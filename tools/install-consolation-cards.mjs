import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { CONSOLATION_DATASET_IDS, consolationRange, playableCollections } from '../js/consolation.js';

const target = new URL('../veri.json', import.meta.url);
const normal = playableCollections(JSON.parse(await readFile(target, 'utf8')));
const additions = JSON.parse(await readFile(new URL('./consolation-cards.json', import.meta.url), 'utf8'));
assert.deepEqual(Object.keys(additions).sort(), [...CONSOLATION_DATASET_IDS].sort());
assert.deepEqual(Object.keys(normal).sort(), [...CONSOLATION_DATASET_IDS].sort());
for (const id of CONSOLATION_DATASET_IDS) {
  const cards = additions[id], range = consolationRange(id);
  assert.equal(cards.length, 10, `${id}: tam 10 teselli kartı gerekli.`);
  assert.equal(new Set(cards.map(card => card.id)).size, 10);
  for (const card of cards) {
    assert.ok(Number.isInteger(card.id) && card.id >= range.min && card.id <= range.max && card.teselli === true);
    assert.ok(!normal[id].some(entry => entry.id === card.id));
    assert.ok(card.isim?.trim() && card.etiket?.trim());
    assert.match(card.gorsel, /^assets\/images\/consolation\/[a-z0-9-]+\.svg$/);
    assert.match(await readFile(new URL('../' + card.gorsel, import.meta.url), 'utf8'), /shape-rendering="crispEdges"/);
  }
}
const result = Object.fromEntries(Object.entries(normal).map(([id, cards]) => [id, [...cards, ...additions[id]]]));
await writeFile(target, JSON.stringify(result, null, 2) + '\n');
console.log(`Teselli havuzları eklendi: ${CONSOLATION_DATASET_IDS.length} koleksiyon × 10 kart. Normal kartlar korunuyor.`);
