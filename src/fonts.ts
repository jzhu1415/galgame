const fontUrl = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap'

// The game paints in system fonts first; a slow font service cannot hold up startup.
export function loadOptionalFonts() {
  const load = () => {
    if (document.getElementById('optional-fonts')) return
    const link = document.createElement('link')
    link.id = 'optional-fonts'
    link.rel = 'stylesheet'
    link.media = 'print'
    link.href = fontUrl
    link.onload = () => { link.media = 'all' }
    link.onerror = () => { link.remove() }
    document.head.append(link)
  }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(load, { timeout: 1500 })
  else window.setTimeout(load, 200)
}
