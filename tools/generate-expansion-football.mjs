import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Editorial selections, never an official ranking. Kits and shirt numbers are
// symbolic national colours; no unverified current club is stored in the cards.
// Original portrait primitives are adapted from generate-legends.mjs below.
const turkishDefinitions = [
  ['lefter', 'Lefter Küçükandonyadis', 'FV', 'Türkiye', 10, 'side', 'olive', 'moustache'],
  ['metin-oktay', 'Metin Oktay', 'FV', 'Türkiye', 10, 'side', 'olive', 'clean'],
  ['can-bartu', 'Can Bartu', 'OF', 'Türkiye', 10, 'side', 'light', 'clean'],
  ['turgay-seren', 'Turgay Şeren', 'KL', 'Türkiye', 1, 'side', 'light', 'clean'],
  ['senol-gunes', 'Şenol Güneş', 'KL', 'Türkiye', 1, 'side', 'olive', 'moustache'],
  ['yasin-ozdenak', 'Yasin Özdenak', 'KL', 'Türkiye', 1, 'long-side', 'light', 'moustache'],
  ['rustu-recber', 'Rüştü Reçber', 'KL', 'Türkiye', 1, 'ponytail', 'olive', 'goatee'],
  ['volkan-demirel', 'Volkan Demirel', 'KL', 'Türkiye', 1, 'short', 'olive', 'beard'],
  ['tanju-colak', 'Tanju Çolak', 'FV', 'Türkiye', 9, 'curls', 'olive', 'moustache'],
  ['aykut-kocaman', 'Aykut Kocaman', 'FV', 'Türkiye', 11, 'curls', 'light', 'clean'],
  ['feyyaz-ucar', 'Feyyaz Uçar', 'FV', 'Türkiye', 9, 'curls', 'olive', 'moustache'],
  ['hakan-sukur', 'Hakan Şükür', 'FV', 'Türkiye', 9, 'short', 'olive', 'clean'],
  ['ridvan-dilmen', 'Rıdvan Dilmen', 'OF', 'Türkiye', 10, 'long-curls', 'olive', 'clean'],
  ['sergen-yalcin', 'Sergen Yalçın', 'OF', 'Türkiye', 10, 'curls', 'light', 'clean'],
  ['oguz-cetin', 'Oğuz Çetin', 'OF', 'Türkiye', 10, 'curls', 'olive', 'moustache'],
  ['tugay-kerimoglu', 'Tugay Kerimoğlu', 'OF', 'Türkiye', 5, 'centre', 'olive', 'clean'],
  ['hami-mandirali', 'Hami Mandıralı', 'FV', 'Türkiye', 10, 'side', 'olive', 'moustache'],
  ['fatih-tekke', 'Fatih Tekke', 'FV', 'Türkiye', 9, 'long-side', 'olive', 'goatee'],
  ['ertugrul-saglam', 'Ertuğrul Sağlam', 'FV', 'Türkiye', 9, 'curls', 'light', 'clean'],
  ['arif-erdem', 'Arif Erdem', 'FV', 'Türkiye', 7, 'short', 'olive', 'clean'],
  ['ilhan-mansiz', 'İlhan Mansız', 'FV', 'Türkiye', 17, 'top-knot', 'olive', 'goatee'],
  ['nihat-kahveci', 'Nihat Kahveci', 'FV', 'Türkiye', 8, 'spikes', 'olive', 'stubble'],
  ['tuncay-sanli', 'Tuncay Şanlı', 'FV', 'Türkiye', 17, 'spikes', 'olive', 'stubble'],
  ['burak-yilmaz', 'Burak Yılmaz', 'FV', 'Türkiye', 17, 'short', 'olive', 'beard'],
  ['semih-senturk', 'Semih Şentürk', 'FV', 'Türkiye', 9, 'spikes', 'light', 'stubble'],
  ['umit-karan', 'Ümit Karan', 'FV', 'Türkiye', 9, 'centre', 'olive', 'goatee'],
  ['hasan-sas', 'Hasan Şaş', 'OF', 'Türkiye', 11, 'buzz', 'olive', 'clean'],
  ['okan-buruk', 'Okan Buruk', 'OF', 'Türkiye', 7, 'centre', 'olive', 'clean'],
  ['emre-belozoglu', 'Emre Belözoğlu', 'OF', 'Türkiye', 5, 'spikes', 'olive', 'clean'],
  ['arda-turan', 'Arda Turan', 'OF', 'Türkiye', 10, 'sweep', 'olive', 'beard'],
  ['hamit-altintop', 'Hamit Altıntop', 'OF', 'Türkiye', 22, 'short', 'olive', 'stubble'],
  ['gokdeniz-karadeniz', 'Gökdeniz Karadeniz', 'OF', 'Türkiye', 7, 'short', 'olive', 'stubble'],
  ['mehmet-aurelio', 'Mehmet Aurélio', 'OF', 'Türkiye', 6, 'buzz', 'brown', 'clean'],
  ['mehmet-topal', 'Mehmet Topal', 'OF', 'Türkiye', 15, 'short', 'olive', 'beard'],
  ['selcuk-inan', 'Selçuk İnan', 'OF', 'Türkiye', 8, 'sweep', 'olive', 'stubble'],
  ['tayfun-korkut', 'Tayfun Korkut', 'OF', 'Türkiye', 8, 'centre', 'olive', 'clean'],
  ['tumer-metin', 'Tümer Metin', 'OF', 'Türkiye', 10, 'long-side', 'olive', 'stubble'],
  ['bulent-korkmaz', 'Bülent Korkmaz', 'DF', 'Türkiye', 3, 'short', 'olive', 'clean'],
  ['alpay-ozalan', 'Alpay Özalan', 'DF', 'Türkiye', 5, 'short', 'olive', 'clean'],
  ['ogun-temizkanoglu', 'Ogün Temizkanoğlu', 'DF', 'Türkiye', 4, 'curls', 'olive', 'moustache'],
  ['umit-ozat', 'Ümit Özat', 'DF', 'Türkiye', 16, 'short', 'light', 'clean'],
  ['hakan-unsal', 'Hakan Ünsal', 'DF', 'Türkiye', 20, 'short', 'olive', 'clean'],
  ['hakan-balta', 'Hakan Balta', 'DF', 'Türkiye', 3, 'short', 'olive', 'beard'],
  ['servet-cetin', 'Servet Çetin', 'DF', 'Türkiye', 2, 'short', 'olive', 'stubble'],
  ['fatih-akyel', 'Fatih Akyel', 'DF', 'Türkiye', 2, 'buzz', 'olive', 'clean'],
  ['emre-asik', 'Emre Aşık', 'DF', 'Türkiye', 4, 'side', 'olive', 'clean'],
  ['ibrahim-uzulmez', 'İbrahim Üzülmez', 'DF', 'Türkiye', 3, 'receding', 'olive', 'clean'],
  ['gokhan-gonul', 'Gökhan Gönül', 'DF', 'Türkiye', 7, 'short', 'olive', 'stubble'],
  ['sabri-sarioglu', 'Sabri Sarıoğlu', 'DF', 'Türkiye', 22, 'spikes', 'olive', 'clean'],
  ['ibrahim-toraman', 'İbrahim Toraman', 'DF', 'Türkiye', 4, 'sweep', 'olive', 'stubble'],
];

