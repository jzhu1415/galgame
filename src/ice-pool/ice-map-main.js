import { referenceLanguage } from './reference-i18n.js';
import { initializeIceMap } from './ice-map-bootstrap.js';

const SOURCE = 'naiwa-ice-map';
const parentOrigin = window.location.origin;
let layer = null;
let pendingInit = null;
let storyPaused = false;
const applyInit = () => {
  if (!layer || !pendingInit) return;
  layer.setInit({ language: pendingInit.language, found: pendingInit.found });
  layer.setStoryPaused(storyPaused);
  window.__naiwaShowFirstQualityDialog?.();
};

window.addEventListener('naiwa-language-change', (event) => {
  const language = event.detail?.language;
  if (language === 'zh' || language === 'en') layer?.setLanguage(language);
});

referenceLanguage.start();

window.addEventListener('message', (event) => {
  if (event.origin !== parentOrigin || event.source !== window.parent) return;
  const data = event.data;
  if (!data || data.source !== 'naiwa-chapter-two') return;
  if (data.type === 'story-pause') { storyPaused = !!data.paused; layer?.setStoryPaused(storyPaused); return; }
  if (data.type === 'language') {
    if (data.language === 'zh' || data.language === 'en') referenceLanguage.setLanguage(data.language, { persist: false });
    return;
  }
  if (data.type !== 'init') return;
  if (data.language === 'zh' || data.language === 'en') {
    referenceLanguage.setLanguage(data.language, { persist: false });
  }
  pendingInit = data;
  storyPaused = !!data.storyPaused;
  applyInit();
});

void initializeIceMap().then(nextLayer => {
  layer = nextLayer;
  applyInit();
  window.parent?.postMessage({ source: SOURCE, type: 'ready' }, parentOrigin);
  if (window.parent === window) window.__naiwaShowFirstQualityDialog?.();
}).catch(error => {
  const reason = error?.code === 'unsupported' ? 'unsupported' : 'load';
  window.__naiwaIceLayer?.setStoryPaused(true);
  window.parent?.postMessage({ source: SOURCE, type: 'error', reason }, parentOrigin);
  if (window.parent !== window) return;
  const zh = document.documentElement.lang.startsWith('zh');
  const panel = document.createElement('section');
  panel.setAttribute('role', 'alert');
  panel.style.cssText = 'position:fixed;inset:0;z-index:100;background:#132e48;color:#effaff;display:grid;place-content:center;padding:32px;font:16px/1.7 sans-serif;';
  const message = document.createElement('p');
  message.textContent = zh ? '镜馆无法启动。请检查网络，并确认浏览器支持 WebGL 2、已开启图形加速。' : 'The mirror hall could not start. Check your connection, WebGL 2 support and graphics acceleration.';
  const retry = document.createElement('button');
  retry.type = 'button'; retry.textContent = zh ? '重试' : 'Retry';
  retry.addEventListener('click', () => window.location.reload());
  panel.append(message, retry); document.body.append(panel);
});
