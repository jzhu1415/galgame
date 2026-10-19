// Browser presentation only. Native EventTarget retains cancellation and once semantics.
export const noop = () => {};
const dialogCloseTasks = [];
export function flushDialogCloseTasks() { while (dialogCloseTasks.length) dialogCloseTasks.shift()(); }
export const canvasContext = new Proxy({}, {
  get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop: noop }) : noop,
});
export function fire(target, type, fields = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(fields)) Object.defineProperty(event, key, { value, configurable: true });
  target.dispatchEvent(event);
  return event;
}
export class TestElement extends EventTarget {
  constructor(tag = 'div') {
    super(); this.tag = tag; this.nodes = new Map(); this.children = []; this.attributes = new Map();
    this.dataset = {}; this.hidden = false; this.disabled = false; this.isConnected = true; this.captured = new Set();
    const classes = new Set();
    this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name),
      toggle(name, force = !classes.has(name)) { if (force) classes.add(name); else classes.delete(name); return force; } };
    this.style = { setProperty: noop }; this.textContent = '';
  }
  set innerHTML(value) { this.html = value; this.nodes.clear(); }
  get innerHTML() { return this.html ?? ''; }
  insertAdjacentHTML(_position, value) {
    const id = value.match(/^<section[^>]*id="([^"]+)"/);
    if (id) { const child = new TestElement('section'); child.id = id[1]; child.innerHTML = value; this.append(child); }
    else this.html = this.innerHTML + value;
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  focus() { document.activeElement = this; }
  after() {}
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  remove() {
    this.removed = true; this.isConnected = false; this.onRemove?.();
    if (this.parent) {
      this.parent.children = this.parent.children.filter(child => child !== this);
      for (const [key, node] of this.parent.nodes) if (node === this) this.parent.nodes.delete(key);
    }
  }
  click() { fire(this, 'click', { detail: 1 }); }
  showModal() { this.open = true; }
  close() { if (this.open) { this.open = false; dialogCloseTasks.push(() => fire(this, 'close')); } }
  getContext() { return canvasContext; }
  getBoundingClientRect() { return { left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200 }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); fire(this, 'lostpointercapture', { pointerId: id }); }
  contains(node) { return this.children.includes(node); }
  closest() { return null; }
  findMarkup(selector) {
    const wanted = selector.startsWith('#') ? this.innerHTML.includes(`id="${selector.slice(1)}"`)
      : selector.startsWith('.') && new RegExp(`class="[^"]*\\b${selector.slice(1).split(/[ >]/)[0]}\\b`).test(this.innerHTML);
    if (wanted) return this;
    for (const child of [...this.children, ...this.nodes.values()]) { const found = child.findMarkup(selector); if (found) return found; }
    return null;
  }
  querySelector(selector) {
    if (selector === 'dialog[open]') return this.children.find(child => child.tag === 'dialog' && child.open) ?? null;
    if (selector.startsWith('#')) {
      const child = this.children.find(node => node.id === selector.slice(1));
      if (child) return child;
    }
    for (const child of [...this.children, ...this.nodes.values()]) {
      const scope = child.findMarkup(selector);
      if (scope) return selector === `#${scope.id}` ? scope : scope.querySelector(selector);
    }
    if (selector.startsWith('#') && !this.innerHTML.includes(`id="${selector.slice(1)}"`)) return null;
    if (selector.startsWith('[data-')) return this.querySelectorAll(selector)[0] ?? null;
    if (!this.nodes.has(selector)) {
      const node = new TestElement(); node.parent = this;
      if (selector.startsWith('#')) {
        const tag = this.innerHTML.match(new RegExp(`<([a-z]+)\\b([^>]*\\bid="${selector.slice(1)}"[^>]*)>`));
        if (tag) { node.tag = tag[1]; for (const attribute of tag[2].matchAll(/([\w-]+)="([^"]*)"/g)) node.setAttribute(attribute[1], attribute[2]); }
      }
      this.nodes.set(selector, node);
    }
    return this.nodes.get(selector);
  }
  querySelectorAll(selector) {
    const attribute = selector.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
    if (!attribute) return [];
    const result = [];
    for (const match of this.innerHTML.matchAll(/<button\b([^>]*)>[\s\S]*?<\/button>/g)) {
      const value = match[1].match(new RegExp(`\\b${attribute[1]}(?:="([^"]*)")?`));
      if (!value || (attribute[2] !== undefined && value[1] !== attribute[2])) continue;
      const key = `${attribute[1]}:${value[1] ?? ''}`;
      if (!this.nodes.has(key)) {
        const node = new TestElement('button'); node.parent = this;
        const name = attribute[1].replace(/^data-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        node.dataset[name] = value[1] ?? ''; node.disabled = /\bdisabled\b/.test(match[1]); this.nodes.set(key, node);
      }
      result.push(this.nodes.get(key));
    }
    return result;
  }
}
