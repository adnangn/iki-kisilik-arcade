import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// The second culture expansion preserves all existing cards and image paths.
// Portraits and district scenes are original symbolic pixel illustrations.
const root = new URL('../', import.meta.url);
const artists = [
  ['mustafa-sandal', 'Mustafa Sandal', 'Pop', 'sanatci', 'short', 'black', 'stubble', 'mic', '#738f8b'],
  ['serdar-ortac', 'Serdar Ortaç', 'Pop', 'sanatci', 'sweep', 'black', 'clean', 'mic', '#a98669'],
  ['deniz-seki', 'Deniz Seki', 'Pop', 'sanatci', 'long-curls', 'brown', 'clean', 'mic', '#ac7e91'],
  ['demet-akalin', 'Demet Akalın', 'Pop', 'sanatci', 'long', 'blond', 'clean', 'mic', '#8c7caa'],
  ['hadise', 'Hadise', 'Pop', 'sanatci', 'long', 'brown', 'clean', 'mic', '#b98274'],
  ['murat-boz', 'Murat Boz', 'Pop', 'sanatci', 'sweep', 'brown', 'stubble', 'mic', '#6d929c'],
  ['edis', 'Edis', 'Pop', 'sanatci', 'curls', 'brown', 'clean', 'mic', '#9b8d68'],
  ['simge', 'Simge', 'Pop', 'sanatci', 'long', 'brown', 'clean', 'mic', '#b47690'],
  ['aleyna-tilki', 'Aleyna Tilki', 'Pop', 'sanatci', 'long', 'blond', 'clean', 'mic', '#7b9990'],
  ['zeynep-bastik', 'Zeynep Bastık', 'Pop', 'sanatci', 'long', 'black', 'clean', 'mic', '#a87c99'],
  ['irem-derici', 'İrem Derici', 'Pop', 'sanatci', 'long', 'blond', 'clean', 'mic', '#ac8e65'],
  ['bengu', 'Bengü', 'Pop', 'sanatci', 'long-curls', 'brown', 'clean', 'mic', '#759698'],
  ['buray', 'Buray', 'Pop', 'sanatci', 'curls', 'black', 'stubble', 'guitar', '#b88367'],
  ['mustafa-ceceli', 'Mustafa Ceceli', 'Pop', 'sanatci', 'short', 'black', 'stubble', 'keys', '#8f83a4'],
  ['yasar', 'Yaşar', 'Pop', 'sanatci', 'short', 'black', 'beard', 'mic', '#799478'],
  ['candan-ercetin', 'Candan Erçetin', 'Pop', 'sanatci', 'bob', 'auburn', 'clean', 'mic', '#ad7986'],
  ['nilufer', 'Nilüfer', 'Pop', 'sanatci', 'curls', 'blond', 'clean', 'mic', '#ac976b'],
  ['askin-nur-yengi', 'Aşkın Nur Yengi', 'Pop', 'sanatci', 'long-curls', 'auburn', 'clean', 'mic', '#718e9d'],
  ['ferhat-gocer', 'Ferhat Göçer', 'Pop', 'sanatci', 'short', 'brown', 'stubble', 'mic', '#a58775'],
  ['funda-arar', 'Funda Arar', 'Pop', 'sanatci', 'long', 'brown', 'clean', 'mic', '#8b7ba0'],
  ['yalin', 'Yalın', 'Pop', 'sanatci', 'short', 'brown', 'stubble', 'guitar', '#7d9a8d'],
  ['emre-altug', 'Emre Altuğ', 'Pop', 'sanatci', 'short', 'black', 'stubble', 'mic', '#b28a70'],
  ['emre-aydin', 'Emre Aydın', 'Rock', 'sanatci', 'sweep', 'black', 'stubble', 'guitar', '#778799'],
  ['kirac', 'Kıraç', 'Rock', 'sanatci', 'long', 'black', 'beard', 'guitar', '#a09064'],
  ['dolu-kadehi-ters-tut', 'Dolu Kadehi Ters Tut', 'Rock', 'grup', 'duo', 'black', 'clean', 'electric', '#927693'],
  ['adamlar', 'Adamlar', 'Rock', 'grup', 'four', 'brown', 'clean', 'electric', '#7f9878'],
  ['madrigal', 'Madrigal', 'Rock', 'grup', 'five', 'brown', 'clean', 'electric', '#b38276'],
  ['dedubluman', 'Dedublüman', 'Rock', 'grup', 'six', 'black', 'clean', 'acoustic', '#789a9b'],
  ['buyuk-ev-ablukada', 'Büyük Ev Ablukada', 'Rock', 'grup', 'trio', 'brown', 'clean', 'electronic', '#a49364'],
  ['kargo', 'Kargo', 'Rock', 'grup', 'four', 'black', 'clean', 'electric', '#a27689'],
  ['pentagram', 'Pentagram', 'Rock', 'grup', 'five', 'black', 'clean', 'electric', '#738b95'],
  ['zakkum', 'Zakkum', 'Rock', 'grup', 'four', 'black', 'clean', 'electric', '#b18864'],
  ['yeni-turku', 'Yeni Türkü', 'Halk', 'grup', 'five', 'grey', 'clean', 'folk-rock', '#78977b'],
  ['son-feci-bisiklet', 'Son Feci Bisiklet', 'Rock', 'grup', 'four', 'brown', 'clean', 'electric', '#a487a2'],
  ['erkan-ogur', 'Erkan Oğur', 'Halk', 'sanatci', 'long', 'grey', 'beard', 'guitar', '#9a8169'],
  ['volkan-konak', 'Volkan Konak', 'Halk', 'sanatci', 'long', 'black', 'moustache', 'mic', '#728c81'],
  ['musa-eroglu', 'Musa Eroğlu', 'Halk', 'sanatci', 'short', 'grey', 'moustache', 'baglama', '#a07d71'],
  ['arif-sag', 'Arif Sağ', 'Halk', 'sanatci', 'sweep', 'grey', 'moustache', 'baglama', '#828c9d'],
  ['kubat', 'Kubat', 'Halk', 'sanatci', 'short', 'black', 'stubble', 'mic', '#b29568'],
  ['cengiz-kurtoglu', 'Cengiz Kurtoğlu', 'Arabesk', 'sanatci', 'short', 'grey', 'clean', 'mic', '#958496'],
  ['hakan-altun', 'Hakan Altun', 'Arabesk', 'sanatci', 'short', 'black', 'beard', 'mic', '#7e9587'],
  ['umit-besen', 'Ümit Besen', 'Arabesk', 'sanatci', 'sweep', 'black', 'moustache', 'keys', '#a68e71'],
  ['mahsun-kirmizigul', 'Mahsun Kırmızıgül', 'Arabesk', 'sanatci', 'long-curls', 'black', 'stubble', 'mic', '#7b8f9e'],
  ['sibel-can', 'Sibel Can', 'Arabesk', 'sanatci', 'long', 'black', 'clean', 'mic', '#b38598'],
  ['eypio', 'Eypio', 'Rap', 'sanatci', 'cap', 'black', 'beard', 'mic', '#8b996e'],
  ['saniser', 'Şanışer', 'Rap', 'sanatci', 'short', 'black', 'beard', 'mic', '#a18872'],
  ['gazapizm', 'Gazapizm', 'Rap', 'sanatci', 'short', 'black', 'beard', 'mic', '#798691'],
  ['norm-ender', 'Norm Ender', 'Rap', 'sanatci', 'short', 'black', 'stubble', 'mic', '#a18b9d'],
  ['sefo', 'Sefo', 'Rap', 'sanatci', 'cap', 'brown', 'clean', 'mic', '#789b91'],
  ['uzi', 'UZI', 'Rap', 'sanatci', 'short', 'black', 'stubble', 'mic', '#b3926d']
];

