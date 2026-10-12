import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Original portraits adapted from generate-expansion-football.mjs.
// Symbolic national kits and numbers, checked against official 2026 sources.
// Only this expansion's feed and new portraits are written.
const definitions = [
  [
    "arda-guler",
    "Arda Güler",
    "OF",
    "Türkiye",
    10,
    "sweep",
    "light",
    "clean"
  ],
  [
    "kenan-yildiz",
    "Kenan Yıldız",
    "FV",
    "Türkiye",
    11,
    "centre",
    "light",
    "clean"
  ],
  [
    "ferdi-kadioglu",
    "Ferdi Kadıoğlu",
    "DF",
    "Türkiye",
    20,
    "sweep",
    "light",
    "stubble"
  ],
  [
    "hakan-calhanoglu",
    "Hakan Çalhanoğlu",
    "OF",
    "Türkiye",
    10,
    "short",
    "olive",
    "beard"
  ],
  [
    "orkun-kokcu",
    "Orkun Kökçü",
    "OF",
    "Türkiye",
    6,
    "short",
    "light",
    "beard"
  ],
  [
    "dusan-vlahovic",
    "Dušan Vlahović",
    "FV",
    "Sırbistan",
    9,
    "sweep",
    "light",
    "stubble"
  ],
  [
    "viktor-gyokeres",
    "Viktor Gyökeres",
    "FV",
    "İsveç",
    9,
    "sweep",
    "light",
    "beard"
  ],
  [
    "benjamin-sesko",
    "Benjamin Šeško",
    "FV",
    "Slovenya",
    11,
    "short",
    "pale",
    "clean"
  ],
  [
    "rafael-leao",
    "Rafael Leão",
    "FV",
    "Portekiz",
    10,
    "dreads",
    "deep",
    "smile"
  ],
  [
    "marcus-rashford",
    "Marcus Rashford",
    "FV",
    "İngiltere",
    11,
    "short",
    "brown",
    "goatee"
  ],
  [
    "luis-diaz",
    "Luis Díaz",
    "FV",
    "Kolombiya",
    7,
    "short",
    "brown",
    "stubble"
  ],
  [
    "cody-gakpo",
    "Cody Gakpo",
    "FV",
    "Hollanda",
    11,
    "tight-curls",
    "brown",
    "clean"
  ],
  [
    "desire-doue",
    "Désiré Doué",
    "FV",
    "Fransa",
    14,
    "tight-curls",
    "brown",
    "smile"
  ],
  [
    "khvicha-kvaratskhelia",
    "Khvicha Kvaratskhelia",
    "FV",
    "Gürcistan",
    7,
    "long-side",
    "light",
    "beard"
  ],
  [
    "bradley-barcola",
    "Bradley Barcola",
    "FV",
    "Fransa",
    11,
    "tight-curls",
    "brown",
    "clean"
  ],
  [
    "joao-pedro",
    "João Pedro",
    "FV",
    "Brezilya",
    9,
    "tight-curls",
    "brown",
    "stubble"
  ],
  [
    "estevao-willian",
    "Estêvão Willian",
    "FV",
    "Brezilya",
    20,
    "tight-curls",
    "brown",
    "clean"
  ],
  [
    "endrick",
    "Endrick",
    "FV",
    "Brezilya",
    9,
    "short",
    "deep",
    "clean"
  ],
  [
    "anthony-gordon",
    "Anthony Gordon",
    "FV",
    "İngiltere",
    7,
    "blond-side",
    "pale",
    "clean"
  ],
  [
    "michael-olise",
    "Michael Olise",
    "FV",
    "Fransa",
    7,
    "dreads",
    "brown",
    "clean"
  ],
  [
    "nico-williams",
    "Nico Williams",
    "FV",
    "İspanya",
    11,
    "tight-curls",
    "deep",
    "smile"
  ],
  [
    "mikel-oyarzabal",
    "Mikel Oyarzabal",
    "FV",
    "İspanya",
    21,
    "sweep",
    "light",
    "beard"
  ],
  [
    "jonathan-david",
    "Jonathan David",
    "FV",
    "Kanada",
    10,
    "short",
    "deep",
    "smile"
  ],
  [
    "christian-pulisic",
    "Christian Pulisic",
    "FV",
    "ABD",
    10,
    "short",
    "light",
    "beard"
  ],
  [
    "takefusa-kubo",
    "Takefusa Kubo",
    "FV",
    "Japonya",
    20,
    "centre",
    "light",
    "clean"
  ],
  [
    "kaoru-mitoma",
    "Kaoru Mitoma",
    "FV",
    "Japonya",
    7,
    "long-side",
    "light",
    "stubble"
  ],
  [
    "sadio-mane",
    "Sadio Mané",
    "FV",
    "Senegal",
    10,
    "receding",
    "deep",
    "smile"
  ],
  [
    "joshua-kimmich",
    "Joshua Kimmich",
    "OF",
    "Almanya",
    6,
    "sweep",
    "light",
    "clean"
  ],
  [
    "vitinha",
    "Vitinha",
    "OF",
    "Portekiz",
    23,
    "short",
    "olive",
    "beard"
  ],
  [
    "joao-neves",
    "João Neves",
    "OF",
    "Portekiz",
    15,
    "long-side",
    "light",
    "clean"
  ],
  [
    "enzo-fernandez",
    "Enzo Fernández",
    "OF",
    "Arjantin",
    24,
    "short",
    "light",
    "stubble"
  ],
  [
    "alexis-mac-allister",
    "Alexis Mac Allister",
    "OF",
    "Arjantin",
    20,
    "side",
    "light",
    "beard"
  ],
  [
    "ryan-gravenberch",
    "Ryan Gravenberch",
    "OF",
    "Hollanda",
    8,
    "short",
    "brown",
    "goatee"
  ],
  [
    "moises-caicedo",
    "Moisés Caicedo",
    "OF",
    "Ekvador",
    23,
    "buzz",
    "deep",
    "clean"
  ],
  [
    "nicolo-barella",
    "Nicolò Barella",
    "OF",
    "İtalya",
    18,
    "sweep",
    "light",
    "clean"
  ],
  [
    "dominik-szoboszlai",
    "Dominik Szoboszlai",
    "OF",
    "Macaristan",
    10,
    "short",
    "light",
    "beard"
  ],
  [
    "martin-zubimendi",
    "Martín Zubimendi",
    "OF",
    "İspanya",
    18,
    "side",
    "light",
    "clean"
  ],
  [
    "dani-olmo",
    "Dani Olmo",
    "OF",
    "İspanya",
    10,
    "buzz",
    "pale",
    "clean"
  ],
  [
    "frenkie-de-jong",
    "Frenkie de Jong",
    "OF",
    "Hollanda",
    21,
    "blond-side",
    "pale",
    "clean"
  ],
  [
    "nuno-mendes",
    "Nuno Mendes",
    "DF",
    "Portekiz",
    25,
    "tight-curls",
    "deep",
    "clean"
  ],
  [
    "denzel-dumfries",
    "Denzel Dumfries",
    "DF",
    "Hollanda",
    22,
    "short",
    "deep",
    "stubble"
  ],
  [
    "reece-james",
    "Reece James",
    "DF",
    "İngiltere",
    24,
    "tight-curls",
    "brown",
    "beard"
  ],
  [
    "gabriel-magalhaes",
    "Gabriel Magalhães",
    "DF",
    "Brezilya",
    6,
    "buzz",
    "brown",
    "goatee"
  ],
  [
    "eder-militao",
    "Éder Militão",
    "DF",
    "Brezilya",
    3,
    "short",
    "brown",
    "beard"
  ],
  [
    "pau-cubarsi",
    "Pau Cubarsí",
    "DF",
    "İspanya",
    5,
    "short",
    "light",
    "clean"
  ],
  [
    "alphonso-davies",
    "Alphonso Davies",
    "DF",
    "Kanada",
    19,
    "tight-curls",
    "deep",
    "smile"
  ],
  [
    "cristian-romero",
    "Cristian Romero",
    "DF",
    "Arjantin",
    13,
    "short",
    "olive",
    "stubble"
  ],
  [
    "unai-simon",
    "Unai Simón",
    "KL",
    "İspanya",
    23,
    "short",
    "light",
    "beard"
  ],
  [
    "ederson",
    "Ederson",
    "KL",
    "Brezilya",
    23,
    "short",
    "brown",
    "clean"
  ],
  [
    "diogo-costa",
    "Diogo Costa",
    "KL",
    "Portekiz",
    1,
    "short",
    "light",
    "beard"
  ]
];

