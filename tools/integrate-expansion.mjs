// Merge reviewed development feeds. The browser still reads only veri.json.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const data = JSON.parse(await readFile(new URL('veri.json', root), 'utf8'));
const canonicalName = name => name.normalize('NFC').trim().toLocaleLowerCase('tr');
for (const filename of ['expansion-football.json', 'expansion-menu.json', 'expansion-culture.json']) {
  const feed = JSON.parse(await readFile(new URL(`tools/${filename}`, root), 'utf8'));
  for (const [datasetId, additions] of Object.entries(feed)) {
    const pool = data[datasetId] ||= [];
    for (const card of additions) {
      const existing = pool.find(value => value.id === card.id);
      if (existing && datasetId === 'turkiye-efsaneleri') {
        // These same players now wear their historic Turkey club colours.
        // Their stable ID/name/image path cannot be reassigned to someone else.
        for (const key of ['id', 'isim', 'gorsel', 'etiket']) assert.equal(existing[key], card[key], `${datasetId}/${card.id}: kart kimliği değiştirilemez.`);
      } else if (existing) assert.deepEqual(existing, card, `${datasetId}/${card.id}: eski kart değiştirilemez.`);
      else pool.push(card);
    }
    assert.equal(new Set(pool.map(card => card.id)).size, pool.length, `${datasetId}: tekrar eden ID.`);
    assert.equal(new Set(pool.map(card => canonicalName(card.isim))).size, pool.length, `${datasetId}: tekrar eden isim.`);
  }
}

const turkeyIcons = JSON.parse(await readFile(new URL('tools/turkey-icons.json', root), 'utf8'))['turkiye-efsaneleri'];
assert.equal(turkeyIcons.length, 120);
const iconsById = new Map(turkeyIcons.map(card => [card.id, card]));
for (const old of data['turkiye-efsaneleri']) {
  const revised = iconsById.get(old.id);
  assert.ok(revised, `Türkiye kartı silinemez: ${old.id}`);
  for (const key of ['id', 'isim', 'gorsel', 'etiket']) assert.equal(revised[key], old[key], `${old.id}: kart kimliği değiştirilemez.`);
}
data['turkiye-efsaneleri'] = turkeyIcons;

for (const filename of ['world-stars-extra.json', 'culture-extra.json', 'nostalgia-sets.json', 'games-geo.json']) {
  const feed = JSON.parse(await readFile(new URL(`tools/${filename}`, root), 'utf8'));
  for (const [datasetId, additions] of Object.entries(feed)) {
    const pool = data[datasetId] ||= [];
    for (const card of additions) {
      const existing = pool.find(value => value.id === card.id);
      if (existing) assert.deepEqual(existing, card, `${datasetId}/${card.id}: eski kart değiştirilemez.`);
      else pool.push(card);
    }
  }
}
const expected = { futbol: 100, superlig: 100, tatli: 100, yemek: 100, dizi: 50, film: 50,
  'turkiye-efsaneleri': 120, 'dunya-yildizlari': 100, 'yerli-sanatcilar': 100, 'ankara-ilceleri': 25, icecek: 50, 'istanbul-ilceleri': 39,
  'cocukluk-cizgifilmleri': 35, 'doksanlar-nostalji': 35, 'kantin-bakkal': 35,
  'turkiye-sehirleri': 81, 'oyun-evreni': 100, ulkeler: 80 };
assert.deepEqual(Object.keys(data).sort(), Object.keys(expected).sort());
for (const [key, count] of Object.entries(expected)) {
  assert.equal(data[key].length, count, key);
  assert.equal(new Set(data[key].map(card => card.id)).size, count, `${key}: tekrar eden ID.`);
  assert.equal(new Set(data[key].map(card => canonicalName(card.isim))).size, count, `${key}: tekrar eden isim.`);
}
await writeFile(new URL('veri.json', root), JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('18 koleksiyon ve 1300 kart tek veri.json dosyasına birleştirildi.');
