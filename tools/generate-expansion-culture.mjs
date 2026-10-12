import { mkdir, writeFile } from 'node:fs/promises';

// Original pixel illustrations, drawn locally from editorial art directions.
// This tool writes only its feed, icons and assets; it never modifies veri.json.
const root = new URL('../', import.meta.url);
const artists = [
  ['tarkan', 'Tarkan', 'Pop', 'sanatci', 'sweep', 'black', 'clean', 'mic', '#688c8b'],
  ['sezen-aksu', 'Sezen Aksu', 'Pop', 'sanatci', 'long-curls', 'auburn', 'clean', 'mic', '#b36d83'],
  ['ajda-pekkan', 'Ajda Pekkan', 'Pop', 'sanatci', 'long', 'blond', 'clean', 'mic', '#a393b7'],
  ['sertab-erener', 'Sertab Erener', 'Pop', 'sanatci', 'curls', 'brown', 'clean', 'mic', '#b6656e'],
  ['baris-manco', 'Barış Manço', 'Rock', 'sanatci', 'long', 'black', 'moustache', 'guitar', '#91709d'],
  ['cem-karaca', 'Cem Karaca', 'Rock', 'sanatci', 'long-curls', 'black', 'moustache-glasses', 'mic', '#a87051'],
  ['erkin-koray', 'Erkin Koray', 'Rock', 'sanatci', 'long', 'black', 'clean', 'guitar', '#7e8f62'],
  ['fikret-kizilok', 'Fikret Kızılok', 'Rock', 'sanatci', 'sweep', 'brown', 'moustache', 'guitar', '#648b9b'],
  ['mfo', 'MFÖ', 'Pop', 'grup', 'trio', 'black', 'clean', 'acoustic', '#94836c'],
  ['duman', 'Duman', 'Rock', 'grup', 'four', 'black', 'clean', 'electric', '#6d8a79'],
  ['mor-ve-otesi', 'mor ve ötesi', 'Rock', 'grup', 'four', 'brown', 'clean', 'electric', '#927fa2'],
  ['manga', 'maNga', 'Rock', 'grup', 'five', 'black', 'clean', 'electronic', '#a47b72'],
  ['athena', 'Athena', 'Rock', 'grup', 'four', 'auburn', 'clean', 'ska', '#b57367'],
  ['gripin', 'Gripin', 'Rock', 'grup', 'four', 'brown', 'clean', 'electric', '#7393a4'],
  ['teoman', 'Teoman', 'Rock', 'sanatci', 'curls', 'black', 'stubble', 'guitar', '#798691'],
  ['sebnem-ferah', 'Şebnem Ferah', 'Rock', 'sanatci', 'long', 'black', 'clean', 'mic', '#976c8c'],
  ['haluk-levent', 'Haluk Levent', 'Rock', 'sanatci', 'long', 'black', 'beard', 'guitar', '#b48659'],
  ['hayko-cepkin', 'Hayko Cepkin', 'Rock', 'sanatci', 'mohawk', 'black', 'makeup', 'keys', '#927b9c'],
  ['ozlem-tekin', 'Özlem Tekin', 'Rock', 'sanatci', 'long', 'black', 'clean', 'mic', '#678987'],
  ['yuksek-sadakat', 'Yüksek Sadakat', 'Rock', 'grup', 'five', 'black', 'clean', 'electric', '#a89660'],
  ['model', 'Model', 'Rock', 'grup', 'five', 'auburn', 'clean', 'electric', '#b77a87'],
  ['pinhani', 'Pinhani', 'Rock', 'grup', 'five', 'black', 'clean', 'acoustic', '#7e9874'],
  ['mogollar', 'Moğollar', 'Rock', 'grup', 'four', 'grey', 'clean', 'folk-rock', '#a98960'],
  ['bulent-ortacgil', 'Bülent Ortaçgil', 'Rock', 'sanatci', 'short', 'grey', 'beard-glasses', 'guitar', '#78958d'],
  ['zeki-muren', 'Zeki Müren', 'Türk Sanat Müziği', 'sanatci', 'sweep', 'black', 'clean', 'vintage-mic', '#ad839b'],
  ['muzeyyen-senar', 'Müzeyyen Senar', 'Türk Sanat Müziği', 'sanatci', 'updo', 'black', 'clean', 'vintage-mic', '#9a755d'],
  ['bulent-ersoy', 'Bülent Ersoy', 'Türk Sanat Müziği', 'sanatci', 'updo', 'black', 'clean', 'vintage-mic', '#968ba8'],
  ['orhan-gencebay', 'Orhan Gencebay', 'Arabesk', 'sanatci', 'sweep', 'black', 'moustache', 'baglama', '#957c5f'],
  ['ferdi-tayfur', 'Ferdi Tayfur', 'Arabesk', 'sanatci', 'sweep', 'black', 'moustache', 'mic', '#7c8d69'],
  ['muslum-gurses', 'Müslüm Gürses', 'Arabesk', 'sanatci', 'curls', 'black', 'moustache', 'vintage-mic', '#89889d'],
  ['ibrahim-tatlises', 'İbrahim Tatlıses', 'Arabesk', 'sanatci', 'short', 'black', 'moustache', 'mic', '#9c7767'],
  ['bergen', 'Bergen', 'Arabesk', 'sanatci', 'long-curls', 'blond', 'clean', 'mic', '#b77789'],
  ['gulden-karabocek', 'Gülden Karaböcek', 'Arabesk', 'sanatci', 'long-curls', 'black', 'clean', 'mic', '#8479a1'],
  ['neset-ertas', 'Neşet Ertaş', 'Halk', 'sanatci', 'cap', 'grey', 'moustache', 'baglama', '#927c5c'],
  ['asik-veysel', 'Âşık Veysel', 'Halk', 'sanatci', 'cap', 'grey', 'moustache', 'baglama', '#728b68'],
  ['selda-bagcan', 'Selda Bağcan', 'Halk', 'sanatci', 'long-curls', 'black', 'clean', 'guitar', '#a87460'],
  ['sabahat-akkiraz', 'Sabahat Akkiraz', 'Halk', 'sanatci', 'long', 'black', 'clean', 'mic', '#a2738a'],
  ['ceza', 'Ceza', 'Rap', 'sanatci', 'cap', 'black', 'beard', 'mic', '#75838f'],
  ['sagopa-kajmer', 'Sagopa Kajmer', 'Rap', 'sanatci', 'short', 'black', 'beard', 'decks', '#87818f'],
  ['ezhel', 'Ezhel', 'Rap', 'sanatci', 'locks', 'black', 'goatee', 'mic', '#aa9060'],
  ['sila', 'Sıla', 'Pop', 'sanatci', 'long-curls', 'brown', 'clean', 'mic', '#6e969c'],
  ['kenan-dogulu', 'Kenan Doğulu', 'Pop', 'sanatci', 'sweep', 'black', 'stubble', 'guitar', '#b28c58'],
  ['gulsen', 'Gülşen', 'Pop', 'sanatci', 'long', 'blond', 'clean', 'mic', '#bd7e80'],
  ['hande-yener', 'Hande Yener', 'Pop', 'sanatci', 'bob', 'auburn', 'clean', 'mic', '#927da5'],
  ['goksel', 'Göksel', 'Pop', 'sanatci', 'bob', 'black', 'clean', 'mic', '#738f89'],
  ['yildiz-tilbe', 'Yıldız Tilbe', 'Pop', 'sanatci', 'curls', 'auburn', 'clean', 'mic', '#b08475'],
  ['ebru-gundes', 'Ebru Gündeş', 'Arabesk', 'sanatci', 'long', 'black', 'clean', 'mic', '#987a9a'],
  ['levent-yuksel', 'Levent Yüksel', 'Pop', 'sanatci', 'short', 'black', 'stubble', 'bass', '#6d958a'],
  ['mabel-matiz', 'Mabel Matiz', 'Pop', 'sanatci', 'curls', 'black', 'moustache', 'mic', '#b69762'],
  ['derya-ulug', 'Derya Uluğ', 'Pop', 'sanatci', 'long', 'brown', 'clean', 'mic', '#927caa']
];

