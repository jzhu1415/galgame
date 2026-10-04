// Gameplay shortcuts must leave native controls (including nested button icons)
// and browser shortcuts alone.
export function isIceControlEvent(event) {
  return !!(event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey
    || event.target?.closest?.('button, a, input, select, textarea, summary, [contenteditable]:not([contenteditable="false"]), [role="button"]'));
}

export function bindIceHoldButton({ button, canPress, setHeld, onPress = () => {} }) {
  let pointerId = null;
  let touchFallback = false;
  let handledContact = false;
  function reset() {
    const previous = pointerId;
    pointerId = null;
    touchFallback = false;
    button.classList.remove('is-pressed');
    setHeld(false);
    // Clear state before releasing capture: lostpointercapture can fire here.
    if (previous !== null && button.hasPointerCapture(previous)) button.releasePointerCapture(previous);
  }
  function press() {
    handledContact = true;
    button.classList.add('is-pressed');
    setHeld(true);
    onPress();
  }
  const down = event => {
    if (!canPress() || pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    pointerId = event.pointerId;
    button.setPointerCapture(pointerId);
    if (!touchFallback) press();
    touchFallback = false;
  };
  const release = event => { if (pointerId !== null && event.pointerId === pointerId) reset(); };
  const touchStart = event => {
    if (!canPress()) return;
    // A touch also delivers pointerdown on modern browsers. Queue only once.
    if (pointerId === null && !touchFallback) { touchFallback = true; press(); }
    if (event.cancelable) event.preventDefault();
  };
  const touchEnd = event => {
    if (touchFallback && !(event.targetTouches ?? event.touches)?.length) reset();
  };
  const touchCancel = () => { if (touchFallback) reset(); };
  const click = event => {
    // Native keyboard/assistive activation has no preceding pointer contact.
    // Compatibility clicks must not queue a second jump after landing.
    if (canPress() && (event.detail === 0 || !handledContact)) onPress();
  };
  const listeners = { pointerdown: down, pointerup: release, pointercancel: release,
    lostpointercapture: release, touchstart: touchStart, touchend: touchEnd, touchcancel: touchCancel, click };
  for (const [type, listener] of Object.entries(listeners)) button.addEventListener(type, listener, { passive: false });
  return {
    reset,
    dispose() {
      reset();
      for (const [type, listener] of Object.entries(listeners)) button.removeEventListener(type, listener);
    },
  };
}
