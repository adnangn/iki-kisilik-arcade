import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Runtime assets contain paths and rectangles only. The development snapshot
// stores the sampled official portrait pixels, so regeneration is offline and
// reproducible. --refresh explicitly retrieves the pinned official Riot patch.
const root = new URL('../', import.meta.url);
const sourceFile = new URL('tools/lol-champions-sources.json', root);
const feedFile = new URL('tools/lol-champions.json', root);
const version = '16.20.1';
const dataUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
const rosterUrl = 'https://www.leagueoflegends.com/en-us/champions/';
const classNames = {
  Fighter: 'Dövüşçü', Mage: 'Büyücü', Marksman: 'Nişancı',
  Assassin: 'Suikastçı', Tank: 'Tank', Support: 'Destek'
};
const officialProfileAliases = { Wukong: 'monkeyking', 'Nunu & Willump': 'nunu', 'Renata Glasc': 'renata' };
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const escapeXml = value => value.replace(/[<>&"']/g, character => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
}[character]));

async function retrieve(url) {
  const response = await fetch(url);
  assert(response.ok, `${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function getSharp() {
  const require = createRequire(import.meta.url);
  try { return require('sharp'); } catch {
    assert(process.env.ARCADE_SHARP_PATH, 'Set ARCADE_SHARP_PATH for --refresh/--audit; normal regeneration needs no dependency.');
    return require(process.env.ARCADE_SHARP_PATH);
  }
}

function quantizePixels(pixels, colourCount = 32) {
  const points = Array.from({ length: pixels.length / 3 }, (_, index) => ({
    index, rgb: [...pixels.subarray(index * 3, index * 3 + 3)]
  }));
  const measure = bucket => {
    const ranges = [0, 1, 2].map(axis => Math.max(...bucket.map(point => point.rgb[axis])) - Math.min(...bucket.map(point => point.rgb[axis])));
    return { axis: ranges.indexOf(Math.max(...ranges)), range: Math.max(...ranges) };
  };
  const buckets = [points];
  while (buckets.length < colourCount) {
    const choices = buckets.map((bucket, index) => ({ index, length: bucket.length, ...measure(bucket) }))
      .filter(choice => choice.length > 1 && choice.range > 0)
      .sort((a, b) => b.range * Math.sqrt(b.length) - a.range * Math.sqrt(a.length));
    if (!choices.length) break;
    const { index, axis } = choices[0];
    const bucket = buckets[index].sort((a, b) => a.rgb[axis] - b.rgb[axis] || a.index - b.index);
    const midpoint = Math.floor(bucket.length / 2);
    buckets.splice(index, 1, bucket.slice(0, midpoint), bucket.slice(midpoint));
  }
  const indexes = new Uint8Array(points.length);
  const palette = buckets.map((bucket, index) => {
    bucket.forEach(point => { indexes[point.index] = index; });
    return `#${[0, 1, 2].map(axis => Math.round(bucket.reduce((sum, point) => sum + point.rgb[axis], 0) / bucket.length)
      .toString(16).padStart(2, '0')).join('')}`;
  });
  return { palette, indexes };
}

function verifyOfficialNames(champions, links) {
  const normalized = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const webNames = new Set(links.map(link => normalized(link.split('/').filter(Boolean).at(-1))));
  assert.equal(webNames.size, champions.length);
  for (const champion of champions) {
    const name = champion.name;
    assert(webNames.has(normalized(officialProfileAliases[name] || name)), `${name} not found in official website roster`);
  }
}

async function refreshedSource() {
  const sharp = getSharp();
  const [dataBytes, rosterBytes, versionsBytes] = await Promise.all([
    retrieve(dataUrl), retrieve(rosterUrl),
    retrieve('https://ddragon.leagueoflegends.com/api/versions.json')
  ]);
  const data = JSON.parse(dataBytes);
  const champions = Object.values(data.data).sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base', ignorePunctuation: true }));
  assert.equal(champions.length, 173, 'Review the pinned roster before changing the card ID mapping.');
  const officialLinks = [...new Set([...rosterBytes.toString().matchAll(/href="([^"\s]*\/champions\/[^"\s]+)"/g)]
    .map(match => match[1]).filter(link => /\/champions\/[^/]+\/?$/.test(link)))];
  assert.equal(officialLinks.length, 173, 'Official champion page count must match Data Dragon.');
  verifyOfficialNames(champions, officialLinks);
  const latestVersion = JSON.parse(versionsBytes)[0];
  const snapshots = new Array(champions.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < champions.length) {
      const index = cursor++;
      const champion = champions[index];
      const portraitUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.image.full}`;
      const portraitBytes = await retrieve(portraitUrl);
      // Thirty 3px cells form a 90px portrait inside the 96px soft arcade frame.
      // Each palette comes from this champion's official icon, never a random
      // face template. Moderate saturation makes the existing pastel UI fit.
      const pixels = await sharp(portraitBytes).extract({ left: 4, top: 4, width: 112, height: 112 })
        .resize(30, 30, { kernel: 'lanczos3' }).modulate({ brightness: 1.13, saturation: 0.82 })
        .removeAlpha().raw().toBuffer();
      const { palette, indexes } = quantizePixels(pixels);
      assert.equal(indexes.length, 900);
      assert(palette.length <= 32, `${champion.name} palette has ${palette.length} colours`);
      snapshots[index] = {
        cardId: 18001 + index, riotId: champion.id, riotKey: champion.key,
        name: champion.name, title: champion.title, riotTags: champion.tags,
        portraitUrl, portraitSha256: sha256(portraitBytes),
        palette, pixelsBase64: Buffer.from(indexes).toString('base64')
      };
    }
  }));
  return {
    dataset: 'lol-sampiyonlari', title: 'LoL Şampiyonları',
    checkedOn: new Date().toISOString().slice(0, 10), pinnedPatch: version,
    latestPatchWhenChecked: latestVersion,
    rosterCount: champions.length,
    officialChampionPage: { url: rosterUrl, count: officialLinks.length, links: officialLinks.sort(), sha256: sha256(rosterBytes) },
    officialChampionData: { url: dataUrl, count: champions.length, sha256: sha256(dataBytes) },
    officialVersions: 'https://ddragon.leagueoflegends.com/api/versions.json',
    documentation: 'https://developer.riotgames.com/docs/lol#data-dragon',
    comparison: 'Both official sources contain exactly the same 173 champion names, after accounting for official profile URL aliases (Wukong: monkeyking; Nunu & Willump: nunu; Renata Glasc: renata). Locke, Yunara and Zaahen are included.',
    officialProfileAliases,
    attribution: 'Champion names and source portrait artwork © Riot Games. These local SVG pixel mosaics are derived from official Data Dragon champion icons. This arcade project is not endorsed by Riot Games.',
    artworkMethod: '30×30 sampled official champion icon, 32-colour palette, softened saturation, 3px rectangular cells and pastel 96px frame. These are faithful pixel adaptations of Riot artwork, not independently invented portraits.',
    classMapping: classNames,
    identityPolicy: 'IDs 18001–18173 correspond to this pinned alphabetic snapshot. Future additions must append IDs, never renumber existing champions.',
    champions: snapshots
  };
}

