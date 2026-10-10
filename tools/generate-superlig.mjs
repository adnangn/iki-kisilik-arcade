import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Original rectangle-only sprites in the same 96 × 96 style as the existing
// football assets. These are representative drawings, not photographic likenesses.
// Run: node tools/generate-superlig.mjs [tools/superlig-cards.json]
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = path.resolve(projectRoot, process.argv[2] || 'tools/superlig-cards.json');
const assetRoot = path.join(projectRoot, 'assets', 'images', 'superlig');

const CLUBS = {
  galatasaray: { primary: '#eaba3d', secondary: '#ab4745', pattern: 'halves' },
  fenerbahce: { primary: '#edca52', secondary: '#364d73', pattern: 'stripes' },
  besiktas: { primary: '#e8e5d6', secondary: '#424249', pattern: 'stripes' },
  trabzonspor: { primary: '#6091a6', secondary: '#87424e', pattern: 'stripes' },
  samsunspor: { primary: '#bc4a49', secondary: '#f0e9d4', pattern: 'stripes' },
  goztepe: { primary: '#e5bf44', secondary: '#b14c43', pattern: 'halves' },
  caykurrizespor: { primary: '#43956e', secondary: '#486f9e', pattern: 'stripes' },
  rizespor: { primary: '#43956e', secondary: '#486f9e', pattern: 'stripes' },
  basaksehir: { primary: '#df884f', secondary: '#405c79', pattern: 'plain' },
  konyaspor: { primary: '#ebe8d2', secondary: '#52875e', pattern: 'stripes' },
  kasimpasa: { primary: '#637fab', secondary: '#ece4d3', pattern: 'stripes' },
  kayserispor: { primary: '#e3b748', secondary: '#b34e42', pattern: 'halves' },
  antalyaspor: { primary: '#e9e5d5', secondary: '#b84949', pattern: 'stripes' },
  alanyaspor: { primary: '#df9656', secondary: '#6e9265', pattern: 'stripes' },
  gaziantep: { primary: '#b74d4a', secondary: '#3f4649', pattern: 'stripes' },
  gaziantepfk: { primary: '#b74d4a', secondary: '#3f4649', pattern: 'stripes' },
  genclerbirligi: { primary: '#aa494a', secondary: '#3f4248', pattern: 'stripes' },
  kocaelispor: { primary: '#56956b', secondary: '#3e4946', pattern: 'stripes' },
  amed: { primary: '#b6504b', secondary: '#4b8d70', pattern: 'stripes' },
  eyupspor: { primary: '#96688e', secondary: '#e2bc4e', pattern: 'plain' },
  karagumruk: { primary: '#b74d4a', secondary: '#43464b', pattern: 'stripes' },
};

const SKINS = ['#e1b990', '#d5a37b', '#c49370', '#ad7e59', '#906446', '#78543f'];
const HAIRS = ['#3d3a38', '#514236', '#6a5141', '#89704f', '#bb995d', '#d0b473'];
const HAIR_STYLES = ['short', 'fade', 'quiff', 'curly', 'buzz', 'sidepart'];
const BEARDS = ['none', 'none', 'stubble', 'short', 'goatee'];

