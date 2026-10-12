import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Original 96 × 96 pixel illustrations. No downloaded images or copied logos.
// Only this expansion's assets and merge feed are written by this generator.
const root = new URL('../', import.meta.url);
const rows = {
  'cocukluk-cizgifilmleri': [
    ['Heidi', 'heidi', 'Klasikler', 'alps', '#bd7167'],
    ['Pepee', 'pepee', 'Yerli', 'pepee', '#708fa9'],
    ['Rafadan Tayfa', 'rafadan-tayfa', 'Yerli', 'friends', '#bf985b'],
    ['Kaptan Tsubasa', 'kaptan-tsubasa', 'Anime', 'football', '#7d9dac'],
    ['Pokémon', 'pokemon', 'Anime', 'monster', '#c8a259'],
    ['Tom ve Jerry', 'tom-ve-jerry', 'Klasikler', 'cat-mouse', '#8798a1'],
    ['Şirinler', 'sirinler', 'Klasikler', 'smurf', '#769dac'],
    ['Taş Devri', 'tas-devri', 'Klasikler', 'caveman', '#bd9470'],
    ['Jetgiller', 'jetgiller', 'Klasikler', 'space', '#7faaa3'],
    ['Scooby-Doo', 'scooby-doo', 'Klasikler', 'dog', '#b8956e'],
    ['Bugs Bunny', 'bugs-bunny', 'Klasikler', 'rabbit', '#ac8fa2'],
    ['Red Kit', 'red-kit', 'Klasikler', 'cowboy', '#baa16e'],
    ['Temel Reis', 'temel-reis', 'Klasikler', 'sailor', '#719da7'],
    ['Arı Maya', 'ari-maya', 'Klasikler', 'bee', '#c3ad67'],
    ['SüngerBob', 'sungerbob', 'Komedi', 'sponge', '#71a4a1'],
    ['Sailor Moon', 'sailor-moon', 'Anime', 'moon', '#a38cae'],
    ['Digimon', 'digimon', 'Anime', 'dinosaur', '#b79564'],
    ['Beyblade', 'beyblade', 'Anime', 'spinning', '#7397a6'],
    ['Yu-Gi-Oh!', 'yu-gi-oh', 'Anime', 'cards', '#a28bab'],
    ['Dragon Ball', 'dragon-ball', 'Anime', 'dragon', '#b5a165'],
    ['Avatar: Son Hava Bükücü', 'avatar', 'Macera', 'air', '#8bafac'],
    ['Ben 10', 'ben-10', 'Macera', 'watch', '#84a577'],
    ['Powerpuff Girls', 'powerpuff-girls', 'Macera', 'trio', '#b588a3'],
    ['Samuray Jack', 'samuray-jack', 'Macera', 'samurai', '#8c9d9a'],
    ['Dexter’ın Laboratuvarı', 'dexterin-laboratuvari', 'Komedi', 'lab', '#afa08d'],
    ['Cesur Korkak Köpek', 'cesur-korkak-kopek', 'Komedi', 'pink-dog', '#b885a5'],
    ['Ed, Edd ve Eddy', 'ed-edd-ve-eddy', 'Komedi', 'trouble', '#8fa583'],
    ['Caillou', 'caillou', 'Klasikler', 'bald', '#c2a367'],
    ['Arthur', 'arthur', 'Klasikler', 'glasses', '#baa476'],
    ['Ninja Kaplumbağalar', 'ninja-kaplumbagalar', 'Macera', 'turtles', '#7e9e75'],
    ['Afacan Louie', 'afacan-louie', 'Komedi', 'louie', '#b39770'],
    ['Niloya', 'niloya', 'Yerli', 'girl', '#b490a2'],
    ['Keloğlan', 'keloglan', 'Yerli', 'village', '#b39c74'],
    ['Maşa ile Koca Ayı', 'masa-ile-koca-ayi', 'Macera', 'bear-girl', '#a68c80'],
    ['Winnie the Pooh', 'winnie-the-pooh', 'Klasikler', 'honey', '#c2a35d'],
    ['Daffy Duck', 'daffy-duck', 'Klasikler', 'daffy', '#b49369'],
    ['Tweety', 'tweety', 'Klasikler', 'tweety', '#c6ae68'],
    ['Sylvester', 'sylvester', 'Klasikler', 'sylvester', '#9da3a9'],
    ['Taz', 'taz', 'Klasikler', 'taz', '#b29579'],
    ['Road Runner', 'road-runner', 'Klasikler', 'roadrunner', '#89a2b5'],
    ['Wile E. Coyote', 'wile-e-coyote', 'Klasikler', 'coyote', '#b5a080'],
    ['Porky Pig', 'porky-pig', 'Klasikler', 'porky', '#c6a0a5'],
    ['Speedy Gonzales', 'speedy-gonzales', 'Klasikler', 'speedy', '#c4aa73'],
    ['Elmer Fudd', 'elmer-fudd', 'Klasikler', 'elmer', '#ae9b77'],
    ['Yosemite Sam', 'yosemite-sam', 'Klasikler', 'yosemite', '#ba8a78'],
    ['Foghorn Leghorn', 'foghorn-leghorn', 'Klasikler', 'foghorn', '#b8a788'],
    ['Marvin the Martian', 'marvin-the-martian', 'Klasikler', 'marvin', '#90a581'],
    ['Pepé Le Pew', 'pepe-le-pew', 'Klasikler', 'skunk', '#a197aa'],
    ['Lola Bunny', 'lola-bunny', 'Klasikler', 'lola', '#ba9bac'],
    ['Mickey Mouse', 'mickey-mouse', 'Klasikler', 'mickey', '#bd8c7f'],
    ['Minnie Mouse', 'minnie-mouse', 'Klasikler', 'minnie', '#bd94a9'],
    ['Donald Duck', 'donald-duck', 'Klasikler', 'donald', '#8ca4ba'],
    ['Goofy', 'goofy', 'Klasikler', 'goofy', '#9caa81'],
    ['Pluto', 'pluto', 'Klasikler', 'pluto', '#c3ad74'],
    ['Pembe Panter', 'pembe-panter', 'Klasikler', 'panther', '#c58fae'],
    ['Müfettiş Gadget', 'mufettis-gadget', 'Macera', 'gadget', '#9ca6ae'],
    ['Garfield', 'garfield', 'Komedi', 'garfield', '#c2a173'],
    ['Gumball', 'gumball', 'Komedi', 'gumball', '#87b0bc'],
    ['Darwin', 'darwin', 'Komedi', 'darwin', '#c69e7a'],
    ['Finn', 'finn', 'Macera', 'finn', '#8baeb5']
  ],
  'doksanlar-nostalji': [
    ['Tamagotchi', 'tamagotchi', 'Teknoloji', 'pet', '#b892b2'],
    ['Sakız Kartları', 'sakiz-kartlari', 'Koleksiyon', 'collector-cards', '#b8a16f'],
    ['Kaset', 'kaset', 'Teknoloji', 'cassette', '#8e9ba4'],
    ['Tetris El Oyunu', 'tetris-el-oyunu', 'Teknoloji', 'handheld', '#96a283'],
    ['Walkman', 'walkman', 'Teknoloji', 'walkman', '#7695ad'],
    ['Disket', 'disket', 'Teknoloji', 'floppy', '#aaa18b'],
    ['Tüplü Televizyon', 'tuplu-televizyon', 'Teknoloji', 'television', '#a69c89'],
    ['Çevirmeli Telefon', 'cevirmeli-telefon', 'Teknoloji', 'telephone', '#b88981'],
    ['VHS Kaset', 'vhs-kaset', 'Teknoloji', 'vhs', '#8f8e9f'],
    ['Atari Kaseti', 'atari-kaseti', 'Teknoloji', 'cartridge', '#a09773'],
    ['Misket', 'misket', 'Sokak Oyunu', 'marbles', '#8fada2'],
    ['Taso', 'taso', 'Koleksiyon', 'pogs', '#aa98ad'],
    ['Yoyo', 'yoyo', 'Sokak Oyunu', 'yoyo', '#b7887e'],
    ['Topaç', 'topac', 'Sokak Oyunu', 'top', '#b99b70'],
    ['Lastik Atlama', 'lastik-atlama', 'Sokak Oyunu', 'elastic', '#a1ab7f'],
    ['Seksek', 'seksek', 'Sokak Oyunu', 'hopscotch', '#a39793'],
    ['İp Atlama', 'ip-atlama', 'Sokak Oyunu', 'rope', '#b7a16e'],
    ['Kâğıt Falcısı', 'kagit-falcisi', 'Sokak Oyunu', 'paper', '#ac99ae'],
    ['Cin Ali Kitapları', 'cin-ali-kitaplari', 'Okul', 'book', '#b3946a'],
    ['Abaküs', 'abakus', 'Okul', 'abacus', '#98ab8f'],
    ['Döner Kalemtıraş', 'doner-kalemtiras', 'Okul', 'sharpener', '#8aaba6'],
    ['Kokulu Silgi', 'kokulu-silgi', 'Okul', 'erasers', '#b898a4'],
    ['Çok Renkli Kalem', 'cok-renkli-kalem', 'Okul', 'pen', '#989bae'],
    ['Hatıra Defteri', 'hatira-defteri', 'Okul', 'diary', '#b791ae'],
    ['Oyun Salonu Jetonu', 'oyun-salonu-jetonu', 'Koleksiyon', 'arcade-token', '#aaa074'],
    ['Telefon Jetonu', 'telefon-jetonu', 'Koleksiyon', 'phone-token', '#a7a697'],
    ['İnternet Kafe', 'internet-kafe', 'Mahalle', 'computers', '#8d9f9c'],
    ['Atari Salonu', 'atari-salonu', 'Mahalle', 'arcade', '#aa91a7'],
    ['Soba Üstü Kestane', 'soba-ustu-kestane', 'Mahalle', 'stove', '#b29578'],
    ['Bakkal Vitrini', 'bakkal-vitrini', 'Mahalle', 'shop', '#aa9d7c'],
    ['Poşette Meyve Suyu', 'posette-meyve-suyu', 'Mahalle', 'juice-bag', '#ba9a7d'],
    ['Çekirdek Külahı', 'cekirdek-kulahi', 'Mahalle', 'seed-cone', '#a8997f'],
    ['Dondurma Çubuğu Koleksiyonu', 'dondurma-cubugu-koleksiyonu', 'Koleksiyon', 'sticks', '#a59175'],
    ['Çıkartma Albümü', 'cikartma-albumu', 'Koleksiyon', 'album', '#94a19b'],
    ['Metal Beslenme Çantası', 'metal-beslenme-cantasi', 'Okul', 'lunchbox', '#8aa6a9']
  ],
  'kantin-bakkal': [
    ['ETİ Cin', 'eti-cin', 'Bisküvi', 'cin', '#c39c55', 'ETİ', 'CIN'],
    ['Tadelle', 'tadelle', 'Çikolata', 'bar', '#b06f70', 'Tadelle', 'TADELLE'],
    ['Metro', 'metro', 'Çikolata', 'bar', '#a8785c', 'Ülker', 'METRO'],
    ['Ülker Çokokrem', 'ulker-cokokrem', 'Çikolata', 'cream-tube', '#ac7f67', 'Ülker', 'COKOKREM'],
    ['Ülker Çikolatalı Gofret', 'ulker-cikolatali-gofret', 'Gofret', 'wafer', '#b87175', 'Ülker', 'GOFRET'],
    ['ETİ Burçak', 'eti-burcak', 'Bisküvi', 'oat', '#b29b64', 'ETİ', 'BURCAK'],
    ['ETİ Puf', 'eti-puf', 'Bisküvi', 'puff', '#b191a4', 'ETİ', 'PUF'],
    ['ETİ Tutku', 'eti-tutku', 'Bisküvi', 'swirl', '#a08974', 'ETİ', 'TUTKU'],
    ['ETİ Popkek', 'eti-popkek', 'Kek', 'cake', '#8b97b1', 'ETİ', 'POPKEK'],
    ['ETİ Topkek', 'eti-topkek', 'Kek', 'cupcake', '#b3936b', 'ETİ', 'TOPKEK'],
    ['ETİ Browni', 'eti-browni', 'Kek', 'cake', '#956f72', 'ETİ', 'BROWNI'],
    ['Ülker Albeni', 'ulker-albeni', 'Çikolata', 'caramel', '#bb9170', 'Ülker', 'ALBENI'],
    ['Ülker Halley', 'ulker-halley', 'Bisküvi', 'sandwich', '#93a68e', 'Ülker', 'HALLEY'],
    ['Ülker Çokomel', 'ulker-cokomel', 'Çikolata', 'marshmallow', '#ac8da6', 'Ülker', 'COKOMEL'],
    ['CocoStar', 'cocostar', 'Çikolata', 'coconut', '#81a9b4', 'Ülker', 'COCOSTAR'],
    ['Ülker Çizi', 'ulker-cizi', 'Tuzlu', 'cracker', '#c09e65', 'Ülker', 'CIZI'],
    ['Ülker Biskrem', 'ulker-biskrem', 'Bisküvi', 'cookie', '#a38d79', 'Ülker', 'BISKREM'],
    ['Ülker Hanımeller', 'ulker-hanimeller', 'Bisküvi', 'cookies', '#b89870', 'Ülker', 'HANIMELLER'],
    ['Ülker Çubuk Kraker', 'ulker-cubuk-kraker', 'Tuzlu', 'pretzel', '#a29c7c', 'Ülker', 'CUBUK'],
    ['ETİ CraX', 'eti-crax', 'Tuzlu', 'sticks', '#9aaf88', 'ETİ', 'CRAX'],
    ['ETİ Wanted', 'eti-wanted', 'Çikolata', 'bar', '#ab9580', 'ETİ', 'WANTED'],
    ['ETİ Hoşbeş', 'eti-hosbes', 'Gofret', 'wafer', '#b69a82', 'ETİ', 'HOSBES'],
    ['ETİ Nero', 'eti-nero', 'Bisküvi', 'dark-cookie', '#918595', 'ETİ', 'NERO'],
    ['Ülker Çokoprens', 'ulker-cokoprens', 'Bisküvi', 'sandwich', '#ad9866', 'Ülker', 'COKOPRENS'],
    ['Ülker Probis', 'ulker-probis', 'Bisküvi', 'sandwich', '#928582', 'Ülker', 'PROBIS'],
    ['Sarelle', 'sarelle', 'Çikolata', 'cream-jar', '#be9b75', 'Sarelle', 'SARELLE'],
    ['Tipitip Sakız', 'tipitip-sakiz', 'Sakız', 'gum', '#ba9a5d', 'Kent', 'TIPITIP'],
    ['Falım Sakız', 'falim-sakiz', 'Sakız', 'gum', '#a17a87', 'Falım', 'FALIM'],
    ['Turbo Sakız', 'turbo-sakiz', 'Sakız', 'gum', '#86a1b0', '', 'TURBO'],
    ['Şıpsevdi Sakız', 'sipsevdi-sakiz', 'Sakız', 'gum', '#bd89a2', 'Şıpsevdi', 'SIPSEVDI'],
    ['Capri-Sun', 'capri-sun', 'İçecek', 'juice-pouch', '#90a9a2', 'Capri-Sun', 'CAPRI'],
    ['Tang', 'tang', 'İçecek', 'juice-packet', '#bfab6a', 'Tang', 'TANG'],
    ['Meybuz', 'meybuz', 'İçecek', 'ice-tube', '#bb907d', '', 'MEYBUZ'],
    ['Leblebi Tozu', 'leblebi-tozu', 'Bakkal', 'powder', '#b3a17e', '', 'LEBLEBI'],
    ['Kantin Tostu', 'kantin-tostu', 'Bakkal', 'toast', '#a9a375', '', 'TOST']
  ]
};