const nations = {
  'Türkiye': { shirt: '#b96058', trim: '#eee4cb', detail: '#eee4cb', pattern: 'band', flag: ['#b96058', '#eee4cb', '#b96058'] },
  'Norveç': { shirt: '#b96058', trim: '#536f9a', detail: '#eee4cb', pattern: 'plain', flag: ['#b96058', '#eee4cb', '#536f9a'] },
  'Belçika': { shirt: '#b96058', trim: '#424c4b', detail: '#e2c765', pattern: 'plain', flag: ['#424c4b', '#e2c765', '#b96058'] },
  'Mısır': { shirt: '#b96058', trim: '#eee4cb', detail: '#424c4b', pattern: 'plain', flag: ['#b96058', '#eee4cb', '#424c4b'] },
  'Polonya': { shirt: '#eee7d1', trim: '#b96058', detail: '#b96058', pattern: 'plain', flag: ['#eee4cb', '#b96058'] },
  'Güney Kore': { shirt: '#b96058', trim: '#424c4b', detail: '#eee4cb', pattern: 'plain', flag: ['#eee4cb', '#b96058', '#536f9a'] },
  'Fas': { shirt: '#b96058', trim: '#548d70', detail: '#e2c765', pattern: 'plain', flag: ['#b96058', '#548d70', '#b96058'] },
  'Arjantin': { shirt: '#f2ecd7', trim: '#70acc8', detail: '#314b5c', pattern: 'stripes', flag: ['#79b5cf', '#f4eacb', '#79b5cf'] },
  'Portekiz': { shirt: '#af554d', trim: '#3b7462', detail: '#ebce87', pattern: 'sash', flag: ['#487b61', '#bd5c4d'] },
  'Brezilya': { shirt: '#e8c760', trim: '#4a8168', detail: '#47658b', pattern: 'plain', flag: ['#54896b', '#e7cb6d', '#6383a4'] },
  'Fransa': { shirt: '#4f7397', trim: '#ebdfc6', detail: '#ae5c57', pattern: 'plain', flag: ['#54729b', '#eee4cb', '#bd675e'] },
  'Hollanda': { shirt: '#d88853', trim: '#414c52', detail: '#eee0c5', pattern: 'plain', flag: ['#b95f59', '#eee5ce', '#5e79a0'] },
  'Almanya': { shirt: '#eee8d4', trim: '#444d4a', detail: '#bb6655', pattern: 'chevron', flag: ['#3f4b48', '#bf6757', '#ddbd60'] },
  'İtalya': { shirt: '#507ba1', trim: '#efe7d4', detail: '#efe7d4', pattern: 'plain', flag: ['#608b6a', '#eee4cc', '#bc665b'] },
  'Macaristan': { shirt: '#b96058', trim: '#efe4cd', detail: '#3c6c58', pattern: 'plain', flag: ['#be6b60', '#f0e5ce', '#62876a'] },
  'İspanya': { shirt: '#b9584d', trim: '#e3bf62', detail: '#ecd398', pattern: 'plain', flag: ['#b35b53', '#e0bd61', '#b35b53'] },
  'İsveç': { shirt: '#dfc566', trim: '#537c9e', detail: '#537c9e', pattern: 'plain', flag: ['#5d81a1', '#e4c566'] },
  'Fildişi Sahili': { shirt: '#d68d56', trim: '#f1e8ce', detail: '#538668', pattern: 'plain', flag: ['#d7915d', '#f1e6c8', '#6c9674'] },
  'Kamerun': { shirt: '#57916d', trim: '#d1b45d', detail: '#b56250', pattern: 'plain', flag: ['#538269', '#b96858', '#dec36d'] },
  'Liberya': { shirt: '#b96159', trim: '#ece3cd', detail: '#48678b', pattern: 'band', flag: ['#496c91', '#e8dfc9', '#ba655d'] },
  'Kuzey İrlanda': { shirt: '#568972', trim: '#f0e6cc', detail: '#f0e6cc', pattern: 'plain', flag: ['#eee5cc', '#b7675c', '#eee5cc'] },
  'İngiltere': { shirt: '#eee7d1', trim: '#53647d', detail: '#ab5955', pattern: 'plain', flag: ['#eee4c8', '#b9655b', '#eee4c8'] },
  'Hırvatistan': { shirt: '#eee7d0', trim: '#ba5e53', detail: '#426284', pattern: 'checks', flag: ['#ba665a', '#eee2c9', '#5c7b9e'] },
  'Sovyetler Birliği': { shirt: '#424c4b', trim: '#c1b69a', detail: '#bd675b', pattern: 'plain', flag: ['#b9655b', '#d5bd6c'] },
  'Ukrayna': { shirt: '#e2c765', trim: '#537c9e', detail: '#537c9e', pattern: 'plain', flag: ['#537c9e', '#e2c765'] },
  'Çekya': { shirt: '#b96058', trim: '#536f9a', detail: '#eee4cb', pattern: 'plain', flag: ['#eee4cb', '#b96058', '#536f9a'] },
  'Danimarka': { shirt: '#b96058', trim: '#eee4cb', detail: '#eee4cb', pattern: 'plain', flag: ['#b96058', '#eee4cb', '#b96058'] },
  'Sırbistan': { shirt: '#b96058', trim: '#eee4cb', detail: '#eee4cb', pattern: 'plain', flag: ['#b96058', '#536f9a', '#eee4cb'] },
  'Uruguay': { shirt: '#70acc8', trim: '#314b5c', detail: '#314b5c', pattern: 'plain', flag: ['#eee4cb', '#70acc8', '#eee4cb'] },
  'Romanya': { shirt: '#e2c765', trim: '#b96058', detail: '#536f9a', pattern: 'plain', flag: ['#536f9a', '#e2c765', '#b96058'] },
  'Nijerya': { shirt: '#548d70', trim: '#eee7d1', detail: '#eee7d1', pattern: 'plain', flag: ['#548d70', '#eee7d1', '#548d70'] },
  'Gana': { shirt: '#eee7d1', trim: '#424c4b', detail: '#424c4b', pattern: 'plain', flag: ['#b96058', '#e2c765', '#548d70'] },
  'Şili': { shirt: '#b96058', trim: '#536f9a', detail: '#eee4cb', pattern: 'plain', flag: ['#536f9a', '#eee4cb', '#b96058'] },
};
Object.assign(nations, {
 'Slovenya': {shirt:'#eee7d1',trim:'#548d70',detail:'#536f9a',pattern:'chevron',flag:['#eee4cb','#536f9a','#b96058']},
 'Kolombiya': {shirt:'#e2c765',trim:'#536f9a',detail:'#b96058',pattern:'plain',flag:['#e2c765','#536f9a','#b96058']},
 'Gürcistan': {shirt:'#eee7d1',trim:'#b96058',detail:'#b96058',pattern:'band',flag:['#eee4cb','#b96058','#eee4cb']},
 'Kanada': {shirt:'#b96058',trim:'#eee4cb',detail:'#eee4cb',pattern:'plain',flag:['#b96058','#eee4cb','#b96058']},
 'ABD': {shirt:'#eee7d1',trim:'#536f9a',detail:'#b96058',pattern:'plain',flag:['#b96058','#eee4cb','#536f9a']},
 'Japonya': {shirt:'#536f9a',trim:'#eee4cb',detail:'#eee4cb',pattern:'plain',flag:['#eee4cb','#b96058','#eee4cb']},
 'Senegal': {shirt:'#eee7d1',trim:'#548d70',detail:'#b96058',pattern:'plain',flag:['#548d70','#e2c765','#b96058']},
 'Ekvador': {shirt:'#e2c765',trim:'#536f9a',detail:'#b96058',pattern:'plain',flag:['#e2c765','#536f9a','#b96058']}
});
const skins = {
  pale: ['#e7bea0', '#cd9e82'],
  light: ['#dbaf8d', '#bd8d6c'],
  olive: ['#cf9f79', '#b47e5f'],
  brown: ['#b7835e', '#926246'],
  dark: ['#9b6d4f', '#7d513c'],
  deep: ['#815c47', '#624433'],
};
const digitPixels = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};
const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const escapeXml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

