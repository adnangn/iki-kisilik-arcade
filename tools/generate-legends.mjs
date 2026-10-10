import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// An editorial collection, not a popularity poll or a numbered greatness ranking.
// National kits are symbolic historical colours, with original pixel portraits.
const definitions = [
  ['messi', 'Lionel Messi', 'FV', 'Arjantin', 10, 'sweep', 'light', 'beard'],
  ['cristiano-ronaldo', 'Cristiano Ronaldo', 'FV', 'Portekiz', 7, 'spikes', 'olive', 'clean'],
  ['pele', 'Pelé', 'FV', 'Brezilya', 10, 'tight-curls', 'dark', 'smile'],
  ['maradona', 'Diego Maradona', 'OF', 'Arjantin', 10, 'curls', 'olive', 'clean'],
  ['zidane', 'Zinédine Zidane', 'OF', 'Fransa', 10, 'balding', 'olive', 'stubble'],
  ['ronaldinho', 'Ronaldinho', 'OF', 'Brezilya', 10, 'band-long', 'brown', 'smile'],
  ['ronaldo-nazario', 'Ronaldo Nazário', 'FV', 'Brezilya', 9, 'tuft', 'brown', 'smile'],
  ['cruyff', 'Johan Cruyff', 'FV', 'Hollanda', 14, 'long-side', 'light', 'clean'],
  ['beckenbauer', 'Franz Beckenbauer', 'DF', 'Almanya', 5, 'side', 'light', 'clean'],
  ['maldini', 'Paolo Maldini', 'DF', 'İtalya', 3, 'long-side', 'olive', 'clean'],
  ['platini', 'Michel Platini', 'OF', 'Fransa', 10, 'curls', 'olive', 'clean'],
  ['eusebio', 'Eusébio', 'FV', 'Portekiz', 13, 'short', 'dark', 'smile'],
  ['puskas', 'Ferenc Puskás', 'FV', 'Macaristan', 10, 'side', 'light', 'clean'],
  ['gerd-muller', 'Gerd Müller', 'FV', 'Almanya', 13, 'curls', 'light', 'moustache'],
  ['romario', 'Romário', 'FV', 'Brezilya', 11, 'short', 'brown', 'clean'],
  ['van-basten', 'Marco van Basten', 'FV', 'Hollanda', 12, 'side', 'light', 'clean'],
  ['baggio', 'Roberto Baggio', 'OF', 'İtalya', 10, 'ponytail', 'olive', 'goatee'],
  ['zico', 'Zico', 'OF', 'Brezilya', 10, 'sweep', 'olive', 'clean'],
  ['gullit', 'Ruud Gullit', 'OF', 'Hollanda', 10, 'dreads', 'brown', 'moustache'],
  ['matthaus', 'Lothar Matthäus', 'OF', 'Almanya', 10, 'sweep', 'light', 'clean'],
  ['xavi', 'Xavi Hernández', 'OF', 'İspanya', 8, 'spikes', 'olive', 'stubble'],
  ['iniesta', 'Andrés Iniesta', 'OF', 'İspanya', 6, 'receding', 'pale', 'clean'],
  ['pirlo', 'Andrea Pirlo', 'OF', 'İtalya', 21, 'long-side', 'olive', 'beard'],
  ['kaka', 'Kaká', 'OF', 'Brezilya', 8, 'centre', 'light', 'clean'],
  ['rivaldo', 'Rivaldo', 'OF', 'Brezilya', 10, 'short', 'brown', 'clean'],
  ['figo', 'Luís Figo', 'OF', 'Portekiz', 7, 'sweep', 'olive', 'stubble'],
  ['henry', 'Thierry Henry', 'FV', 'Fransa', 12, 'buzz', 'dark', 'stubble'],
  ['bergkamp', 'Dennis Bergkamp', 'FV', 'Hollanda', 8, 'blond-side', 'light', 'clean'],
  ['batistuta', 'Gabriel Batistuta', 'FV', 'Arjantin', 9, 'long-side', 'olive', 'goatee'],
  ['raul', 'Raúl', 'FV', 'İspanya', 7, 'sweep', 'olive', 'clean'],
  ['ibrahimovic', 'Zlatan Ibrahimović', 'FV', 'İsveç', 10, 'top-knot', 'olive', 'goatee'],
  ['drogba', 'Didier Drogba', 'FV', 'Fildişi Sahili', 11, 'band-long', 'deep', 'clean'],
  ['etoo', 'Samuel Eto’o', 'FV', 'Kamerun', 9, 'buzz', 'deep', 'clean'],
  ['george-weah', 'George Weah', 'FV', 'Liberya', 9, 'short', 'deep', 'clean'],
  ['george-best', 'George Best', 'FV', 'Kuzey İrlanda', 7, 'long-side', 'light', 'clean'],
  ['bobby-charlton', 'Bobby Charlton', 'OF', 'İngiltere', 9, 'receding', 'pale', 'clean'],
  ['beckham', 'David Beckham', 'OF', 'İngiltere', 7, 'blond-buzz', 'light', 'stubble'],
  ['modric', 'Luka Modrić', 'OF', 'Hırvatistan', 10, 'blond-long', 'light', 'clean'],
  ['baresi', 'Franco Baresi', 'DF', 'İtalya', 6, 'curls', 'olive', 'clean'],
  ['cannavaro', 'Fabio Cannavaro', 'DF', 'İtalya', 5, 'short', 'olive', 'clean'],
  ['nesta', 'Alessandro Nesta', 'DF', 'İtalya', 13, 'centre', 'olive', 'clean'],
  ['bobby-moore', 'Bobby Moore', 'DF', 'İngiltere', 6, 'blond-side', 'light', 'clean'],
  ['cafu', 'Cafu', 'DF', 'Brezilya', 2, 'buzz', 'brown', 'smile'],
  ['roberto-carlos', 'Roberto Carlos', 'DF', 'Brezilya', 6, 'bald', 'brown', 'clean'],
  ['puyol', 'Carles Puyol', 'DF', 'İspanya', 5, 'long-curls', 'olive', 'clean'],
  ['zanetti', 'Javier Zanetti', 'DF', 'Arjantin', 4, 'side', 'olive', 'clean'],
  ['yashin', 'Lev Yashin', 'KL', 'Sovyetler Birliği', 1, 'cap', 'light', 'clean'],
  ['buffon', 'Gianluigi Buffon', 'KL', 'İtalya', 1, 'sweep', 'olive', 'stubble'],
  ['casillas', 'Iker Casillas', 'KL', 'İspanya', 1, 'short', 'olive', 'stubble'],
  ['kahn', 'Oliver Kahn', 'KL', 'Almanya', 1, 'blond-side', 'light', 'clean'],
  ['gerrard', 'Steven Gerrard', 'OF', 'İngiltere', 4, 'side', 'light', 'clean'],
  ['lampard', 'Frank Lampard', 'OF', 'İngiltere', 8, 'sweep', 'light', 'clean'],
  ['scholes', 'Paul Scholes', 'OF', 'İngiltere', 18, 'blond-buzz', 'pale', 'clean'],
  ['rooney', 'Wayne Rooney', 'FV', 'İngiltere', 10, 'receding', 'pale', 'stubble'],
  ['totti', 'Francesco Totti', 'OF', 'İtalya', 10, 'long-side', 'olive', 'stubble'],
  ['del-piero', 'Alessandro Del Piero', 'FV', 'İtalya', 7, 'curls', 'olive', 'goatee'],
  ['shevchenko', 'Andriy Shevchenko', 'FV', 'Ukrayna', 7, 'side', 'light', 'clean'],
  ['seedorf', 'Clarence Seedorf', 'OF', 'Hollanda', 10, 'buzz', 'deep', 'beard'],
  ['vieira', 'Patrick Vieira', 'OF', 'Fransa', 4, 'buzz', 'deep', 'clean'],
  ['ballack', 'Michael Ballack', 'OF', 'Almanya', 13, 'sweep', 'light', 'stubble'],
  ['schweinsteiger', 'Bastian Schweinsteiger', 'OF', 'Almanya', 7, 'blond-buzz', 'light', 'clean'],
  ['nedved', 'Pavel Nedvěd', 'OF', 'Çekya', 11, 'blond-long', 'light', 'clean'],
  ['owen', 'Michael Owen', 'FV', 'İngiltere', 10, 'side', 'light', 'clean'],
  ['torres', 'Fernando Torres', 'FV', 'İspanya', 9, 'blond-long', 'pale', 'clean'],
  ['van-nistelrooy', 'Ruud van Nistelrooy', 'FV', 'Hollanda', 9, 'centre', 'light', 'clean'],
  ['van-persie', 'Robin van Persie', 'FV', 'Hollanda', 9, 'short', 'olive', 'stubble'],
  ['klose', 'Miroslav Klose', 'FV', 'Almanya', 11, 'sweep', 'light', 'clean'],
  ['schmeichel', 'Peter Schmeichel', 'KL', 'Danimarka', 1, 'blond-side', 'light', 'clean'],
  ['cech', 'Petr Čech', 'KL', 'Çekya', 1, 'cap', 'pale', 'clean'],
  ['dida', 'Dida', 'KL', 'Brezilya', 1, 'buzz', 'deep', 'clean'],
  ['sergio-ramos', 'Sergio Ramos', 'DF', 'İspanya', 15, 'top-knot', 'olive', 'beard'],
  ['ferdinand', 'Rio Ferdinand', 'DF', 'İngiltere', 5, 'buzz', 'brown', 'goatee'],
  ['vidic', 'Nemanja Vidić', 'DF', 'Sırbistan', 5, 'buzz', 'pale', 'clean'],
  ['luis-suarez', 'Luis Suárez', 'FV', 'Uruguay', 9, 'short', 'olive', 'beard'],
  ['neymar', 'Neymar', 'FV', 'Brezilya', 10, 'spikes', 'brown', 'stubble'],
  ['hagi', 'Gheorghe Hagi', 'OF', 'Romanya', 10, 'curls', 'olive', 'clean'],
  ['alex-de-souza', 'Alex de Souza', 'OF', 'Brezilya', 10, 'receding', 'light', 'clean'],
  ['robben', 'Arjen Robben', 'FV', 'Hollanda', 11, 'balding', 'pale', 'clean'],
  ['sneijder', 'Wesley Sneijder', 'OF', 'Hollanda', 10, 'buzz', 'light', 'clean'],
  ['makelele', 'Claude Makélélé', 'OF', 'Fransa', 6, 'buzz', 'deep', 'clean'],
  ['riquelme', 'Juan Román Riquelme', 'OF', 'Arjantin', 10, 'short', 'olive', 'clean'],
  ['veron', 'Juan Sebastián Verón', 'OF', 'Arjantin', 11, 'bald', 'olive', 'goatee'],
  ['rui-costa', 'Rui Costa', 'OF', 'Portekiz', 10, 'long-side', 'olive', 'stubble'],
  ['deco', 'Deco', 'OF', 'Portekiz', 20, 'short', 'olive', 'clean'],
  ['guti', 'Guti', 'OF', 'İspanya', 14, 'blond-long', 'light', 'clean'],
  ['michael-laudrup', 'Michael Laudrup', 'OF', 'Danimarka', 10, 'centre', 'light', 'clean'],
  ['brian-laudrup', 'Brian Laudrup', 'FV', 'Danimarka', 11, 'long-side', 'light', 'clean'],
  ['okocha', 'Jay-Jay Okocha', 'OF', 'Nijerya', 10, 'buzz', 'dark', 'smile'],
  ['abedi-pele', 'Abedi Pelé', 'OF', 'Gana', 10, 'tight-curls', 'deep', 'clean'],
  ['zamorano', 'Iván Zamorano', 'FV', 'Şili', 9, 'curls', 'olive', 'clean'],
  ['fowler', 'Robbie Fowler', 'FV', 'İngiltere', 9, 'side', 'light', 'clean'],
  ['andy-cole', 'Andy Cole', 'FV', 'İngiltere', 9, 'buzz', 'deep', 'clean'],
  ['david-villa', 'David Villa', 'FV', 'İspanya', 7, 'spikes', 'olive', 'goatee'],
  ['inzaghi', 'Filippo Inzaghi', 'FV', 'İtalya', 9, 'long-side', 'olive', 'clean'],
  ['trezeguet', 'David Trezeguet', 'FV', 'Fransa', 20, 'bald', 'olive', 'clean'],
  ['vieri', 'Christian Vieri', 'FV', 'İtalya', 21, 'short', 'olive', 'stubble'],
  ['crespo', 'Hernán Crespo', 'FV', 'Arjantin', 9, 'long-side', 'olive', 'clean'],
  ['ayala', 'Roberto Ayala', 'DF', 'Arjantin', 2, 'centre', 'olive', 'clean'],
  ['ricardo-carvalho', 'Ricardo Carvalho', 'DF', 'Portekiz', 4, 'long-side', 'light', 'clean'],
  ['van-der-sar', 'Edwin van der Sar', 'KL', 'Hollanda', 1, 'side', 'light', 'clean'],
];

