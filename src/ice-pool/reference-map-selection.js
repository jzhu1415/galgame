export const REFERENCE_MAP = 'reference';
export const MAP_ROUTES = Object.freeze({
  reference: '/reference-map.html',
  initial: '/initial-map.html',
});

export function mapHref(selection, currentHref) {
  const route = MAP_ROUTES[selection];
  return route ? new URL(route, currentHref).href : null;
}

export function bindMapSelection({
  select,
  location,
  currentMap = REFERENCE_MAP,
  navigate = href => location.assign(href),
}) {
  if (!select || !MAP_ROUTES[currentMap]) throw new TypeError('A valid map selector and current map are required');
  select.value = currentMap;
  select.addEventListener('change', () => {
    const nextMap = select.value;
    const href = mapHref(nextMap, location.href);
    if (!href || nextMap === currentMap) {
      select.value = currentMap;
      return;
    }
    navigate(href);
  });
  return select;
}
