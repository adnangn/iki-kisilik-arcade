import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { splitCollections, activeConsolationCards } from '../js/consolation.js';
import { resolveDatasetId, DATASET_GROUPS } from '../js/datasets.js';
import { draftTriplets } from '../js/game-setup.js';

const root = new URL('../', import.meta.url);
const { datasets, consolationDatasets } = splitCollections(JSON.parse(await readFile(new URL('veri.json', root), 'utf8')));
const collections = {
  'tatil-rotalari': ['ankara', 200001], 'efsane-otomobiller': ['otomobil', 201001],
  'sokak-lezzetleri': ['yemek', 202001], 'tv-yarismalari': ['dizi', 203001], 'ikonik-mekanlar': ['ankara', 204001]
};

test('five new collections each offer forty distinct cards and eight separate auction consolation cards', () => {
  const allNewIds = new Set();
  for (const [id, [category, first]] of Object.entries(collections)) {
    const cards = datasets[id], reserve = activeConsolationCards(consolationDatasets[id]);
    assert.equal(cards?.length, 40, id);
    assert.equal(new Set(cards.map(card => card.isim)).size, 40, id);
    assert.deepEqual(cards.map(card => card.id), Array.from({ length: 40 }, (_, index) => first + index), id);
    assert.equal(reserve.length, 8, id);
    assert.equal(new Set(reserve.map(card => card.isim)).size, 8, id);
    for (const card of cards) {
      assert.ok(!allNewIds.has(card.id), `${id}/${card.id}`); allNewIds.add(card.id);
      assert.ok(!reserve.some(entry => entry.id === card.id));
    }
    assert.equal(resolveDatasetId(category, id), id);
    assert.equal(Object.values(DATASET_GROUPS).filter(group => group.sets.some(set => set.id === id)).length, 1);
  }
  assert.equal(allNewIds.size, 200);
});

test('new collection artwork is local pixel SVG and every collection supports eleven same-tag draft trios', async () => {
  for (const id of Object.keys(collections)) {
    const cards = datasets[id], byId = new Map(cards.map(card => [card.id, card]));
    const triplets = draftTriplets(cards, () => 0);
    assert.equal(triplets.length, 11, id);
    for (const trio of triplets) {
      assert.equal(new Set(trio.cards).size, 3, id);
      assert.ok(trio.cards.every(cardId => byId.get(cardId)?.etiket === trio.etiket), id);
    }
    for (const card of [...cards, ...consolationDatasets[id]]) {
      assert.match(card.gorsel, /^assets\/images\/[a-z0-9-]+\/[a-z0-9-]+\.svg$/);
      const svg = await readFile(new URL(card.gorsel, root), 'utf8');
      assert.match(svg, /shape-rendering="crispEdges"/);
      assert.match(svg, /<title\b/);
      assert.doesNotMatch(svg, /<script|<foreignObject|(?:href|src)\s*=\s*["'](?:https?:|\/\/)|url\(\s*["']?(?:https?:|\/\/)/i);
    }
  }
});
