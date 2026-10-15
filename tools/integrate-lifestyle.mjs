import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { playableCollections } from '../js/consolation.js';

const root = new URL('../', import.meta.url), target = new URL('veri.json', root);
const current = JSON.parse(await readFile(target, 'utf8'));
const normal = playableCollections(current);
const ranges = { 'tatil-rotalari': 200001, 'efsane-otomobiller': 201001, 'sokak-lezzetleri': 202001, 'tv-yarismalari': 203001, 'ikonik-mekanlar': 204001 };
const additions = Object.assign({}, ...await Promise.all(['tools/lifestyle-travel-cars.json', 'tools/lifestyle-culture.json'].map(async path => JSON.parse(await readFile(new URL(path, root), 'utf8')))));
assert.deepEqual(Object.keys(additions).sort(), Object.keys(ranges).sort());
const originalIds = new Set(Object.entries(normal).filter(([id]) => !Object.hasOwn(ranges, id)).flatMap(([, cards]) => cards.map(card => card.id)));
for (const [id, first] of Object.entries(ranges)) {
  const cards = additions[id];
  assert.equal(cards.length, 40, `${id}: 40 kart gerekli.`);
  assert.equal(new Set(cards.map(card => card.isim)).size, 40, `${id}: isim tekrarı.`);
  assert.deepEqual(cards.map(card => card.id), Array.from({ length: 40 }, (_, index) => first + index), `${id}: kimlik sırası.`);
  for (const card of cards) {
    assert.ok(!originalIds.has(card.id) && card.teselli !== true, `${id}/${card.id}: kimlik çakışması.`);
    assert.ok(card.isim?.trim() && card.etiket?.trim());
    assert.match(card.gorsel, new RegExp(`^assets/images/${id}/[a-z0-9-]+\\.svg$`));
    await readFile(new URL(card.gorsel, root));
  }
  if (normal[id]) assert.deepEqual(normal[id], cards, `${id}: mevcut kayıtlar değiştirilemez.`);
  current[id] = [...cards, ...(current[id] || []).filter(card => card.teselli === true)];
}
await writeFile(target, JSON.stringify(current, null, 2) + '\n');
console.log('Beş yeni koleksiyon eklendi: 5 × 40 kart. Mevcut kartlar korundu.');