// Complete 25-district list checked against ABB's official Muhtarlar directory.
// Landmarks are representative illustrations, never maps or boundary claims.
const districts = [
  ['akyurt', 'Akyurt', 'fields'],
  ['altindag', 'Altındağ', 'castle'],
  ['ayas', 'Ayaş', 'orchard'],
  ['bala', 'Bala', 'pine'],
  ['beypazari', 'Beypazarı', 'oldtown'],
  ['camlidere', 'Çamlıdere', 'forest-lake'],
  ['cankaya', 'Çankaya', 'monument'],
  ['cubuk', 'Çubuk', 'dam'],
  ['elmadag', 'Elmadağ', 'snow'],
  ['etimesgut', 'Etimesgut', 'railway'],
  ['evren', 'Evren', 'boat-lake'],
  ['golbasi', 'Gölbaşı', 'reeds'],
  ['gudul', 'Güdül', 'valley'],
  ['haymana', 'Haymana', 'thermal'],
  ['kahramankazan', 'Kahramankazan', 'fields-plane'],
  ['kalecik', 'Kalecik', 'castle-grapes'],
  ['kecioren', 'Keçiören', 'tower'],
  ['kizilcahamam', 'Kızılcahamam', 'forest-spring'],
  ['mamak', 'Mamak', 'lake-bridge'],
  ['nallihan', 'Nallıhan', 'striped-hills'],
  ['polatli', 'Polatlı', 'tumulus'],
  ['pursaklar', 'Pursaklar', 'park'],
  ['sincan', 'Sincan', 'tulips'],
  ['sereflikochisar', 'Şereflikoçhisar', 'salt-lake'],
  ['yenimahalle', 'Yenimahalle', 'cable-car']
];

