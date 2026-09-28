// Keep translations separate from gameplay so the language selector can call
// referenceLanguage.setLanguage('zh' | 'en' | 'auto') without rebuilding the scene.
export const messages = {
  zh: {
    'page.title': '泳池空间 — 参考地图',
    'page.description': '探索泳池空间：沉浸式泳池、光影与水面反射。',
    'game.title': '泳池空间',
    'game.canvas': '泳池空间参考地图',
    'entry.label': '进入参考地图',
    'entry.keyboard': 'WASD 移动 · Space 跳跃/上浮 · Shift 加速/下潜 · Esc 设置',
    'entry.touch': '左侧圆环移动 · 右侧滑动观察 · 圆键跳跃/游泳',
    'settings.kicker': '环境调节',
    'settings.title': '场景设置',
    'settings.reset': '恢复默认',
    'settings.continue': '继续探索',
    'settings.hint': '再次按 ESC 或选择“继续探索”返回场景',
    'map.label': '地图',
    'map.reference': '参考版（默认）',
    'map.initial': '初版',
    'map.note': '切换会加载所选地图；默认入口保持参考版。',
    'language.label': '语言',
    'language.auto': '跟随系统',
    'language.zh': '中文',
    'language.en': 'English',
    'language.note': '立即生效并记住选择；跟随系统会自动识别语言。',
    'quality.label': '画质',
    'quality.high': '高画质',
    'quality.balanced': '平衡（推荐）',
    'quality.performance': '性能优先',
    'quality.note': '调整分辨率、水体刷新与光照数量，场景布局和材质保持不变。',
    'volume.label': '环境音量',
    'volume.low': '静音',
    'volume.high': '清晰',
    'volume.note': '控制脚步、水声和镜馆环境音。',
    'light.label': '光源亮度',
    'light.low': '幽暗',
    'light.high': '明亮',
    'reflection.label': '地板与墙壁反光',
    'reflection.low': '无反光',
    'reflection.high': '强反光',
    'tiles.multicolor.label': '多色瓷砖',
    'tiles.multicolor.note': '显示零散的蓝色与黑色瓷砖。',
    'speed.label': '移动速度',
    'speed.low': '缓慢 · 25%',
    'speed.high': '快速 · 300%',
    'gravity.label': '重力',
    'gravity.low': '轻盈 · 25%',
    'gravity.high': '沉重 · 200%',
    'touch.menu': '打开场景设置',
    'touch.stick': '移动摇杆',
    'touch.jump': '跳跃',
    'touch.rise': '上浮',
    'touch.dive': '下潜',
  },
  en: {
    'page.title': 'POOLROOMS — REFERENCE MAP',
    'page.description': 'Explore Poolrooms: immersive pools, lighting and water reflections.',
    'game.title': 'POOLROOMS',
    'game.canvas': 'Reference Poolrooms map',
    'entry.label': 'Enter the reference map',
    'entry.keyboard': 'WASD Move · Space Jump / Swim up · Shift Sprint / Dive · Esc Settings',
    'entry.touch': 'Left ring to move · Swipe right side to look · Round buttons to jump / swim',
    'settings.kicker': 'Environmental calibration',
    'settings.title': 'Settings',
    'settings.reset': 'Reset defaults',
    'settings.continue': 'Continue exploring',
    'settings.hint': 'Press ESC again or select “Continue exploring” to return',
    'map.label': 'Map',
    'map.reference': 'Reference (default)',
    'map.initial': 'Initial version',
    'map.note': 'Choosing a map loads it. The default entry remains Reference.',
    'language.label': 'Language',
    'language.auto': 'System default',
    'language.zh': '中文',
    'language.en': 'English',
    'language.note': 'Changes apply instantly and are saved. System default detects your preferred language.',
    'quality.label': 'Graphics',
    'quality.high': 'High quality',
    'quality.balanced': 'Balanced (recommended)',
    'quality.performance': 'Performance',
    'quality.note': 'Adjust resolution, water refresh rate and light count. Layout and materials stay unchanged.',
    'volume.label': 'Ambient volume',
    'volume.low': 'Muted',
    'volume.high': 'Clear',
    'volume.note': 'Controls footsteps, water and hall ambience.',
    'light.label': 'Light brightness',
    'light.low': 'Dim',
    'light.high': 'Bright',
    'reflection.label': 'Floor & wall reflections',
    'reflection.low': 'None',
    'reflection.high': 'Strong',
    'tiles.multicolor.label': 'Multicolor tiles',
    'tiles.multicolor.note': 'Show scattered blue and black tiles.',
    'speed.label': 'Movement speed',
    'speed.low': 'Slow · 25%',
    'speed.high': 'Fast · 300%',
    'gravity.label': 'Gravity',
    'gravity.low': 'Light · 25%',
    'gravity.high': 'Heavy · 200%',
    'touch.menu': 'Open settings',
    'touch.stick': 'Movement joystick',
    'touch.jump': 'Jump',
    'touch.rise': 'Swim up',
    'touch.dive': 'Dive',
  },
};