function pixelNumber(number, x, y, colour) {
  return String(number).split('').map((digit, place) => digitPixels[digit]
    .map((row, r) => [...row].map((pixel, c) => pixel === '1'
      ? rect(x + place * 8 + c * 2, y + r * 2, 2, 2, colour) : '').join('')).join('')).join('');
}

function hairBehind(type, colour) {
  if (type === 'blond-ponytail') type = 'ponytail';
  if (['long-side', 'blond-long', 'band-long', 'long-curls'].includes(type)) {
    return rect(27, 22, 42, 28, colour) + rect(25, 29, 5, 27, colour) + rect(66, 29, 5, 27, colour);
  }
  if (type === 'dreads') {
    return rect(27, 18, 42, 17, colour) + Array.from({ length: 5 }, (_, i) =>
      rect(23 + i * 5, 29, 3, 24 + i % 2 * 4, colour) + rect(55 + i * 4, 29, 3, 27 - i % 2 * 3, colour)).join('');
  }
  if (['ponytail', 'top-knot'].includes(type)) {
    return rect(26, 24, 8, 17, colour) + rect(26, 36, 5, 22, colour) + rect(25, 53, 7, 5, colour);
  }
  return '';
}

function hairFront(type, colour, shadow, skin) {
  if (type === 'blond-ponytail') type = 'ponytail';
  const base = rect(32, 18, 32, 9, colour) + rect(29, 24, 7, 9, colour) + rect(60, 24, 7, 9, colour);
  if (type === 'bald') return rect(30, 26, 3, 6, colour) + rect(63, 26, 3, 6, colour);
  if (['balding', 'receding'].includes(type)) {
    return rect(30, 23, 5, 12, colour) + rect(61, 23, 5, 12, colour)
      + rect(34, 20, 5, 5, colour) + rect(57, 20, 5, 5, colour)
      + (type === 'receding' ? rect(36, 19, 24, 3, colour) + rect(39, 21, 7, 3, colour) : '');
  }
  if (type === 'tuft') return rect(30, 23, 3, 7, shadow) + rect(63, 23, 3, 7, shadow)
    + rect(35, 19, 26, 5, colour) + rect(39, 16, 18, 4, colour);
  if (['buzz', 'blond-buzz'].includes(type)) return rect(33, 21, 30, 4, colour)
    + rect(30, 24, 4, 6, colour) + rect(62, 24, 4, 6, colour)
    + rect(36, 21, 22, 1, shadow);
  if (type === 'cap') return rect(28, 18, 40, 10, colour) + rect(34, 13, 28, 5, colour)
    + rect(24, 26, 48, 4, '#354240') + rect(37, 19, 24, 2, '#6b7467');
  if (['curls', 'tight-curls', 'long-curls'].includes(type)) {
    let curls = rect(29, 19, 38, 10, colour) + rect(27, 26, 7, 9, colour) + rect(62, 26, 7, 9, colour);
    for (let i = 0; i < 6; i += 1) curls += rect(29 + i * 6, 16 + i % 2 * 2, 5, 6, colour)
      + rect(31 + i * 6, 23, 3, 2, shadow);
    return curls + (type === 'tight-curls' ? rect(32, 26, 32, 2, skin) : '');
  }
  if (type === 'spikes') return base + rect(34, 14, 5, 6, colour) + rect(44, 12, 6, 7, colour)
    + rect(55, 15, 5, 5, colour) + rect(48, 20, 12, 3, shadow);
  if (type === 'dreads') return base + rect(29, 17, 40, 9, colour)
    + rect(29, 27, 38, 3, '#8c714f') + rect(35, 18, 3, 7, shadow) + rect(46, 17, 3, 8, shadow);
  if (type === 'band-long') return base + rect(27, 17, 42, 11, colour)
    + rect(29, 26, 38, 4, '#8a866c') + rect(34, 20, 3, 5, shadow) + rect(52, 18, 3, 7, shadow);
  if (type === 'centre') return base + rect(30, 18, 15, 13, colour) + rect(51, 18, 15, 13, colour)
    + rect(46, 18, 4, 8, skin) + rect(38, 29, 7, 3, colour) + rect(51, 29, 7, 3, colour);
  if (type === 'top-knot') return base + rect(40, 12, 17, 7, colour) + rect(43, 9, 11, 4, colour)
    + rect(37, 19, 23, 3, shadow);
  if (type === 'ponytail') return base + rect(39, 21, 20, 8, colour) + rect(36, 25, 13, 5, colour);
  return base + rect(type.includes('side') ? 35 : 39, 25, 16, 5, colour)
    + rect(35, 19, 24, 3, shadow);
}