const palette = { ink: '#494650', cream: '#f5e9cc', skin: '#e2b48e', hair: '#68533f', green: '#899d73', yellow: '#e1bc6d', pink: '#c9849c', blue: '#729ba9', brown: '#936c4d', white: '#f2ecdc' };
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
function drawing(name, accent, index) {
  const parts = [];
  const r = (x, y, w, h, color) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`);
  const p = (d, color) => parts.push(`<path d="${d}" fill="${color}"/>`);
  const dot = (x, y, color, size = 3) => r(x, y, size, size, color);
  r(0, 0, 96, 96, palette.cream); r(4, 4, 88, 88, accent); r(8, 8, 80, 80, '#e9dec9');
  r(8, 69, 80, 19, '#d5c5a8'); r(13, 81, 70, 3, '#bdad96');
  for (let i = 0; i < 4; i++) dot(13 + i * 21, 12 + ((index + i) % 3) * 3, accent, 2);
  return { r, p, dot, finish: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${escape(name)} için temsili piksel çizim" shape-rendering="crispEdges"><title>${escape(name)} — özgün temsili piksel çizim</title>${parts.join('')}</svg>\n` };
}
function blockHead(d, x, y, skin = palette.skin, hair = palette.hair, scale = 1, style = 'short') {
  const q = (dx, dy, w, h, color) => d.r(x + dx * scale, y + dy * scale, w * scale, h * scale, color);
  q(-13, -14, 26, 27, palette.ink); q(-11, -12, 22, 24, skin); q(-15, -1, 4, 8, skin); q(11, -1, 4, 8, skin);
  if (style !== 'bald') { q(-13, -15, 26, 7, hair); q(-13, -8, 4, 9, hair); q(9, -8, 4, 9, hair); }
  if (style === 'spiky') for (let i = 0; i < 5; i++) q(-14 + i * 6, -21 + (i % 2) * 4, 7, 8, hair);
  if (style === 'long') { q(-15, -7, 5, 22, hair); q(10, -7, 5, 22, hair); }
  q(-7, -1, 3, 3, palette.ink); q(5, -1, 3, 3, palette.ink); q(-4, 7, 9, 2, '#a47769');
}
function person(d, x, y, shirt, hair = palette.hair, scale = 1, style = 'short') {
  d.r(x - 15 * scale, y + 14 * scale, 30 * scale, 23 * scale, shirt);
  d.r(x - 13 * scale, y + 35 * scale, 10 * scale, 6 * scale, palette.ink); d.r(x + 3 * scale, y + 35 * scale, 10 * scale, 6 * scale, palette.ink);
  blockHead(d, x, y, palette.skin, hair, scale, style);
}
function ball(d, x, y, size = 20) {
  d.r(x + 3, y, size - 6, size, palette.white); d.r(x, y + 3, size, size - 6, palette.white);
  d.r(x + size / 2 - 3, y + size / 2 - 3, 6, 6, palette.ink); d.r(x + 2, y + 3, 4, 3, palette.ink); d.r(x + size - 6, y + size - 6, 4, 3, palette.ink);
}
function animal(d, kind, color, ear = 'point') {
  const { r } = d;
  r(28, 43, 40, 35, color); r(33, 25, 30, 34, color); r(28, 30, 40, 23, color);
  if (ear === 'point') { r(29, 17, 9, 20, color); r(58, 17, 9, 20, color); r(31, 20, 4, 12, palette.pink); r(60, 20, 4, 12, palette.pink); }
  if (ear === 'long') { r(29, 9, 10, 28, color); r(57, 9, 10, 28, color); r(32, 13, 4, 18, palette.pink); r(60, 13, 4, 18, palette.pink); }
  if (ear === 'round') { r(24, 23, 12, 13, color); r(60, 23, 12, 13, color); }
  if (ear === 'flop') { r(20, 30, 12, 23, color); r(64, 30, 12, 23, color); }
  r(36, 35, 6, 7, palette.white); r(53, 35, 6, 7, palette.white); r(39, 37, 3, 4, palette.ink); r(53, 37, 3, 4, palette.ink);
  r(42, 47, 13, 7, '#dcb78e'); r(46, 44, 7, 5, palette.ink); r(36, 73, 11, 6, color); r(54, 73, 11, 6, color);
  if (kind === 'dog') { r(33, 24, 12, 6, '#654f3e'); r(57, 49, 7, 8, '#654f3e'); r(37, 58, 23, 5, '#76a9a1'); }
}
function cartoonArt(row, index) {
  const [name, , , motif, accent] = row; const d = drawing(name, accent, index); const { r, p } = d; const c = palette;
  switch (motif) {
    case 'alps':
      p('M8 57L31 22L56 57Z', '#a5b8af'); p('M37 58L68 18L88 58Z', '#92aca6'); p('M22 35L31 22L40 35Z', c.white); p('M56 35L68 18L78 35Z', c.white);
      person(d, 48, 42, '#bd675d', '#835740'); r(35, 52, 26, 4, '#e4ba74'); r(34, 61, 28, 12, '#e4ba74'); break;
    case 'pepee':
      person(d, 48, 38, '#d79458', '#78553e'); r(30, 16, 36, 11, '#6e9db1'); r(30, 25, 42, 5, '#537f98'); r(33, 10, 29, 8, '#8eacba'); r(35, 60, 26, 15, '#6e9db1'); break;
    case 'friends':
      r(10, 26, 18, 43, '#c4b091'); r(72, 20, 14, 49, '#bba685'); r(17, 33, 6, 9, c.white); r(75, 28, 6, 9, c.white);
      person(d, 27, 47, '#798eac', '#675644', 0.65); person(d, 48, 41, '#b86e65', '#554d42', 0.8); person(d, 70, 49, '#8a9b64', '#845b40', 0.6); break;
    case 'football':
      r(8, 58, 80, 20, '#91a77e'); person(d, 45, 37, c.white, '#414343', 1, 'spiky'); r(34, 58, 22, 4, '#759ab0'); ball(d, 65, 61, 20); break;
    case 'monster':
      animal(d, 'mouse', '#d7b65a'); r(28, 10, 7, 19, '#d7b65a'); r(61, 10, 7, 19, '#d7b65a'); r(28, 10, 7, 6, c.ink); r(61, 10, 7, 6, c.ink); r(31, 44, 6, 6, '#c06f60'); r(60, 44, 6, 6, '#c06f60');
      r(10, 59, 17, 18, c.white); r(10, 59, 17, 8, '#b85d66'); r(10, 67, 17, 3, c.ink); r(16, 65, 5, 6, c.white); break;
    case 'cat-mouse':
      animal(d, 'cat', '#879aa5'); r(28, 49, 13, 27, '#a9b4b9'); r(64, 57, 13, 17, '#a48668'); r(61, 54, 9, 8, '#a48668'); r(72, 54, 9, 8, '#a48668'); r(68, 65, 3, 3, c.ink); break;
    case 'smurf':
      blockHead(d, 47, 40, '#729aaf', c.white); r(28, 54, 40, 24, c.white); r(30, 21, 34, 9, c.white); r(39, 14, 28, 9, c.white); r(54, 11, 14, 7, c.white); r(12, 48, 13, 28, '#e9e3cf'); r(9, 42, 20, 10, '#c37d71'); r(15, 43, 5, 3, c.white); break;
    case 'caveman':
      person(d, 47, 39, '#ce9560', '#534e43'); r(35, 54, 26, 6, '#7ca4a5'); r(37, 57, 6, 10, '#52696e'); r(42, 65, 4, 5, c.ink); r(56, 69, 4, 5, c.ink); r(9, 66, 19, 8, '#baa783'); break;
    case 'space':
      r(16, 45, 64, 10, '#8aaba9'); r(24, 34, 48, 11, '#add3ce'); r(35, 27, 27, 8, '#c7ded7'); r(20, 54, 56, 5, '#6f8e91'); r(36, 59, 24, 3, '#cca176'); r(43, 62, 10, 14, '#dbc49b');
      blockHead(d, 48, 35, c.skin, '#b47858', 0.5); r(12, 16, 4, 4, c.yellow); r(76, 22, 5, 5, c.yellow); break;
    case 'dog': animal(d, 'dog', '#a77e53', 'flop'); r(44, 62, 9, 8, '#caaa65'); break;
    case 'rabbit': animal(d, 'rabbit', '#9ea4a6', 'long'); r(42, 52, 13, 7, c.white); r(68, 61, 6, 17, '#cf985a'); r(67, 58, 8, 5, c.green); break;
    case 'cowboy':
      person(d, 48, 37, c.yellow, '#6b4a35'); r(28, 20, 40, 4, '#ece2c5'); r(35, 13, 25, 11, '#ece2c5'); r(37, 51, 22, 8, '#b76b64'); r(30, 53, 7, 20, c.ink); r(59, 53, 7, 20, c.ink); break;
    case 'sailor':
      person(d, 48, 38, '#5b6b77', '#997149'); r(30, 21, 36, 8, c.white); r(37, 17, 21, 7, c.white); r(43, 54, 11, 13, '#d7936e'); r(19, 51, 14, 18, c.skin); r(65, 49, 14, 20, c.skin); r(54, 44, 20, 3, c.brown); r(70, 42, 6, 8, c.brown); break;
    case 'bee':
      r(23, 39, 17, 24, '#c4d9d5'); r(58, 39, 17, 24, '#c4d9d5'); r(33, 40, 31, 36, c.yellow); r(33, 51, 31, 5, c.ink); r(33, 63, 31, 5, c.ink); blockHead(d, 48, 31, c.yellow, '#c9a15d'); r(38, 13, 3, 10, c.ink); r(57, 13, 3, 10, c.ink); break;
    case 'sponge':
      r(26, 22, 45, 46, c.yellow); r(28, 68, 41, 6, c.white); r(28, 74, 41, 8, '#9b7654'); r(46, 68, 5, 11, '#b8786e');
      r(34, 32, 12, 14, c.white); r(50, 32, 12, 14, c.white); r(39, 37, 5, 7, '#7499ae'); r(52, 37, 5, 7, '#7499ae'); r(41, 56, 17, 3, c.ink); r(44, 57, 4, 6, c.white); r(51, 57, 4, 6, c.white); r(29, 26, 5, 4, '#b9a25e'); r(62, 58, 5, 5, '#b9a25e'); break;
    case 'moon':
      person(d, 48, 37, c.white, '#c9a558', 1, 'long'); r(32, 16, 8, 9, '#c9a558'); r(57, 16, 8, 9, '#c9a558'); r(37, 53, 22, 6, '#728ba7'); r(40, 58, 16, 6, '#c0798d'); r(35, 66, 26, 10, '#728ba7'); r(71, 13, 9, 12, c.yellow); r(75, 11, 6, 11, '#e9dec9'); break;
    case 'dinosaur':
      animal(d, 'dinosaur', '#cb9c5f', 'round'); r(50, 46, 22, 14, '#deb679'); r(63, 41, 5, 3, c.ink); r(23, 66, 15, 9, '#cb9c5f'); r(16, 61, 11, 8, '#cb9c5f'); r(39, 67, 18, 10, '#e5ca99'); break;
    case 'spinning':
      r(18, 64, 60, 9, '#a9b0aa'); r(23, 59, 50, 6, '#bdc6bf'); r(35, 41, 27, 18, '#7397ad'); r(26, 49, 45, 7, '#809fb0'); r(39, 39, 18, 6, '#bd775e'); r(42, 57, 12, 16, '#776c75'); r(16, 27, 20, 4, '#baa55e'); r(60, 26, 20, 4, '#baa55e'); break;
    case 'cards':
      person(d, 46, 37, '#766287', '#58484d', 1, 'spiky'); r(34, 17, 8, 9, '#c5a15e'); r(45, 13, 7, 10, '#c5a15e'); r(53, 17, 7, 9, '#c5a15e'); r(44, 56, 10, 9, c.yellow); r(66, 48, 17, 27, '#a7795b'); r(69, 51, 11, 18, c.cream); r(72, 55, 5, 10, '#937ba0'); break;
    case 'dragon':
      person(d, 48, 40, '#c99561', '#484742', 1, 'spiky'); r(34, 53, 28, 4, '#7492ab'); r(44, 53, 9, 20, '#7492ab'); r(11, 18, 13, 13, '#d4a360'); r(15, 22, 3, 3, '#b76859'); r(72, 26, 12, 12, '#d4a360'); r(76, 30, 3, 3, '#b76859'); break;
    case 'air':
      person(d, 49, 37, '#c99861', c.hair, 1, 'bald'); r(46, 25, 5, 12, '#82a4ae'); r(42, 31, 13, 4, '#82a4ae'); r(34, 55, 28, 5, '#b88363'); p('M13 49H23V53H17V60H25V64H10V57H13Z', '#a1c2bb'); p('M72 38H83V42H76V49H85V53H71V46H72Z', '#a1c2bb'); break;
    case 'watch':
      person(d, 48, 37, c.white, '#65503e'); r(42, 52, 11, 25, '#849f69'); r(22, 56, 17, 9, c.skin); r(23, 56, 9, 9, c.ink); r(25, 58, 5, 5, '#90aa78'); break;
    case 'trio':
      for (const [x, color, h] of [[24, '#ca8f9f', '#cbae68'], [48, '#8cacc0', '#bf7552'], [72, '#91ab7d', '#54473e']]) { person(d, x, 41, color, h, 0.62, 'long'); r(x - 8, 39, 16, 8, c.white); r(x - 5, 40, 4, 6, c.ink); r(x + 2, 40, 4, 6, c.ink); } break;
    case 'samurai':
      person(d, 48, 38, c.white, '#53463e'); r(41, 14, 13, 10, '#53463e'); r(34, 54, 28, 4, '#aa8a74'); r(71, 28, 4, 48, '#bbc3ba'); r(67, 59, 12, 4, '#82755f'); r(71, 63, 4, 15, '#82755f'); break;
    case 'lab':
      person(d, 45, 39, c.white, '#c08755'); r(30, 33, 14, 10, c.ink); r(47, 33, 14, 10, c.ink); r(44, 36, 4, 2, c.ink); r(33, 36, 7, 4, '#b9cdc7'); r(50, 36, 7, 4, '#b9cdc7'); r(69, 49, 11, 23, '#7cb8a5'); r(71, 41, 7, 9, '#b7c6bd'); r(17, 59, 8, 15, '#baa3c4'); break;
    case 'pink-dog': animal(d, 'pink-dog', '#c68ca6', 'flop'); r(37, 32, 8, 12, c.white); r(51, 32, 8, 12, c.white); r(42, 49, 15, 8, c.ink); r(45, 50, 8, 4, c.white); break;
    case 'trouble':
      person(d, 25, 41, '#8f9f73', '#8a6b43', 0.7); person(d, 49, 45, '#c4a258', '#5e4b40', 0.6); person(d, 73, 44, '#bc8171', '#7e6247', 0.65); r(20, 19, 12, 6, '#8a6b43'); r(41, 21, 18, 5, '#caae6c'); break;
    case 'bald': person(d, 48, 36, '#d2b45c', c.hair, 1, 'bald'); r(31, 68, 34, 10, '#7fa0b5'); r(38, 53, 21, 3, '#bd796d'); break;
    case 'glasses':
      person(d, 48, 39, '#d2b35e', '#8d6c45'); r(28, 20, 10, 10, '#bd9d77'); r(59, 20, 10, 10, '#bd9d77'); r(31, 33, 14, 12, c.ink); r(49, 33, 14, 12, c.ink); r(45, 36, 5, 2, c.ink); r(34, 36, 8, 6, '#dbe0d3'); r(52, 36, 8, 6, '#dbe0d3'); break;
    case 'turtles':
      for (let i = 0; i < 4; i++) { const x = 22 + i * 17; r(x - 6, 48, 15, 28, '#84986d'); r(x - 7, 32 + i % 2 * 5, 17, 19, '#91a975'); r(x - 7, 38 + i % 2 * 5, 17, 5, ['#7e92b1', '#aa7d97', '#c58d61', '#b87870'][i]); r(x - 3, 40 + i % 2 * 5, 3, 2, c.white); r(x + 3, 40 + i % 2 * 5, 3, 2, c.white); r(x - 3, 55, 9, 15, '#c2ac71'); } break;
    case 'louie': person(d, 48, 38, '#b47666', '#ae865c'); r(31, 54, 34, 13, '#c3a561'); r(39, 31, 4, 3, '#987453'); r(52, 31, 4, 3, '#987453'); break;
    case 'girl':
      person(d, 48, 38, '#c3849d', '#66503d', 1, 'long'); r(25, 28, 8, 17, '#66503d'); r(64, 28, 8, 17, '#66503d'); r(30, 28, 7, 4, '#a76179'); r(60, 28, 7, 4, '#a76179'); r(34, 64, 28, 12, '#8cab91'); break;
    case 'village':
      r(10, 45, 22, 24, '#c9b18c'); p('M7 46L21 29L35 46Z', '#aa7b60'); person(d, 53, 37, '#99a67c', c.hair, 1, 'bald'); r(39, 63, 29, 13, '#a58159'); break;
    case 'bear-girl':
      animal(d, 'bear', '#977757', 'round'); r(65, 47, 17, 28, '#bc83a0'); r(64, 38, 18, 15, '#bc83a0'); r(67, 41, 12, 11, c.skin); r(69, 43, 2, 2, c.ink); r(76, 43, 2, 2, c.ink); break;
    case 'honey':
      animal(d, 'bear', '#cfac5e', 'round'); r(28, 52, 40, 14, '#bb7768'); r(11, 61, 20, 17, '#a17f58'); r(12, 58, 18, 5, '#cbb476'); r(15, 61, 4, 11, '#d6bb75'); break;
    case 'daffy':
      r(35, 43, 27, 29, '#45454a'); r(44, 34, 10, 15, '#45454a'); r(33, 20, 30, 24, '#45454a');
      r(32, 16, 4, 9, '#45454a'); r(38, 14, 4, 9, '#45454a'); r(41, 23, 8, 11, c.white); r(50, 23, 8, 11, c.white);
      r(45, 26, 3, 6, c.ink); r(51, 26, 3, 6, c.ink); r(30, 35, 40, 8, '#d8a369'); r(35, 42, 28, 3, '#ba8258');
      r(43, 45, 13, 4, c.white); r(38, 70, 6, 10, '#d8a369'); r(54, 70, 6, 10, '#d8a369');
      r(31, 77, 14, 5, '#d8a369'); r(53, 77, 17, 5, '#d8a369'); p('M33 54H21V59H30V64H37Z', '#45454a'); break;
    case 'tweety':
      r(31, 17, 34, 31, '#e0bf65'); r(25, 23, 46, 20, '#e0bf65'); r(34, 46, 28, 19, '#e0bf65');
      r(41, 9, 2, 9, c.ink); r(48, 8, 2, 9, c.ink); r(54, 10, 2, 8, c.ink);
      r(32, 27, 12, 13, c.white); r(52, 27, 12, 13, c.white); r(39, 31, 4, 8, '#709baa'); r(53, 31, 4, 8, '#709baa');
      r(39, 32, 2, 7, c.ink); r(53, 32, 2, 7, c.ink); r(44, 40, 9, 5, '#cd965a'); r(46, 43, 5, 4, '#cd965a');
      r(34, 60, 9, 13, '#e0bf65'); r(54, 60, 9, 13, '#e0bf65'); r(23, 70, 21, 9, '#cd965a'); r(53, 70, 21, 9, '#cd965a');
      r(29, 48, 8, 12, '#e0bf65'); r(61, 48, 8, 12, '#e0bf65'); break;
    case 'sylvester':
      animal(d, 'cat', '#494a50'); r(31, 50, 34, 24, c.white); r(29, 41, 38, 16, c.white); r(44, 40, 11, 7, '#bf776d');
      r(30, 27, 6, 9, '#cf9aa1'); r(60, 27, 6, 9, '#cf9aa1'); r(21, 47, 15, 2, c.ink); r(60, 47, 15, 2, c.ink);
      r(23, 53, 13, 2, c.ink); r(61, 53, 12, 2, c.ink); p('M65 68H77V52H72V43H78V49H83V73H65Z', '#494a50');
      r(33, 73, 13, 7, c.white); r(54, 73, 13, 7, c.white); break;
    case 'taz':
      p('M23 31H31V23H39V18H61V25H71V33H77V62H69V78H27V63H19V43H23Z', '#9c7857');
      r(33, 32, 9, 8, c.white); r(54, 32, 9, 8, c.white); r(37, 33, 4, 6, c.ink); r(54, 33, 4, 6, c.ink);
      p('M31 43H65V47H69V65H61V70H35V65H27V47H31Z', '#d9ba90'); r(34, 49, 28, 17, '#655044');
      r(36, 49, 7, 8, c.white); r(52, 49, 7, 8, c.white); r(40, 60, 7, 6, c.white); r(51, 60, 6, 6, c.white);
      r(42, 41, 14, 8, '#534841'); r(27, 73, 15, 7, '#d0ad86'); r(55, 73, 15, 7, '#d0ad86');
      p('M13 70H25V73H18V76H79V73H72V70H83V78H13Z', '#b79873'); break;
    case 'roadrunner':
      r(41, 40, 23, 15, '#738bb0'); r(53, 27, 9, 25, '#738bb0'); r(52, 20, 18, 15, '#738bb0');
      r(58, 14, 4, 9, '#6b7c9e'); r(65, 13, 4, 10, '#6b7c9e'); r(69, 29, 16, 5, '#c7a268');
      r(61, 22, 7, 8, c.white); r(65, 24, 3, 5, c.ink); r(44, 49, 13, 8, '#afc4c6');
      p('M43 44H32V39H20V33H13V43H20V50H43Z', '#657b9c');
      p('M47 55H51V65H39V75H23V72H35V61H47Z', '#c4a172'); p('M55 54H59V66H70V72H83V75H66V70H55Z', '#c4a172');
      r(12, 59, 16, 3, '#c4b391'); r(9, 66, 12, 3, '#c4b391'); break;
    case 'coyote':
      r(31, 13, 9, 25, '#a98a62'); r(55, 12, 9, 26, '#a98a62'); r(34, 16, 3, 17, '#d0b494'); r(58, 15, 3, 18, '#d0b494');
      r(28, 32, 38, 22, '#a98a62'); r(33, 52, 30, 26, '#a98a62'); r(37, 56, 22, 19, '#d7bc93');
      r(35, 37, 9, 9, '#e8d7b2'); r(52, 37, 9, 9, '#e8d7b2'); r(40, 39, 3, 6, c.ink); r(53, 39, 3, 6, c.ink);
      r(42, 46, 29, 10, '#d7bc93'); r(64, 45, 9, 7, c.ink); r(30, 28, 13, 4, c.ink); r(54, 28, 12, 4, c.ink);
      p('M63 67H76V56H81V71H65Z', '#a98a62'); r(11, 64, 19, 17, '#b4956d'); r(13, 66, 15, 2, '#cfb58d');
      pixelText(d, 'ACME', 13, 72, c.ink); break;
    case 'porky':
      r(25, 48, 46, 29, '#7596ab'); r(31, 50, 34, 22, '#deb0aa'); r(30, 20, 36, 28, '#deb0aa');
      r(23, 22, 11, 14, '#deb0aa'); r(62, 22, 11, 14, '#deb0aa'); r(25, 25, 6, 8, '#ba8785'); r(65, 25, 6, 8, '#ba8785');
      r(35, 27, 10, 11, c.white); r(52, 27, 10, 11, c.white); r(41, 30, 3, 6, c.ink); r(53, 30, 3, 6, c.ink);
      r(40, 37, 18, 9, '#c89491'); r(44, 40, 3, 3, '#9b6b70'); r(51, 40, 3, 3, '#9b6b70');
      r(36, 47, 10, 8, '#b87377'); r(51, 47, 10, 8, '#b87377'); r(46, 50, 6, 4, '#9e5f68');
      r(33, 72, 10, 10, '#deb0aa'); r(55, 72, 10, 10, '#deb0aa'); break;
    case 'speedy':
      r(30, 37, 35, 21, '#a78965'); r(23, 30, 14, 18, '#a78965'); r(59, 30, 14, 18, '#a78965');
      r(26, 33, 7, 10, '#cfab93'); r(63, 33, 7, 10, '#cfab93'); r(35, 42, 6, 7, c.white); r(51, 42, 6, 7, c.white);
      r(38, 44, 3, 4, c.ink); r(51, 44, 3, 4, c.ink); r(41, 51, 16, 7, '#dbc19a'); r(45, 48, 7, 5, c.ink);
      r(15, 26, 66, 7, '#d2b26b'); r(23, 21, 50, 7, '#d2b26b'); r(36, 12, 25, 13, '#d2b26b'); r(36, 22, 25, 4, '#b78e55');
      r(33, 57, 30, 17, c.white); r(43, 57, 12, 5, '#ba796b'); r(48, 61, 6, 10, '#ba796b');
      r(32, 73, 13, 8, '#a78965'); r(55, 73, 16, 8, '#a78965'); p('M64 64H77V58H80V68H64Z', '#a78965'); break;
    case 'elmer':
      person(d, 48, 38, '#ab9168', c.hair, 1, 'bald'); r(23, 21, 47, 8, '#a08a68'); r(32, 15, 29, 13, '#a08a68');
      r(57, 27, 10, 15, '#a08a68'); r(38, 43, 21, 5, '#d8a686'); r(45, 36, 10, 10, '#d8a686');
      r(46, 53, 4, 22, '#806d55'); r(35, 61, 10, 9, '#bba07c'); r(54, 61, 9, 9, '#bba07c');
      r(31, 75, 16, 6, '#7a6857'); r(53, 75, 16, 6, '#7a6857'); break;
    case 'yosemite':
      person(d, 48, 41, '#bc7b69', '#ad6d46'); r(16, 20, 64, 8, '#e5d6b5'); r(30, 9, 37, 16, '#e5d6b5');
      r(24, 10, 10, 12, '#e5d6b5'); r(62, 10, 10, 12, '#e5d6b5'); r(30, 21, 36, 5, '#c0a379');
      p('M47 45H37V40H24V48H18V61H26V66H40V56H47Z', '#ba7b4c');
      p('M49 45H59V40H72V48H78V61H70V66H56V56H49Z', '#ba7b4c');
      r(43, 40, 11, 8, '#d5a781'); r(38, 74, 11, 7, '#775948'); r(53, 74, 11, 7, '#775948'); break;
    case 'foghorn':
      r(31, 42, 33, 32, '#eee4ce'); r(48, 26, 13, 31, '#eee4ce'); r(40, 25, 27, 22, '#eee4ce');
      r(47, 13, 6, 15, '#bd756d'); r(54, 11, 6, 17, '#bd756d'); r(61, 14, 6, 14, '#bd756d');
      r(55, 30, 8, 10, c.white); r(59, 31, 3, 7, c.ink); r(61, 39, 18, 6, '#cea166'); r(53, 45, 8, 12, '#bd756d');
      p('M34 49H21V38H15V48H10V58H18V64H33Z', '#9c7354'); r(40, 69, 5, 10, '#cea166'); r(55, 69, 5, 10, '#cea166');
      r(33, 78, 15, 4, '#cea166'); r(54, 78, 17, 4, '#cea166'); break;
    case 'marvin':
      r(34, 37, 28, 22, '#49494b'); r(28, 27, 40, 18, '#829a6e'); r(33, 21, 30, 12, '#829a6e');
      r(27, 38, 43, 6, '#667f58'); r(29, 39, 8, 17, '#829a6e'); r(60, 39, 8, 17, '#829a6e');
      r(39, 9, 21, 10, '#d6b86f'); r(45, 18, 9, 6, '#b7985b'); r(39, 44, 7, 11, c.white); r(51, 44, 7, 11, c.white);
      r(34, 58, 28, 16, '#b6756b'); r(28, 60, 7, 9, '#b6756b'); r(61, 60, 7, 9, '#b6756b');
      r(28, 66, 7, 7, c.white); r(61, 66, 7, 7, c.white); r(33, 71, 9, 8, '#b6756b'); r(54, 71, 9, 8, '#b6756b');
      r(28, 77, 16, 7, c.white); r(53, 77, 18, 7, c.white); break;
    case 'skunk':
      p('M58 67H72V62H78V32H73V22H63V17H54V22H48V36H55V53H58Z', '#49484c');
      p('M61 59H66V33H63V26H57V22H63V24H70V32H72V57H67V65H61Z', c.white);
      animal(d, 'skunk', '#49484c', 'round'); r(43, 21, 11, 20, c.white); r(35, 43, 29, 14, c.white); r(45, 42, 10, 7, '#49484c');
      r(39, 58, 18, 18, c.white); r(23, 27, 10, 10, '#49484c'); r(64, 27, 10, 10, '#49484c'); break;
    case 'lola':
      animal(d, 'rabbit', '#b79873', 'long'); r(40, 42, 21, 13, '#e0c5a0'); r(39, 54, 19, 14, '#c2a3b9');
      r(42, 23, 20, 6, '#d9bd77'); r(51, 17, 14, 8, '#d9bd77'); r(61, 21, 9, 14, '#d9bd77'); r(60, 24, 8, 3, '#a481a7');
      r(37, 31, 5, 2, c.ink); r(54, 31, 5, 2, c.ink); r(40, 68, 17, 9, '#928da7');
      r(70, 60, 14, 15, '#c89462'); r(74, 58, 7, 19, '#c89462'); r(76, 59, 2, 17, '#9a704f'); r(70, 67, 14, 2, '#9a704f'); break;
    case 'mickey': case 'minnie': {
      const black = '#4b4749'; r(23, 15, 18, 18, black); r(55, 15, 18, 18, black); r(28, 26, 40, 32, black);
      p('M34 31H44V35H52V31H63V48H59V53H37V48H33Z', '#e6c7a3'); r(40, 34, 7, 12, c.white); r(50, 34, 7, 12, c.white);
      r(44, 37, 3, 8, c.ink); r(51, 37, 3, 8, c.ink); r(43, 45, 12, 6, black); r(39, 53, 18, 2, '#a87568');
      r(34, 57, 29, 20, motif === 'mickey' ? '#b8756d' : '#c28da4'); r(26, 58, 9, 15, black); r(63, 58, 9, 15, black);
      r(22, 70, 14, 9, c.white); r(61, 70, 14, 9, c.white); r(37, 76, 5, 6, black); r(55, 76, 5, 6, black);
      r(31, 81, 14, 5, '#d7b573'); r(52, 81, 16, 5, '#d7b573');
      if (motif === 'minnie') {
        p('M32 12H42L48 17L54 12H64V26H54L48 21L42 26H32Z', '#c38fa5'); r(45, 16, 7, 7, '#a6748c');
        for (const [x, y] of [[35, 16], [56, 17], [38, 63], [52, 63], [45, 71], [59, 71]]) r(x, y, 3, 3, c.white);
        r(31, 69, 36, 9, '#c28da4'); r(37, 32, 9, 2, black); r(51, 32, 8, 2, black);
      } else { r(39, 63, 4, 7, c.cream); r(53, 63, 4, 7, c.cream); }
      break;
    }
    case 'donald':
      r(31, 28, 35, 28, c.white); r(33, 21, 30, 13, c.white); r(35, 52, 29, 25, '#789ab7'); r(29, 59, 7, 14, c.white); r(64, 59, 8, 14, c.white);
      r(30, 17, 38, 9, '#789ab7'); r(36, 11, 26, 9, '#789ab7'); r(28, 24, 43, 4, '#5d7d9e');
      r(36, 30, 9, 13, c.white); r(52, 30, 9, 13, c.white); r(40, 32, 4, 9, '#7798ae'); r(53, 32, 4, 9, '#7798ae');
      r(27, 43, 44, 9, '#d4a365'); r(35, 51, 29, 4, '#be8d58'); r(32, 55, 15, 5, c.white); r(52, 55, 15, 5, c.white);
      r(43, 58, 12, 8, '#b77974'); r(32, 73, 10, 8, '#d4a365'); r(56, 73, 10, 8, '#d4a365'); r(26, 79, 17, 5, '#d4a365'); r(55, 79, 18, 5, '#d4a365'); break;
    case 'goofy':
      r(39, 25, 24, 27, '#56504a'); r(26, 33, 8, 29, '#4f4945'); r(64, 34, 8, 29, '#4f4945');
      r(35, 29, 13, 17, c.white); r(49, 29, 12, 17, c.white); r(42, 33, 4, 11, c.ink); r(50, 33, 4, 11, c.ink);
      r(33, 43, 28, 15, '#d2b18a'); r(30, 43, 15, 8, '#514944'); r(46, 53, 14, 7, '#7b6252'); r(48, 52, 4, 6, c.white); r(54, 52, 4, 6, c.white);
      r(37, 16, 28, 10, '#90a36f'); r(44, 9, 18, 9, '#90a36f'); r(36, 23, 30, 4, '#66794f');
      r(32, 59, 34, 15, '#c19663'); r(39, 60, 5, 13, '#615b52'); r(56, 60, 5, 13, '#615b52'); r(34, 74, 13, 10, '#7792a7'); r(52, 74, 13, 10, '#7792a7'); break;
    case 'pluto':
      r(26, 48, 43, 21, '#d1ad61'); r(22, 55, 11, 22, '#d1ad61'); r(57, 55, 11, 22, '#d1ad61');
      r(31, 25, 30, 30, '#d1ad61'); r(23, 27, 9, 29, '#554c43'); r(60, 27, 9, 29, '#554c43');
      r(34, 31, 10, 13, c.white); r(48, 31, 10, 13, c.white); r(40, 35, 3, 8, c.ink); r(50, 35, 3, 8, c.ink);
      r(33, 43, 32, 13, '#e2c587'); r(40, 42, 14, 8, '#554c43'); r(32, 53, 32, 5, '#86a071');
      r(20, 75, 15, 6, '#d1ad61'); r(55, 75, 15, 6, '#d1ad61'); p('M68 53H75V40H78V59H68Z', '#554c43'); r(44, 54, 9, 7, '#c6ac70'); break;
    case 'panther':
      r(38, 40, 20, 34, '#c88fa7'); r(34, 20, 29, 26, '#c88fa7'); r(28, 16, 10, 13, '#c88fa7'); r(59, 16, 10, 13, '#c88fa7');
      r(36, 26, 10, 9, '#ded095'); r(52, 26, 10, 9, '#ded095'); r(42, 29, 3, 6, c.ink); r(53, 29, 3, 6, c.ink);
      r(33, 34, 32, 9, '#ddaec0'); r(45, 32, 11, 6, '#a46783'); r(45, 40, 2, 6, '#a46783'); r(33, 29, 14, 3, '#bb7f9b');
      r(24, 48, 14, 5, '#c88fa7'); r(21, 48, 6, 19, '#c88fa7'); r(57, 48, 6, 23, '#c88fa7'); r(38, 71, 5, 11, '#c88fa7'); r(53, 71, 5, 11, '#c88fa7');
      r(32, 80, 12, 5, '#c88fa7'); r(52, 80, 13, 5, '#c88fa7'); p('M57 65H76V58H81V68H74V72H57Z', '#c88fa7'); break;
    case 'gadget':
      person(d, 48, 40, '#a3a5a1', '#544f48'); r(22, 25, 52, 6, '#939c9e'); r(32, 16, 31, 13, '#939c9e'); r(34, 24, 27, 3, '#657479');
      r(43, 34, 13, 10, '#dfb493'); r(49, 35, 15, 6, '#dfb493'); r(44, 44, 12, 3, '#a57767'); r(39, 57, 5, 6, '#757c79'); r(55, 57, 5, 6, '#757c79');
      r(31, 67, 35, 4, '#707973'); r(46, 53, 4, 25, '#707973'); r(68, 47, 5, 22, '#a5b1b1');
      r(68, 45, 12, 4, '#a5b1b1'); r(77, 35, 4, 13, '#a5b1b1'); r(72, 30, 6, 7, '#a5b1b1'); r(79, 30, 6, 7, '#a5b1b1'); r(73, 34, 10, 6, '#a5b1b1'); break;
    case 'garfield':
      r(24, 43, 47, 33, '#d0a064'); r(24, 26, 47, 29, '#d0a064'); r(29, 20, 10, 15, '#d0a064'); r(58, 20, 10, 15, '#d0a064');
      r(30, 35, 16, 10, c.white); r(49, 35, 16, 10, c.white); r(30, 31, 16, 8, '#c19259'); r(49, 31, 16, 8, '#c19259');
      r(41, 39, 3, 6, c.ink); r(50, 39, 3, 6, c.ink); r(31, 45, 33, 10, '#e2bc80'); r(43, 44, 11, 6, '#b58b72');
      r(21, 34, 8, 3, '#795d49'); r(65, 34, 9, 3, '#795d49'); r(22, 56, 9, 3, '#795d49'); r(64, 58, 9, 3, '#795d49');
      r(43, 24, 3, 8, '#795d49'); r(50, 24, 3, 8, '#795d49'); r(18, 72, 18, 6, '#d0a064'); r(61, 72, 16, 6, '#d0a064');
      r(37, 66, 26, 13, '#918576'); r(39, 64, 22, 10, '#d7b57e'); r(41, 64, 18, 3, '#b3765c'); r(39, 70, 22, 2, '#edcb8d'); break;
    case 'gumball':
      r(26, 23, 45, 33, '#89b9c4'); r(22, 16, 12, 22, '#89b9c4'); r(63, 16, 12, 22, '#89b9c4'); r(29, 20, 5, 10, '#b4d3d3'); r(65, 20, 5, 10, '#b4d3d3');
      r(32, 30, 13, 13, c.white); r(50, 30, 13, 13, c.white); r(40, 33, 4, 8, c.ink); r(51, 33, 4, 8, c.ink);
      r(43, 44, 11, 5, '#668f9c'); r(37, 51, 21, 2, c.ink); r(20, 44, 11, 2, '#668f9c'); r(65, 44, 11, 2, '#668f9c');
      r(31, 57, 34, 19, '#c7bca8'); r(32, 57, 32, 4, '#a49382'); r(30, 70, 7, 6, '#a49382'); r(60, 70, 7, 6, '#a49382');
      r(36, 75, 9, 8, '#7d8588'); r(54, 75, 9, 8, '#7d8588'); p('M65 67H79V58H75V63H65Z', '#89b9c4'); break;
    case 'darwin':
      r(26, 20, 43, 38, '#d6a06b'); r(21, 27, 53, 24, '#d6a06b'); r(33, 54, 29, 16, '#d6a06b');
      r(27, 27, 17, 15, c.white); r(48, 27, 17, 15, c.white); r(38, 31, 4, 9, c.ink); r(50, 31, 4, 9, c.ink);
      r(40, 48, 21, 3, '#8c6955'); r(45, 51, 8, 3, '#c88765'); r(32, 65, 7, 13, '#d6a06b'); r(57, 65, 7, 13, '#d6a06b');
      r(25, 75, 18, 8, '#8ea97c'); r(53, 75, 18, 8, '#8ea97c'); r(25, 81, 18, 3, c.white); r(53, 81, 18, 3, c.white);
      p('M24 43H17V38H12V52H24Z', '#d6a06b'); p('M70 43H77V38H82V52H70Z', '#d6a06b'); break;
    case 'finn':
      r(29, 17, 39, 32, c.white); r(29, 12, 10, 14, c.white); r(58, 12, 10, 14, c.white); r(34, 26, 28, 18, '#dfba98');
      r(40, 31, 3, 3, c.ink); r(54, 31, 3, 3, c.ink); r(44, 38, 11, 2, '#986f61');
      r(34, 49, 28, 22, '#80b4c0'); r(25, 49, 9, 23, '#94ad77'); r(24, 51, 10, 9, '#aecb8c');
      r(31, 69, 34, 9, '#698ca5'); r(35, 76, 6, 6, '#dfba98'); r(55, 76, 6, 6, '#dfba98'); r(32, 82, 12, 4, c.ink); r(52, 82, 12, 4, c.ink);
      r(70, 27, 4, 39, '#d3bc7c'); r(64, 63, 17, 4, '#ab985c'); r(69, 67, 6, 13, '#97784f'); break;
    default: throw new Error(`Unknown cartoon motif: ${motif}`);
  }
  return d.finish();
}

