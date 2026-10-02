// Keep translations separate from gameplay so the language selector can call
// referenceLanguage.setLanguage('zh' | 'en' | 'auto') without rebuilding the scene.
export const messages = {
  zh: {
    'page.title': '冰封镜馆 · NAIWA',
    'page.description': '进入冰封镜馆，沿着结霜的镜面长廊寻找失落的证词。',
    'game.title': '冰封镜馆',
    'game.canvas': '冰封镜馆三维地图',
    'entry.label': '进入冰封镜馆',
    'entry.keyboard': 'WASD 移动 · Space 跳跃/上浮 · Shift 加速/下潜 · Esc 设置',
    'entry.touch': '左侧圆环移动 · 右侧滑动观察 · 圆键跳跃/游泳',
    'settings.kicker': 'NAIWA · 第二章',
    'settings.title': '游戏设置',
    'settings.reset': '恢复默认',
    'settings.continue': '继续探索',
    'settings.button': '设置',
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
    'quality.performance': '低画质 · 手机推荐',
    'quality.note': '选择画面细节与流畅度。',
    'quality.welcome.kicker': 'NAIWA · 首次进入',
    'quality.welcome.title': '选择画质',
    'quality.welcome.note': '低画质会减少场景中的水晶，以提升流畅度。',
    'quality.welcome.enter': '进入镜馆',
    'volume.label': '环境音量',
    'volume.low': '静音',
    'volume.high': '清晰',
    'volume.note': '控制脚步、水声和镜馆环境音。',
    'light.label': '画面亮度',
    'light.low': '幽暗',
    'light.high': '明亮',
    'look.label': '视角灵敏度',
    'look.low': '缓慢',
    'look.high': '灵敏',
    'look.note': '同时调整鼠标和触屏视角速度。',
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
    'page.title': 'FROZEN MIRROR HALL · NAIWA',
    'page.description': 'Enter the frozen mirror hall and follow its frost-lined corridors to find the lost testimony.',
    'game.title': 'FROZEN MIRROR HALL',
    'game.canvas': 'Frozen Mirror Hall 3D map',
    'entry.label': 'Enter the Frozen Mirror Hall',
    'entry.keyboard': 'WASD Move · Space Jump / Swim up · Shift Sprint / Dive · Esc Settings',
    'entry.touch': 'Left ring to move · Swipe right side to look · Round buttons to jump / swim',
    'settings.kicker': 'NAIWA · CHAPTER TWO',
    'settings.title': 'Game preferences',
    'settings.reset': 'Reset defaults',
    'settings.continue': 'Continue exploring',
    'settings.button': 'Settings',
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
    'quality.performance': 'Low · Recommended for phones',
    'quality.note': 'Choose the visual detail and smoothness that suit your device.',
    'quality.welcome.kicker': 'NAIWA · FIRST VISIT',
    'quality.welcome.title': 'Choose graphics quality',
    'quality.welcome.note': 'Low quality reduces the number of crystals in the scene to improve smoothness.',
    'quality.welcome.enter': 'Enter the hall',
    'volume.label': 'Ambient volume',
    'volume.low': 'Muted',
    'volume.high': 'Clear',
    'volume.note': 'Controls footsteps, water and hall ambience.',
    'light.label': 'Brightness',
    'light.low': 'Dim',
    'light.high': 'Bright',
    'look.label': 'Look sensitivity',
    'look.low': 'Slow',
    'look.high': 'Fast',
    'look.note': 'Adjusts mouse and touch look speed together.',
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
    if (typeof CustomEvent !== 'undefined') {
      events?.dispatchEvent(new CustomEvent('naiwa-language-change', { detail: { language } }));
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
