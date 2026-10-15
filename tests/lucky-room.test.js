import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseLuckySetup, animateLuckySetup } from '../js/lucky-room.js';

const option = (datasetId, mode, extra = {}) => ({ datasetId, datasetName: `Koleksiyon ${datasetId}`, groupName: 'Oyun', mode, modeName: `Mod ${mode}`, ...extra });
const choices = [option('a', 'auction'), option('a', 'mystery-box'), option('b', 'blind-ranking')];
const sequence = (...values) => () => values.shift();

test('lucky setup gives every collection an equal chance despite different compatible mode counts', () => {
  assert.equal(chooseLuckySetup(choices, sequence(0, 0)).datasetId, 'a');
  assert.equal(chooseLuckySetup(choices, sequence(.499, .999)).mode, 'mystery-box');
  assert.equal(chooseLuckySetup(choices, sequence(.5, 0)).datasetId, 'b');
  assert.equal(chooseLuckySetup(choices, sequence(.999, .999)).mode, 'blind-ranking');
});

test('duplicate collection/mode pairs do not bias the selection and extra room options survive', () => {
  const base = Object.freeze(option('a', 'bracket', { bracketSize: 32 }));
  const result = chooseLuckySetup([base, base, option('a', 'auction')], sequence(0, .5));
  assert.equal(result.mode, 'auction');
  const bracket = chooseLuckySetup([base], sequence(0, 0));
  assert.equal(bracket.bracketSize, 32);
  assert.notEqual(bracket, base);
  bracket.datasetName = 'Changed';
  assert.equal(base.datasetName, 'Koleksiyon a');
});

test('lucky setup works for every supplied mode without a hardcoded game allowlist', () => {
  const modes = ['auction', 'sealed-auction', 'ranking', 'telepathy', 'detective', 'chameleon', 'blind-ranking', 'bracket', 'start-bench-cut', 'frequency', 'double-ranking', 'mystery-box'];
  const rows = modes.map(mode => option('a', mode));
  for (let i = 0; i < modes.length; i++) assert.equal(chooseLuckySetup(rows, sequence(0, (i + .5) / modes.length)).mode, modes[i]);
});

test('empty, incomplete and invalid random selections fail explicitly', () => {
  for (const invalid of [undefined, {}, [], [null], [option('', 'auction')], [option('a', ' ')], [{ datasetId: 'a' }]]) {
    assert.throws(() => chooseLuckySetup(invalid), /Şans|oyun/);
  }
  for (const invalid of [-.01, 1, NaN, Infinity, '0.5', undefined]) {
    assert.throws(() => chooseLuckySetup(choices, () => invalid), RangeError);
  }
});

// A small DOM substitute is enough to check ownership, safe text and cleanup.
// The module does not need jsdom or a browser package in the production app.
function makeElement() {
  class Node {
    constructor(tag, doc) { this.tagName = tag; this.ownerDocument = doc; this.children = []; this.parentNode = null; this.attributes = new Map(); this.dataset = {}; this.className = ''; this._text = ''; }
    set textContent(value) { this._text = String(value); this.replaceChildren(); }
    get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
    set innerHTML(value) { throw new Error(`Unsafe HTML: ${value}`); }
    append(...nodes) { for (const node of nodes) { node.parentNode = this; this.children.push(node); } }
    replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this.append(...nodes); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    remove() { if (!this.parentNode) return; this.parentNode.children = this.parentNode.children.filter(node => node !== this); this.parentNode = null; }
  }
  const doc = { createElement: tag => new Node(tag, doc) };
  return doc.createElement('div');
}
const find = (node, className) => node.className === className ? node : node.children.map(child => find(child, className)).find(Boolean);

test('reduced motion reveals the exact choice immediately and announces only the final values', async () => {
  const element = makeElement(), finalChoice = choices[1], frames = [];
  const result = await animateLuckySetup({ element, choices, finalChoice, reducedMotion: true, onFrame: frame => frames.push(frame) });
  assert.deepEqual(result, finalChoice);
  assert.equal(element.getAttribute('aria-busy'), null);
  assert.equal(element.children[0].dataset.state, 'complete');
  assert.equal(find(element, 'lucky-room-reels').getAttribute('aria-hidden'), 'true');
  const status = find(element, 'lucky-room-status');
  assert.equal(status.getAttribute('aria-live'), 'polite');
  assert.equal(status.textContent, 'Oyun · Koleksiyon a · Mod mystery-box');
  assert.deepEqual(frames.map(frame => frame.done), [true]);
});

test('normal animation keeps the live region empty until the final frame and renders names as plain text', async () => {
  const element = makeElement(), unsafe = option('a', 'auction', { datasetName: '<img src=x onerror=alert(1)>' }), frames = [];
  await animateLuckySetup({ element, choices: [unsafe], finalChoice: unsafe, reducedMotion: false, duration: 12, random: () => 0,
    onFrame: frame => frames.push({ done: frame.done, live: find(element, 'lucky-room-status').textContent }) });
  assert.ok(frames.some(frame => !frame.done));
  assert.ok(frames.filter(frame => !frame.done).every(frame => frame.live === ''));
  assert.equal(frames.at(-1).done, true);
  assert.match(element.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(element.children[0].dataset.state, 'complete');
});

test('aborting removes only owned animation, restores busy state and permits the next reveal', async () => {
  const element = makeElement(), abort = new AbortController();
  element.setAttribute('aria-busy', 'false');
  const pending = animateLuckySetup({ element, choices, finalChoice: choices[0], reducedMotion: false, duration: 100, signal: abort.signal });
  const rejection = assert.rejects(pending, { name: 'AbortError' });
  const sibling = element.ownerDocument.createElement('span'); sibling.textContent = 'Diğer içerik'; element.append(sibling);
  abort.abort(); await rejection;
  assert.equal(element.getAttribute('aria-busy'), 'false');
  assert.deepEqual(element.children, [sibling]);
  await animateLuckySetup({ element, choices, finalChoice: choices[2], reducedMotion: true });
  assert.equal(element.children[0].dataset.state, 'complete');
});

test('an already aborted request and an unknown final choice leave the target untouched', async () => {
  const element = makeElement(), abort = new AbortController(), original = element.ownerDocument.createElement('p');
  original.textContent = 'Korunan içerik'; element.append(original); abort.abort();
  await assert.rejects(animateLuckySetup({ element, choices, finalChoice: choices[0], signal: abort.signal }), { name: 'AbortError' });
  await assert.rejects(animateLuckySetup({ element, choices, finalChoice: option('missing', 'auction') }), RangeError);
  assert.deepEqual(element.children, [original]);
});

test('same target cannot run two animations concurrently and callback errors release ownership', async () => {
  const element = makeElement(), abort = new AbortController();
  const pending = animateLuckySetup({ element, choices, finalChoice: choices[0], reducedMotion: false, duration: 100, signal: abort.signal });
  const rejection = assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(animateLuckySetup({ element, choices, finalChoice: choices[0] }), /zaten seçim/);
  abort.abort(); await rejection;
  await assert.rejects(animateLuckySetup({ element, choices, finalChoice: choices[0], reducedMotion: true, onFrame: () => { throw new Error('Callback failed'); } }), /Callback failed/);
  assert.equal(element.children.length, 0);
  assert.equal(element.getAttribute('aria-busy'), null);
  await animateLuckySetup({ element, choices, finalChoice: choices[0], reducedMotion: true });
  assert.equal(element.children[0].dataset.state, 'complete');
});
