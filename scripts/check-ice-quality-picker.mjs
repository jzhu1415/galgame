import assert from 'node:assert/strict';
import { bindIceQualityPicker } from '../src/ice-pool/ice-quality-picker.js';

const listeners = new Map();
const inputs = ['high', 'balanced', 'performance'].map(value => {
  const classes = new Set();
  const input = { value, checked: false, disabled: false };
  const card = {
    classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) },
    querySelector: () => input,
  };
  input.closest = () => card;
  input.card = card;
  input.text = { closest: () => card };
  input.selected = () => classes.has('is-selected');
  return input;
});
const container = {
  contains: card => inputs.some(input => input.card === card),
  addEventListener: (type, listener) => listeners.set(type, listener),
  removeEventListener: type => listeners.delete(type),
};
let pending = true;
const choices = [];
const picker = bindIceQualityPicker({ container, inputs, canChoose: () => pending, onChoose: value => choices.push(value) });
const emit = (type, target, values = {}) => listeners.get(type)?.({ target, ...values });
const touch = (type, input, values = {}) => emit(type, input.text, { pointerType: 'touch', pointerId: 1, clientX: 20, clientY: 30, ...values });
const assertChoice = value => {
  assert.equal(picker.value(), value);
  assert.deepEqual(inputs.filter(input => input.checked).map(input => input.value), [value], 'Only one radio is selected');
  assert.deepEqual(inputs.filter(input => input.selected()).map(input => input.value), [value], 'Card feedback matches the radio without relying on CSS :has');
};
picker.select('performance', false);
assertChoice('performance');
assert.equal(choices.length, 0, 'Showing defaults does not apply or save a quality change');

// A real touch sequence whose browser never forwards a compatibility click.
touch('pointerdown', inputs[0]);
touch('pointerup', inputs[0]);
assertChoice('high');
assert.deepEqual(choices, ['high'], 'Touching the option text selects the whole card directly');
emit('click', inputs[0].text);
emit('change', inputs[0]);
assert.deepEqual(choices, ['high'], 'A later native click/change does not duplicate selection work');

touch('pointerdown', inputs[1]);
touch('pointermove', inputs[1], { clientY: 60 });
touch('pointerup', inputs[1], { clientY: 60 });
assertChoice('high');
touch('pointerdown', inputs[1]);
touch('pointercancel', inputs[1]);
touch('pointerup', inputs[1]);
assertChoice('high');
emit('click', inputs[1].text);
assertChoice('balanced');

// Native radio keyboard navigation dispatches change after updating checked.
inputs[1].checked = false;
inputs[2].checked = true;
emit('change', inputs[2]);
assertChoice('performance');
picker.select('missing-quality');
assertChoice('performance');
inputs[0].disabled = true;
touch('pointerdown', inputs[0]);
touch('pointerup', inputs[0]);
assertChoice('performance');
pending = false;
emit('click', inputs[1].text);
assertChoice('performance');
const count = choices.length;
picker.dispose();
emit('click', inputs[1].text);
assert.equal(listeners.size, 0);
assert.equal(choices.length, count);
console.log('Ice quality picker OK: direct mobile card taps without compatibility clicks, native mouse/keyboard, feedback, deduplication, cancelled scrolling, disabled controls and disposal.');