// Hand-tuned cues distinguish familiar players while keeping the artwork stylized.
const LOOKS = {
  'gunay-guvenc': { skin: 0, hair: 1, style: 'short', beard: 'full' },
  'eren-elmali': { skin: 1, hair: 0, style: 'quiff', beard: 'short' },
  'kaan-ayhan': { skin: 1, hair: 0, style: 'sidepart', beard: 'stubble' },
  'mario-lemina': { skin: 4, hair: 0, style: 'braids', beard: 'short' },
  'roland-sallai': { skin: 0, hair: 2, style: 'short', beard: 'stubble' },
  'wilfried-singo': { skin: 5, hair: 0, style: 'fade', beard: 'none' },
  'tiago-djalo': { skin: 4, hair: 0, style: 'fade', beard: 'short' },
  'emmanuel-agbadou': { skin: 5, hair: 0, style: 'buzz', beard: 'full' },
  'salih-ozcan': { skin: 1, hair: 0, style: 'quiff', beard: 'short' },
  'mustafa-erhan-hekimoglu': { skin: 1, hair: 0, style: 'curly', beard: 'none' },
  'irfan-can-kahveci': { skin: 1, hair: 0, style: 'quiff', beard: 'full' },
  'mert-muldur': { skin: 0, hair: 2, style: 'quiff', beard: 'stubble' },
  'mert-gunok': { skin: 0, hair: 1, style: 'sidepart', beard: 'short' },
  'ruslan-malinovskyi': { skin: 0, hair: 2, style: 'quiff', beard: 'short' },
  'batista-mendy': { skin: 5, hair: 0, style: 'fade', beard: 'short' },
  'umut-nayir': { skin: 1, hair: 1, style: 'sidepart', beard: 'full' },
  'tino-anjorin': { skin: 4, hair: 0, style: 'curly', beard: 'short' },
  'novatus-miroshi': { skin: 5, hair: 0, style: 'buzz', beard: 'none' },
  'taylan-antalyali': { skin: 1, hair: 0, style: 'quiff', beard: 'full' },
  'ibrahim-olawoyin': { skin: 5, hair: 0, style: 'fade', beard: 'none' },
  'dusan-vlahovic': { skin: 0, hair: 1, style: 'quiff', beard: 'stubble' },
  'leandro-trossard': { skin: 0, hair: 1, style: 'sidepart', beard: 'stubble' },
  'alexander-nubel': { skin: 0, hair: 3, style: 'sidepart', beard: 'none' },
  'fabio-miretti': { skin: 0, hair: 1, style: 'curly', beard: 'none' },
  'rafael-leao': { skin: 4, hair: 0, style: 'braids', beard: 'none' },
  'mason-greenwood': { skin: 3, hair: 0, style: 'fade', beard: 'none' },
  'romelu-lukaku': { skin: 5, hair: 0, style: 'buzz', beard: 'short' },
  'nathan-ake': { skin: 3, hair: 0, style: 'braids', beard: 'none' },
  'vedat-muriqi': { skin: 0, hair: 1, style: 'sidepart', beard: 'full' },
  'mohamed-salah': { skin: 2, hair: 0, style: 'curly', beard: 'full' },
  fabinho: { skin: 2, hair: 0, style: 'buzz', beard: 'short' },
  'franculino-dju': { skin: 5, hair: 0, style: 'fade', beard: 'none' },
  'dia-saba': { skin: 1, hair: 0, style: 'buzz', beard: 'short' },
  'gift-orban': { skin: 5, hair: 0, style: 'fade', beard: 'none' },
  'mbaye-diagne': { skin: 5, hair: 0, style: 'buzz', beard: 'short' },
  'samuel-ballet': { skin: 3, hair: 0, style: 'curly', beard: 'none' },
  'yira-sor': { skin: 5, hair: 0, style: 'fade', beard: 'none' },
  'rayan-raveloson': { skin: 3, hair: 0, style: 'curly', beard: 'short' },
  'umut-meras': { skin: 0, hair: 1, style: 'quiff', beard: 'short' },
  'alban-lafont': { skin: 3, hair: 0, style: 'fade', beard: 'none' },
  'eldor-shomurodov': { skin: 1, hair: 0, style: 'sidepart', beard: 'stubble' },
  'davie-selke': { skin: 2, hair: 1, style: 'fade', beard: 'short' },
  'edin-visca': { skin: 0, hair: 1, style: 'quiff', beard: 'stubble' },
  'yusuf-sari': { skin: 0, hair: 0, style: 'fade', beard: 'short' },
  'abbosbek-fayzullaev': { skin: 1, hair: 0, style: 'quiff', beard: 'none' },
  'bruno-petkovic': { skin: 0, hair: 1, style: 'sidepart', beard: 'full' },
  'dan-agyei': { skin: 5, hair: 0, style: 'fade', beard: 'short' },
  'berkan-kutlu': { skin: 0, hair: 1, style: 'quiff', beard: 'short' },
  'tobias-gulliksen': { skin: 0, hair: 4, style: 'sidepart', beard: 'none' },
  'aleksandar-jovanovic': { skin: 0, hair: 1, style: 'buzz', beard: 'full' },
  'victor-osimhen': { skin: 4, hair: 5, style: 'fade', beard: 'none', mask: true },
  'leroy-sane': { skin: 3, hair: 0, style: 'curly', beard: 'goatee' },
  'baris-alper-yilmaz': { skin: 0, hair: 2, style: 'quiff', beard: 'stubble' },
  'yunus-akgun': { skin: 0, hair: 0, style: 'fade', beard: 'short' },
  'lucas-torreira': { skin: 1, hair: 0, style: 'sidepart', beard: 'short' },
  'gabriel-sara': { skin: 2, hair: 0, style: 'curly', beard: 'short' },
  'ilkay-gundogan': { skin: 1, hair: 0, style: 'quiff', beard: 'full' },
  'davinson-sanchez': { skin: 4, hair: 0, style: 'buzz', beard: 'none' },
  'abdulkerim-bardakci': { skin: 1, hair: 0, style: 'quiff', beard: 'full' },
  'ugurcan-cakir': { skin: 0, hair: 1, style: 'quiff', beard: 'short' },
  'orkun-kokcu': { skin: 1, hair: 0, style: 'sidepart', beard: 'short' },
  'milot-rashica': { skin: 1, hair: 1, style: 'quiff', beard: 'full' },
  'wilfred-ndidi': { skin: 4, hair: 0, style: 'buzz', beard: 'short' },
  'vaclav-cerny': { skin: 0, hair: 2, style: 'buzz', beard: 'stubble' },
  'semih-kilicsoy': { skin: 1, hair: 1, style: 'fade', beard: 'none' },
  'ridvan-yilmaz': { skin: 0, hair: 2, style: 'sidepart', beard: 'stubble' },
  'emirhan-topcu': { skin: 1, hair: 0, style: 'quiff', beard: 'short' },
  'dogan-alemdar': { skin: 0, hair: 1, style: 'fade', beard: 'stubble' },
  'marco-asensio': { skin: 1, hair: 1, style: 'sidepart', beard: 'short' },
  'kerem-akturkoglu': { skin: 1, hair: 2, style: 'quiff', beard: 'full' },
  'dorgeles-nene': { skin: 4, hair: 0, style: 'braids', beard: 'none' },
  'oguz-aydin': { skin: 0, hair: 2, style: 'quiff', beard: 'stubble' },
  'ismail-yuksek': { skin: 1, hair: 1, style: 'fade', beard: 'short' },
  'ngolo-kante': { skin: 5, hair: 0, style: 'buzz', beard: 'none' },
  'matteo-guendouzi': { skin: 1, hair: 1, style: 'long-curly', beard: 'stubble' },
  'milan-skriniar': { skin: 0, hair: 2, style: 'quiff', beard: 'full' },
  'nelson-semedo': { skin: 3, hair: 0, style: 'fade', beard: 'goatee' },
  ederson: { skin: 2, hair: 0, style: 'fade', beard: 'short' },
  'paul-onuachu': { skin: 5, hair: 0, style: 'buzz', beard: 'none' },
  'ernest-muci': { skin: 0, hair: 1, style: 'quiff', beard: 'short' },
  'okay-yokuslu': { skin: 1, hair: 0, style: 'sidepart', beard: 'full' },
  'ozan-tufan': { skin: 0, hair: 1, style: 'fade', beard: 'full' },
  'stefan-savic': { skin: 1, hair: 1, style: 'sidepart', beard: 'full' },
  'mustafa-eskihellac': { skin: 1, hair: 1, style: 'quiff', beard: 'short' },
  'arseniy-batagov': { skin: 0, hair: 3, style: 'quiff', beard: 'stubble' },
  'andre-onana': { skin: 5, hair: 0, style: 'buzz', beard: 'short' },
  'mohamed-bayo': { skin: 4, hair: 0, style: 'curly', beard: 'short' },
  'emre-kilinc': { skin: 0, hair: 2, style: 'sidepart', beard: 'full' },
  'yalcin-kayan': { skin: 1, hair: 0, style: 'quiff', beard: 'stubble' },
  'strahinja-erakovic': { skin: 0, hair: 2, style: 'sidepart', beard: 'short' },
  'okan-kocuk': { skin: 0, hair: 1, style: 'fade', beard: 'short' },
  juan: { skin: 3, hair: 0, style: 'curly', beard: 'none' },
  'efkan-bekiroglu': { skin: 1, hair: 0, style: 'quiff', beard: 'full' },
  'taha-altikardes': { skin: 0, hair: 2, style: 'sidepart', beard: 'stubble' },
  'malcom-bokele': { skin: 4, hair: 0, style: 'fade', beard: 'goatee' },
  'luka-gugeshashvili': { skin: 0, hair: 1, style: 'short', beard: 'short' },
  'ali-sowe': { skin: 5, hair: 0, style: 'braids', beard: 'none' },
  'ahmed-kutucu': { skin: 1, hair: 2, style: 'fade', beard: 'short' },
  'dal-varesanovic': { skin: 0, hair: 0, style: 'sidepart', beard: 'stubble' },
  'attila-mocsi': { skin: 0, hair: 3, style: 'quiff', beard: 'full' },
};

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

