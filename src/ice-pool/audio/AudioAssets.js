import { AUDIO_CONFIG } from './AudioConfig.js';
import { AUDIO_MANIFEST } from './AudioManifest.js';
import {
  createDevAudioPlaceholder,
  DEV_ONLY_AUDIO_PLACEHOLDER,
} from './DevAudioPlaceholder.js';

const DISPOSED = Symbol('AudioAssets disposed');

function makeAbortController() {
  const Controller = globalThis.AbortController;
  if (typeof Controller === 'function') return new Controller();
  return { signal: undefined, abort() {} };
}

function byteView(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

function responseContentType(response) {
  if (!response?.headers) return '';
  if (typeof response.headers.get === 'function') {
    return String(response.headers.get('content-type') ?? response.headers.get('Content-Type') ?? '');
  }
  return String(response.headers['content-type'] ?? response.headers['Content-Type'] ?? '');
}

function isAudioContentType(contentType) {
  const normalized = contentType.trim().toLowerCase();
  if (!normalized) return true;
  return normalized.startsWith('audio/')
    || normalized === 'application/octet-stream'
    || normalized === 'binary/octet-stream'
    || normalized === 'application/wav'
    || normalized === 'application/x-wav';
}

function looksLikeHtml(value) {
  const bytes = byteView(value);
  if (!bytes?.length) return false;
  const head = new TextDecoder().decode(bytes.subarray(0, 256))
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html')
    || head.startsWith('<head') || head.startsWith('<body')
    || /^<\s*(?:script|title|meta)\b/.test(head);
}

function errorText(error) {
  if (error?.message) return error.message;
  return String(error);
}

export class AudioAssets {
  constructor(context, {
    manifest = AUDIO_MANIFEST,
    dev = false,
    config = AUDIO_CONFIG,
    // Keep the native Window/Worker receiver. Storing fetch directly and then
    // calling this.fetcher() makes AudioAssets its receiver (Illegal invocation
    // in browsers), silently replacing real recordings with DEV placeholders.
    fetcher = (...args) => globalThis.fetch(...args),
  } = {}) {
    this.context = context;
    this.manifest = manifest ?? AUDIO_MANIFEST;
    this.dev = Boolean(dev);
    this.config = config ?? AUDIO_CONFIG;
    this.fetcher = fetcher;
    this.placeholderEnabled = Boolean(this.dev && this.config.devPlaceholder);

    this.urlPromises = new Map();
    this.placeholderBuffers = new Map();
    this.pools = new Map();
    this.warnedUrls = new Set();
    this.abortControllers = new Set();
    this.loadAllPromise = null;
    this.generation = 0;
    this.disposed = false;
    this.disposePromise = new Promise(resolve => {
      this.resolveDisposed = resolve;
    });
  }

  async loadAll() {
    if (this.disposed) return this;
    if (this.loadAllPromise) return this.loadAllPromise;

    const generation = this.generation;
    const promise = this.loadAllInternal(generation)
      .catch(error => {
        if (this.isCurrent(generation)) {
          console.warn(`[AudioAssets] Audio manifest load failed: ${errorText(error)}`);
        }
      })
      .then(() => this)
      .finally(() => {
        if (this.generation === generation) this.loadAllPromise = null;
      });
    this.loadAllPromise = promise;
    return promise;
  }

  getPool(name) {
    const pool = this.pools.get(name);
    return pool ? pool.slice() : [];
  }

  async loadImpulse(url) {
    if (this.disposed || typeof url !== 'string' || !url) return null;
    const generation = this.generation;
    const buffer = await this.getRealBuffer(url, generation);
    if (!this.isCurrent(generation) || !buffer) return null;
    if (buffer.sampleRate !== this.context.sampleRate || ![1, 2, 4].includes(buffer.numberOfChannels)) {
      this.warnOnce(url, 'Impulse response requires context-matched sample rate and 1, 2 or 4 channels.');
      return null;
    }
    return buffer;
  }

  async loadAllInternal(generation) {
    const entries = [];
    const nextPools = new Map();
    for (const [name, definition] of Object.entries(this.manifest ?? {})) {
      nextPools.set(name, []);
      if (!Array.isArray(definition?.samples)) continue;
      for (const sample of definition.samples) {
        if (typeof sample?.url !== 'string' || !sample.url) continue;
        entries.push({ name, definition, sample });
      }
    }

    const urls = [...new Set(entries.map(entry => entry.sample.url))];
    await this.loadUrlBatch(urls, generation);
    if (!this.isCurrent(generation)) return;

    const buffers = new Map();
    for (const url of urls) buffers.set(url, await this.getRealBuffer(url, generation));
    if (!this.isCurrent(generation)) return;

    for (const entry of entries) {
      let buffer = buffers.get(entry.sample.url);
      let placeholder = false;
      if (!buffer && this.placeholderEnabled) {
        buffer = this.getPlaceholder(entry.sample.url, entry.sample, entry.definition.loop);
        placeholder = Boolean(buffer);
      }
      if (!buffer) continue;
      nextPools.get(entry.name).push({
        buffer,
        url: entry.sample.url,
        loopStart: entry.sample.loopStart,
        loopEnd: entry.sample.loopEnd,
        placeholder,
      });
    }

    if (this.isCurrent(generation)) this.pools = nextPools;
  }

  async loadUrlBatch(urls, generation) {
    if (!urls.length || !this.isCurrent(generation)) return;
    const configuredConcurrency = Number(this.config?.loading?.concurrency);
    const concurrency = Math.max(1, Math.floor(configuredConcurrency) || 1);
    let cursor = 0;
    const worker = async () => {
      while (this.isCurrent(generation)) {
        const index = cursor;
        cursor += 1;
        if (index >= urls.length) return;
        await this.getRealBuffer(urls[index], generation);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  }

  getRealBuffer(url, generation = this.generation) {
    if (!this.isCurrent(generation) || typeof url !== 'string' || !url) {
      return Promise.resolve(null);
    }
    const existing = this.urlPromises.get(url);
    if (existing) return existing;

    const promise = this.loadRealUrl(url, generation)
      .then(buffer => buffer || null)
      .catch(error => {
        if (this.isCurrent(generation)) {
          const detail = errorText(error);
          const fallback = this.placeholderEnabled
            ? ` ${DEV_ONLY_AUDIO_PLACEHOLDER} is development-only, deterministic noise and not final audio quality.`
            : '';
          this.warnOnce(url, `Audio asset unavailable (${detail}).${fallback}`);
        }
        return null;
      });
    this.urlPromises.set(url, promise);
    return promise;
  }

  async loadRealUrl(url, generation) {
    const controller = makeAbortController();
    this.abortControllers.add(controller);
    try {
      if (typeof this.fetcher !== 'function') throw new Error('fetcher is unavailable');
      const response = await this.withTimeout(
        () => this.fetcher(url, { signal: controller.signal }),
        controller,
        generation,
        'fetch',
      );
      if (response === DISPOSED || !this.isCurrent(generation)) return null;
      if (!response || response.ok === false
        || (Number.isFinite(response.status) && response.status >= 400)) {
        const status = Number.isFinite(response?.status) ? ` (HTTP ${response.status})` : '';
        throw new Error(`request failed${status}`);
      }

      const contentType = responseContentType(response);
      if (!isAudioContentType(contentType)) {
        throw new Error(`non-audio response (${contentType || 'unknown content type'})`);
      }
      if (typeof response.arrayBuffer !== 'function') {
        throw new Error('response has no arrayBuffer()');
      }
      const bytes = await this.withTimeout(
        () => response.arrayBuffer(),
        controller,
        generation,
        'arrayBuffer',
      );
      if (bytes === DISPOSED || !this.isCurrent(generation)) return null;
      if (!byteView(bytes)?.length) throw new Error('audio response is empty');
      if (looksLikeHtml(bytes)) throw new Error('non-audio response (HTML document)');

      const buffer = await this.withTimeout(
        () => this.decodeAudioData(bytes),
        controller,
        generation,
        'decode',
      );
      if (buffer === DISPOSED || !this.isCurrent(generation)) return null;
      if (!buffer) throw new Error('decodeAudioData returned no buffer');
      return buffer;
    } finally {
      this.abortControllers.delete(controller);
    }
  }

  decodeAudioData(bytes) {
    if (typeof this.context?.decodeAudioData !== 'function') {
      throw new Error('AudioContext.decodeAudioData is unavailable');
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const succeed = value => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const fail = error => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      let returned;
      try {
        returned = this.context.decodeAudioData(bytes, succeed, fail);
      } catch (error) {
        fail(error);
        return;
      }
      if (returned && typeof returned.then === 'function') returned.then(succeed, fail);
      else if (returned !== undefined) succeed(returned);
    });
  }

  withTimeout(operation, controller, generation, phase) {
    if (!this.isCurrent(generation)) return Promise.resolve(DISPOSED);
    const timeoutMs = Number(this.config?.loading?.timeoutMs);
    let timer = null;
    const operationPromise = Promise.resolve().then(operation);
    const races = [operationPromise, this.disposePromise];
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      races.push(new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          try { controller.abort(); } catch { /* Abort is best effort for custom fetchers. */ }
          reject(new Error(`${phase} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }));
    }
    return Promise.race(races).finally(() => {
      if (timer !== null) clearTimeout(timer);
    });
  }

  getPlaceholder(url, sample, loop) {
    if (this.placeholderBuffers.has(url)) return this.placeholderBuffers.get(url);
    try {
      const buffer = createDevAudioPlaceholder(this.context, {
        url,
        kind: sample.kind,
        loop,
        variant: sample.variant,
      });
      if (buffer) this.placeholderBuffers.set(url, buffer);
      return buffer;
    } catch (error) {
      this.warnOnce(url, `${DEV_ONLY_AUDIO_PLACEHOLDER} could not be generated (${errorText(error)})`);
      return null;
    }
  }

  isCurrent(generation) {
    return !this.disposed && generation === this.generation;
  }

  warnOnce(url, reason) {
    if (this.warnedUrls.has(url)) return;
    this.warnedUrls.add(url);
    console.warn(`[AudioAssets] ${reason} URL: ${url}`);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    for (const controller of this.abortControllers) {
      try { controller.abort(); } catch { /* Best effort; custom controllers may be inert. */ }
    }
    this.abortControllers.clear();
    this.resolveDisposed(DISPOSED);
    this.urlPromises.clear();
    this.placeholderBuffers.clear();
    this.pools.clear();
    this.loadAllPromise = null;
  }
}
