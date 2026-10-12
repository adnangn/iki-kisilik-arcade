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
      if (existing) assert.deepEqual(existing, card, `${datasetId}/${card.id}: eski kart değiştirilemez.`);
      else pool.push(card);
    }
    assert.equal(new Set(pool.map(card => card.id)).size, pool.length, `${datasetId}: tekrar eden ID.`);
    assert.equal(new Set(pool.map(card => canonicalName(card.isim))).size, pool.length, `${datasetId}: tekrar eden isim.`);
  }
}
const expected = { futbol: 100, superlig: 100, tatli: 100, yemek: 100, dizi: 50, film: 50,
  'turkiye-efsaneleri': 50, 'dunya-yildizlari': 50, 'yerli-sanatcilar': 50, 'ankara-ilceleri': 25, icecek: 50 };
assert.deepEqual(Object.keys(data).sort(), Object.keys(expected).sort());
for (const [key, count] of Object.entries(expected)) assert.equal(data[key].length, count, key);
await writeFile(new URL('veri.json', root), JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('11 koleksiyon ve 725 kart tek veri.json dosyasına birleştirildi.');