const nations = {
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
  const label = `${name} — ${nation} milli formasıyla temsili piksel portre`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${escapeXml(label)}" shape-rendering="crispEdges"><title>${escapeXml(label)}</title>${art}</svg>\n`;
}

if (definitions.length !== 100) throw new Error('Exactly 100 legends are required.');
const root = new URL('../', import.meta.url);
const outputDirectory = new URL('assets/images/legends/', root);
await mkdir(outputDirectory, { recursive: true });
const cards = definitions.map((definition, index) => {
  const [slug, isim, etiket, takim] = definition;
  return { id: index + 1, isim, gorsel: `assets/images/legends/${slug}.svg`, etiket, takim, takimTuru: 'milli', ...(index >= 50 ? { donem: '1990–2015' } : {}) };
});
let writtenPortraits = 0;
await Promise.all(definitions.map(async (definition, index) => {
  const path = new URL(`${definition[0]}.svg`, outputDirectory);
  const svg = portrait(definition, index + 1);
  let previous;
  try {
    previous = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (previous !== svg) {
    await writeFile(path, svg, 'utf8');
    writtenPortraits += 1;
  }
}));
await writeFile(new URL('tools/legends-cards.json', root), `${JSON.stringify(cards, null, 2)}\n`, 'utf8');
await writeFile(new URL('tools/additions-legends.json', root), `${JSON.stringify(cards.slice(80), null, 2)}\n`, 'utf8');
const tags = Object.fromEntries(['FV', 'OF', 'DF', 'KL'].map(tag => [tag, cards.filter(card => card.etiket === tag).length]));
console.log(`${cards.length} original portraits verified in ${fileURLToPath(outputDirectory)}; ${writtenPortraits} written.`);
console.log(JSON.stringify({ count: cards.length, additions: cards.length - 80, writtenPortraits, tags, teams: new Set(cards.map(card => card.takim)).size }));
