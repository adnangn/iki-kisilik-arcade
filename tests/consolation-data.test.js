import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CONSOLATION_DATASET_IDS, CONSOLATION_POOL_SIZE, activeConsolationCards, consolationRange,
  splitCollections, playableCollections } from '../js/consolation.js';
import { shuffledIds, draftTriplets } from '../js/game-setup.js';
import { createPartyGame, partyCards } from '../js/party-games.js';
import { createCooperative } from '../js/cooperative.js';

const root = new URL('../', import.meta.url);
const raw = JSON.parse(await readFile(new URL('veri.json', root), 'utf8'));
const { datasets, consolationDatasets } = splitCollections(raw);
const baseline = {
  futbol: [100, '810cd07c0f073f0627d4fb836a4eb81952889b0ac5a18b2b8582f608b4012f8c'],
  superlig: [100, 'a3135485d9857991c4beb38be69805b49c59c6384647730fd03dbe0886c86121'],
  tatli: [100, '23f1736e084e9746847d2b7bbae7e815b0d3eebb0cbb962b951e79fb6e5453ba'],
  yemek: [100, 'd7bffc8416d12bc1d5751997525e12ef15822f01f2884d75d6081e984dd7e41f'],
  dizi: [50, '82df4fdcd85314d196b62f81870246a7422df948a7d57c81a3869346983b7d0e'],
  film: [50, 'f8876eed2dbdc4fb8b6f0e37c49c6c67c37758a31e497336cb12b400082e4256'],
  'turkiye-efsaneleri': [120, '2bacff4e21aa2c3d40de4af3639a8c5e79ef281b189c4d327be74085f1c361ba'],
  'dunya-yildizlari': [100, '4b8ce77c0d32ee4d2ec3c9eb652ff6de2d2d2cb382ba6ed3cac492bc5c7f3ea0'],
  icecek: [50, '1e7fd827916bcb2f54e9f76839652ff3675912deda4c484ce30e8c95dc39e86a'],
  'yerli-sanatcilar': [100, '14f5468418e5290c057aebb5bfa1a74cc4413fd2c5c35251dabe5907ca2ab3f4'],
  'ankara-ilceleri': [25, 'd6d1bcb80427455ac965af05a4811ae6a56b08ebf1da11ecb401e17646e420b8'],
  'istanbul-ilceleri': [39, 'e8eee57754482f6c9d2a5106d75afcd0fb6930f0363504ce823aa743f446d074'],
  'cocukluk-cizgifilmleri': [60, '68dcd3c8b3afc510506a8003b7f87fa7ba6532a9623ed65fce85269ccd009b68'],
  'doksanlar-nostalji': [35, '52d3608bd66d26e834b92dd09c2a34eb97b34f5a8e39962d03a502ab8f96fadd'],
  'kantin-bakkal': [35, 'b43113f4076b1ecaf0c8a662dcc0b6d906dd25a0d56bd970f040a2dec5879cbd'],
  'turkiye-sehirleri': [81, 'd3dc3e779169cd5aeb2a63637ac5e4e1e0cea26991e5942bd6a291901217da05'],
  'oyun-evreni': [100, 'd5561d254ca160139bfc31ec6eef909e1164aa3fb6dfec9d06e61070870d7221'],
  ulkeler: [80, '42db8240b8f34b21ea1e5e6b23e07cb16a5290bcdc5a0a4488700eee57dc66c9'],
  'tatli-vol1': [35, 'ad2446ff4714808b49916b8d6a81333d5306fbc147f7e80ec42d51daeba9a947'],
  'yemek-vol1': [50, 'e41a3263dcdb7564a123e47eb3060f152926f9239ab7476f9045839d70d2dee0'],
  'oyun-karakterleri': [60, 'c30f19f7d87455c7590d3ecbf5618001d24354cbac3cd95565ad2fdf84eca872'],
  oyunlar: [40, '5e85f53fe5ec76270cb2e32dbe99db32cbd261f91696c2f9dc9a6be2e7c2c0d1'],
  'valorant-ajanlari': [29, 'a698c257c2403b7e013973cd2b05e612adec83dcb8db0ab1f6a521c63c946bde'],
  'lol-sampiyonlari': [173, '8d1e2e33d38e1bdd10e4c6313c1f6f865ba7a4372702913ddd8e0b88ed7b36f8']
};

