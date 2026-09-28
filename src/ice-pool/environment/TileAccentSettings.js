// Settings binding for the optional blue/black tile accents.
// Keep the persistence boundary small so storage restrictions never affect play.
export const MULTICOLOR_TILES_STORAGE_KEY = 'poolrooms.reference.multicolorTiles';
export const TILE_ACCENT_STORAGE_KEY = MULTICOLOR_TILES_STORAGE_KEY;
export const DEFAULT_MULTICOLOR_TILES_ENABLED = true;

function readStoredValue(getStorage) {
  try {
    const value = getStorage()?.getItem?.(MULTICOLOR_TILES_STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {
    // Private browsing and restricted embedded contexts can reject either step.
  }
  return DEFAULT_MULTICOLOR_TILES_ENABLED;
}

function persistValue(getStorage, enabled) {
  try {
    getStorage()?.setItem?.(MULTICOLOR_TILES_STORAGE_KEY, String(enabled));
  } catch {
    // A settings control must remain usable when storage is unavailable.
  }
}

export function bindTileAccentSettings({
  input,
  onChange = () => {},
  getStorage = () => globalThis.window?.localStorage,
} = {}) {
  if (!input || typeof input.addEventListener !== 'function') {
    throw new TypeError('bindTileAccentSettings requires a checkbox input');
  }
  const notify = typeof onChange === 'function' ? onChange : () => {};

  const enabled = readStoredValue(getStorage);
  input.checked = enabled;
  notify(enabled);

  function handleChange() {
    const nextEnabled = Boolean(input.checked);
    notify(nextEnabled);
    persistValue(getStorage, nextEnabled);
  }

  input.addEventListener('change', handleChange);

  return {
    reset() {
      input.checked = DEFAULT_MULTICOLOR_TILES_ENABLED;
      notify(DEFAULT_MULTICOLOR_TILES_ENABLED);
      persistValue(getStorage, DEFAULT_MULTICOLOR_TILES_ENABLED);
    },
    dispose() {
      input.removeEventListener?.('change', handleChange);
    },
  };
}