// The official 39-district list. Scenes are symbolic, not municipal boundaries.
const districts = [
  ['adalar', 'Adalar', 'island'],
  ['arnavutkoy', 'Arnavutköy', 'airport'],
  ['atasehir', 'Ataşehir', 'towers'],
  ['avcilar', 'Avcılar', 'promenade'],
  ['bagcilar', 'Bağcılar', 'tram'],
  ['bahcelievler', 'Bahçelievler', 'neighbourhood'],
  ['bakirkoy', 'Bakırköy', 'harbour'],
  ['basaksehir', 'Başakşehir', 'stadium'],
  ['bayrampasa', 'Bayrampaşa', 'bus-station'],
  ['besiktas', 'Beşiktaş', 'palace'],
  ['beykoz', 'Beykoz', 'castle'],
  ['beylikduzu', 'Beylikdüzü', 'park'],
  ['beyoglu', 'Beyoğlu', 'galata'],
  ['buyukcekmece', 'Büyükçekmece', 'bridge'],
  ['catalca', 'Çatalca', 'fields'],
  ['cekmekoy', 'Çekmeköy', 'forest'],
  ['esenler', 'Esenler', 'fountain'],
  ['esenyurt', 'Esenyurt', 'plaza'],
  ['eyupsultan', 'Eyüpsultan', 'cable-car'],
  ['fatih', 'Fatih', 'mosque'],
  ['gaziosmanpasa', 'Gaziosmanpaşa', 'square'],
  ['gungoren', 'Güngören', 'shops'],
  ['kadikoy', 'Kadıköy', 'ferry'],
  ['kagithane', 'Kağıthane', 'stream'],
  ['kartal', 'Kartal', 'coast'],
  ['kucukcekmece', 'Küçükçekmece', 'lake'],
  ['maltepe', 'Maltepe', 'seaside-park'],
  ['pendik', 'Pendik', 'marina'],
  ['sancaktepe', 'Sancaktepe', 'hill-park'],
  ['sariyer', 'Sarıyer', 'bosphorus'],
  ['silivri', 'Silivri', 'old-port'],
  ['sultanbeyli', 'Sultanbeyli', 'hill-castle'],
  ['sultangazi', 'Sultangazi', 'aqueduct'],
  ['sile', 'Şile', 'lighthouse'],
  ['sisli', 'Şişli', 'clock-tower'],
  ['tuzla', 'Tuzla', 'shipyard'],
  ['umraniye', 'Ümraniye', 'market'],
  ['uskudar', 'Üsküdar', 'maidens-tower'],
  ['zeytinburnu', 'Zeytinburnu', 'city-walls']
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
    const count = hairStyle === 'duo' ? 2 : hairStyle === 'trio' ? 3 : hairStyle === 'five' ? 5 : hairStyle === 'six' ? 6 : 4;
    // A symbolic band lineup, not a claim about present-day band membership.
    r(36, 49, 25, 20, '#9b6957'); r(40, 52, 17, 14, cream); r(46, 56, 6, 6, accent);
    r(31, 41, 12, 3, '#c5aa63'); r(58, 40, 15, 3, '#c5aa63'); r(35, 44, 2, 17, ink); r(65, 43, 2, 19, ink);
    for (let i = 0; i < count; i++) {
      const x = 17 + Math.round(62 / (count - 1)) * i;
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
  const stone = '#b99b7f', light = '#dcc4a1', roof = '#ae7b68', water = '#80abb6', green = '#7e9b7c';
  r(0, 0, 96, 96, ['#cedce1', '#d8d5e4', '#d6ddc9', '#e5d9c4'][index % 4]);
  r(71, 12, 12, 12, '#ebd39b'); r(68, 15, 18, 6, '#ebd39b');
  r(7, 17, 23, 4, cream); r(12, 13, 14, 4, cream);
  r(0, 70, 96, 26, '#96a58b'); r(0, 86, 96, 10, '#819478');
  const tree = (x, y, h = 28) => { r(x + 8, y + h - 4, 4, 12, '#8b725a'); p(`M${x + 4} ${y}h12v5h5v7h4v10H${x - 1}V${y + 12}h5z`, green); r(x + 5, y + 6, 5, 8, '#a5b992'); };
  const sea = (y = 66) => { r(0, y, 96, 30, water); for (let i = 0; i < 5; i++) r(8 + (i * 19 % 78), y + 4 + i * 5, 18, 2, '#bad5d3'); };
  const building = (x, y, w, h, color = light) => { r(x, y, w, h, color); r(x - 2, y - 4, w + 4, 5, roof); for (let xx = x + 4; xx < x + w - 3; xx += 9) for (let yy = y + 5; yy < y + h - 6; yy += 10) { r(xx, yy, 4, 6, '#788e98'); r(xx, yy, 4, 1, '#bfd2ce'); } r(x + w / 2 - 3, y + h - 9, 6, 9, '#877c6c'); };
  const promenade = () => { sea(); r(0, 77, 96, 10, light); r(0, 74, 96, 3, '#918778'); for (const x of [8, 42, 76]) { r(x, 61, 2, 15, ink); r(x - 2, 58, 6, 5, '#e7d7a3'); } };
  const boat = (x, y, sail = false) => { r(x, y, 29, 5, '#ae8a6d'); r(x + 4, y + 5, 22, 4, '#a27b65'); r(x + 4, y - 8, 20, 8, cream); r(x + 8, y - 12, 13, 4, cream); for (let xx = x + 7; xx < x + 23; xx += 6) r(xx, y - 5, 3, 3, '#778f98'); if (sail) { r(x + 14, y - 29, 2, 27, ink); p(`M${x + 17} ${y - 27}h3v5h4v6h4v6h-11z`, cream); } };
  const arch = (x, y, w = 13, h = 17) => { r(x, y, w, h, '#8d8476'); r(x + 3, y + 3, w - 6, h - 3, '#cad6ca'); };
  const park = () => { tree(4, 45, 29); tree(68, 38, 36); r(27, 74, 38, 4, roof); r(30, 64, 32, 4, roof); r(30, 69, 32, 3, roof); r(31, 78, 3, 9, ink); r(59, 78, 3, 9, ink); for (let i = 0; i < 6; i++) { r(5 + i * 16, 88, 2, 7, green); r(3 + i * 16, 86, 6, 3, i % 2 ? '#c291a2' : '#ddc181'); } };
  if (style === 'island') {
    sea(62); p('M4 73h9V63h10V55h23v5h12v8h10v7H4z', green); building(22, 39, 21, 24); tree(9, 35, 24); boat(64, 77, true);
  } else if (style === 'airport') {
    r(0, 73, 96, 20, '#8f9492'); r(0, 81, 96, 3, '#d4d4bd'); building(14, 45, 45, 25); r(67, 35, 7, 38, stone); r(61, 27, 19, 10, '#899a9e'); r(64, 29, 13, 5, '#bfd2cc'); r(42, 18, 4, 21, '#7c8b96'); r(29, 26, 30, 5, '#7c8b96'); r(36, 36, 16, 3, '#7c8b96');
  } else if (style === 'towers' || style === 'plaza') {
    for (const [x, y, w, h, c] of [[10, 45, 18, 36, '#b3b9af'], [33, 22, 22, 59, '#8d9eab'], [62, 37, 23, 44, '#bbab99']]) building(x, y + (style === 'plaza' ? 6 : 0), w, h, c); r(0, 81, 96, 6, light); r(45, 80, 3, 16, '#cab49a');
  } else if (style === 'promenade' || style === 'coast' || style === 'seaside-park') {
    promenade(); if (style === 'promenade') { building(12, 38, 22, 28); building(42, 44, 22, 22); boat(65, 67); }
    if (style === 'coast') { p('M27 65h9V54h10V44h13v10h9v11z', '#9eaa99'); building(8, 43, 19, 25); tree(69, 46, 24); }
    if (style === 'seaside-park') { tree(4, 41); tree(68, 45); r(35, 67, 24, 4, roof); r(39, 71, 3, 6, ink); r(53, 71, 3, 6, ink); }
  } else if (style === 'tram') {
    building(6, 38, 25, 37); building(64, 34, 24, 41); r(0, 82, 96, 3, ink); r(0, 88, 96, 2, ink); r(26, 56, 44, 25, '#ac7979'); r(30, 60, 36, 9, '#cbd5c9'); r(42, 72, 12, 9, light); r(32, 79, 6, 5, ink); r(59, 79, 6, 5, ink); r(46, 37, 3, 18, ink); r(32, 36, 28, 2, ink);
  } else if (style === 'neighbourhood' || style === 'shops' || style === 'market') {
    for (const [i, x] of [7, 36, 65].entries()) building(x, 39 + (i % 2) * 9, 24, 39 - (i % 2) * 9, i % 2 ? '#c8b499' : '#d1c9b3');
    if (style === 'shops' || style === 'market') { for (const x of [5, 34, 63]) { r(x, 65, 27, 5, '#b47d83'); for (let xx = x + 3; xx < x + 27; xx += 6) r(xx, 65, 3, 5, cream); r(x + 3, 72, 21, 6, '#858d8a'); } }
    if (style === 'neighbourhood') { tree(38, 55, 24); r(0, 84, 96, 4, light); }
    if (style === 'market') { r(10, 85, 25, 6, '#c1a16c'); r(12, 83, 8, 3, '#b8886c'); r(23, 83, 8, 3, '#88995e'); }
  } else if (style === 'harbour' || style === 'marina' || style === 'old-port') {
    sea(64); r(7, 77, 58, 5, light); r(14, 82, 3, 11, stone); r(53, 82, 3, 11, stone); boat(64, 72, style === 'marina'); building(13, style === 'old-port' ? 39 : 44, 27, style === 'old-port' ? 26 : 21); if (style === 'harbour') boat(40, 58); if (style === 'marina') { r(45, 59, 2, 18, ink); p('M48 48h3v5h4v6h4v5H48z', cream); }
  } else if (style === 'stadium') {
    r(8, 37, 80, 41, '#a4b2ab'); r(13, 42, 70, 31, '#e0d2b2'); r(19, 49, 58, 21, '#82a487'); r(20, 52, 56, 2, '#c9dec4'); r(45, 49, 2, 21, '#c9dec4'); for (const x of [13, 77]) { r(x, 25, 2, 20, ink); r(x - 5, 22, 12, 5, '#c1ccc4'); } r(24, 77, 48, 4, stone);
  } else if (style === 'bus-station') {
    building(8, 35, 77, 34); r(4, 63, 85, 6, stone); for (const x of [11, 40, 69]) { r(x, 69, 23, 13, '#789b94'); r(x + 3, 71, 17, 4, cream); r(x + 3, 80, 4, 5, ink); r(x + 16, 80, 4, 5, ink); } r(0, 90, 96, 2, cream);
  } else if (style === 'palace') {
    sea(78); r(13, 42, 71, 31, light); r(8, 38, 80, 6, stone); r(25, 25, 47, 16, light); r(21, 22, 55, 4, stone); for (let x = 20; x < 80; x += 13) { r(x, 47, 6, 15, '#81949b'); r(x - 2, 64, 10, 4, stone); } r(42, 58, 15, 16, '#96856d'); r(9, 74, 79, 6, light);
  } else if (style === 'castle' || style === 'hill-castle' || style === 'city-walls') {
    if (style === 'castle') sea(75); else p('M3 75h9V63h13V51h15V40h20v11h11v12h13v12z', '#96a083');
    const y = style === 'hill-castle' ? 37 : 45; r(16, y + 10, 67, 24, stone); for (const x of [13, 39, 71]) { r(x, y, 13, 36, light); r(x, y - 4, 4, 7, light); r(x + 9, y - 4, 4, 7, light); r(x + 5, y + 10, 3, 8, '#8b7e6c'); } r(46, y + 21, 10, 14, '#8b7e6c'); if (style === 'city-walls') { r(5, 82, 86, 4, stone); tree(2, 55, 24); }
  } else if (style === 'park' || style === 'hill-park') {
    if (style === 'hill-park') p('M0 67h12V56h12V45h13V39h25v8h12v10h12v10z', '#9aae8b'); park();
  } else if (style === 'galata' || style === 'maidens-tower') {
    if (style === 'maidens-tower') sea(65); else { building(3, 45, 20, 33); building(71, 40, 22, 38); }
    const y = style === 'galata' ? 33 : 43; r(34, y, 28, 43, light); r(30, y - 6, 36, 7, stone); p(`M32 ${y - 7}v-5h6v-6h6v-7h8v7h6v6h6v5z`, roof); for (const x of [39, 52]) { r(x, y + 5, 5, 9, '#7c8b90'); r(x, y + 21, 5, 8, '#7c8b90'); } r(43, y + 33, 10, 10, '#92816c'); if (style === 'maidens-tower') { r(24, 77, 50, 6, stone); boat(4, 77); } else { r(20, 83, 52, 5, light); r(25, 89, 42, 4, light); }
  } else if (style === 'bridge' || style === 'bosphorus') {
    sea(60); r(2, 55, 92, 6, light); if (style === 'bridge') { for (const x of [10, 28, 46, 64, 82]) { r(x - 3, 61, 19, 12, stone); arch(x, 62, 13, 12); } } else { for (const x of [18, 75]) { r(x, 29, 4, 33, '#8c9ca0'); r(x - 5, 29, 14, 4, '#8c9ca0'); } p('M21 33h4v5h8v5h10v5h11v-5h10v-5h11v-5h4v24h-4V45H65v5H54v5H42v-5H32v-5H21z', '#c0c6b9'); boat(33, 77); }
  } else if (style === 'fields') {
    r(0, 66, 96, 30, '#c5b98b'); for (let i = 0; i < 8; i++) { const x = 5 + i * 12; r(x, 68 + i % 3 * 6, 2, 26, '#a58c59'); r(x - 2, 72 + i % 3 * 6, 7, 3, '#dfca8f'); } building(12, 39, 23, 27); tree(64, 42, 24);
  } else if (style === 'forest') {
    for (const [x, y, h] of [[0, 40, 30], [19, 27, 40], [42, 31, 36], [66, 36, 32]]) tree(x, y, h); r(33, 79, 28, 6, light); r(37, 85, 21, 11, light);
  } else if (style === 'fountain' || style === 'square') {
    building(5, 37, 25, 33); building(68, 40, 23, 30); r(5, 79, 86, 10, light); r(33, 65, 31, 13, stone); r(38, 69, 21, 6, water); r(46, 49, 5, 19, stone); r(40, 47, 17, 5, light); r(48, 40, 2, 9, '#e6e1c8'); if (style === 'square') { r(34, 43, 27, 4, '#b7a485'); r(42, 30, 11, 13, '#918873'); tree(2, 47, 28); }
  } else if (style === 'cable-car') {
    p('M12 75h11V63h15V49h19V38h20v37z', green); r(4, 27, 3, 51, ink); r(81, 15, 3, 62, ink); r(6, 23, 79, 2, ink); r(37, 26, 2, 14, ink); r(29, 39, 21, 18, '#ba8582'); r(33, 43, 13, 7, cream); r(33, 54, 13, 3, roof); building(65, 50, 22, 28);
  } else if (style === 'mosque') {
    r(24, 48, 49, 26, light); p('M28 48v-6h6v-7h8v-6h13v6h9v7h6v6z', '#8eaaa7'); for (const x of [12, 80]) { r(x, 23, 5, 52, light); r(x - 2, 45, 9, 3, stone); p(`M${x - 1} 23v-4h2v-7h3v7h2v4z`, '#8eaaa7'); } for (const x of [32, 46, 60]) arch(x, 56, 10, 18); r(18, 76, 59, 5, light);
  } else if (style === 'ferry') {
    sea(63); building(6, 41, 22, 26); r(28, 39, 49, 27, light); r(24, 34, 56, 5, roof); for (const x of [36, 53, 68]) arch(x, 45, 11, 21); boat(36, 77); r(46, 65, 3, 10, ink); r(49, 65, 8, 5, '#b47877');
  } else if (style === 'stream' || style === 'lake') {
    if (style === 'lake') { sea(65); tree(4, 40); r(19, 60, 63, 5, light); for (const x of [23, 42, 61]) arch(x, 65, 14, 11); }
    else { r(41, 54, 17, 42, water); r(36, 77, 27, 5, water); r(23, 67, 50, 5, light); r(28, 72, 4, 10, stone); r(64, 72, 4, 10, stone); building(8, 34, 21, 32); tree(66, 39, 29); }
  } else if (style === 'aqueduct') {
    r(9, 35, 79, 10, light); r(9, 47, 79, 10, light); for (const x of [15, 35, 55, 75]) { arch(x, 37, 11, 10); r(x - 5, 55, 21, 23, stone); arch(x - 2, 56, 15, 22); } r(5, 79, 87, 5, light);
  } else if (style === 'lighthouse') {
    sea(70); p('M1 79h17V66h12V53h16v26z', stone); r(39, 29, 19, 44, cream); r(39, 44, 19, 8, '#ab7878'); r(36, 22, 25, 8, '#818e94'); r(40, 24, 17, 4, '#e7d2a0'); r(42, 18, 13, 5, roof); r(47, 58, 5, 15, '#898475'); p('M60 25h20v2H60zm-36 0h12v2H24z', '#e6d6a8');
  } else if (style === 'clock-tower') {
    building(5, 45, 23, 31); building(68, 37, 22, 39); r(37, 31, 22, 46, light); r(33, 26, 30, 6, stone); r(42, 17, 12, 10, light); r(40, 13, 16, 5, roof); r(41, 35, 14, 14, '#fff0cc'); r(47, 38, 2, 7, ink); r(43, 44, 6, 2, ink); r(44, 61, 8, 16, '#8f806c'); r(29, 78, 38, 5, stone);
  } else if (style === 'shipyard') {
    sea(68); r(5, 75, 85, 7, stone); for (const x of [16, 65]) { r(x, 27, 4, 45, '#9c8474'); r(x, 27, 21, 4, '#9c8474'); r(x + 19, 31, 2, 17, ink); r(x + 16, 46, 8, 5, ink); } boat(35, 74); building(4, 48, 24, 24, '#b8b4a1');
  }
  // Plate-code 34 stamp is independent of scene and carries no boundary claim.
  r(4, 4, 18, 11, cream); p('M7 6h5v2h-2v1h2v4H7v-2h3v-1H8V8H7z', '#777c77'); p('M15 6h2v4h2V6h2v7h-2v-2h-4z', '#777c77');
  return d.finish();
}

assert.equal(artists.length, 50);
assert.equal(districts.length, 39);
const existing = JSON.parse(await readFile(new URL('tools/expansion-culture.json', root), 'utf8'));
const oldNames = new Set(existing['yerli-sanatcilar'].map(card => card.isim.toLocaleLowerCase('tr')));
for (const artist of artists) assert(!oldNames.has(artist[1].toLocaleLowerCase('tr')), `Existing artist: ${artist[1]}`);
await mkdir(new URL('assets/images/artists/', root), { recursive: true });
await mkdir(new URL('assets/images/istanbul/', root), { recursive: true });
const feed = { 'yerli-sanatcilar': [], 'istanbul-ilceleri': [] };
for (const [index, definition] of artists.entries()) {
  const [slug, isim, etiket, tip] = definition;
  const gorsel = `assets/images/artists/${slug}.svg`;
  await writeFile(new URL(gorsel, root), artistArt(definition, index + 50));
  feed['yerli-sanatcilar'].push({ id: 7051 + index, isim, gorsel, etiket, tip });
}
for (const [index, definition] of districts.entries()) {
  const [slug, isim] = definition;
  const gorsel = `assets/images/istanbul/${slug}.svg`;
  await writeFile(new URL(gorsel, root), districtArt(definition, index));
  feed['istanbul-ilceleri'].push({ id: 10001 + index, isim, gorsel, etiket: 'İstanbul' });
}
for (const cards of Object.values(feed)) {
  assert.equal(new Set(cards.map(card => card.id)).size, cards.length);
  assert.equal(new Set(cards.map(card => card.isim.toLocaleLowerCase('tr'))).size, cards.length);
}
await writeFile(new URL('tools/culture-extra.json', root), JSON.stringify(feed, null, 2) + '\n');
console.log(`Culture expansion: ${artists.length} artists (${artists.filter(a => a[3] === 'grup').length} bands), ${districts.length} Istanbul districts; 89 original SVG assets.`);