const glyphs = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'], G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'], N: ['101', '111', '111', '111', '101'], O: ['010', '101', '101', '101', '010'], P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '111', '011'], R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'], V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'], ' ': ['000', '000', '000', '000', '000'], '9': ['111', '101', '111', '001', '111'], '0': ['111', '101', '101', '101', '111']
};
function pixelText(d, word, x, y, color = palette.white, scale = 1) {
  [...word].forEach((letter, i) => (glyphs[letter] ?? glyphs[' ']).forEach((line, row) => [...line].forEach((bit, col) => { if (bit === '1') d.r(x + (i * 4 + col) * scale, y + row * scale, scale, scale, color); })));
}
function wrapper(d, label, accent, style = 'bar') {
  const { r } = d; const c = palette;
  if (style === 'bar') { r(15, 32, 66, 28, c.ink); r(17, 34, 62, 24, accent); r(15, 34, 5, 24, '#cab99f'); r(76, 34, 5, 24, '#cab99f'); r(22, 35, 51, 3, '#d0b3a0'); }
  else { r(25, 20, 46, 47, c.ink); r(27, 22, 42, 43, accent); r(25, 20, 46, 4, '#cab99f'); r(25, 63, 46, 4, '#cab99f'); }
  pixelText(d, label, 48 - (label.length * 4 - 1) / 2, style === 'bar' ? 43 : 32);
}
function nostalgiaArt(row, index) {
  const [name, , , motif, accent] = row; const d = drawing(name, accent, index); const { r, p } = d; const c = palette;
  switch (motif) {
    case 'pet':
      r(29, 18, 38, 59, '#b692b4'); r(24, 26, 48, 44, '#b692b4'); r(33, 32, 30, 23, c.ink); r(36, 35, 24, 17, '#aab397'); r(44, 40, 9, 8, '#59674f'); r(42, 39, 3, 3, '#59674f'); r(52, 39, 3, 3, '#59674f'); r(46, 43, 2, 2, '#aab397'); r(51, 43, 2, 2, '#aab397'); for (let i = 0; i < 3; i++) r(34 + i * 10, 63, 5, 5, '#d5c66a'); break;
    case 'collector-cards':
      for (let i = 0; i < 3; i++) { r(20 + i * 14, 22 + i * 5, 32, 43, c.ink); r(22 + i * 14, 24 + i * 5, 28, 39, [c.yellow, c.pink, c.blue][i]); r(27 + i * 14, 30 + i * 5, 18, 19, c.cream); person(d, 35 + i * 14, 40 + i * 5, c.green, c.hair, 0.3); r(27 + i * 14, 53 + i * 5, 18, 3, c.white); } break;
    case 'cassette': case 'vhs':
      r(15, 27, 66, 43, c.ink); r(18, 30, 60, 37, motif === 'vhs' ? '#657177' : '#8197a2'); r(25, 35, 46, 17, '#c6c4b6'); r(29, 38, 11, 10, '#747778'); r(57, 38, 11, 10, '#747778'); r(33, 41, 4, 4, c.cream); r(61, 41, 4, 4, c.cream); r(36, 57, 25, 7, c.ink); pixelText(d, motif === 'vhs' ? 'VHS' : 'KASET', 40, 20, c.ink); break;
    case 'handheld':
      r(29, 14, 38, 65, '#909f7c'); r(33, 21, 30, 29, c.ink); r(36, 24, 24, 23, '#c1c7a7'); for (const [x, y] of [[38, 38], [42, 38], [42, 34], [46, 34], [50, 38], [54, 38], [54, 42]]) r(x, y, 3, 3, '#647353'); r(36, 58, 11, 4, c.ink); r(39, 55, 4, 10, c.ink); r(54, 60, 5, 5, '#ad796c'); break;
    case 'walkman':
      r(25, 34, 45, 39, '#769bb1'); r(31, 43, 33, 20, c.ink); r(35, 47, 25, 12, '#a5bbb9'); r(26, 34, 43, 5, '#b7c7c5'); r(20, 21, 4, 31, c.ink); r(20, 17, 56, 4, c.ink); r(72, 21, 4, 31, c.ink); r(17, 36, 9, 18, c.ink); r(70, 36, 9, 18, c.ink); break;
    case 'floppy':
      r(25, 20, 47, 55, '#687889'); r(30, 20, 32, 20, '#b7bcb8'); r(50, 23, 7, 14, '#788186'); r(32, 49, 33, 22, c.cream); r(37, 54, 23, 3, accent); r(37, 62, 17, 2, accent); break;
    case 'television':
      r(15, 30, 66, 42, '#827564'); r(21, 35, 46, 31, c.ink); r(24, 38, 40, 25, '#94b1ae'); for (let i = 0; i < 5; i++) r(24 + i * 8, 38, 8, 19, ['#c3ad6a', '#a5b382', '#9da1ba', '#c88e9c', '#759daa'][i]); r(70, 39, 6, 6, c.cream); r(70, 51, 6, 6, c.cream); r(27, 72, 7, 6, '#827564'); r(64, 72, 7, 6, '#827564'); p('M45 30L29 17L32 14L48 27L62 14L65 17L51 30Z', c.ink); break;
    case 'telephone':
      r(25, 41, 47, 30, '#ba8e86'); r(20, 32, 57, 9, '#ba8e86'); r(20, 29, 16, 17, '#ba8e86'); r(61, 29, 16, 17, '#ba8e86'); r(37, 44, 23, 23, '#d2bca0'); r(43, 50, 11, 11, '#987b68'); for (const [x, y] of [[39, 47], [50, 47], [55, 56], [48, 62], [39, 59]]) r(x, y, 3, 3, c.ink); break;
    case 'cartridge':
      r(26, 25, 45, 47, '#b5a164'); r(32, 33, 33, 24, '#c6d1b3'); r(37, 37, 23, 16, '#879d95'); pixelText(d, '90', 43, 41, c.cream); r(32, 65, 33, 7, c.ink); for (let i = 0; i < 7; i++) r(34 + i * 4, 66, 2, 6, '#c9aa67'); break;
    case 'marbles':
      for (const [x, y, color] of [[22, 43, c.blue], [42, 29, c.pink], [57, 50, c.green], [32, 61, c.yellow]]) { r(x, y, 17, 17, color); r(x + 3, y - 2, 11, 21, color); r(x + 2, y + 4, 4, 7, c.white); r(x + 8, y + 9, 5, 3, '#c4d2cc'); } break;
    case 'pogs':
      for (let i = 0; i < 4; i++) { const x = 19 + i % 2 * 32; const y = 25 + Math.floor(i / 2) * 27; r(x + 3, y, 22, 23, [c.blue, c.yellow, c.pink, c.green][i]); r(x, y + 4, 28, 15, [c.blue, c.yellow, c.pink, c.green][i]); r(x + 9, y + 7, 9, 9, c.cream); r(x + 12, y + 4, 3, 15, c.cream); } break;
    case 'yoyo':
      r(20, 25, 3, 25, c.ink); r(22, 25, 34, 3, c.ink); r(53, 28, 3, 18, c.ink); r(28, 47, 41, 26, '#bc8177'); r(32, 43, 33, 34, '#bc8177'); r(37, 50, 23, 20, '#d2a39a'); r(45, 55, 8, 10, c.cream); break;
    case 'top':
      p('M22 43H74L63 62H58L51 75H45L38 62H33Z', '#ae865d'); r(27, 41, 42, 8, '#c3a572'); r(43, 26, 10, 15, '#866849'); r(37, 31, 22, 6, '#b1916b'); r(25, 57, 46, 3, '#a27065'); break;
    case 'elastic':
      r(20, 35, 4, 39, '#8a735f'); r(71, 35, 4, 39, '#8a735f'); r(24, 54, 47, 3, '#af819b'); r(24, 64, 47, 3, '#af819b'); r(44, 29, 9, 24, c.cream); r(35, 25, 28, 7, c.blue); r(42, 17, 12, 9, c.skin); r(44, 50, 4, 21, c.ink); r(50, 50, 4, 14, c.ink); break;
    case 'hopscotch':
      for (const [x, y, w] of [[39, 65, 18], [25, 49, 23], [49, 49, 23], [39, 33, 18], [25, 17, 23], [49, 17, 23]]) { r(x, y, w, 15, c.cream); r(x + 2, y + 2, w - 4, 11, '#ada699'); } r(45, 69, 3, 5, c.cream); r(35, 54, 4, 4, c.cream); r(59, 54, 4, 4, c.cream); r(45, 37, 3, 4, c.cream); break;
    case 'rope':
      p('M25 24H29V66H34V71H62V66H67V24H71V68H67V75H29V68H25Z', '#bd9c5a'); r(20, 19, 13, 24, '#a97f6c'); r(63, 19, 13, 24, '#a97f6c'); break;
    case 'paper':
      p('M19 46L47 19L76 46L48 77Z', c.white); p('M19 46L47 19L47 46Z', '#b78fa5'); p('M47 46L76 46L48 77Z', '#97b5ad'); p('M47 46L48 77L19 46Z', '#d1b878'); p('M47 19L76 46L47 46Z', '#9fa7bd'); break;
    case 'book':
      r(26, 21, 43, 56, '#b97d67'); r(31, 24, 35, 49, '#efe2c3'); pixelText(d, 'CIN ALI', 36, 30, c.ink); r(47, 42, 8, 8, c.ink); r(43, 43, 16, 3, c.ink); r(50, 50, 2, 13, c.ink); p('M42 54H44L51 57L58 54H60V56L51 60Z', c.ink); p('M50 61H52L43 70H40Z', c.ink); p('M50 61H52L61 70H58Z', c.ink); break;
    case 'abacus':
      r(22, 23, 5, 53, '#a58360'); r(69, 23, 5, 53, '#a58360'); r(22, 20, 52, 5, '#a58360'); r(22, 74, 52, 5, '#a58360'); for (let i = 0; i < 4; i++) { r(27, 30 + i * 11, 42, 2, '#a2ada4'); for (let j = 0; j < 4; j++) r(32 + j * 9 + i % 2 * 3, 27 + i * 11, 6, 8, [c.pink, c.blue, c.green, c.yellow][i]); } break;
    case 'sharpener':
      r(31, 32, 31, 43, '#87aaa5'); r(29, 24, 35, 14, '#a9c3b9'); r(40, 27, 13, 9, c.ink); r(64, 46, 10, 4, '#868983'); r(71, 46, 4, 15, '#868983'); r(70, 59, 8, 6, '#a07f60'); r(39, 43, 15, 21, '#d0d7ca'); break;
    case 'erasers':
      for (const [x, y, color] of [[19, 39, c.pink], [39, 25, c.yellow], [56, 49, c.blue]]) { r(x, y, 23, 20, color); r(x + 3, y + 3, 17, 3, '#e3d2b8'); r(x + 5, y + 12, 14, 2, '#9c8d80'); } break;
    case 'pen':
      r(43, 20, 13, 52, '#dadbd0'); r(43, 20, 13, 10, '#719fb5'); r(40, 32, 19, 5, '#a8c0c8'); r(44, 72, 11, 5, '#8e8f85'); r(47, 77, 5, 4, c.ink); r(44, 25, 3, 6, '#ba8179'); r(49, 25, 3, 6, '#83a175'); r(54, 25, 3, 6, '#b69a63'); break;
    case 'diary': case 'album':
      r(25, 20, 46, 58, accent); r(28, 23, 40, 52, '#ccbca7'); r(34, 30, 28, 22, motif === 'diary' ? '#c299af' : '#91b0aa'); r(40, 36, 5, 6, c.cream); r(49, 36, 5, 6, c.cream); r(44, 42, 7, 6, c.cream); for (let i = 0; i < 4; i++) r(34, 57 + i * 4, 26 - i % 2 * 5, 2, '#ad9e8d'); break;
    case 'arcade-token': case 'phone-token':
      r(25, 24, 46, 47, motif === 'phone-token' ? '#aaa995' : '#c4aa68'); r(20, 32, 56, 31, motif === 'phone-token' ? '#aaa995' : '#c4aa68'); r(28, 31, 40, 32, '#cfc3a4'); r(35, 37, 26, 20, '#a39271'); pixelText(d, motif === 'phone-token' ? 'PTT' : 'OYUN', motif === 'phone-token' ? 42 : 40, 43, c.cream); break;
    case 'computers':
      for (let i = 0; i < 2; i++) { const x = 13 + i * 37; r(x, 30, 32, 28, '#898d88'); r(x + 4, 34, 24, 20, '#92afa9'); r(x + 13, 58, 7, 9, '#898d88'); r(x + 3, 69, 28, 5, '#b0ada1'); r(x + 7, 39, 9, 3, '#698d87'); r(x + 7, 45, 17, 3, '#698d87'); } break;
    case 'arcade':
      r(29, 17, 38, 62, '#7f7286'); r(33, 21, 30, 9, '#bc9aab'); pixelText(d, 'OYUN', 40, 23, c.white); r(33, 35, 30, 23, c.ink); r(37, 39, 22, 15, '#8eaba7'); r(43, 44, 9, 7, c.yellow); r(28, 61, 40, 8, '#a994a8'); r(37, 58, 3, 9, c.ink); r(55, 62, 5, 4, '#b87e6c'); break;
    case 'stove':
      r(25, 41, 47, 34, '#80776b'); r(28, 38, 41, 5, '#93897a'); r(44, 13, 10, 25, '#80776b'); r(33, 52, 30, 17, '#504d48'); r(36, 56, 24, 8, '#c69259'); for (let i = 0; i < 5; i++) r(30 + i * 7, 34 + i % 2 * 2, 6, 5, '#8c6345'); break;
    case 'shop':
      r(20, 22, 56, 57, '#ae956d'); r(17, 20, 62, 11, '#a47872'); for (let i = 0; i < 5; i++) r(20 + i * 12, 21, 6, 10, '#d2c195'); r(25, 36, 46, 37, '#dccdae'); for (let j = 0; j < 3; j++) { r(25, 46 + j * 12, 46, 3, '#a68b65'); for (let i = 0; i < 5; i++) r(29 + i * 8, 38 + j * 12, 5, 8, [c.blue, c.pink, c.yellow, c.green, c.brown][(i + j) % 5]); } break;
    case 'juice-bag':
      p('M26 33H70L64 74H32Z', '#d2a175'); r(33, 41, 29, 27, '#c68b60'); r(26, 32, 44, 4, '#ece0c1'); r(50, 18, 4, 34, '#ad8271'); r(50, 18, 17, 4, '#ad8271'); break;
    case 'seed-cone':
      p('M20 28H76L50 78H46Z', '#d4c9b2'); r(29, 32, 39, 7, '#f2e9d4'); for (let j = 0; j < 3; j++) for (let i = 0; i < 7 - j; i++) r(28 + i * 6 + j * 3, 24 + j * 5, 3, 5, i % 2 ? '#8f8474' : '#685f52'); r(35, 48, 26, 2, '#9b9489'); r(39, 55, 19, 2, '#9b9489'); break;
    case 'sticks':
      for (let i = 0; i < 7; i++) { r(19 + i * 8, 29 + i % 3 * 7, 5, 37, '#b69670'); r(20 + i * 8, 32 + i % 3 * 7, 2, 28, '#d5ba8e'); } break;
    case 'lunchbox':
      r(34, 23, 29, 6, '#8a9697'); r(34, 23, 5, 13, '#8a9697'); r(58, 23, 5, 13, '#8a9697'); r(21, 35, 55, 37, '#81a4ac'); r(23, 38, 51, 30, '#a7c1bd'); r(30, 44, 37, 19, '#d3bc87'); r(46, 35, 6, 8, '#c5b9a0'); r(34, 51, 28, 3, '#ba9070'); break;
    default: throw new Error(`Unknown nostalgia motif: ${motif}`);
  }
  return d.finish();
}

