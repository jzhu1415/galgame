// Native radio semantics plus direct card activation for mobile browsers that
// omit the label's compatibility click after a touch or viewport transition.
export function bindIceQualityPicker({ container, inputs, canChoose, onChoose }) {
  let selected = null;
  let contact = null;
  const inputFor = target => {
    const card = target?.closest?.('.quality-choice');
    if (!card || !container.contains(card)) return null;
    const input = card.querySelector('input');
    return inputs.includes(input) && !input.disabled ? input : null;
  };
  function select(value, notify = true) {
    const next = inputs.find(input => input.value === value && !input.disabled);
    if (!next) return;
    const changed = selected !== value;
    selected = value;
    for (const input of inputs) {
      input.checked = input === next;
      input.closest('.quality-choice')?.classList.toggle('is-selected', input === next);
    }
    if (changed && notify) onChoose(value);
  }
  function choose(input) {
    if (input && canChoose()) select(input.value);
  }
  const change = event => { if (event.target.checked) choose(event.target); };
  const click = event => choose(inputFor(event.target));
  const down = event => {
    if (!canChoose() || event.isPrimary === false || !['touch', 'pen'].includes(event.pointerType)) return;
    const input = inputFor(event.target);
    contact = input ? { id: event.pointerId, x: event.clientX, y: event.clientY, input } : null;
  };
  const cancel = () => { contact = null; };
  const move = event => {
    if (contact?.id === event.pointerId && Math.hypot(event.clientX - contact.x, event.clientY - contact.y) > 12) cancel();
  };
  const up = event => {
    if (contact?.id !== event.pointerId) return;
    const tap = contact;
    cancel();
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= 12) choose(tap.input);
  };
  const listeners = { change, click, pointerdown: down, pointermove: move, pointerup: up, pointercancel: cancel };
  for (const [type, listener] of Object.entries(listeners)) container.addEventListener(type, listener);
  return {
    select,
    value: () => selected,
    dispose() {
      cancel();
      for (const [type, listener] of Object.entries(listeners)) container.removeEventListener(type, listener);
    },
  };
}