test('all original 24 collections retain their exact normal card records and ordering', () => {
  assert.ok(Object.keys(baseline).every(id => Object.hasOwn(datasets, id)));
  let count = 0;
  for (const [id, [length, digest]] of Object.entries(baseline)) {
    assert.equal(datasets[id].length, length, id);
    assert.equal(createHash('sha256').update(JSON.stringify(datasets[id])).digest('hex'), digest, id);
    assert.ok(datasets[id].every(card => card.teselli !== true), id);
    count += length;
  }
  assert.equal(count, 1712);
});

test('each collection has eight active consolation cards while retaining all ten saved-room identities', () => {
  assert.deepEqual(CONSOLATION_DATASET_IDS, [
    'futbol', 'superlig', 'turkiye-efsaneleri', 'dunya-yildizlari',
    'tatli-vol1', 'tatli', 'yemek-vol1', 'yemek', 'icecek',
    'dizi', 'film', 'yerli-sanatcilar',
    'ankara-ilceleri', 'istanbul-ilceleri', 'turkiye-sehirleri', 'ulkeler',
    'cocukluk-cizgifilmleri', 'doksanlar-nostalji', 'kantin-bakkal',
    'oyunlar', 'oyun-karakterleri', 'valorant-ajanlari', 'lol-sampiyonlari', 'oyun-evreni',
    'tatil-rotalari', 'efsane-otomobiller', 'sokak-lezzetleri', 'tv-yarismalari', 'ikonik-mekanlar'
  ]);
  assert.equal(CONSOLATION_POOL_SIZE, 8);
  assert.deepEqual([...CONSOLATION_DATASET_IDS].sort(), Object.keys(raw).sort());
  const all = [];
  for (const id of CONSOLATION_DATASET_IDS) {
    const cards = consolationDatasets[id];
    const { min, max } = consolationRange(id);
    assert.equal(min, 900001 + CONSOLATION_DATASET_IDS.indexOf(id) * 10, id);
    assert.equal(cards.length, 10, id);
    assert.equal(activeConsolationCards(cards).length, 8, id);
    assert.deepEqual(activeConsolationCards(cards).map(card => card.id), Array.from({ length: 8 }, (_, index) => min + index), id);
    assert.equal(cards.filter(card => card.teselliArsiv === true).length, 2, id);
    assert.equal(max - min + 1, 10, id);
    assert.deepEqual(cards.map(card => card.id).sort((a, b) => a - b), Array.from({ length: 10 }, (_, i) => min + i), id);
    assert.equal(new Set(cards.map(card => card.isim)).size, 10, id);
    assert.equal(new Set(cards.map(card => card.gorsel)).size, 10, id);
    for (const card of cards) {
      assert.equal(card.teselli, true, `${id}/${card.id}`);
      assert.ok(typeof card.isim === 'string' && card.isim.trim().length > 0, `${id}/${card.id}`);
      assert.ok(typeof card.etiket === 'string' && card.etiket.trim().length > 0, `${id}/${card.id}`);
      assert.ok(!datasets[id].some(normal => normal.id === card.id), `${id}/${card.id}`);
    }
    all.push(...cards);
  }
  assert.equal(all.length, 290);
  assert.equal(new Set(all.map(card => card.id)).size, 290);
  assert.throws(() => consolationRange('unknown'));
});