function kitColour(theme, isKeeper, id) {
  if (isKeeper && theme.shirt === '#424c4b') return theme.shirt;
  return isKeeper ? ['#768f82', '#819298', '#9e967b', '#9ca273'][id % 4] : theme.shirt;
}

function jersey(theme, isKeeper, id) {
  const shirt = kitColour(theme, isKeeper, id);
  const trim = isKeeper ? '#e6ddbd' : theme.trim;
  let art = rect(27, 56, 42, 37, '#3c554b') + rect(21, 60, 11, 23, '#b18060')
    + rect(64, 60, 11, 23, '#b18060') + rect(22, 57, 13, 17, shirt) + rect(61, 57, 13, 17, shirt)
    + rect(30, 55, 36, 37, shirt) + rect(23, 71, 10, 3, trim) + rect(63, 71, 10, 3, trim);
  if (!isKeeper && theme.pattern === 'stripes') {
    for (let x = 32; x < 65; x += 12) art += rect(x, 56, 5, 34, theme.trim);
  }
  if (!isKeeper && theme.pattern === 'checks') {
    for (let y = 56; y < 91; y += 7) for (let x = 31; x < 65; x += 7) {
      if ((Math.floor((x - 31) / 7) + Math.floor((y - 56) / 7)) % 2 === 0) art += rect(x, y, 7, 7, theme.trim);
    }
  }
  if (!isKeeper && theme.pattern === 'sash') {
    for (let i = 0; i < 6; i += 1) art += rect(31 + i * 4, 57 + i * 5, 9, 5, theme.trim);
  }
  if (!isKeeper && theme.pattern === 'band') art += rect(31, 63, 34, 6, theme.trim);
  if (!isKeeper && theme.pattern === 'chevron') art += rect(31, 61, 8, 3, '#bb6755')
    + rect(39, 64, 8, 3, '#bb6755') + rect(47, 67, 8, 3, '#bb6755') + rect(55, 64, 10, 3, '#bb6755');
  art += rect(37, 54, 22, 4, trim) + rect(41, 58, 14, 3, trim) + rect(31, 89, 34, 3, trim);
  for (let i = 0; i < theme.flag.length; i += 1) art += rect(56, 62 + i * 2, 7, 2, theme.flag[i]);
  if (isKeeper) art += rect(18, 76, 12, 11, '#d9d4b8') + rect(66, 76, 12, 11, '#d9d4b8')
    + rect(19, 79, 4, 6, '#7b8c7c') + rect(73, 79, 4, 6, '#7b8c7c');
  return art;
}

