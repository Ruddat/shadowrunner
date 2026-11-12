// Minimal DOM/media surfaces for exercising the real engine under Node.
// These tests validate logic; they do not replace visual/browser playtesting.
const listeners = new Map();
const noop = () => {};
export const context = new Proxy({}, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'measureText') return text => ({ width: String(text).length * 8 });
    if (String(key).startsWith('create')) return () => ({ addColorStop: noop });
    return noop;
} });
export const canvas = { width: 960, height: 540, style: {},
    getContext: () => context,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
    addEventListener(type, fn) { listeners.set(`canvas:${type}`, fn); } };
globalThis.window = { innerWidth: 960, innerHeight: 540,
    addEventListener(type, fn) { const list = listeners.get(type) ?? []; list.push(fn); listeners.set(type, list); } };
globalThis.document = { getElementById: () => canvas, addEventListener: noop, documentElement: {} };
globalThis.Image = class { width = 2048; height = 1024; naturalWidth = 2048; complete = true;
    set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); }
    get src() { return this._src; }
    addEventListener(type, fn) { if (type === "load") queueMicrotask(fn); }
};
globalThis.Audio = class { volume = 1; currentTime = 0; play() { return Promise.resolve(); }
    pause() {} cloneNode() { return new Audio(); } addEventListener() {} };
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k), clear: () => storage.clear() };
let pads = [];
export function setGamepads(value) { pads = value; }
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });
let frame;
globalThis.requestAnimationFrame = fn => { frame = fn; };
let timestamp = 0;
export function tick(frames = 1) {
    for (let i = 0; i < frames; i++) { timestamp += 1000 / 60; frame(timestamp); }
}
export function key(code, type = 'keydown', extra = {}) {
    for (const fn of listeners.get(type) ?? []) fn({ code, preventDefault: noop, repeat: false, ...extra });
}
export function press(code) { key(code); key(code, 'keyup'); }
export function click() { listeners.get('canvas:click')?.({}); }
