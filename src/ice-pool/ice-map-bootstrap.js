// Keep initialization failures catchable, including asynchronous shader compilation.
export async function initializeIceMap({
  supportsWebGL2 = () => typeof globalThis.WebGL2RenderingContext !== 'undefined',
  loadWorld = () => import('./reference-map.js'),
  getLayer = () => window.__naiwaIceLayer,
} = {}) {
  if (!supportsWebGL2()) {
    const error = new Error('WebGL 2 is unavailable');
    error.code = 'unsupported';
    throw error;
  }
  const world = await loadWorld();
  await world.referenceReady;
  const layer = getLayer();
  if (!layer) throw new Error('Mirror hall initialization did not finish');
  return layer;
}