function portrait(definition, id) {
  const [, name, tag, nation, number, hair, skinType, face] = definition;
  const theme = nations[nation];
  const [skin, skinShade] = skins[skinType];
  const blond = hair.startsWith('blond');
  const hairColour = blond ? '#b99c64' : id % 4 === 0 ? '#554b40' : '#3c4140';
  const hairShade = blond ? '#dbc084' : '#676150';
  const keeper = tag === 'KL';
  const back = ['#c8d8c4', '#c3d4ce', '#d1d7bc', '#c8d1c5'][id % 4];
  let art = rect(0, 0, 96, 96, back) + rect(0, 15, 96, 28, '#aebfb5')
    + rect(0, 22, 96, 3, '#e6e7c9') + rect(0, 35, 96, 3, '#dce0c0');
  for (let x = 4; x < 96; x += 12) art += rect(x, 28, 5, 4, ['#78948e', '#b49780', '#899eaa'][(x / 4 + id) % 3]);
  art += rect(0, 43, 96, 53, '#7f9f80') + rect(0, 67, 96, 3, '#c3d3ad')
    + rect(46, 43, 4, 53, '#c3d3ad') + rect(20, 92, 56, 4, '#5f806c');
  art += hairBehind(hair, hairColour) + jersey(theme, keeper, id);
  art += rect(21, 74, 10, 9, skin) + rect(65, 74, 10, 9, skin)
    + rect(42, 46, 12, 11, skinShade) + rect(43, 46, 8, 11, skin)
    + rect(32, 21, 32, 28, skin) + rect(35, 49, 26, 4, skin)
    + rect(28, 30, 4, 11, skin) + rect(64, 30, 4, 11, skinShade)
    + rect(60, 27, 4, 21, skinShade) + rect(36, 49, 23, 3, skinShade);
  art += hairFront(hair, hairColour, hairShade, skin);
  const browY = id % 3 === 0 ? 32 : 31;
  art += rect(37, browY, 7, 2, hairColour) + rect(52, browY, 7, 2, hairColour)
    + rect(39, 35, 4, 3, '#35463f') + rect(53, 35, 4, 3, '#35463f')
    + rect(40, 35, 1, 1, '#f2e7c9') + rect(54, 35, 1, 1, '#f2e7c9')
    + rect(47, 36, 3, 7, skinShade);
  if (face === 'beard') art += rect(34, 43, 27, 5, hairColour) + rect(38, 48, 21, 6, hairColour)
    + rect(41, 44, 14, 3, skin) + rect(43, 47, 10, 2, '#a0795d');
  else if (face === 'goatee') art += rect(41, 43, 14, 2, hairColour) + rect(44, 49, 9, 5, hairColour)
    + rect(42, 46, 12, 2, '#8b644f');
  else if (face === 'moustache') art += rect(40, 43, 16, 3, hairColour) + rect(43, 48, 10, 2, '#8f6952');
  else if (face === 'smile') art += rect(40, 44, 16, 4, '#785642') + rect(42, 44, 12, 2, '#f1e4c8');
  else if (face === 'stubble') art += rect(35, 46, 4, 4, skinShade) + rect(58, 45, 3, 5, skinShade)
    + rect(41, 45, 15, 2, '#896753') + rect(42, 50, 13, 2, skinShade);
  else art += rect(41, 45, 14, 2, '#986d55');
  const numberColour = keeper ? '#efe4bf' : theme.detail;
  art += rect(number > 9 ? 38 : 42, 73, number > 9 ? 20 : 12, 14, kitColour(theme, keeper, id))
    + pixelNumber(number, number > 9 ? 41 : 45, 75, numberColour);
  if (['messi', 'cristiano-ronaldo', 'maradona', 'beckenbauer', 'maldini', 'zanetti'].includes(definition[0])) {
    art += rect(22, 64, 10, 4, '#e8d99f') + rect(23, 65, 8, 2, '#7b8065');
  }
  art += rect(7, 77, 9, 9, '#ece5cd') + rect(10, 80, 3, 3, '#42624f')
    + rect(7, 80, 3, 3, '#42624f') + rect(13, 77, 3, 3, '#42624f');
  if (definition[0] === 'victor-osimhen') {
    // Signature protective mask, kept below the brow and around visible eyes.
    art += rect(34, 32, 28, 3, '#354240') + rect(34, 35, 4, 5, '#354240')
      + rect(43, 35, 9, 5, '#354240') + rect(58, 35, 4, 5, '#354240')
      + rect(37, 39, 22, 2, '#354240');
  }
  if (definition[0] === 'rustu-recber') {
    art += rect(36, 39, 9, 2, '#354240') + rect(51, 39, 9, 2, '#354240');
  }
  if (nation === 'Türkiye' && !keeper) {
    art += rect(56, 63, 6, 6, '#eee4cb') + rect(59, 63, 4, 4, '#b96058')
      + rect(63, 63, 2, 2, '#eee4cb');
  }
  const label = `${name} — ${nation} milli formasıyla temsili piksel portre`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${escapeXml(label)}" shape-rendering="crispEdges"><title>${escapeXml(label)}</title>${art}</svg>\n`;
}