const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
function drawing(name) {
  const parts = [];
  const rect = (x, y, w, h, fill) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
  const path = (d, fill) => parts.push(`<path d="${d}" fill="${fill}"/>`);
  return { rect, path, finish: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${escapeXml(name)} için temsili piksel çizim" shape-rendering="crispEdges"><title>${escapeXml(name)} — özgün temsili piksel çizim</title>${parts.join('')}</svg>\n` };
}

const ink = '#484651', cream = '#f4e8cb';
const hairColors = { black: '#46413f', brown: '#73543f', auburn: '#9b5b3c', blond: '#c6a268', grey: '#9f9d8b' };
function microphone(r, x, y, vintage = false) {
  r(x + 4, y + 8, 2, 28, ink); r(x - 2, y + 34, 14, 3, ink);
  r(x, y, 10, vintage ? 13 : 8, '#686e74'); r(x + 2, y + 1, 6, vintage ? 11 : 6, '#b8c0b6');
  if (vintage) for (let row = 3; row < 12; row += 3) r(x + 1, y + row, 8, 1, '#696d71');
}
function guitar(r, x, y, baglama = false, bass = false, color = '#b28753') {
  r(x + 2, y + 9, 25, 20, ink); r(x, y + 13, 29, 13, color); r(x + 5, y + 7, 17, 27, color);
  if (baglama) { r(x + 8, y + 4, 11, 34, color); r(x + 24, y - 13, 4, 24, '#997343'); r(x + 26, y - 21, 6, 11, '#997343'); }
  else { r(x + 24, y + 4, 9, 4, '#7b6254'); r(x + 30, y - 1, 9, 4, '#7b6254'); r(x + 36, y - 9, 6, 10, '#8f7255'); }
  r(x + 10, y + 16, baglama ? 3 : 7, baglama ? 2 : 7, ink);
  r(x + 6, y + 28, 15, 2, '#705242'); r(x + 19, y + 12, 2, bass ? 15 : 12, cream);
}
function hair(r, type, color, x = 48, y = 32, scale = 1) {
  const q = (dx, dy, w, h, fill = color) => r(x + dx * scale, y + dy * scale, w * scale, h * scale, fill);
  if (['long', 'long-curls', 'locks'].includes(type)) { q(-19, -13, 38, 19); q(-20, 0, 7, 29); q(13, 0, 7, 29); }
  if (type === 'bob') { q(-19, -12, 38, 25); q(-18, 8, 7, 10); q(11, 8, 7, 10); }
  if (type === 'updo') { q(-17, -17, 34, 18); q(-10, -24, 20, 8); q(-18, -4, 6, 11); q(12, -4, 6, 11); }
  if (type === 'short') { q(-16, -12, 32, 6); q(-17, -6, 5, 8); q(12, -6, 5, 8); }
  if (['curls', 'long-curls'].includes(type)) {
    q(-18, -14, 36, 14);
    for (let i = 0; i < 6; i++) { q(-19 + i * 6, -17 + i % 2 * 3, 7, 6); q(-16 + i * 6, -6, 4, 3, '#746153'); }
    q(-19, -4, 6, 12); q(13, -4, 6, 12);
  }
  if (type === 'sweep') { q(-17, -14, 34, 10); q(-18, -4, 6, 9); q(12, -4, 6, 8); q(-11, -4, 17, 5); }
  if (type === 'long' || type === 'bob') { q(-18, -13, 36, 8); q(-15, -5, 12, 5); q(2, -5, 14, 3); }
  if (type === 'mohawk') { q(-7, -24, 13, 18); q(-3, -28, 5, 5); q(-17, -5, 3, 6); q(14, -5, 3, 6); }
  if (type === 'cap') { q(-19, -16, 38, 12, '#766d5d'); q(-14, -22, 28, 7, '#857862'); q(-21, -5, 42, 4, '#5a554d'); }
  if (type === 'locks') { q(-18, -15, 36, 10); for (let i = 0; i < 8; i++) q(-19 + i * 5, -12, 3, 12 + i % 3 * 3); }
}
function face(r, style, color, x = 48, y = 32, scale = 1) {
  const q = (dx, dy, w, h, fill) => r(x + dx * scale, y + dy * scale, w * scale, h * scale, fill);
  q(-10, 4, 6, 2, color); q(5, 4, 6, 2, color); q(-8, 8, 3, 3, ink); q(6, 8, 3, 3, ink);
  q(-1, 9, 3, 7, '#c49676'); q(-7, 19, 14, 2, '#9f6e64');
  if (style.includes('moustache')) { q(-10, 16, 20, 4, color); q(-7, 19, 14, 2, '#d5a67f'); }
  if (style.includes('beard')) { q(-13, 17, 26, 5, color); q(-9, 22, 18, 5, color); q(-6, 18, 12, 3, '#d8aa85'); }
  if (style === 'goatee') { q(-6, 17, 12, 2, color); q(-4, 22, 8, 6, color); }
  if (style === 'stubble') { q(-13, 20, 3, 4, '#b28b72'); q(10, 20, 3, 4, '#b28b72'); }
  if (style.includes('glasses')) { q(-14, 5, 12, 7, ink); q(2, 5, 12, 7, ink); q(-3, 7, 6, 2, ink); q(-11, 7, 6, 3, '#acaeab'); q(5, 7, 6, 3, '#acaeab'); }
  if (style === 'makeup') { q(-12, 7, 10, 2, '#928092'); q(3, 6, 9, 4, '#887289'); q(-8, 18, 16, 3, '#9d6281'); }
}
function stageBase(d, index, accent) {
  const { rect: r, path: p } = d;
  const back = ['#d5c8df', '#c2d8d1', '#e2ccbc', '#d8d6b9'][index % 4];
  r(0, 0, 96, 96, back); r(0, 73, 96, 23, '#9d9286'); r(0, 74, 96, 3, '#c2b6a1');
  r(0, 0, 6, 73, accent); r(90, 0, 6, 73, accent); r(0, 0, 96, 7, accent);
  p('M15 9h9l15 52H8z', '#e5e0c7'); p('M73 9h9l6 52H57z', '#dfdcc2');
  for (const x of [15, 44, 73]) { r(x, 7, 8, 5, '#787780'); r(x + 2, 12, 4, 3, '#f0d68f'); }
  r(7, 60, 13, 26, '#697479'); r(76, 60, 13, 26, '#697479');
  for (const x of [9, 78]) { r(x, 64, 9, 8, '#888d8d'); r(x + 2, 66, 5, 4, '#4f5d62'); r(x, 76, 9, 7, '#888d8d'); }
}
function artistArt(definition, index) {
  const [, name, , kind, hairStyle, hairColor, faceStyle, instrument, accent] = definition;
  const d = drawing(name), { rect: r } = d;
  stageBase(d, index, accent);
  if (kind === 'grup') {
    const count = hairStyle === 'trio' ? 3 : hairStyle === 'five' ? 5 : 4;
    // A symbolic band lineup, not a claim about present-day band membership.
    r(36, 49, 25, 20, '#9b6957'); r(40, 52, 17, 14, cream); r(46, 56, 6, 6, accent);
    r(31, 41, 12, 3, '#c5aa63'); r(58, 40, 15, 3, '#c5aa63'); r(35, 44, 2, 17, ink); r(65, 43, 2, 19, ink);
    for (let i = 0; i < count; i++) {
      const x = 17 + (count === 3 ? 28 : count === 4 ? 20 : 15) * i;
      const y = i === Math.floor(count / 2) ? 21 : 30 + i % 2 * 3;
      const color = hairColors[i === 0 ? hairColor : i % 3 === 0 ? 'blond' : 'black'];
      r(x - 5, y + 14, 10, 18, i % 2 ? '#667f80' : accent); r(x - 4, y + 32, 3, 14, ink); r(x + 1, y + 32, 3, 14, ink);
      r(x - 6, y, 12, 14, '#d8ad88'); r(x - 6, y - 2, 12, 5, color); r(x - 7, y + 3, 2, 6, color); r(x + 5, y + 3, 2, 6, color);
      r(x - 3, y + 5, 2, 2, ink); r(x + 2, y + 5, 2, 2, ink); r(x - 2, y + 11, 4, 1, '#9f6e64');
      if (i === 0 || i === count - 1) { r(x - 6, y + 24, 13, 9, instrument === 'acoustic' || instrument === 'folk-rock' ? '#b68d59' : '#a16f75'); r(x + 4, y + 20, 11, 3, '#705c4e'); r(x, y + 28, 3, 3, ink); }
      else if (i === 1) { r(x + 7, y + 15, 2, 27, ink); r(x + 6, y + 13, 4, 4, '#b7bdaf'); }
    }
    if (instrument === 'electronic') { r(31, 69, 36, 7, '#646b73'); for (let x = 33; x < 66; x += 4) r(x, 69, 3, 4, cream); }
    if (instrument === 'ska') { r(21, 61, 6, 4, '#b39b58'); r(25, 56, 3, 8, '#b39b58'); r(20, 61, 5, 7, '#d1b76c'); }
  } else {
    const h = hairColors[hairColor];
    // Hair behind the face, then shoulders and neck, then the facial features.
    if (['long', 'long-curls', 'bob', 'locks'].includes(hairStyle)) { r(28, 21, 40, 34, h); r(27, 41, 8, 24, h); r(61, 41, 8, 24, h); }
    r(28, 59, 40, 33, accent); r(20, 65, 12, 22, accent); r(65, 65, 11, 22, accent);
    r(42, 52, 12, 10, '#be8e6e'); r(33, 23, 30, 32, '#d9ae88'); r(30, 34, 3, 12, '#d9ae88'); r(63, 34, 3, 12, '#bc8a6a'); r(60, 29, 3, 23, '#c69673');
    hair(r, hairStyle, h); face(r, faceStyle, h);
    r(39, 61, 4, 20, '#d8ccb7'); r(52, 61, 4, 20, '#d8ccb7');
    if (['guitar', 'bass', 'baglama'].includes(instrument)) { guitar(r, 35, 60, instrument === 'baglama', instrument === 'bass', instrument === 'bass' ? '#916b82' : '#b38a57'); r(23, 76, 16, 6, '#d9ae88'); r(61, 66, 13, 5, '#d9ae88'); }
    else if (instrument === 'keys') { r(19, 76, 60, 11, '#697179'); for (let x = 22; x < 78; x += 5) r(x, 77, 4, 7, cream); for (let x = 26; x < 75; x += 10) r(x, 77, 2, 4, ink); r(26, 71, 8, 5, '#d9ae88'); r(60, 71, 8, 5, '#d9ae88'); }
    else if (instrument === 'decks') { r(20, 76, 57, 12, '#647078'); for (const x of [26, 55]) { r(x, 78, 15, 8, ink); r(x + 5, 80, 5, 4, '#b4b4a7'); } r(46, 77, 4, 10, '#9b9b8c'); }
    else { microphone(r, 63, 49, instrument === 'vintage-mic'); r(61, 64, 9, 6, '#d9ae88'); }
    if (name === 'Barış Manço') { for (const x of [25, 30]) r(x, 78, 2, 3, '#d5bb68'); r(34, 58, 3, 5, '#d5bb68'); }
    if (['Zeki Müren', 'Bülent Ersoy'].includes(name)) for (let i = 0; i < 7; i++) r(31 + (i * 7 % 34), 65 + (i * 5 % 22), 2, 2, '#e9d187');
  }
  // A small music-note stamp is consistently placed clear of facial details.
  r(6, 8, 12, 11, '#ece1bd'); r(14, 9, 2, 7, accent); r(10, 14, 6, 3, accent); r(14, 9, 4, 2, accent);
  return d.finish();
}

function districtArt(definition, index) {
  const [, name, style] = definition;
  const d = drawing(name), { rect: r, path: p } = d;
  const stone = '#b39879', stoneLight = '#d2b897', brick = '#a77863', grass = '#8da57a', tree = '#5f886c', water = '#81acb2';
  r(0, 0, 96, 96, ['#c9d9dc', '#d4d4e1', '#d6dec8', '#e2d7bf'][index % 4]);
  r(68, 11, 13, 12, '#ebd090'); r(65, 14, 19, 6, '#ebd090'); r(11, 13, 20, 4, cream); r(6, 17, 32, 4, cream);
  p('M0 51h7V44h12V36h10v9h12v8h10V43h9V38h13v9h14v6h9v43H0z', '#9fac94');
  r(0, 66, 96, 30, grass); r(0, 87, 96, 9, '#81996e');
  const pine = (x, y, height = 28) => { r(x + 8, y + height - 7, 4, 15, '#8c7256'); p(`M${x + 10} ${y}h4v6h4v5h4v5h4v${height - 16}H${x - 2}v-${height - 16}h4v-5h4v-5h4z`, tree); r(x + 7, y + 7, 4, 7, '#7ca27b'); };
  const house = (x, y, width = 24, height = 28) => { r(x, y, width, height, cream); p(`M${x - 3} ${y}v-3h4v-4h4v-4h${width - 10}v4h4v4h4v3z`, brick); r(x + 2, y + 3, width - 4, 3, '#a6886a'); r(x + width / 2 - 3, y + height - 10, 6, 10, '#806755'); for (let dx = 3; dx < width - 3; dx += 11) r(x + dx, y + 9, 5, 7, '#688794'); };
  const lake = (salt = false) => { r(0, 62, 96, 26, salt ? '#dce0ce' : water); r(0, 66, 96, 3, salt ? '#f2ead7' : '#acd2cd'); r(11, 79, 35, 2, salt ? '#bfcac2' : '#b5d6ce'); r(58, 72, 28, 2, salt ? '#f4ecdf' : '#bfdcd4'); };
  const castle = (x, y, width) => { r(x, y, width, 29, stone); r(x - 5, y - 8, 12, 38, stoneLight); r(x + width - 7, y - 8, 12, 38, stoneLight); for (const tx of [x - 5, x + width - 7]) { r(tx, y - 12, 4, 7, stoneLight); r(tx + 8, y - 12, 4, 7, stoneLight); r(tx + 4, y + 2, 3, 9, '#7e715d'); } for (let bx = x + 11; bx < x + width - 7; bx += 12) r(bx, y + 5, 5, 5, '#887962'); r(x + width / 2 - 6, y + 12, 12, 17, '#80735e'); };
  const flowers = (tulip = false) => { for (let i = 0; i < 7; i++) { const x = 7 + i * 13, y = 79 + i % 2 * 4; r(x + 3, y, 2, 12, tree); r(x, y - 3, 8, 5, i % 2 ? '#d0a65f' : '#b87887'); if (tulip) { r(x, y - 5, 2, 3, '#b87887'); r(x + 6, y - 5, 2, 3, '#b87887'); } r(x + 5, y + 7, 4, 2, tree); } };
  if (style === 'castle' || style === 'castle-grapes') {
    p('M10 71h11V60h12V46h30v14h13v11h9v10H10z', '#948e71'); castle(29, 40, 39);
    if (style === 'castle-grapes') { r(6, 72, 3, 19, '#8b7055'); for (let i = 0; i < 8; i++) r(4 + i % 3 * 4, 69 + Math.floor(i / 3) * 4, 4, 4, '#8d7898'); r(7, 66, 7, 3, tree); }
  } else if (style === 'oldtown' || style === 'orchard') {
    house(9, 42, 27, 34); house(59, 36, 27, 40); house(35, 51, 24, 31); r(0, 84, 96, 4, '#c2ae8e');
    if (style === 'orchard') { for (let i = 0; i < 5; i++) { const x = 8 + i * 18; r(x, 91, 11, 3, '#b9705e'); r(x + 2, 87, 7, 4, '#be765e'); r(x + 5, 85, 2, 3, tree); } }
  } else if (style === 'monument') {
    r(14, 74, 68, 7, stone); r(19, 68, 58, 6, stoneLight); r(24, 41, 48, 27, cream); r(21, 35, 54, 7, stoneLight);
    for (let x = 27; x < 71; x += 7) { r(x, 43, 4, 22, stoneLight); r(x + 4, 43, 3, 22, '#968c78'); }
    r(18, 83, 60, 3, '#d8c5a7'); r(22, 88, 52, 3, '#d8c5a7'); r(82, 26, 2, 52, '#727b77'); r(84, 26, 9, 8, '#b46e69');
  } else if (['forest-lake', 'boat-lake', 'reeds', 'dam', 'lake-bridge', 'salt-lake'].includes(style)) {
    lake(style === 'salt-lake');
    if (style === 'forest-lake') { for (const x of [2, 21, 71]) pine(x, 32, 26); }
    if (style === 'boat-lake') { r(33, 70, 30, 5, '#a17656'); r(37, 75, 22, 4, '#a17656'); r(46, 42, 2, 28, ink); p('M48 44h3v4h4v5h4v5h4v6H48z', cream); }
    if (style === 'reeds') { for (let i = 0; i < 8; i++) { const x = 4 + i * 4; r(x, 66 + i % 3 * 4, 2, 23, tree); r(x - 1, 64 + i % 3 * 4, 4, 8, '#b69767'); } r(68, 76, 15, 5, cream); r(78, 68, 5, 10, cream); r(78, 66, 8, 4, cream); r(85, 67, 3, 2, '#b98554'); }
    if (style === 'dam') { r(24, 47, 53, 27, stoneLight); r(20, 44, 60, 6, stone); for (let x = 30; x < 73; x += 10) { r(x, 55, 5, 15, '#8aa4a1'); r(x, 70, 5, 8, '#b5d2c9'); } }
    if (style === 'lake-bridge') { r(15, 68, 66, 5, '#c3b190'); r(16, 72, 4, 8, '#a5977c'); r(42, 72, 5, 10, '#a5977c'); r(77, 72, 4, 8, '#a5977c'); pine(3, 34, 23); }
    if (style === 'salt-lake') { r(37, 60, 14, 5, '#c58d96'); r(48, 51, 3, 13, '#c58d96'); r(47, 48, 8, 4, '#c58d96'); r(53, 50, 5, 2, ink); r(40, 65, 2, 16, '#a4737a'); r(46, 65, 2, 16, '#a4737a'); }
  } else if (style === 'snow') {
    p('M3 73h5v-9h9V52h9V37h12V22h14v15h12v15h10v12h11v9z', '#909a9b');
    p('M28 40h10V24h12v13h10v8H48v-4H38v4H28z', '#eeecdb'); r(0, 75, 96, 9, '#dfe2cf'); r(31, 72, 29, 2, '#89999c'); r(42, 56, 2, 16, ink); r(41, 53, 5, 6, '#9c7270'); r(35, 63, 14, 2, '#9c7270');
  } else if (style === 'railway' || style === 'tulips') {
    if (style === 'railway') house(15, 41, 51, 31);
    r(0, 77, 96, 3, '#777975'); for (let x = 0; x < 96; x += 9) r(x, 81, 5, 3, '#8b7458'); r(0, 86, 96, 3, '#777975');
    r(44, 62, 36, 13, '#768f8d'); r(41, 66, 42, 6, '#768f8d'); for (let x = 48; x < 80; x += 8) r(x, 64, 5, 5, '#d7dcc6'); r(48, 74, 7, 4, ink); r(70, 74, 7, 4, ink);
    if (style === 'tulips') { r(0, 85, 96, 11, grass); flowers(true); }
  } else if (style === 'fields' || style === 'fields-plane') {
    r(0, 62, 96, 29, '#c6b77b'); for (let i = 0; i < 8; i++) { const x = 6 + i * 12; r(x, 66 + i % 2 * 6, 2, 23, '#997e4a'); r(x - 3, 69 + i % 2 * 6, 8, 3, '#ddc68a'); r(x - 2, 75 + i % 2 * 6, 6, 2, '#ddc68a'); } house(7, 43, 19, 17);
    if (style === 'fields-plane') { r(57, 32, 3, 18, '#767e81'); r(40, 38, 37, 5, '#767e81'); r(49, 46, 20, 3, '#767e81'); r(57, 29, 3, 6, '#767e81'); }
  } else if (style === 'pine' || style === 'forest-spring') {
    for (const [x, y, h] of [[0, 39, 28], [19, 29, 34], [44, 32, 31], [70, 39, 25]]) pine(x, y, h);
    if (style === 'forest-spring') { r(27, 76, 40, 10, water); r(32, 72, 30, 8, '#b7d0be'); for (const x of [40, 51]) { r(x, 60, 2, 6, '#edf0da'); r(x + 2, 54, 2, 6, '#edf0da'); } }
  } else if (style === 'valley') {
    p('M0 34h12v8h10v11h10v30H0z', '#baaa86'); p('M64 40h10V30h14v-5h8v58H64z', '#b49b7a'); r(39, 62, 15, 34, water); r(34, 81, 26, 6, water); house(24, 52, 23, 21); pine(71, 57, 23);
  } else if (style === 'thermal') {
    r(13, 67, 70, 18, stone); r(18, 70, 60, 12, water); r(24, 72, 48, 3, '#b8d0c4'); house(21, 36, 55, 29);
    for (const x of [28, 45, 62]) { r(x, 53, 2, 10, '#eff0dc'); r(x + 2, 47, 2, 7, '#eff0dc'); }
  } else if (style === 'tower') {
    r(30, 30, 33, 50, '#cfb59a'); r(26, 26, 41, 8, '#ad8b70'); p('M30 25v-5h6v-5h6v-7h9v7h6v5h6v5z', '#a17c62');
    for (const y of [37, 53]) for (const x of [36, 51]) r(x, y, 6, 9, '#7b847e'); r(40, 65, 13, 15, '#88715c'); r(8, 69, 12, 14, '#9fc0b7'); r(10, 70, 8, 3, '#c9ddd0');
  } else if (style === 'striped-hills') {
    p('M0 74h10V64h9V51h10V37h10v-7h10v11h10v12h10v11h12v10z', '#bf8e69');
    for (const [x, y, w, color] of [[19, 53, 42, '#d9c094'], [10, 65, 69, '#aa7968'], [29, 42, 22, '#cda782'], [0, 75, 91, '#dbc79d']]) r(x, y, w, 5, color);
    r(0, 86, 96, 10, water); r(68, 79, 12, 4, cream); r(77, 74, 3, 6, cream); r(75, 72, 9, 3, cream); r(82, 73, 3, 1, ink);
  } else if (style === 'tumulus') {
    p('M10 79h7v-9h9V58h10V46h24v12h10v12h9v9h7v8H10z', '#baa078');
    r(38, 63, 20, 23, '#927b59'); r(42, 68, 12, 18, '#5e6451'); r(17, 87, 63, 4, '#d2bc90');
  } else if (style === 'cable-car') {
    r(9, 23, 3, 60, '#7d867b'); r(79, 17, 3, 66, '#7d867b'); r(7, 22, 77, 2, '#767e78'); r(13, 26, 63, 2, '#767e78');
    for (const [x, y] of [[26, 33], [55, 30]]) { r(x + 7, 23, 2, y - 20, ink); r(x, y, 18, 15, '#b78483'); r(x + 3, y + 3, 12, 6, '#d7dccc'); r(x + 3, y + 14, 12, 2, '#876969'); }
    house(38, 55, 23, 24); pine(0, 57, 24);
  } else if (style === 'park') {
    pine(5, 40, 30); pine(68, 44, 27); r(29, 70, 37, 4, '#a37b5d'); r(31, 59, 33, 4, '#a37b5d'); r(31, 64, 33, 3, '#a37b5d'); r(33, 73, 3, 9, ink); r(59, 73, 3, 9, ink); flowers();
  }
  // 06 is a plate-code stamp, not a drawn municipal boundary.
  r(4, 4, 17, 10, cream); r(7, 6, 5, 6, '#767b72'); r(8, 7, 3, 4, cream); r(14, 6, 5, 6, '#767b72'); r(15, 7, 4, 1, cream); r(15, 9, 3, 2, cream);
  return d.finish();
}

await mkdir(new URL('assets/images/artists/', root), { recursive: true });
await mkdir(new URL('assets/images/ankara/', root), { recursive: true });
const feed = { 'yerli-sanatcilar': [], 'ankara-ilceleri': [] };
for (const [index, definition] of artists.entries()) {
  const [slug, isim, etiket, tip] = definition;
  const gorsel = `assets/images/artists/${slug}.svg`;
  await writeFile(new URL(gorsel, root), artistArt(definition, index));
  feed['yerli-sanatcilar'].push({ id: 7001 + index, isim, gorsel, etiket, tip });
}
for (const [index, definition] of districts.entries()) {
  const [slug, isim] = definition;
  const gorsel = `assets/images/ankara/${slug}.svg`;
  await writeFile(new URL(gorsel, root), districtArt(definition, index));
  feed['ankara-ilceleri'].push({ id: 8001 + index, isim, gorsel, etiket: 'Ankara' });
}
if (artists.length !== 50 || districts.length !== 25) throw new Error('Kültür koleksiyonu adetleri değişti.');
for (const cards of Object.values(feed)) {
  if (new Set(cards.map(card => card.isim.toLocaleLowerCase('tr'))).size !== cards.length) throw new Error('Tekrarlanan kültür kartı.');
}
await writeFile(new URL('tools/expansion-culture.json', root), JSON.stringify(feed, null, 2) + '\n');
await writeFile(new URL('assets/images/music-icon.svg', root), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="Piksel müzik notası" shape-rendering="crispEdges"><title>Piksel müzik notası</title><path fill="#a38ab8" d="M6 2h8v9h-2V5H8v8H6z"/><path fill="#d7c6e5" d="M8 2h6v2H8z"/><path fill="#806497" d="M2 11h4v1h2v2H6v1H2v-1H1v-2h1zm8-2h4v1h1v2h-1v1h-4v-1H9v-2h1z"/></svg>\n');
await writeFile(new URL('assets/images/map-icon.svg', root), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="Piksel gezi haritası" shape-rendering="crispEdges"><title>Piksel gezi haritası</title><path fill="#e2cd9d" d="M1 3h4v10H1zm9 0h5v10h-5z"/><path fill="#a8bea0" d="M5 2h5v10H5z"/><path fill="#c18880" d="M6 3h4v1h1v4h-1v2H9v2H8v-2H7V8H6z"/><path fill="#f1e7ca" d="M7 4h3v3H7z"/><path fill="#829b80" d="M2 6h2v1H2zm0 4h2v1H2zm10-3h2v1h-2zm0 3h2v1h-2z"/></svg>\n');
console.log(`Kültür: ${artists.length} sanatçı (${artists.filter(row => row[3] === 'grup').length} grup), ${districts.length} ilçe; ${artists.length + districts.length} özgün SVG.`);