function snackArt(row, index) {
  const [name, , , motif, accent, , label] = row; const d = drawing(name, accent, index); const { r, p } = d; const c = palette;
  if (['bar', 'caramel', 'coconut', 'wafer', 'cake', 'sticks', 'pretzel'].includes(motif)) wrapper(d, label, accent);
  else if (['gum', 'juice-packet'].includes(motif)) wrapper(d, label, accent, 'packet');
  switch (motif) {
    case 'bar': case 'caramel': case 'coconut':
      r(31, 65, 36, 12, '#79563f'); r(33, 67, 32, 5, motif === 'coconut' ? '#e4d8b6' : motif === 'caramel' ? '#c89e64' : '#b89a72'); r(31, 65, 36, 3, '#8f674b'); r(44, 65, 2, 12, '#644632'); r(56, 65, 2, 12, '#644632'); break;
    case 'wafer':
      r(30, 64, 37, 14, '#baa17a'); for (let i = 0; i < 3; i++) r(30, 66 + i * 4, 37, 2, '#e0caa0'); r(30, 64, 37, 2, '#9b7953'); break;
    case 'cin':
      r(22, 24, 52, 10, accent); pixelText(d, label, 42, 26); r(26, 40, 44, 35, '#ceaa6d'); r(22, 46, 52, 23, '#ceaa6d'); r(29, 44, 38, 26, '#bf8154'); for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) r(30 + i * 5, 47 + j * 5 + i % 2, 3, 3, '#795442'); break;
    case 'cream-tube':
      p('M28 27H69L60 69H38Z', '#d8b67e'); r(30, 28, 37, 7, '#9d785d'); r(37, 39, 25, 21, accent); pixelText(d, 'COKO', 42, 46); r(39, 69, 20, 8, '#e6dcc0'); break;
    case 'oat': case 'cracker': case 'cookies': case 'cookie': case 'swirl': case 'dark-cookie': case 'sandwich':
      r(18, 22, 60, 10, accent); pixelText(d, label, 48 - (label.length * 4 - 1) / 2, 25);
      for (let i = 0; i < 2; i++) { const x = 22 + i * 28; const color = motif === 'dark-cookie' ? '#71533f' : '#c9a471'; r(x + 3, 43 + i * 5, 22, 28, color); r(x, 47 + i * 5, 28, 20, color);
        if (motif === 'sandwich' || motif === 'dark-cookie') { r(x, 62 + i * 5, 28, 3, motif === 'dark-cookie' ? '#e2d6b7' : '#866044'); }
        if (motif === 'swirl') { p(`M${x + 7} ${48 + i * 5}H${x + 20}V${53 + i * 5}H${x + 12}V${59 + i * 5}H${x + 22}V${64 + i * 5}H${x + 8}Z`, '#795a44'); }
        else for (let j = 0; j < 3; j++) r(x + 6 + j * 6, 50 + i * 5 + j % 2 * 5, 3, 3, motif === 'dark-cookie' ? '#a28265' : '#977049'); }
      break;
    case 'puff': case 'marshmallow':
      r(17, 24, 62, 11, accent); pixelText(d, label, 48 - (label.length * 4 - 1) / 2, 27); r(26, 62, 45, 12, '#b78b60'); r(31, 45, 35, 22, motif === 'puff' ? '#e1c8bc' : '#8b654a'); r(27, 51, 43, 13, motif === 'puff' ? '#e1c8bc' : '#8b654a');
      if (motif === 'puff') for (let i = 0; i < 12; i++) r(31 + i % 6 * 6, 47 + Math.floor(i / 6) * 9, 3, 3, i % 2 ? '#b689a3' : '#ceb270');
      else { r(34, 62, 29, 7, '#e8d4b9'); r(34, 69, 29, 3, '#8b654a'); } break;
    case 'cake':
      r(32, 64, 33, 15, '#a17a51'); r(32, 64, 33, 4, '#7c5641'); r(37, 69, 23, 3, '#cbab7b'); break;
    case 'cupcake':
      r(20, 24, 56, 10, accent); pixelText(d, label, 37, 27); p('M29 54H67L61 78H35Z', '#baa079'); r(31, 43, 34, 14, '#bb9160'); r(36, 38, 24, 10, '#bb9160'); r(32, 52, 33, 5, '#926b45'); for (let i = 0; i < 4; i++) r(36 + i * 7, 59, 2, 16, '#dbbf91'); break;
    case 'sticks': case 'pretzel':
      for (let i = 0; i < 5; i++) { r(30 + i * 8, 62 + i % 2 * 3, 4, 17, '#c29b60'); r(30 + i * 8, 66, 2, 2, c.cream); } break;
    case 'cream-jar':
      r(30, 31, 36, 45, '#b9a58b'); r(27, 26, 42, 10, '#bda475'); r(30, 43, 36, 25, accent); pixelText(d, label, 35, 51); r(33, 37, 30, 4, '#956b4a'); break;
    case 'gum':
      r(34, 71, 27, 7, '#d7c8b4'); r(38, 70, 6, 8, '#ece0cb'); r(53, 70, 5, 8, '#ece0cb'); r(33, 46, 30, 12, '#d3b392'); if (label === 'TURBO') { r(38, 50, 19, 5, '#88a6b7'); r(40, 54, 4, 4, c.ink); r(52, 54, 4, 4, c.ink); } else { r(43, 49, 10, 5, '#a77c88'); r(46, 54, 4, 3, '#a77c88'); } break;
    case 'juice-pouch':
      p('M28 31H69L64 77H33Z', '#abbfbb'); r(34, 43, 30, 21, accent); pixelText(d, label, 39, 47); r(48, 12, 3, 31, '#c99772'); r(49, 12, 15, 3, '#c99772'); r(34, 63, 29, 4, '#d0b279'); break;
    case 'juice-packet':
      r(36, 46, 23, 12, '#cfaa5c'); r(42, 49, 12, 6, '#e4c67c'); r(20, 70, 24, 8, '#c9a55e'); r(22, 65, 20, 5, '#d7be7f'); break;
    case 'ice-tube':
      r(38, 24, 20, 52, '#dcbdab'); r(41, 31, 14, 40, '#cf9679'); r(37, 22, 22, 5, '#e7d1b3'); r(37, 75, 22, 4, '#e7d1b3'); r(41, 43, 14, 13, accent); pixelText(d, 'BUZ', 43, 46); break;
    case 'powder':
      p('M25 35H70L64 77H31Z', '#dcc9a3'); r(28, 33, 39, 5, '#b9a881'); r(33, 47, 29, 13, '#c3a572'); pixelText(d, 'TOZ', 42, 51); for (let i = 0; i < 6; i++) r(34 + i * 5, 28 + i % 2 * 2, 3, 3, '#c3a572'); break;
    case 'toast':
      r(21, 41, 55, 31, '#9f7953'); r(24, 38, 49, 30, '#d0ab73'); r(29, 42, 39, 21, '#e0bd84'); for (let i = 0; i < 5; i++) r(30 + i * 8, 43, 2, 18, '#b88f5d'); r(25, 68, 47, 5, '#dfbf74'); r(26, 74, 43, 3, '#a96354'); break;
    default: throw new Error(`Unknown snack motif: ${motif}`);
  }
  return d.finish();
}