export function detectLanguage(preferences = {}) {
  const languages = Array.isArray(preferences.languages) && preferences.languages.length
    ? preferences.languages : [preferences.language];
  for (const locale of languages) {
    if (typeof locale !== 'string') continue;
    const language = locale.trim().toLowerCase().split(/[-_]/)[0];
    if (language === 'zh' || language === 'en') return language;
  }
  return 'en';
}

const translatedAttributes = ['aria-label', 'content'];
export const LANGUAGE_STORAGE_KEY = 'poolrooms-reference-language';
const languagePreferences = ['auto', 'zh', 'en'];

export function createLanguageController({
  root = globalThis.document,
  preferences = globalThis.navigator,
  events = globalThis.window,
  getStorage = () => globalThis.localStorage,
} = {}) {
  let preference = 'auto';
  let language = detectLanguage(preferences);
  let started = false;
  const t = key => messages[language][key] ?? messages.en[key] ?? key;

  function localize(element, key, attribute) {
    element.setAttribute(attribute ? `data-i18n-${attribute}` : 'data-i18n', key);
    if (attribute) element.setAttribute(attribute, t(key));
    else element.textContent = t(key);
  }

  function apply() {
    root.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    root.title = t('page.title');
    for (const element of root.querySelectorAll('[data-i18n]')) {
      element.textContent = t(element.getAttribute('data-i18n'));
    }
    for (const attribute of translatedAttributes) {
      for (const element of root.querySelectorAll(`[data-i18n-${attribute}]`)) {
        element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
      }
    }
    for (const select of root.querySelectorAll('[data-language-select]')) {
      select.value = preference;
    }
  }

  function setLanguage(nextPreference, { persist = true } = {}) {
    if (!languagePreferences.includes(nextPreference)) {
      throw new RangeError(`Unsupported language: ${nextPreference}`);
    }
    preference = nextPreference;
    language = preference === 'auto' ? detectLanguage(preferences) : preference;
    apply();
    if (persist) {
      try {
        getStorage()?.setItem(LANGUAGE_STORAGE_KEY, preference);
      } catch {
        // Private browsing/storage restrictions must not block this session's choice.
      }
    }
  }

  function start() {
    if (started) return;
    started = true;
    try {
      const saved = getStorage()?.getItem(LANGUAGE_STORAGE_KEY);
      if (languagePreferences.includes(saved)) preference = saved;
    } catch {
      // Fall back to automatic detection when storage is unavailable.
    }
    setLanguage(preference, { persist: false });
    for (const select of root.querySelectorAll('[data-language-select]')) {
      select.addEventListener('change', () => setLanguage(select.value));
    }
    events?.addEventListener('languagechange', () => {
      if (preference === 'auto') setLanguage('auto', { persist: false });
    });
  }

  return { start, setLanguage, localize, t, get language() { return language; } };
}

export const referenceLanguage = createLanguageController();
