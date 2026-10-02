import { referenceLanguage } from './reference-i18n.js';
import './reference-map.js';

const SOURCE = 'naiwa-ice-map';
const parentOrigin = window.location.origin;
const layer = window.__naiwaIceLayer;

window.addEventListener('naiwa-language-change', (event) => {
  const language = event.detail?.language;
  if (language === 'zh' || language === 'en') layer?.setLanguage(language);
});

referenceLanguage.start();

window.addEventListener('message', (event) => {
  if (event.origin !== parentOrigin || event.source !== window.parent) return;
  const data = event.data;
  if (!data || data.source !== 'naiwa-chapter-two') return;
  if (data.type === 'story-pause') { layer?.setStoryPaused(!!data.paused); return; }
  if (data.type !== 'init') return;
  if (data.language === 'zh' || data.language === 'en') {
    referenceLanguage.setLanguage(data.language, { persist: false });
  }
  layer?.setInit({ language: data.language, found: data.found });
  layer?.setStoryPaused(!!data.storyPaused);
  window.__naiwaShowFirstQualityDialog?.();
});

window.parent?.postMessage({ source: SOURCE, type: 'ready' }, parentOrigin);
if (window.parent === window) window.__naiwaShowFirstQualityDialog?.();