const root = new URL('../', import.meta.url);
const oldFeed = JSON.parse(await readFile(new URL('tools/expansion-football.json',root),'utf8'))['dunya-yildizlari'];
const current = JSON.parse(await readFile(new URL('veri.json',root),'utf8'));
const oldNames = new Set(oldFeed.map(card=>card.isim.normalize('NFKC').toLocaleLowerCase('tr')));
const oldImages = new Set(oldFeed.map(card=>card.gorsel));
if(definitions.length!==50 || new Set(definitions.map(d=>d[0])).size!==50 || new Set(definitions.map(d=>d[1])).size!==50) throw new Error('Exactly 50 unique extra players required.');
for(const tag of ['FV','OF','DF','KL']) if(definitions.filter(d=>d[2]===tag).length<3) throw new Error('Every position needs 3 players.');
const cards=[], sprites=[];
for(const [index,definition] of definitions.entries()) {
 const [slug,isim,etiket,takim]=definition, id=6051+index, gorsel='assets/images/world-stars/'+slug+'.svg';
 if(oldNames.has(isim.normalize('NFKC').toLocaleLowerCase('tr')) || oldImages.has(gorsel)) throw new Error('Duplicate old player: '+isim);
 const old = (current['dunya-yildizlari']||[]).find(c=>c.id===id);
 if(old && (old.isim!==isim || old.gorsel!==gorsel)) throw new Error('ID already used: '+id);
 const card={id,isim,gorsel,etiket,takim,takimTuru:'milli'};
 const svg=portrait(definition,id);
 if(/<(?:script|foreignObject|image)|(?:href|onload)=/i.test(svg)) throw new Error('Non-static image: '+slug);
 cards.push(card);sprites.push({gorsel,svg});
}
await mkdir(new URL('assets/images/world-stars/',root),{recursive:true});
let created=0,reused=0;
for(const {gorsel,svg} of sprites) {
 try {await writeFile(new URL(gorsel,root),svg,{encoding:'utf8',flag:'wx'});created++;}
 catch(error) {if(error.code!=='EEXIST')throw error;if(await readFile(new URL(gorsel,root),'utf8')!==svg)throw new Error('Refused to overwrite old portrait: '+gorsel);reused++;}
}
await writeFile(new URL('tools/world-stars-extra.json',root),JSON.stringify({'dunya-yildizlari':cards},null,2)+'\n','utf8');
console.log('50 extra world stars, IDs 6051–6100; '+created+' new portraits, '+reused+' identical portraits.');
console.log(Object.fromEntries(['FV','OF','DF','KL'].map(t=>[t,cards.filter(c=>c.etiket===t).length])));