function portraitSvg(champion) {
  const pixels = Buffer.from(champion.pixelsBase64, 'base64');
  assert.equal(pixels.length, 900);
  const colourPaths = champion.palette.map(() => []);
  for (let row = 0; row < 30; row++) {
    for (let col = 0; col < 30;) {
      const paletteIndex = pixels[row * 30 + col];
      assert(paletteIndex < colourPaths.length);
      let end = col + 1;
      while (end < 30 && pixels[row * 30 + end] === paletteIndex) end++;
      const x = col * 3 + 3;
      const y = row * 3 + 3;
      const width = (end - col) * 3;
      colourPaths[paletteIndex].push(`M${x} ${y}h${width}v3h-${width}z`);
      col = end;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" shape-rendering="crispEdges" role="img" aria-label="${escapeXml(champion.name)} piksel portresi"><title>${escapeXml(champion.name)}</title><rect width="96" height="96" fill="#e9dec7"/><rect x="1" y="1" width="94" height="94" fill="#786382"/>${colourPaths.map((paths, index) => paths.length ? `<path fill="${champion.palette[index]}" d="${paths.join('')}"/>` : '').join('')}<path fill="#f1e6ce" d="M0 0h96v1H0zM0 0h1v96H0z"/><path fill="#b3a0b7" d="M0 95h96v1H0zM95 0h1v96h-1z"/></svg>\n`;
}

let source;
if (process.argv.includes('--refresh')) {
  source = await refreshedSource();
  await writeFile(sourceFile, `${JSON.stringify(source, null, 2)}\n`);
} else {
  source = JSON.parse(await readFile(sourceFile, 'utf8'));
}
assert.equal(source.dataset, 'lol-sampiyonlari');
assert.equal(source.champions.length, 173);
verifyOfficialNames(source.champions, source.officialChampionPage.links);
assert.equal(new Set(source.champions.map(champion => champion.name)).size, 173);
assert.equal(new Set(source.champions.map(champion => champion.cardId)).size, 173);
const cards = source.champions.map(champion => {
  assert(classNames[champion.riotTags[0]], `Unknown primary class ${champion.name}`);
  return {
    id: champion.cardId, isim: champion.name,
    gorsel: `assets/images/lol/${slug(champion.name)}.svg`,
    etiket: classNames[champion.riotTags[0]], evren: 'League of Legends',
    tip: 'karakter', riotId: champion.riotId, riotSiniflar: champion.riotTags
  };
});
assert.equal(new Set(cards.map(card => card.gorsel)).size, 173);
await mkdir(new URL('assets/images/lol/', root), { recursive: true });
for (let index = 0; index < cards.length; index++) {
  const svg = portraitSvg(source.champions[index]);
  assert(!/<(?:script|image|foreignObject)\b|(?:xlink:)?href\s*=|on\w+\s*=/i.test(svg));
  await writeFile(new URL(cards[index].gorsel, root), svg);
}
await writeFile(feedFile, `${JSON.stringify({ 'lol-sampiyonlari': cards }, null, 2)}\n`);
if (process.argv.includes('--audit')) {
  const sharp = getSharp();
  const hashes = [];
  for (const card of cards) {
    const svg = await readFile(new URL(card.gorsel, root));
    const raster = await sharp(svg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(raster.info.width, 96);
    assert.equal(raster.info.height, 96);
    hashes.push(sha256(raster.data));
  }
  assert.equal(new Set(hashes).size, 173, 'Every champion needs a distinct portrait.');
}
console.log(JSON.stringify({ collection: 'lol-sampiyonlari', count: cards.length,
  classes: Object.fromEntries(Object.values(classNames).map(label => [label, cards.filter(card => card.etiket === label).length])),
  assets: cards.length, patch: source.pinnedPatch, audit: process.argv.includes('--audit') }));