const config = {
  'cocukluk-cizgifilmleri': { directory: 'cartoons', start: 11001, count: 60, art: cartoonArt },
  'doksanlar-nostalji': { directory: 'nostalgia', start: 12001, count: 35, art: nostalgiaArt },
  'kantin-bakkal': { directory: 'snacks', start: 13001, count: 35, art: snackArt }
};
// Limit asset writes when refreshing one collection; the complete merge feed is
// still emitted. Existing unrelated assets are left byte-for-byte unchanged.
const datasetArgument = process.argv.find(argument => argument.startsWith('--dataset='));
const selectedDataset = datasetArgument?.slice('--dataset='.length);
assert.ok(!selectedDataset || Object.hasOwn(config, selectedDataset), `Unknown dataset: ${selectedDataset}`);
const looneyCharacterNames = new Set([
  'Bugs Bunny', 'Daffy Duck', 'Tweety', 'Sylvester', 'Taz', 'Road Runner',
  'Wile E. Coyote', 'Porky Pig', 'Speedy Gonzales', 'Elmer Fudd',
  'Yosemite Sam', 'Foghorn Leghorn', 'Marvin the Martian', 'Pepé Le Pew', 'Lola Bunny'
]);
const feed = {};
for (const [dataset, items] of Object.entries(rows)) {
  const { directory, start, count, art } = config[dataset];
  assert.equal(items.length, count, `${dataset} must contain exactly ${count} records`);
  assert.equal(new Set(items.map(row => row[0].toLocaleLowerCase('tr-TR'))).size, count, `${dataset} contains duplicate names`);
  assert.equal(new Set(items.map(row => row[1])).size, count, `${dataset} contains duplicate asset paths`);
  const writeAssets = !selectedDataset || selectedDataset === dataset;
  if (writeAssets) await mkdir(new URL(`assets/images/${directory}/`, root), { recursive: true });
  feed[dataset] = [];
  for (const [index, row] of items.entries()) {
    const gorsel = `assets/images/${directory}/${row[1]}.svg`;
    const item = { id: start + index, isim: row[0], gorsel, etiket: row[2] };
    if (dataset === 'cocukluk-cizgifilmleri' && looneyCharacterNames.has(row[0])) item.evren = 'Looney Tunes';
    if (dataset === 'kantin-bakkal' && row[5]) item.marka = row[5];
    feed[dataset].push(item);
    if (writeAssets) await writeFile(new URL(gorsel, root), art(row, index), 'utf8');
  }
}
await writeFile(new URL('tools/nostalgia-sets.json', root), `${JSON.stringify(feed, null, 2)}\n`, 'utf8');
console.log('Generated 3 nostalgia collections: 60 cartoons, 35 memories, 35 snacks; 130 original local SVG card assets.');