test('requested real series, films, musicians and foods replace fictional consolation placeholders', () => {
  const names = id => activeConsolationCards(consolationDatasets[id]).map(card => card.isim);
  for (const name of ['Selena', 'Akasya Durağı', 'Bez Bebek', 'Deniz Yıldızı', 'Hepsi 1']) assert.ok(names('dizi').includes(name), name);
  for (const name of ['Cumali Ceber: Allah Seni Alsın', 'Laz Kit', "Keloğlan Kara Prens'e Karşı", 'Çılgın Dersane', 'Dünyayı Kurtaran Adamın Oğlu']) assert.ok(names('film').includes(name), name);
  assert.ok(names('yerli-sanatcilar').includes('Ajdar'));
  for (const id of ['yemek', 'yemek-vol1']) for (const name of ['Pırasa Haşlama', 'Çiğ Bamya']) assert.ok(names(id).includes(name), `${id}/${name}`);
  for (const name of ['Özetin Özeti', 'Kamera Kapağı', 'Duş Konseri', 'Valizistan', 'Dünkü Makarna', 'Boş Şarjör']) assert.ok(!Object.values(consolationDatasets).flat().some(card => card.isim === name), name);
});

test('every consolation card renders from a safe local crisp SVG without remote dependencies', async () => {
  for (const [id, cards] of Object.entries(consolationDatasets)) {
    for (const card of cards) {
      assert.match(card.gorsel, /^assets\/images\/consolation\/[a-z0-9-]+\.svg$/, `${id}/${card.id}`);
      const image = await readFile(new URL(card.gorsel, root), 'utf8');
      assert.match(image, /<svg\b/);
      assert.match(image, /shape-rendering="crispEdges"/);
      assert.doesNotMatch(image, /<script|<foreignObject|(?:href|src)\s*=\s*["'](?:https?:|\/\/)|url\(\s*["']?(?:https?:|\/\/)/i);
    }
  }
});

test('Sabri Sarıoğlu is available in the legends consolation pool without changing the normal legend list', () => {
  assert.ok(consolationDatasets.futbol.some(card => card.isim === 'Sabri Sarıoğlu'));
  assert.ok(!datasets.futbol.some(card => card.isim === 'Sabri Sarıoğlu'));
});

test('splitting collections preserves source objects and includes only explicit true flags in the reserve', () => {
  const normal = { id: 1, teselli: false }, legacy = { id: 2 }, lookalike = { id: 3, teselli: 'true' }, reserve = { id: 4, teselli: true };
  const input = { sample: [normal, legacy, lookalike, reserve] };
  const before = structuredClone(input);
  const split = splitCollections(input);
  assert.deepEqual(input, before);
  assert.deepEqual(split.datasets.sample, [normal, legacy, lookalike]);
  assert.deepEqual(split.consolationDatasets.sample, [reserve]);
  assert.equal(split.datasets.sample[0], normal);
  assert.equal(split.consolationDatasets.sample[0], reserve);
  assert.deepEqual(playableCollections(input), split.datasets);
  assert.deepEqual(activeConsolationCards([normal, lookalike, reserve, { id: 5, teselli: true, teselliArsiv: true }]), [reserve]);
  assert.throws(() => splitCollections({ invalid: null }));
});

test('normal setup, every party game, and paired games exclude consolation cards from candidates and ordinary decks', () => {
  for (const [id, cards] of Object.entries(playableCollections(raw))) {
    const reserve = new Set(consolationDatasets[id].map(card => card.id));
    const deck = shuffledIds(cards, () => 0);
    assert.ok(deck.every(cardId => !reserve.has(cardId)), id);
    assert.ok(draftTriplets(cards, () => 0).flatMap(trio => trio.cards).every(cardId => !reserve.has(cardId)), id);
    for (const mode of ['auction', 'sealed-auction', 'simultaneous-ranking', 'telepathy', 'detective', 'chameleon']) {
      const game = createPartyGame(mode, { seats: mode === 'chameleon' ? ['p1', 'p2', 'p3'] : ['p1', 'p2'], deck });
      assert.ok(game.deck.every(cardId => !reserve.has(cardId)), `${id}/${mode}`);
      assert.ok(partyCards(game).every(cardId => !reserve.has(cardId)), `${id}/${mode}`);
      assert.equal(game.completionDeck, undefined, `${id}/${mode}`);
    }
    for (const mode of ['frequency', 'double-ranking']) {
      const game = createCooperative(mode, deck);
      assert.ok(game.deck.every(cardId => !reserve.has(cardId)), `${id}/${mode}`);
    }
  }
});