function hash(value) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

function clubKey(value) {
  return String(value).replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

function clubPalette(team) {
  const normalized = clubKey(team);
  const match = Object.entries(CLUBS).find(([key]) => normalized.includes(key));
  if (!match) throw new Error(`Forma renkleri tanımlı değil: ${team}`);
  return match[1];
}

function shade(hex, adjustment) {
  const channels = [1, 3, 5].map(offset => Math.max(0, Math.min(255, Number.parseInt(hex.slice(offset, offset + 2), 16) + adjustment)));
  return '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('');
}

function portrait(card, slug) {
  const seed = hash(slug);
  const defaults = {
    skin: seed % SKINS.length,
    hair: (seed >>> 5) % HAIRS.length,
    style: HAIR_STYLES[(seed >>> 9) % HAIR_STYLES.length],
    beard: BEARDS[(seed >>> 13) % BEARDS.length],
  };
  const look = { ...defaults, ...LOOKS[slug] };
  const palette = clubPalette(card.takim);
  const skin = SKINS[look.skin], skinShadow = shade(skin, -26), skinHighlight = shade(skin, 11);
  const hair = HAIRS[look.hair], hairShadow = shade(hair, -16), hairHighlight = shade(hair, 13);
  const goalkeeper = card.etiket === 'KL';
  const shirt = goalkeeper ? '#719b8e' : palette.primary;
  const trim = goalkeeper ? '#515277' : palette.secondary;
  const bits = [];
  const rect = (x, y, width, height, fill) => bits.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`);

  // Same softly colored pitch, crowd rows, ball, and centered bust as the originals.
  rect(0, 0, 96, 96, '#c1d4c6');
  rect(0, 16, 96, 27, '#afc1bc');
  rect(0, 22, 96, 3, '#eef0d3');
  rect(0, 34, 96, 3, '#e4e6ce');
  rect(0, 44, 96, 52, '#7da58e');
  rect(0, 68, 96, 3, '#cad9bb');
  rect(46, 44, 4, 52, '#cad9bb');
  const crowd = ['#759b99', '#bc9582', '#93a6b8'];
  for (let index = 0; index < 8; index++) rect(4 + index * 12, 27, 5, 4, crowd[(index + seed % 3) % 3]);
  rect(22, 91, 52, 5, '#608b78');

  // A square collar, colored sleeves, and a simple crest keep shirts recognizable
  // without reproducing club logos, commercial sponsors, or licensed kit art.
  rect(27, 56, 42, 34, '#354d4c');
  rect(20, 60, 12, 24, skin);
  rect(64, 60, 12, 24, skin);
  rect(20, 78, 3, 6, skinShadow);
  rect(73, 78, 3, 6, skinShadow);
  rect(23, 56, 12, 13, shirt);
  rect(61, 56, 12, 13, shirt);
  rect(31, 54, 34, 36, shirt);
  if (!goalkeeper && palette.pattern === 'stripes') {
    rect(33, 55, 6, 34, trim); rect(45, 55, 6, 34, trim); rect(57, 55, 6, 34, trim);
  } else if (!goalkeeper && palette.pattern === 'halves') {
    rect(31, 54, 17, 36, trim);
  } else {
    rect(31, 59, 34, 4, trim);
  }
  rect(23, 66, 9, 3, trim);
  rect(64, 66, 9, 3, trim);
  rect(39, 53, 18, 6, trim);
  rect(31, 87, 34, 3, trim);
  rect(35, 81, 26, 3, shade(shirt, -17));
  rect(42, 49, 12, 8, skin);
  rect(42, 49, 3, 8, skinShadow);

  // Hair is drawn behind the head first for the longer silhouettes.
  if (look.style === 'long-curly') {
    rect(27, 22, 42, 27, hair);
    rect(24, 29, 7, 17, hair);
    rect(65, 29, 7, 17, hair);
    rect(28, 45, 8, 8, hairShadow);
    rect(60, 45, 8, 8, hairShadow);
  }
  rect(32, 21, 32, 29, skin);
  rect(28, 29, 4, 11, skin);
  rect(64, 29, 4, 11, skin);
  rect(32, 23, 3, 24, skinShadow);
  rect(61, 23, 3, 24, skinShadow);
  rect(35, 22, 24, 4, skinHighlight);
  rect(37, 45, 22, 5, skinShadow);

  switch (look.style) {
    case 'fade':
      rect(33, 19, 30, 7, hair); rect(30, 25, 6, 6, hairShadow); rect(60, 25, 6, 6, hairShadow);
      rect(35, 17, 24, 4, hairHighlight); rect(31, 30, 3, 5, skinShadow); rect(62, 30, 3, 5, skinShadow);
      break;
    case 'quiff':
      rect(32, 18, 31, 8, hair); rect(36, 14, 24, 6, hair); rect(41, 12, 15, 3, hairHighlight);
      rect(29, 24, 7, 9, hairShadow); rect(61, 25, 5, 8, hairShadow); rect(35, 20, 12, 3, hairHighlight);
      break;
    case 'curly':
    case 'long-curly':
      rect(30, 19, 36, 7, hair); rect(34, 15, 28, 7, hair);
      for (let index = 0; index < 6; index++) rect(30 + index * 6, 17 + (index % 2 ? 0 : 2), 5, 7, index % 3 ? hair : hairHighlight);
      rect(29, 26, 7, 9, hairShadow); rect(60, 26, 7, 9, hairShadow); rect(39, 23, 5, 6, hair);
      break;
    case 'buzz':
      rect(34, 20, 28, 4, hair); rect(31, 25, 4, 8, hairShadow); rect(62, 25, 4, 8, hairShadow);
      rect(37, 19, 22, 2, hairHighlight);
      break;
    case 'sidepart':
      rect(31, 18, 34, 8, hair); rect(37, 15, 26, 6, hair); rect(30, 25, 6, 10, hairShadow);
      rect(61, 26, 5, 8, hairShadow); rect(34, 22, 12, 6, hair); rect(48, 18, 3, 7, hairHighlight);
      break;
    case 'braids':
      rect(31, 18, 34, 8, hair); rect(28, 23, 6, 17, hairShadow); rect(62, 23, 6, 17, hairShadow);
      for (let index = 0; index < 5; index++) rect(33 + index * 6, 15 + index % 2, 3, 13, index % 2 ? hairShadow : hairHighlight);
      break;
    default:
      rect(32, 18, 32, 8, hair); rect(29, 24, 8, 8, hair); rect(60, 24, 7, 8, hair);
  }

  if (look.mask) {
    rect(30, 29, 36, 12, '#3c4142');
    rect(36, 32, 8, 4, skinHighlight); rect(52, 32, 8, 4, skinHighlight);
  } else {
    rect(37, 29, 7, 2, hairShadow); rect(53, 29, 7, 2, hairShadow);
  }
  rect(38, 32, 4, 4, '#353e3e'); rect(54, 32, 4, 4, '#353e3e');
  if (seed % 3 === 1) { rect(39, 32, 1, 1, '#dce5d6'); rect(55, 32, 1, 1, '#dce5d6'); }
  rect(46, 35, 4, 6, skinShadow);
  if (look.beard === 'full') {
    rect(34, 39, 4, 9, hairShadow); rect(58, 39, 4, 9, hairShadow);
    rect(36, 43, 24, 7, hair); rect(39, 48, 18, 4, hairShadow); rect(40, 42, 16, 3, hair);
  } else if (look.beard === 'short') {
    rect(35, 43, 26, 6, hairShadow); rect(38, 47, 20, 4, hair); rect(41, 41, 14, 2, hair);
  } else if (look.beard === 'goatee') {
    rect(42, 42, 12, 2, hair); rect(44, 46, 8, 5, hairShadow);
  } else if (look.beard === 'stubble') {
    for (const [x, y] of [[36, 43], [38, 47], [42, 48], [49, 48], [55, 47], [58, 43]]) rect(x, y, 2, 2, shade(skin, -43));
  }
  rect(42, 44, 12, 2, look.beard === 'none' ? '#8d6456' : skinShadow);
  rect(57, 62, 5, 6, palette.secondary);
  rect(58, 63, 3, 2, palette.primary);
  // A neutral pixel chevron is decorative, rather than a claimed squad number.
  rect(41, 71, 4, 3, '#f8f0d9'); rect(45, 74, 6, 3, '#f8f0d9'); rect(51, 71, 4, 3, '#f8f0d9');
  rect(6, 77, 9, 9, '#eee9d3'); rect(9, 80, 3, 3, '#455b50'); rect(6, 80, 3, 3, '#455b50'); rect(12, 77, 3, 3, '#455b50');

  const name = escapeXml(card.isim), team = escapeXml(card.takim);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${name} için temsili piksel çizim" shape-rendering="crispEdges"><title>${name} — temsili piksel çizim</title><desc>${team} renklerinden esinlenen özgün 8-bit portre. Gerçek fotoğraf veya resmi kulüp arması kullanılmamıştır.</desc>${bits.join('')}</svg>\n`;
}

const cards = JSON.parse(await readFile(sourcePath, 'utf8'));
if (!Array.isArray(cards) || cards.length < 1 || cards.length > 200) throw new Error('Süper Lig tablosu 1–200 oyuncu içermelidir.');
const ids = new Set(), slugs = new Set();
const sprites = cards.map(card => {
  const match = /^assets\/images\/superlig\/([a-z0-9]+(?:-[a-z0-9]+)*)\.svg$/.exec(card.gorsel || '');
  if (!match || !Number.isSafeInteger(card.id) || card.id < 1 || !card.isim || !card.takim || !card.etiket) throw new Error(`Kart kaydı geçersiz: ${JSON.stringify(card)}`);
  const slug = match[1];
  if (ids.has(card.id) || slugs.has(slug)) throw new Error(`Tekrarlanan kimlik veya dosya: ${slug}`);
  ids.add(card.id); slugs.add(slug);
  return { filePath: path.join(assetRoot, `${slug}.svg`), content: portrait(card, slug) };
});
await mkdir(assetRoot, { recursive: true });
for (const sprite of sprites) await writeFile(sprite.filePath, sprite.content, 'utf8');
console.log(`${sprites.length} özgün 96×96 piksel portre üretildi: assets/images/superlig/`);