const worldDefinitions = [
  ['lionel-messi', 'Lionel Messi', 'FV', 'Arjantin', 10, 'sweep', 'light', 'beard'],
  ['cristiano-ronaldo', 'Cristiano Ronaldo', 'FV', 'Portekiz', 7, 'spikes', 'olive', 'clean'],
  ['kylian-mbappe', 'Kylian Mbappé', 'FV', 'Fransa', 10, 'buzz', 'brown', 'smile'],
  ['erling-haaland', 'Erling Haaland', 'FV', 'Norveç', 9, 'blond-ponytail', 'pale', 'clean'],
  ['vinicius-junior', 'Vinícius Júnior', 'FV', 'Brezilya', 7, 'tight-curls', 'deep', 'smile'],
  ['mohamed-salah', 'Mohamed Salah', 'FV', 'Mısır', 10, 'curls', 'olive', 'beard'],
  ['harry-kane', 'Harry Kane', 'FV', 'İngiltere', 9, 'sweep', 'light', 'stubble'],
  ['lamine-yamal', 'Lamine Yamal', 'FV', 'İspanya', 19, 'tight-curls', 'brown', 'clean'],
  ['bukayo-saka', 'Bukayo Saka', 'FV', 'İngiltere', 7, 'tight-curls', 'deep', 'smile'],
  ['robert-lewandowski', 'Robert Lewandowski', 'FV', 'Polonya', 9, 'short', 'light', 'clean'],
  ['neymar', 'Neymar', 'FV', 'Brezilya', 10, 'spikes', 'brown', 'stubble'],
  ['lautaro-martinez', 'Lautaro Martínez', 'FV', 'Arjantin', 22, 'spikes', 'olive', 'stubble'],
  ['julian-alvarez', 'Julián Álvarez', 'FV', 'Arjantin', 9, 'short', 'light', 'clean'],
  ['victor-osimhen', 'Victor Osimhen', 'FV', 'Nijerya', 9, 'blond-buzz', 'deep', 'clean'],
  ['alexander-isak', 'Alexander Isak', 'FV', 'İsveç', 9, 'short', 'dark', 'stubble'],
  ['raphinha', 'Raphinha', 'FV', 'Brezilya', 11, 'short', 'brown', 'goatee'],
  ['rodrygo', 'Rodrygo', 'FV', 'Brezilya', 11, 'tight-curls', 'brown', 'clean'],
  ['son-heung-min', 'Son Heung-min', 'FV', 'Güney Kore', 7, 'centre', 'light', 'smile'],
  ['ousmane-dembele', 'Ousmane Dembélé', 'FV', 'Fransa', 11, 'buzz', 'deep', 'smile'],
  ['jude-bellingham', 'Jude Bellingham', 'OF', 'İngiltere', 10, 'tight-curls', 'brown', 'clean'],
  ['phil-foden', 'Phil Foden', 'OF', 'İngiltere', 20, 'buzz', 'pale', 'clean'],
  ['cole-palmer', 'Cole Palmer', 'OF', 'İngiltere', 20, 'short', 'pale', 'clean'],
  ['jamal-musiala', 'Jamal Musiala', 'OF', 'Almanya', 10, 'tight-curls', 'brown', 'clean'],
  ['florian-wirtz', 'Florian Wirtz', 'OF', 'Almanya', 17, 'centre', 'light', 'clean'],
  ['pedri', 'Pedri', 'OF', 'İspanya', 20, 'short', 'olive', 'stubble'],
  ['rodri', 'Rodri', 'OF', 'İspanya', 16, 'short', 'olive', 'clean'],
  ['declan-rice', 'Declan Rice', 'OF', 'İngiltere', 4, 'side', 'light', 'stubble'],
  ['bruno-fernandes', 'Bruno Fernandes', 'OF', 'Portekiz', 8, 'sweep', 'olive', 'beard'],
  ['bernardo-silva', 'Bernardo Silva', 'OF', 'Portekiz', 10, 'sweep', 'light', 'beard'],
  ['kevin-de-bruyne', 'Kevin De Bruyne', 'OF', 'Belçika', 7, 'blond-side', 'pale', 'clean'],
  ['martin-odegaard', 'Martin Ødegaard', 'OF', 'Norveç', 10, 'blond-side', 'pale', 'clean'],
  ['federico-valverde', 'Federico Valverde', 'OF', 'Uruguay', 15, 'short', 'light', 'stubble'],
  ['aurelien-tchouameni', 'Aurélien Tchouaméni', 'OF', 'Fransa', 8, 'short', 'deep', 'clean'],
  ['eduardo-camavinga', 'Eduardo Camavinga', 'OF', 'Fransa', 6, 'dreads', 'deep', 'clean'],
  ['bruno-guimaraes', 'Bruno Guimarães', 'OF', 'Brezilya', 5, 'short', 'olive', 'stubble'],
  ['virgil-van-dijk', 'Virgil van Dijk', 'DF', 'Hollanda', 4, 'top-knot', 'brown', 'goatee'],
  ['william-saliba', 'William Saliba', 'DF', 'Fransa', 17, 'buzz', 'brown', 'stubble'],
  ['ruben-dias', 'Rúben Dias', 'DF', 'Portekiz', 4, 'sweep', 'olive', 'stubble'],
  ['achraf-hakimi', 'Achraf Hakimi', 'DF', 'Fas', 2, 'short', 'olive', 'stubble'],
  ['trent-alexander-arnold', 'Trent Alexander-Arnold', 'DF', 'İngiltere', 2, 'dreads', 'brown', 'clean'],
  ['theo-hernandez', 'Theo Hernández', 'DF', 'Fransa', 22, 'short', 'olive', 'beard'],
  ['antonio-rudiger', 'Antonio Rüdiger', 'DF', 'Almanya', 2, 'buzz', 'deep', 'beard'],
  ['alessandro-bastoni', 'Alessandro Bastoni', 'DF', 'İtalya', 23, 'sweep', 'light', 'clean'],
  ['marquinhos', 'Marquinhos', 'DF', 'Brezilya', 4, 'tight-curls', 'brown', 'goatee'],
  ['josko-gvardiol', 'Joško Gvardiol', 'DF', 'Hırvatistan', 4, 'short', 'light', 'beard'],
  ['thibaut-courtois', 'Thibaut Courtois', 'KL', 'Belçika', 1, 'short', 'light', 'clean'],
  ['alisson-becker', 'Alisson Becker', 'KL', 'Brezilya', 1, 'sweep', 'olive', 'beard'],
  ['gianluigi-donnarumma', 'Gianluigi Donnarumma', 'KL', 'İtalya', 1, 'short', 'olive', 'beard'],
  ['emiliano-martinez', 'Emiliano Martínez', 'KL', 'Arjantin', 23, 'short', 'light', 'stubble'],
  ['david-raya', 'David Raya', 'KL', 'İspanya', 13, 'short', 'olive', 'stubble'],
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
const pools = [
  ['turkiye-efsaneleri', 'turkish-legends', 5001, turkishDefinitions],
  ['dunya-yildizlari', 'world-stars', 6001, worldDefinitions],
];
const feed = {};
let writtenPortraits = 0;
for (const [key, directory, firstId, definitions] of pools) {
  if (definitions.length !== 50) throw new Error(`${key}: exactly 50 players are required.`);
  if (new Set(definitions.map(player => player[0])).size !== 50
      || new Set(definitions.map(player => player[1])).size !== 50) {
    throw new Error(`${key}: player names and slugs must be unique.`);
  }
  for (const tag of ['FV', 'OF', 'DF', 'KL']) {
    if (definitions.filter(player => player[2] === tag).length < 3) {
      throw new Error(`${key}: every position needs at least 3 cards for team selection.`);
    }
  }
  const outputDirectory = new URL(`assets/images/${directory}/`, root);
  await mkdir(outputDirectory, { recursive: true });
  feed[key] = [];
  for (const [index, definition] of definitions.entries()) {
    const [slug, isim, etiket, takim] = definition;
    const id = firstId + index;
    const svg = portrait(definition, id);
    if (/<(?:script|foreignObject)|(?:href|onload)=/i.test(svg)) {
      throw new Error(`${key}/${slug}: portraits must contain only static SVG primitives.`);
    }
    const path = new URL(`${slug}.svg`, outputDirectory);
    let previous;
    try { previous = await readFile(path, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous !== svg) {
      await writeFile(path, svg, 'utf8');
      writtenPortraits += 1;
    }
    feed[key].push({ id, isim, gorsel: `assets/images/${directory}/${slug}.svg`, etiket, takim, takimTuru: 'milli' });
  }
}
const outputPath = new URL('tools/expansion-football.json', root);
await writeFile(outputPath, `${JSON.stringify(feed, null, 2)}\n`, 'utf8');
console.log(`${pools.length} collections, 100 verified portraits; ${writtenPortraits} written.`);
console.log(`Feed: ${fileURLToPath(outputPath)}`);
for (const [key, cards] of Object.entries(feed)) {
  console.log(`${key}: ${JSON.stringify(Object.fromEntries(['FV', 'OF', 'DF', 'KL'].map(tag => [tag, cards.filter(card => card.etiket === tag).length])))}`);
}
