import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Original, locally generated pixel illustrations. No remote posters or photos.
// The fixed starts keep IDs stable before and after veri.json is merged.
// Only the 80 additions are drawn; existing assets are never overwritten.
const root = new URL('../', import.meta.url);
const current = JSON.parse(await readFile(new URL(process.argv[2] || 'veri.json', root), 'utf8'));
const desserts = [
  ['Lokma', 'lokma', 'Şerbetli', 'cookies', 0],
  ['Halka Tatlısı', 'halka-tatlisi', 'Şerbetli', 'rings', 0],
  ['Şambali', 'sambali', 'Şerbetli', 'squares', 0],
  ['Kalburabastı', 'kalburabasti', 'Şerbetli', 'pastry', 0],
  ['Kabak Tatlısı', 'kabak-tatlisi', 'Meyveli', 'fruit', 0],
  ['Ayva Tatlısı', 'ayva-tatlisi', 'Meyveli', 'fruit', 1],
  ['Cevizli Sucuk', 'cevizli-sucuk', 'Geleneksel', 'walnut-stick', 0],
  ['Pişmaniye', 'pismaniye', 'Geleneksel', 'cotton', 0],
  ['Tahin Helvası', 'tahin-helvasi', 'Helva', 'halva-bars', 0],
  ['Fıstıklı Sarma', 'fistikli-sarma', 'Şerbetli', 'sarma', 0],
  ['Burma Tatlısı', 'burma-tatlisi', 'Şerbetli', 'pastry', 1],
  ['Kestane Şekeri', 'kestane-sekeri', 'Meyveli', 'cookies', 1],
  ['Çikolatalı Kurabiye', 'cikolatali-kurabiye', 'Kurabiye', 'cookies', 2],
  ['Mozaik Pasta', 'mozaik-pasta', 'Pasta', 'mosaic', 0],
  ['Rulo Pasta', 'rulo-pasta', 'Pasta', 'roll-cake', 0],
  ['Limonlu Kek', 'limonlu-kek', 'Kek', 'lemon-cake', 0],
  ['San Sebastian Cheesecake', 'san-sebastian-cheesecake', 'Pasta', 'burnt-cake', 0],
  ['Panna Cotta', 'panna-cotta', 'Sütlü', 'pudding', 0],
  ['Crème Brûlée', 'creme-brulee', 'Sütlü', 'pudding', 1],
  ['Churros', 'churros', 'Hamur Tatlısı', 'pastry', 2]
];
const meals = [
  ['Mercimek Çorbası', 'mercimek-corbasi', 'Çorba', 'soup', 0],
  ['Ezogelin Çorbası', 'ezogelin-corbasi', 'Çorba', 'soup', 1],
  ['Yayla Çorbası', 'yayla-corbasi', 'Çorba', 'soup', 2],
  ['Menemen', 'menemen', 'Kahvaltı', 'eggs', 0],
  ['Çılbır', 'cilbir', 'Kahvaltı', 'eggs', 1],
  ['Kaşarlı Tost', 'kasarli-tost', 'Kahvaltı', 'toast', 0],
  ['Su Böreği', 'su-boregi', 'Hamur İşi', 'pastry', 3],
  ['Patatesli Gözleme', 'patatesli-gozleme', 'Hamur İşi', 'pastry', 4],
  ['Arnavut Ciğeri', 'arnavut-cigeri', 'Et', 'stew', 3],
  ['Ali Nazik', 'ali-nazik', 'Kebap', 'stew', 0],
  ['Et Sote', 'et-sote', 'Et', 'stew', 2],
  ['Tavuk Sote', 'tavuk-sote', 'Tavuk', 'stew', 4],
  ['Kadınbudu Köfte', 'kadinbudu-kofte', 'Köfte', 'kofte', 0],
  ['İzmir Köfte', 'izmir-kofte', 'Köfte', 'kofte', 1],
  ['Mücver', 'mucver', 'Sebze', 'fritters', 0],
  ['Zeytinyağlı Enginar', 'zeytinyagli-enginar', 'Sebze', 'vegetables', 0],
  ['Midye Dolma', 'midye-dolma', 'Deniz Ürünü', 'mussels', 0],
  ['Hamsi Tava', 'hamsi-tava', 'Deniz Ürünü', 'fish', 1],
  ['Spagetti Bolonez', 'spagetti-bolonez', 'İtalyan', 'noodles', 0],
  ['Pad Thai', 'pad-thai', 'Tayland', 'noodles', 1]
];
const series = [
  ['Prison Break', 'prison-break', 'Aksiyon', 'prison', 0],
  ['La Casa de Papel', 'la-casa-de-papel', 'Suç', 'mask', 0],
  ['Narcos', 'narcos', 'Suç', 'crime', 3],
  ['Dexter', 'dexter', 'Suç', 'crime', 4],
  ['Vikings', 'vikings', 'Tarihi', 'sword', 2],
  ['The Walking Dead', 'the-walking-dead', 'Korku', 'zombie', 0],
  ['Chernobyl', 'chernobyl', 'Dram', 'radiation', 0],
  ['Fargo', 'fargo', 'Suç', 'city', 3],
  ['Modern Family', 'modern-family', 'Komedi', 'family', 1],
  ['Brooklyn Nine-Nine', 'brooklyn-nine-nine', 'Komedi', 'badge', 0],
  ['The Big Bang Theory', 'the-big-bang-theory', 'Komedi', 'atom', 0],
  ['House', 'house', 'Dram', 'hospital', 0],
  ['Squid Game', 'squid-game', 'Gerilim', 'game', 0],
  ['Wednesday', 'wednesday', 'Fantastik', 'gothic', 0],
  ['The Mandalorian', 'the-mandalorian', 'Bilim Kurgu', 'helmet', 0],
  ['House of the Dragon', 'house-of-the-dragon', 'Fantastik', 'dragon', 0],
  ['Masum', 'masum', 'Polisiye', 'house', 1],
  ['Kuzey Güney', 'kuzey-guney', 'Dram', 'city', 4],
  ['Süper Baba', 'super-baba', 'Dram', 'family', 2],
  ['Seksenler', 'seksenler', 'Komedi', 'television', 1]
];
const movies = [
  ['Yeşil Yol', 'yesil-yol', 'Dram', 'prison', 1],
  ['Er Ryan’ı Kurtarmak', 'er-ryani-kurtarmak', 'Savaş', 'soldier', 0],
  ['İyi, Kötü ve Çirkin', 'iyi-kotu-ve-cirkin', 'Western', 'western', 1],
  ['Schindler’in Listesi', 'schindlerin-listesi', 'Dram', 'paper', 0],
  ['12 Öfkeli Adam', '12-ofkeli-adam', 'Dram', 'jury', 0],
  ['Dune', 'dune', 'Bilim Kurgu', 'desert', 0],
  ['Avatar', 'avatar', 'Bilim Kurgu', 'alien-world', 0],
  ['Terminator 2: Mahşer Günü', 'terminator-2-mahser-gunu', 'Bilim Kurgu', 'robot', 0],
  ['Alien', 'alien', 'Korku', 'alien', 0],
  ['Yenilmezler: Son Oyun', 'yenilmezler-son-oyun', 'Aksiyon', 'gauntlet', 0],
  ['Örümcek-Adam: Örümcek Evreninde', 'orumcek-adam-orumcek-evreninde', 'Animasyon', 'web', 0],
  ['Oyuncak Hikâyesi', 'oyuncak-hikayesi', 'Animasyon', 'toys', 0],
  ['WALL·E', 'wall-e', 'Animasyon', 'robot', 1],
  ['Yukarı Bak', 'yukari-bak', 'Animasyon', 'balloons', 0],
  ['Neşeli Günler', 'neseli-gunler', 'Komedi', 'family', 1],
  ['Aile Şerefi', 'aile-serefi', 'Dram', 'family', 2],
  ['Ayla', 'ayla', 'Dram', 'soldier', 1],
  ['Nefes: Vatan Sağ Olsun', 'nefes-vatan-sag-olsun', 'Savaş', 'soldier', 2],
  ['7. Koğuştaki Mucize', '7-kogustaki-mucize', 'Dram', 'prison', 2],
  ['Kelebeğin Rüyası', 'kelebegin-ruyasi', 'Dram', 'paper', 1]
];

const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
function drawing(name) {
  const bits = [];
  const rect = (x, y, w, h, color) => bits.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`);
  return { bits, rect, finish: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${escapeXml(name)} için temsili piksel çizim" shape-rendering="crispEdges"><title>${escapeXml(name)} — özgün piksel çizim</title>${bits.join('')}</svg>\n` };
}

function foodArt(name, style, variant, dessert, index) {
  const { rect: r, finish } = drawing(name);
  const gold = '#d8ad65', brown = '#936045', chocolate = '#68483f', cream = '#f5e3c0', green = '#748a55', red = '#bc6756';
  r(0, 0, 96, 96, dessert ? ['#dfc3b5', '#d5c8d9', '#dcd7ae'][index % 3] : ['#cbd5b8', '#c1d4d1', '#d5cbaf'][index % 3]);
  r(0, 71, 96, 25, '#b59d86'); r(0, 73, 96, 3, '#cab69d');
  r(11, 49, 74, 23, '#788f88'); r(15, 45, 66, 25, '#f4ecd5'); r(20, 48, 56, 17, '#e6dabd');
  r(8, 32, 3, 30, '#f3ead2'); r(5, 32, 3, 9, '#f3ead2'); r(11, 32, 3, 9, '#f3ead2'); r(85, 32, 3, 30, '#f3ead2');
  const sprinkle = (x, y, w, h, color, count = 12) => {
    for (let i = 0; i < count; i++) r(x + ((i * 13 + index * 3) % w), y + ((i * 7 + index) % h), 2, 2, color);
  };
  const chunk = (x, y, w, h, color) => { r(x + 2, y, w - 4, h, color); r(x, y + 2, w, h - 4, color); };
  if (style === 'squares') {
    const top = [gold, cream, '#f2e7d0', '#d6c48a', chocolate][variant];
    for (let y = 34; y <= 50; y += 16) for (let x = 26; x <= 58; x += 16) {
      r(x, y + 3, 14, 12, variant === 4 ? brown : '#b88755'); r(x, y, 14, 10, top);
      r(x + 2, y + 2, 10, 2, variant === 4 ? '#a07c65' : '#f0d9a4');
      sprinkle(x + 2, y + 3, 8, 4, variant === 4 ? cream : green, 3);
    }
  } else if (style === 'cookies' || style === 'puffs') {
    for (let y = 36; y <= 51; y += 15) for (let x = 25; x <= 61; x += 18) {
      chunk(x, y, 15, 12, style === 'puffs' ? chocolate : variant ? '#bd8751' : gold);
      r(x + 4, y + 2, 7, 3, style === 'puffs' ? '#917464' : '#efd5a1');
      if (style === 'cookies') r(x + 6, y + 5, 3, 4, brown);
      if (variant === 2) { r(x + 2, y + 4, 3, 3, chocolate); r(x + 9, y + 8, 3, 2, chocolate); }
    }
  } else if (style === 'sticks') {
    for (let y = 33; y < 63; y += 10) {
      chunk(27 + ((y % 2) * 3), y, 41, 8, variant ? cream : gold);
      r(29, y, 37, 4, variant ? chocolate : '#c98746');
      if (!variant) for (let x = 31; x < 65; x += 6) r(x, y + 1, 2, 5, '#e9bf73');
    }
  } else if (style === 'mound') {
    r(28, 50, 40, 14, '#ad8257'); r(31, 42, 34, 15, variant ? '#b88755' : '#d3b076'); r(38, 34, 20, 15, variant ? '#bd996d' : '#e2c58e');
    sprinkle(32, 43, 29, 16, variant ? '#ecd4ab' : brown, 18); r(44, 32, 7, 4, green);
  } else if (style === 'bowl' || style === 'ramekin') {
    r(27, 35, 42, 25, style === 'ramekin' ? '#c99b83' : '#c6c1b5'); r(31, 40, 34, 23, cream); r(35, 59, 26, 7, '#cab8a0');
    r(27, 32, 42, 12, variant || style === 'ramekin' ? chocolate : '#d8b67a'); r(31, 29, 34, 7, variant || style === 'ramekin' ? '#8e6553' : '#e9cb98');
    sprinkle(31, 31, 32, 7, style === 'ramekin' ? cream : red, 10);
    if (style === 'ramekin') for (let x = 33; x < 65; x += 7) r(x, 46, 2, 12, '#a58375');
  } else if (style === 'cake') {
    r(29, 32, 40, 31, [cream, cream, '#e6ce9f', chocolate][variant]); r(29, 49, 40, 3, ['#ceb393', gold, chocolate, '#c2997c'][variant]);
    r(29, 35, 40, 5, ['#ca9264', red, chocolate, '#86594d'][variant]); r(33, 27, 32, 8, [gold, '#ba5e59', '#95705b', chocolate][variant]);
    if (variant === 1) { r(44, 23, 8, 6, '#c66565'); r(47, 20, 3, 4, green); }
    else sprinkle(33, 29, 29, 5, variant === 3 ? cream : '#f0d9ad');
  } else if (style === 'glass') {
    r(30, 27, 36, 36, '#9bbcb5'); r(34, 31, 28, 27, cream); r(34, 40, 28, 4, gold); r(34, 53, 28, 5, gold);
    r(32, 26, 32, 6, '#e9cd9d'); r(39, 24, 6, 8, red); r(52, 23, 6, 8, red); r(35, 31, 3, 26, '#fff0d7'); r(39, 62, 18, 4, '#a3b2a1');
  } else if (style === 'icecream') {
    r(35, 48, 26, 8, gold); r(39, 56, 18, 8, '#ba8b54'); r(43, 64, 10, 6, gold); r(46, 70, 4, 5, '#ba8b54');
    chunk(28, 30, 19, 21, '#c77f8a'); chunk(49, 30, 19, 21, '#a3826a'); chunk(39, 15, 21, 22, cream); r(44, 16, 9, 4, '#fff2d7');
  } else if (style === 'waffle' || style === 'tart') {
    chunk(26, 30, 45, 33, gold); r(30, 34, 37, 25, style === 'tart' ? '#c78853' : '#b98a53');
    for (let x = 32; x < 66; x += 8) r(x, 34, 3, 25, '#e6c58b');
    for (let y = 36; y < 59; y += 8) r(30, y, 37, 3, '#e6c58b');
    if (style === 'waffle') { r(29, 47, 36, 4, chocolate); for (let x = 30; x < 64; x += 12) { r(x, 36, 6, 7, red); r(x + 6, 53, 5, 5, cream); } }
  } else if (style === 'stack') {
    for (let y = 40; y < 63; y += 6) { chunk(27, y, 44, 7, '#b98851'); r(29, y, 40, 3, '#e5c389'); }
    r(35, 37, 28, 4, '#a77342'); r(52, 39, 5, 15, '#a77342'); r(42, 31, 12, 7, '#ecd2a1');
  } else if (style === 'donut') {
    chunk(26, 29, 45, 34, gold); chunk(29, 29, 39, 25, '#c58194'); r(42, 36, 14, 15, '#e6dabd'); r(42, 49, 14, 3, '#aa764b');
    sprinkle(32, 32, 32, 21, cream, 16);
  } else if (style === 'macaron') {
    for (const [x, y, c] of [[24, 35, '#b6899f'], [43, 48, '#7fa68b'], [57, 29, '#cfad76']]) {
      chunk(x, y, 19, 16, c); r(x, y + 7, 19, 3, cream); r(x + 4, y + 2, 10, 2, '#e1cbb3');
    }
  } else if (style === 'skewers') {
    r(24, 53, 48, 10, gold);
    for (let y = 34; y < 56; y += 13) { r(20, y + 4, 56, 2, '#8b8476'); for (let x = 25; x < 68; x += 12) { chunk(x, y, 11, 9, variant === 2 ? '#d3ae78' : '#a66c4e'); r(x + 2, y + 2, 2, 4, '#694a39'); } }
    r(25, 60, 13, 4, green); r(59, 60, 10, 4, red);
  } else if (style === 'wrap') {
    r(29, 27, 32, 33, '#e6c18c'); r(34, 25, 30, 8, green); r(38, 25, 9, 4, red); r(51, 28, 11, 4, brown);
    r(34, 47, 23, 17, '#f0e9d6'); r(31, 52, 27, 8, '#f0e9d6'); r(39, 61, 14, 7, '#d0cab7'); r(33, 36, 2, 11, '#b89161');
  } else if (style === 'kofte') {
    for (let y = 33; y <= 50; y += 17) for (let x = 25; x < 65; x += variant ? 12 : 21) {
      chunk(x, y, variant ? 10 : 18, variant ? 13 : 15, variant ? brown : '#c89a5d'); r(x + 3, y + 3, variant ? 2 : 11, 3, variant ? '#d3a37b' : '#e4be7f');
    }
    r(29, 64, 35, 3, green); r(70, 48, 5, 9, red);
  } else if (style === 'fries') {
    for (let x = 25; x < 69; x += 6) r(x, 35 + (x % 3), 4, 25, gold);
    r(28, 42, 38, 10, cream); for (let x = 31; x < 65; x += 8) r(x, 39 + (x % 3), 6, 16, brown); r(31, 42, 31, 3, red); r(42, 36, 10, 3, green);
  } else if (style === 'stew') {
    r(24, 35, 48, 25, '#cba07e'); r(28, 39, 40, 25, cream); r(32, 59, 32, 7, '#caba9e'); r(25, 32, 46, 16, variant === 0 ? '#dac49e' : '#b97c51');
    for (let i = 0; i < 14; i++) r(29 + ((i * 11) % 36), 33 + ((i * 7) % 10), variant === 1 ? 4 : 6, 4, variant === 1 ? gold : (i % 3 === 0 ? green : brown));
  } else if (style === 'eggplant') {
    for (let x = 26; x <= 56; x += 30) { chunk(x, 29, 21, 34, '#5b565e'); r(x + 4, 32, 13, 25, variant ? '#cb916a' : brown); r(x + 6, 34, 9, 6, red); r(x + 4, 25, 5, 8, green); sprinkle(x + 5, 43, 10, 12, green, 5); }
  } else if (style === 'sarma') {
    for (let y = 33; y < 62; y += 10) for (let x = 25; x < 68; x += 15) { chunk(x, y, 13, 8, '#647e50'); r(x + 2, y + 1, 9, 2, '#93a270'); }
    r(64, 31, 10, 9, '#e8cf79'); r(66, 33, 6, 5, '#f4dfa0');
  } else if (style === 'peppers') {
    for (const [x, y] of [[27, 31], [51, 31], [39, 47]]) { chunk(x, y, 18, 18, green); r(x + 3, y + 3, 12, 4, '#dfc28a'); r(x + 5, y, 8, 4, red); r(x + 8, y - 3, 3, 4, '#456b47'); }
  } else if (style === 'pide') {
    r(22, 42, 52, 14, gold); r(28, 37, 40, 24, gold); r(26, 45, 44, 9, brown); r(32, 41, 32, 16, brown);
    sprinkle(31, 42, 31, 13, green); sprinkle(31, 42, 31, 13, red, 8); r(30, 61, 36, 3, '#a47e4f');
  } else if (style === 'rice') {
    r(27, 44, 44, 19, variant ? '#d6cba4' : '#e5dbbd'); r(33, 35, 32, 21, cream); r(40, 30, 19, 10, cream);
    sprinkle(32, 37, 31, 22, variant ? green : '#c9ba9a', 22);
    if (!variant) for (let x = 34; x <= 59; x += 9) { r(x, 34, 7, 7, '#d1aa7d'); r(x + 1, 34, 5, 2, '#f3d4a5'); }
  } else if (style === 'fish') {
    if (variant) {
      for (let y = 32; y < 64; y += 10) { r(26, y, 39, 6, '#b1b3a0'); r(31, y + 1, 29, 2, '#eee0b7'); r(64, y - 1, 9, 3, gold); r(64, y + 4, 9, 3, gold); r(28, y + 2, 2, 2, '#394f49'); }
    } else { r(26, 39, 41, 21, '#8d9c95'); r(32, 34, 26, 31, '#9eafa0'); r(32, 42, 28, 3, '#d5d6b5'); r(65, 36, 9, 9, '#6f8f81'); r(65, 54, 9, 9, '#6f8f81'); r(30, 42, 3, 3, '#394f49'); }
    r(52, 27, 12, 10, '#e8ce75'); r(55, 29, 6, 6, '#f2de9a'); r(24, 63, 48, 3, green);
  } else if (style === 'pizza') {
    chunk(24, 27, 48, 39, '#bc8651'); chunk(27, 30, 42, 33, '#d4b56a'); r(30, 32, 36, 28, '#ddc880');
    for (const [x, y] of [[33, 34], [50, 36], [59, 48], [38, 52], [46, 45]]) { chunk(x, y, 8, 7, red); r(x + 3, y + 2, 2, 2, brown); }
    sprinkle(30, 33, 32, 26, green, 10);
  } else if (style === 'burger') {
    r(29, 33, 39, 8, gold); r(35, 27, 27, 8, '#e2bc7b'); r(26, 41, 45, 5, green); r(29, 46, 39, 5, red); r(26, 51, 45, 7, brown); r(31, 49, 33, 3, '#ead083'); r(29, 59, 39, 7, gold);
    sprinkle(36, 29, 24, 9, cream, 9);
  } else if (style === 'lasagna') {
    r(27, 31, 43, 32, '#d2a970'); for (let y = 35; y < 60; y += 8) { r(27, y, 43, 4, red); r(27, y + 4, 43, 2, cream); }
    r(26, 29, 45, 8, '#e3c48a'); sprinkle(31, 29, 35, 6, green, 14);
  } else if (style === 'sushi') {
    r(19, 43, 58, 20, '#a47f58');
    for (const [x, y] of [[24, 37], [43, 32], [62, 37], [35, 50], [55, 50]]) { r(x, y, 13, 12, '#45685b'); r(x + 2, y, 9, 8, cream); r(x + 4, y + 2, 5, 4, '#cd8c70'); }
    r(74, 24, 2, 30, brown); r(80, 22, 2, 30, brown);
  } else if (style === 'taco') {
    for (const [x, y] of [[25, 32], [44, 40]]) { chunk(x, y, 29, 23, gold); r(x + 3, y + 4, 23, 7, green); r(x + 6, y + 6, 18, 5, brown); r(x + 7, y + 4, 6, 5, red); r(x + 1, y + 12, 27, 9, '#e4bc73'); }
  } else if (style === 'rings') {
    for (const [x, y] of [[24, 31], [45, 32], [35, 49]]) { chunk(x, y, 22, 18, '#c58c4a'); chunk(x + 3, y + 2, 16, 13, gold); r(x + 7, y + 5, 8, 6, '#e6dabd'); r(x + 4, y + 2, 12, 2, '#ebc588'); }
  } else if (style === 'fruit') {
    for (const [x, y] of [[25, 38], [48, 37], [37, 53]]) { chunk(x, y, 24, 14, variant ? '#ca7572' : '#d4904f'); r(x + 3, y + 2, 17, 3, variant ? '#eaa795' : '#e6b373'); r(x + 6, y - 3, 12, 5, cream); sprinkle(x + 7, y, 10, 6, brown, 4); }
  } else if (style === 'walnut-stick') {
    for (const [x, y] of [[23, 35], [33, 48], [42, 58]]) { chunk(x, y, 35, 9, '#946043'); r(x + 3, y + 2, 30, 2, '#c29164'); r(x + 28, y + 1, 5, 7, gold); r(x + 30, y + 3, 2, 3, cream); }
  } else if (style === 'cotton') {
    for (const [x, y] of [[24, 35], [47, 35], [35, 51]]) { chunk(x, y, 24, 16, '#ebdfbd'); for (let i = 0; i < 6; i++) r(x + 3 + i * 3, y + 2 + i % 3, 1, 11, '#cdb88e'); r(x + 5, y, 14, 3, '#f8efd4'); }
  } else if (style === 'halva-bars') {
    for (const [x, y] of [[25, 34], [48, 35], [35, 51]]) { r(x, y + 4, 23, 12, '#ba9469'); r(x, y, 23, 12, '#ddc79b'); r(x + 3, y + 2, 17, 2, '#f0e1be'); sprinkle(x + 4, y + 3, 15, 8, '#a58353', 7); }
  } else if (style === 'mosaic') {
    r(27, 53, 45, 12, chocolate); r(31, 42, 37, 14, chocolate); r(38, 30, 23, 14, chocolate); r(45, 24, 9, 8, chocolate);
    for (const [x, y, w] of [[32, 55, 9], [48, 54, 11], [39, 43, 8], [53, 42, 6], [43, 33, 7], [59, 59, 8]]) { r(x, y, w, 5, cream); r(x + 2, y, w - 3, 2, gold); }
  } else if (style === 'roll-cake') {
    chunk(26, 32, 43, 28, gold); r(26, 40, 43, 3, '#c19461'); chunk(48, 31, 23, 30, cream); chunk(52, 36, 15, 20, chocolate); r(56, 39, 8, 13, cream); r(58, 43, 4, 6, '#ad7560'); r(30, 33, 15, 3, '#f3dfb2');
  } else if (style === 'lemon-cake' || style === 'burnt-cake') {
    r(28, 37, 43, 27, style === 'burnt-cake' ? '#e5d3a9' : '#e6c476'); r(28, 35, 43, 8, style === 'burnt-cake' ? '#986441' : '#f0d9a1'); r(32, 32, 35, 5, style === 'burnt-cake' ? '#6f4937' : '#f5e3b5'); r(31, 47, 3, 13, '#f3e4c4');
    if (style === 'lemon-cake') { chunk(42, 23, 14, 11, '#e4c86b'); r(47, 25, 3, 7, '#f6e6b4'); r(44, 28, 10, 2, '#f6e6b4'); }
    else sprinkle(33, 34, 32, 6, '#b67d4b', 8);
  } else if (style === 'pudding') {
    if (variant) { r(26, 35, 45, 25, '#bb997c'); r(29, 38, 39, 18, '#dfd4b5'); r(28, 31, 41, 12, '#b98547'); sprinkle(31, 33, 32, 6, '#e2bf78', 17); for (let x = 31; x < 67; x += 7) r(x, 47, 2, 10, '#a9866c'); }
    else { r(31, 50, 34, 13, '#d6c8a8'); r(35, 39, 26, 17, cream); r(38, 29, 20, 14, '#f1e8cc'); r(35, 27, 26, 7, red); r(33, 57, 30, 4, red); r(46, 22, 7, 6, '#b56265'); r(47, 20, 6, 3, green); }
  } else if (style === 'pastry') {
    if (variant === 2) {
      for (let x = 26; x < 66; x += 9) { chunk(x, 31 + x % 3, 7, 31, gold); r(x + 2, 33, 2, 24, '#edc989'); }
      r(60, 44, 16, 18, '#ac8b74'); r(59, 41, 18, 7, chocolate);
    } else if (variant >= 3) {
      for (const [x, y] of [[26, 33], [47, 35], [35, 52]]) { r(x, y, 24, 12, variant === 3 ? '#dfcca1' : '#d7b77b'); r(x, y + 3, 24, 2, cream); r(x, y + 8, 24, 2, variant === 3 ? '#9ca07b' : '#b88c57'); sprinkle(x + 3, y + 1, 18, 8, brown, 5); }
    } else {
      for (const [x, y] of [[25, 34], [50, 35], [38, 52]]) { chunk(x, y, 21, 13, gold); for (let i = 0; i < 4; i++) r(x + 3 + i * 4, y + 2, 2, 9, '#aa7745'); if (variant) r(x + 3, y + 5, 15, 2, '#edcb8c'); }
    }
  } else if (style === 'soup') {
    const liquid = ['#d5af6c', '#c78657', '#ede3c5'][variant]; r(22, 34, 52, 28, '#a4b6b0'); r(27, 37, 42, 25, cream); r(31, 59, 34, 7, '#d4c8aa'); r(23, 31, 50, 14, liquid); r(27, 29, 42, 11, liquid); sprinkle(29, 31, 36, 7, variant === 2 ? green : '#a7804f', 12);
    r(62, 23, 11, 9, '#e8ce75'); r(64, 25, 7, 5, '#f2dea3'); for (const x of [36, 49, 60]) { r(x, 18, 2, 7, '#f3ead7'); r(x + 2, 15, 2, 4, '#f3ead7'); }
  } else if (style === 'eggs') {
    r(26, 33, 43, 26, '#697e77'); r(23, 36, 5, 9, '#697e77'); r(69, 36, 5, 9, '#697e77'); r(29, 36, 37, 18, variant ? cream : red);
    for (const [x, y] of [[31, 36], [47, 42]]) { chunk(x, y, 16, 13, '#f3e6c8'); chunk(x + 4, y + 3, 8, 7, '#dfb85f'); }
    if (variant) { r(31, 52, 31, 3, red); sprinkle(30, 37, 34, 15, green, 7); } else sprinkle(30, 37, 34, 15, green, 12);
  } else if (style === 'toast') {
    r(27, 45, 44, 16, '#ac7949'); r(27, 44, 44, 5, '#efcf79'); r(29, 31, 40, 14, '#dbb877'); r(32, 27, 34, 8, '#e2c88f'); for (let i = 0; i < 5; i++) r(33 + i * 7, 31, 2, 10, '#a57e51'); r(30, 57, 36, 3, '#deb475');
  } else if (style === 'fritters') {
    for (const [x, y] of [[25, 35], [48, 35], [35, 52]]) { chunk(x, y, 23, 15, '#a5a267'); r(x + 4, y + 3, 15, 3, '#cec487'); sprinkle(x + 3, y + 3, 17, 9, '#718451', 8); }
    r(64, 54, 10, 8, cream);
  } else if (style === 'vegetables') {
    chunk(28, 32, 42, 27, '#b7be88'); chunk(33, 38, 32, 18, '#d5d4a6'); r(37, 33, 23, 6, '#e0d4a1');
    for (const [x, y] of [[35, 36], [48, 32], [54, 42], [39, 48]]) { r(x, y, 7, 7, gold); r(x, y, 4, 3, '#e2b56c'); } sprinkle(32, 38, 31, 19, green, 15);
  } else if (style === 'mussels') {
    for (const [x, y] of [[23, 33], [48, 32], [34, 51]]) { chunk(x, y, 25, 14, '#425953'); chunk(x + 4, y + 3, 17, 8, '#cfad72'); r(x + 1, y + 2, 3, 10, '#809081'); sprinkle(x + 6, y + 5, 11, 4, brown, 5); } r(66, 52, 11, 10, '#e4c774'); r(68, 54, 6, 6, '#f2dd9b');
  } else if (style === 'noodles') {
    for (let i = 0; i < 7; i++) { r(26, 33 + i * 4, 40, 2, '#d8b776'); r(25 + i * 6, 35, 2, 26, '#efd39b'); r(28 + i * 5, 34 + i % 3, 2, 22, '#bb955f'); }
    if (variant) { r(36, 44, 10, 6, '#d5a17b'); r(52, 35, 11, 6, '#d5a17b'); sprinkle(29, 36, 31, 21, green, 13); r(63, 50, 11, 10, '#dacf7c'); }
    else { r(33, 35, 29, 10, red); sprinkle(35, 37, 23, 8, brown, 10); r(43, 31, 7, 4, green); }
  } else throw new Error(`Unknown dish art: ${style}`);
  return finish();
}

function screenArt(name, motif, variant, film, index) {
  const { bits, rect: r, finish } = drawing(name);
  const palettes = [
    ['#b9c8b8', '#607b72', '#d8b47c'], ['#c4bed3', '#666581', '#d7b5a2'],
    ['#d8c4b1', '#806d67', '#d4aa70'], ['#adc9cb', '#4d737a', '#d0bf95'],
    ['#c9cba8', '#70815e', '#d9b485'], ['#d5bfc4', '#816572', '#d0bd88']
  ];
  const [bg, dark, light] = palettes[index % palettes.length];
  const ink = '#354e4c', cream = '#f1e8ce', red = '#bf726e', skin = '#d2a17d', green = '#819863', brown = '#936b50';
  r(0, 0, 96, 96, bg); r(0, 79, 96, 17, '#ac9785');
  if (film) {
    r(10, 9, 76, 77, dark); r(18, 16, 60, 62, light);
    for (let y = 14; y < 81; y += 12) { r(12, y, 4, 6, cream); r(80, y, 4, 6, cream); }
    r(23, 11, 50, 3, cream); r(23, 80, 50, 3, bg);
  } else {
    r(30, 18, 4, 7, dark); r(26, 14, 4, 4, dark); r(61, 18, 4, 7, dark); r(65, 13, 4, 5, dark);
    r(12, 25, 72, 53, dark); r(8, 31, 80, 41, dark); r(16, 29, 60, 44, light);
    r(78, 38, 6, 6, cream); r(78, 50, 6, 6, cream); r(78, 62, 6, 2, ink); r(21, 78, 11, 5, ink); r(66, 78, 11, 5, ink);
  }
  const sx = film ? 18 : 20, sy = film ? 16 : 32, sw = film ? 60 : 52, sh = film ? 62 : 37;
  bits.push(`<defs><clipPath id="screen"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}"/></clipPath></defs><g clip-path="url(#screen)">`);
  // Draw in a shared 60×60 scene; the television window crops the margins.
  const y = film ? 19 : 23;
  const box = (x, yy, w, h, color) => r(x + 18, yy + y, w, h, color);
  box(0, 0, 60, 62, bg); box(0, 45, 60, 17, dark);
  const person = (x, yy, coat, small = false) => {
    const w = small ? 6 : 8; box(x, yy, w, w, skin); box(x, yy + w, w, small ? 10 : 14, coat); box(x, yy, w, 2, ink);
    box(x, yy + (small ? 18 : 22), 3, 5, ink); box(x + w - 3, yy + (small ? 18 : 22), 3, 5, ink);
  };
  const city = () => { for (let i = 0; i < 6; i++) { const h = 15 + ((i * 7 + variant * 4) % 19); box(i * 11 - 2, 46 - h, 9, h, dark); for (let j = 0; j < 3; j++) box(i * 11, 48 - h + j * 6, 3, 2, light); } };
  const tree = (x, yy) => { box(x + 6, yy + 14, 4, 23, '#826f54'); box(x, yy + 4, 18, 18, green); box(x + 4, yy, 10, 26, green); box(x + 3, yy + 7, 5, 3, '#9caf7a'); };
  if (['crime', 'cap'].includes(motif)) {
    city(); person(13, 17, ink); person(36, 20, variant ? '#78676e' : cream);
    box(11, 16, 12, 3, ink); box(13, 13, 8, 3, motif === 'cap' ? light : ink); box(35, 30, 10, 3, red);
  } else if (motif === 'city') {
    city(); box(4, 39, 49, 4, ink); box(9, 45, 2, 3, cream); box(25, 45, 2, 3, cream);
    if (variant === 2) { box(22, 8, 32, 6, dark); box(22, 8, 6, 28, dark); }
    else person(24, 23, red);
  } else if (motif === 'tree' || motif === 'family') {
    tree(8, 4); tree(37, 8); person(28, 26, red); person(40, 31, light, true);
    if (motif === 'tree') { box(2, 21, 4, 3, red); box(30, 14, 4, 3, '#bb9767'); }
  } else if (motif === 'romance') {
    if (variant) { tree(1, 1); box(34, 36, 27, 13, red); box(41, 29, 14, 8, red); box(43, 30, 9, 5, '#adc6c0'); box(40, 47, 5, 6, ink); box(56, 47, 5, 6, ink); }
    else { box(5, 15, 44, 30, cream); box(11, 20, 9, 15, dark); box(29, 20, 9, 15, dark); }
    person(16, 25, red); person(26, 25, cream); box(27, 12, 4, 3, red); box(32, 12, 4, 3, red); box(29, 15, 5, 3, red);
  } else if (motif === 'palace') {
    box(9, 25, 41, 20, cream); box(17, 13, 25, 14, light); box(22, 8, 15, 5, light); box(27, 5, 5, 4, ink);
    box(3, 17, 4, 31, cream); box(53, 17, 4, 31, cream); box(23, 30, 12, 15, dark); person(26, 25, variant ? red : dark);
  } else if (motif === 'camera') {
    box(18, 17, 25, 17, dark); box(43, 20, 10, 10, ink); box(20, 11, 8, 8, ink); box(32, 11, 8, 8, ink); box(29, 34, 3, 18, ink); box(18, 50, 25, 3, ink); person(3, 24, red);
  } else if (motif === 'workshop') {
    box(4, 11, 52, 22, cream); box(10, 15, 4, 11, dark); box(8, 14, 8, 4, dark); box(26, 15, 5, 14, dark); box(25, 25, 10, 4, dark); person(16, 28, red); person(35, 28, green); box(6, 45, 46, 5, light);
  } else if (motif === 'office') {
    for (let x = 3; x < 57; x += 18) { box(x, 9, 15, 25, cream); box(x + 2, 11, 11, 21, '#9dbab9'); box(x + 7, 11, 1, 21, dark); }
    box(7, 38, 45, 5, light); box(10, 43, 3, 13, dark); box(45, 43, 3, 13, dark); box(11, 30, 12, 9, ink); box(13, 31, 8, 6, '#a7bcb4'); person(35, 23, variant ? ink : cream);
  } else if (motif === 'cafe') {
    box(7, 35, 46, 14, variant ? red : '#a8899d'); box(3, 38, 5, 14, dark); box(51, 38, 5, 14, dark); person(13, 17, ink); person(28, 18, cream); person(42, 19, green); box(18, 45, 23, 4, light);
  } else if (motif === 'sword' || motif === 'wizard') {
    box(7, 8, 45, 39, dark); box(11, 13, 7, 34, ink); box(43, 13, 7, 34, ink); box(28, 10, 5, 29, cream); box(21, 36, 19, 4, light); box(28, 40, 5, 9, red);
    if (motif === 'wizard') { box(10, 30, 10, 3, light); box(40, 9, 3, 9, light); box(38, 12, 7, 3, light); }
    else if (variant) { box(2, 20, 54, 4, light); box(2, 28, 54, 4, light); }
  } else if (motif === 'detective') {
    city(); box(18, 13, 23, 5, cream); box(14, 18, 5, 19, cream); box(40, 18, 5, 19, cream); box(18, 36, 23, 5, cream); box(38, 40, 5, 5, light); box(43, 45, 5, 5, light); box(28, 21, 3, 12, dark);
  } else if (motif === 'scales') {
    box(28, 11, 4, 36, light); box(9, 16, 41, 4, light); box(15, 20, 2, 13, cream); box(43, 20, 2, 13, cream); box(6, 32, 20, 5, red); box(35, 32, 20, 5, red); box(18, 48, 25, 5, light); box(8, 8, 9, 4, cream);
  } else if (motif === 'ruins') {
    city(); tree(34, 4); box(5, 16, 6, 32, green); box(15, 26, 10, 7, green); person(21, 26, dark); person(34, 32, red, true);
  } else if (motif === 'island' || motif === 'holiday') {
    box(0, 35, 60, 11, '#7babb0'); box(3, 43, 53, 11, '#d6ba83'); tree(4, 8); box(7, 8, 27, 4, green); box(16, 4, 4, 10, green);
    if (motif === 'island') { box(35, 27, 22, 3, cream); box(41, 23, 9, 9, cream); person(29, 29, dark); }
    else { person(35, 21, red); box(34, 28, 10, 11, red); box(12, 38, 17, 3, light); }
  } else if (motif === 'school') {
    box(6, 8, 47, 21, '#557968'); box(9, 11, 40, 15, '#6d8e70'); box(17, 16, 24, 2, cream); box(26, 21, 11, 2, cream);
    for (let x = 6; x <= 42; x += 12) { person(x, 27, '#b79574', true); box(x - 2, 42, 12, 4, light); box(x, 46, 2, 8, ink); }
  } else if (motif === 'ghost') {
    box(7, 16, 44, 30, dark); box(16, 29, 30, 19, variant ? ink : cream); box(20, 19, 23, 17, variant ? ink : cream); box(24, 14, 15, 10, variant ? ink : cream); box(25, 27, 3, 5, variant ? cream : ink); box(35, 27, 3, 5, variant ? cream : ink);
    if (variant) { box(28, 35, 7, 3, red); box(4, 18, 6, 29, red); box(51, 18, 5, 29, red); }
    else box(29, 37, 4, 4, ink);
  } else if (motif === 'street') {
    city(); person(24, 20, green); box(37, 29, 3, 23, light); box(30, 51, 18, 3, brown); box(4, 41, 13, 10, dark);
  } else if (motif === 'space') {
    box(0, 0, 60, 62, dark); for (let i = 0; i < 14; i++) box((i * 17) % 57, (i * 11) % 48, 2, 2, cream);
    if (variant === 1) { box(9, 12, 42, 4, light); box(4, 16, 7, 23, light); box(49, 16, 7, 23, light); box(9, 39, 42, 4, light); box(19, 22, 24, 12, ink); box(3, 28, 53, 3, cream); }
    else { box(24, 21, 14, 9, cream); box(19, 28, 24, 8, cream); box(13, 33, 36, 5, light); box(28, 22, 6, 4, '#83a4ac'); box(22, 38, 6, 6, red); box(35, 38, 6, 6, red); if (variant === 2) { box(5, 9, 13, 13, '#98a4a5'); box(8, 12, 3, 3, dark); } }
  } else if (motif === 'dinosaur') {
    tree(1, 7); box(14, 29, 29, 16, green); box(34, 14, 18, 18, green); box(40, 25, 17, 5, green); box(43, 19, 3, 3, ink); box(12, 33, 5, 8, green); box(6, 36, 7, 4, green); box(20, 43, 6, 12, green); box(36, 43, 6, 12, green); box(40, 32, 8, 4, green);
    if (variant) person(5, 28, brown, true);
  } else if (motif === 'western') {
    box(3, 17, 23, 26, light); box(35, 17, 23, 26, light); box(1, 14, 27, 5, brown); box(33, 14, 27, 5, brown); box(8, 24, 10, 19, brown); box(40, 24, 10, 19, brown); person(26, 22, red); box(22, 20, 15, 3, brown); box(26, 16, 8, 4, brown);
  } else if (motif === 'television') {
    box(9, 13, 42, 30, brown); box(13, 17, 27, 22, '#9bb8b3'); box(44, 20, 4, 4, cream); box(44, 30, 4, 4, cream); box(18, 23, 17, 3, cream); box(18, 31, 17, 3, dark); box(19, 45, 23, 4, brown); box(23, 9, 3, 5, ink); box(33, 6, 3, 8, ink);
  } else if (motif === 'mountain') {
    box(0, 35, 60, 12, cream); box(9, 27, 41, 13, light); box(16, 20, 27, 15, light); box(24, 14, 11, 11, cream); box(18, 36, 23, 12, brown); box(27, 38, 6, 10, dark); person(44, 32, ink, true);
  } else if (motif === 'prison') {
    box(4, 6, 51, 42, dark); for (let x = 9; x < 55; x += 9) box(x, 8, 3, 38, light); person(26, 23, cream); box(12, 33, 38, 3, cream); box(0, 48, 60, 4, light);
  } else if (motif === 'ring') {
    box(16, 13, 28, 5, light); box(12, 18, 6, 23, light); box(42, 18, 6, 23, light); box(16, 41, 28, 5, light); box(19, 17, 22, 3, cream); box(46, 8, 3, 14, cream); box(41, 13, 13, 3, cream); tree(-5, 24);
  } else if (motif === 'matrix') {
    box(0, 0, 60, 62, '#4c6b5b'); for (let x = 2; x < 59; x += 7) for (let yy = x % 4; yy < 57; yy += 7) box(x, yy, 2, 4, '#9bb68b');
    box(10, 29, 16, 9, red); box(35, 29, 16, 9, '#83a6bf'); box(11, 29, 7, 9, '#d59b86'); box(36, 29, 7, 9, '#b0c7ce');
  } else if (motif === 'soap') {
    box(0, 0, 60, 62, '#9fa999'); box(10, 24, 40, 24, '#b9778d'); box(14, 19, 32, 8, '#d9a0b1'); box(17, 28, 27, 12, '#dda4b5'); box(21, 32, 18, 3, '#ad6a80'); box(21, 35, 4, 4, '#ad6a80');
  } else if (motif === 'bench') {
    tree(3, 1); box(8, 36, 43, 5, brown); box(8, 44, 43, 4, brown); box(12, 48, 3, 10, dark); box(44, 48, 3, 10, dark); person(28, 20, cream); box(14, 47, 10, 6, light);
  } else if (motif === 'ship') {
    box(0, 42, 60, 20, '#81a4ad'); box(6, 36, 49, 10, dark); box(11, 31, 39, 6, cream); box(16, 26, 29, 6, cream); for (let x = 20; x < 45; x += 9) { box(x, 17, 5, 10, red); box(x, 16, 5, 3, ink); }
    for (let x = 11; x < 51; x += 7) box(x, 38, 3, 2, cream); box(2, 50, 20, 2, cream); box(35, 54, 21, 2, cream);
  } else if (motif === 'car') {
    box(0, 0, 60, 62, dark); box(0, 48, 60, 4, light); box(9, 33, 42, 12, '#aab5ae'); box(19, 24, 22, 10, '#c7cec0'); box(22, 26, 16, 7, '#698c96'); box(13, 43, 7, 7, ink); box(41, 43, 7, 7, ink); box(7, 38, 5, 3, red); box(48, 35, 4, 4, cream); box(2, 17, 4, 10, light); box(5, 23, 5, 3, light);
  } else if (motif === 'bat') {
    city(); box(0, 0, 60, 20, dark); box(10, 12, 10, 6, ink); box(40, 12, 10, 6, ink); box(16, 16, 12, 9, ink); box(32, 16, 12, 9, ink); box(27, 18, 7, 13, ink); box(27, 14, 2, 7, ink); box(32, 14, 2, 7, ink); person(27, 29, ink);
  } else if (motif === 'house') {
    box(4, 13, 52, 4, dark); box(8, 17, 44, 29, cream); box(12, 20, 23, 14, '#789b96'); box(38, 20, 10, 24, dark); box(0, 47, 60, 8, green); box(6, 37, 21, 6, dark); person(28, 31, ink, true); box(2, 49, 10, 2, cream);
  } else if (motif === 'mask') {
    city(); box(17, 33, 28, 22, red); box(21, 14, 20, 22, cream); box(24, 11, 14, 5, cream); box(24, 20, 5, 2, ink); box(33, 20, 5, 2, ink); box(25, 27, 12, 2, brown); box(29, 29, 4, 5, brown); box(29, 23, 4, 3, '#d9c39a');
  } else if (motif === 'zombie') {
    city(); tree(2, 12); person(21, 23, brown); person(39, 25, cream); box(21, 23, 8, 8, '#9caa76'); box(39, 25, 8, 8, '#a6b08a'); box(23, 27, 2, 2, ink); box(26, 28, 2, 2, red); box(41, 29, 2, 2, ink); box(39, 40, 13, 3, '#919e78');
  } else if (motif === 'radiation') {
    box(8, 25, 16, 22, dark); box(10, 17, 12, 10, dark); box(12, 11, 8, 8, light); box(30, 24, 23, 22, '#87947a'); box(34, 12, 5, 14, ink); box(44, 8, 5, 18, ink); box(31, 34, 19, 13, light); box(39, 38, 3, 3, ink); box(33, 35, 5, 3, ink); box(43, 35, 5, 3, ink); box(38, 43, 5, 3, ink); box(32, 5, 17, 3, '#c5cabb');
  } else if (motif === 'badge') {
    box(6, 8, 47, 33, dark); box(25, 10, 11, 32, light); box(17, 17, 27, 18, light); box(12, 22, 36, 8, light); box(23, 20, 15, 12, cream); box(26, 23, 9, 6, dark); person(8, 30, ink); person(44, 30, red);
  } else if (motif === 'atom') {
    box(8, 25, 45, 3, dark); box(25, 9, 3, 34, dark); box(11, 15, 3, 18, dark); box(46, 15, 3, 18, dark); box(15, 11, 30, 3, dark); box(15, 37, 30, 3, dark);
    for (let i = 0; i < 6; i++) { box(14 + i * 5, 12 + i * 5, 5, 2, red); box(14 + i * 5, 39 - i * 5, 5, 2, red); } box(25, 23, 9, 8, light); box(46, 15, 5, 5, cream); box(10, 32, 5, 5, cream);
  } else if (motif === 'hospital') {
    box(5, 11, 50, 35, cream); box(14, 14, 5, 16, red); box(8, 20, 17, 5, red); box(32, 17, 18, 12, '#87a7a0'); box(34, 23, 5, 2, cream); box(38, 20, 3, 6, cream); box(7, 34, 43, 5, dark); box(10, 39, 3, 12, dark); box(46, 39, 3, 12, dark); person(29, 22, cream); box(31, 25, 3, 7, dark);
  } else if (motif === 'game') {
    box(0, 0, 60, 62, '#77968b');
    for (let i = 0; i < 3; i++) { box(8 + i * 17, 26, 12, 23, '#b47282'); box(8 + i * 17, 13, 12, 13, ink); }
    box(11, 17, 6, 1, cream); box(10, 18, 1, 5, cream); box(17, 18, 1, 5, cream); box(11, 23, 6, 1, cream);
    box(30, 17, 2, 2, cream); box(28, 19, 2, 2, cream); box(32, 19, 2, 2, cream); box(27, 22, 8, 1, cream);
    box(44, 17, 7, 1, cream); box(44, 23, 7, 1, cream); box(44, 18, 1, 5, cream); box(50, 18, 1, 5, cream);
  } else if (motif === 'gothic') {
    box(8, 9, 43, 35, dark); box(12, 13, 35, 25, '#a0a3b3'); box(28, 11, 3, 28, ink); box(11, 24, 37, 3, ink); box(23, 24, 15, 28, ink); box(23, 13, 15, 14, ink); box(26, 17, 9, 9, cream); box(26, 19, 9, 2, ink); box(20, 21, 4, 21, ink); box(38, 21, 4, 21, ink); box(25, 28, 5, 3, cream); box(32, 28, 5, 3, cream);
  } else if (motif === 'helmet') {
    box(0, 0, 60, 62, dark); box(18, 14, 25, 26, '#a6b5b0'); box(22, 10, 17, 5, '#c9d0bf'); box(20, 23, 21, 5, ink); box(28, 25, 5, 16, ink); box(16, 40, 31, 16, brown); box(21, 17, 3, 6, cream); box(36, 17, 3, 6, cream); box(6, 7, 2, 2, cream); box(50, 16, 2, 2, cream);
  } else if (motif === 'dragon') {
    box(6, 37, 48, 6, dark); box(15, 23, 27, 13, red); box(36, 15, 15, 11, red); box(43, 22, 14, 4, red); box(44, 18, 2, 2, cream); box(10, 17, 16, 6, red); box(4, 12, 8, 15, red); box(21, 14, 14, 10, red); box(27, 9, 8, 7, red); box(10, 32, 9, 4, red); box(4, 35, 8, 3, red); box(23, 34, 4, 12, red); box(37, 34, 4, 12, red);
  } else if (motif === 'soldier') {
    if (variant === 2) { box(0, 30, 60, 18, '#8b977a'); box(9, 21, 38, 16, '#8b977a'); box(22, 13, 13, 11, '#8b977a'); }
    person(21, 22, green); box(18, 20, 14, 4, ink); box(21, 16, 8, 5, green); box(30, 33, 12, 3, brown); box(40, 28, 3, 11, brown);
    if (variant === 1) { person(37, 32, red, true); box(36, 31, 9, 2, ink); } else { person(6, 29, green, true); box(5, 27, 9, 3, ink); }
  } else if (motif === 'paper') {
    box(13, 8, 34, 40, cream); box(18, 13, 24, 2, dark); for (let yy = 21; yy < 42; yy += 5) box(18, yy, 17 + yy % 7, 2, dark); box(38, 36, 3, 17, brown); box(36, 49, 6, 3, ink);
    if (variant) { box(5, 18, 6, 7, red); box(13, 18, 6, 7, red); box(10, 21, 4, 9, ink); box(45, 9, 4, 6, light); box(51, 9, 4, 6, light); box(49, 12, 2, 7, ink); }
  } else if (motif === 'jury') {
    box(5, 9, 50, 35, cream); box(8, 36, 44, 5, brown); box(11, 41, 3, 13, brown); box(46, 41, 3, 13, brown); for (let x = 10; x < 51; x += 9) person(x, 17 + x % 2, dark, true); box(24, 39, 12, 3, light); box(27, 42, 5, 4, ink);
  } else if (motif === 'desert') {
    box(0, 25, 60, 37, light); box(8, 20, 32, 7, '#dfc792'); box(16, 15, 16, 6, '#dfc792'); box(36, 33, 19, 5, '#9d845d'); box(41, 29, 11, 4, '#9d845d'); person(20, 22, brown); box(18, 21, 12, 3, cream); box(21, 25, 8, 2, '#719399'); box(4, 8, 8, 8, cream);
  } else if (motif === 'alien-world') {
    box(0, 0, 60, 62, '#87a6a5'); tree(2, 12); tree(38, 8); box(25, 16, 10, 11, '#7099af'); box(22, 27, 16, 19, '#7099af'); box(28, 20, 2, 2, light); box(32, 20, 2, 2, light); box(18, 30, 4, 12, '#7099af'); box(37, 29, 4, 12, '#7099af'); box(25, 45, 4, 10, '#7099af'); box(32, 45, 4, 10, '#7099af'); box(48, 22, 6, 3, '#b48cb2');
  } else if (motif === 'robot') {
    if (variant) { box(16, 31, 28, 19, light); box(19, 34, 22, 11, '#c8a66a'); box(26, 23, 5, 10, dark); box(17, 16, 24, 11, cream); box(19, 18, 8, 7, dark); box(30, 18, 8, 7, dark); box(18, 47, 9, 7, ink); box(34, 47, 9, 7, ink); box(11, 33, 6, 4, dark); box(44, 33, 6, 4, dark); }
    else { box(19, 11, 23, 30, '#aebcb5'); box(23, 8, 15, 5, '#c4ccbe'); box(21, 20, 7, 4, dark); box(32, 20, 7, 4, red); box(27, 27, 6, 5, dark); box(25, 35, 12, 3, cream); box(15, 40, 32, 17, dark); box(39, 22, 3, 11, '#778a82'); }
  } else if (motif === 'alien') {
    box(0, 0, 60, 62, dark); box(15, 13, 32, 10, '#52695c'); box(12, 19, 32, 11, '#718271'); box(22, 25, 18, 23, '#718271'); box(24, 28, 15, 4, cream); box(25, 32, 13, 2, ink); box(17, 32, 5, 17, '#52695c'); box(40, 32, 5, 17, '#52695c'); box(28, 43, 5, 12, '#52695c'); box(34, 43, 5, 12, '#52695c');
  } else if (motif === 'gauntlet') {
    box(0, 0, 60, 62, dark); box(20, 23, 23, 27, light); box(15, 28, 7, 12, light); box(20, 11, 5, 15, light); box(26, 8, 5, 17, light); box(32, 9, 5, 17, light); box(38, 12, 5, 16, light);
    for (const [x, yy, c] of [[21, 25, red], [27, 23, '#85a8b0'], [33, 24, '#9db984'], [39, 26, '#ba93bc'], [17, 31, '#e9c76d'], [29, 33, cream]]) box(x, yy, 4, 4, c);
  } else if (motif === 'web') {
    box(0, 0, 60, 62, '#758ba9'); for (let i = 0; i < 7; i++) { box(i * 8, i * 7, 8, 1, cream); box(56 - i * 8, i * 7, 8, 1, cream); } box(28, 0, 1, 55, cream); box(0, 26, 60, 1, cream); box(20, 15, 21, 27, red); box(24, 10, 13, 7, red); box(22, 22, 7, 5, cream); box(33, 22, 7, 5, cream); box(29, 16, 2, 24, dark); box(20, 32, 21, 2, dark);
  } else if (motif === 'toys') {
    box(0, 0, 60, 62, '#9eb6b5'); person(13, 23, light); box(9, 20, 16, 3, brown); box(13, 16, 8, 5, brown); box(13, 31, 8, 3, red); person(35, 23, cream); box(32, 21, 14, 13, '#b6c8c1'); box(34, 23, 10, 7, skin); box(36, 34, 7, 5, green); box(9, 45, 13, 3, brown);
  } else if (motif === 'balloons') {
    for (const [x, yy, c] of [[9, 5, red], [21, 3, light], [33, 6, green], [43, 11, '#a38faa'], [4, 18, light], [17, 16, '#a38faa'], [30, 18, red]]) { box(x, yy, 9, 10, c); box(x + 4, yy + 10, 1, 25 - yy, dark); }
    box(16, 41, 25, 16, cream); box(13, 38, 31, 5, brown); box(18, 33, 21, 5, brown); box(20, 45, 6, 6, '#92aeaa'); box(31, 44, 6, 13, red);
  } else throw new Error(`Unknown screen art: ${motif}`);
  bits.push('</g>');
  if (!film) { r(23, 34, 46, 1, '#e6e6c6'); r(23, 67, 46, 1, dark); }
  return finish();
}

const normalizeName = name => name.normalize('NFKC').toLocaleLowerCase('tr').trim();
const additions = {}, pools = {}, sprites = [];
for (const [key, definitions, folder, start] of [
  ['tatli', desserts, 'desserts', 31], ['yemek', meals, 'meals', 37],
  ['dizi', series, 'series', 31], ['film', movies, 'movies', 31]
]) {
  if (definitions.length !== 20) throw new Error(`${key}: 20 yeni kart olmalı.`);
  additions[key] = definitions.map(([isim, slug, etiket], index) => ({
    id: start + index, isim, gorsel: `assets/images/${folder}/${slug}.svg`, etiket
  }));
  const newIds = new Set(additions[key].map(card => card.id));
  const base = current[key].filter(card => !newIds.has(card.id));
  if (base.length !== 30 || Math.max(...base.map(card => card.id)) !== start - 1) throw new Error(`${key}: sabit ID tabanı beklenen 30 kartla uyuşmuyor.`);
  const byId = new Map(current[key].map(card => [card.id, card]));
  const baseNames = new Set(base.map(card => normalizeName(card.isim)));
  const baseImages = new Set(base.map(card => card.gorsel));
  for (const card of additions[key]) {
    const existing = byId.get(card.id);
    if (existing && ['id', 'isim', 'gorsel', 'etiket'].some(field => existing[field] !== card[field])) throw new Error(`${key}: ${card.id} kimliği başka bir karta ait.`);
    if (baseNames.has(normalizeName(card.isim)) || baseImages.has(card.gorsel)) throw new Error(`${key}: mevcut isim/görsel tekrarı: ${card.isim}`);
  }
  pools[key] = [...base, ...additions[key]].sort((a, b) => a.id - b.id);
  if (pools[key].length !== 50 || new Set(pools[key].map(card => card.id)).size !== 50 || new Set(pools[key].map(card => normalizeName(card.isim))).size !== 50) throw new Error(`${key}: 50 benzersiz kart olmalı.`);
  definitions.forEach(([isim, , , style, variant], index) => {
    sprites.push({ gorsel: additions[key][index].gorsel, content: key === 'dizi' || key === 'film'
      ? screenArt(isim, style, variant, key === 'film', index)
      : foodArt(isim, style, variant, key === 'tatli', index) });
  });
}
// Validate all records and all art before writing any file.
let created = 0, reused = 0;
for (const { gorsel, content } of sprites) {
  await mkdir(new URL(gorsel.slice(0, gorsel.lastIndexOf('/') + 1), root), { recursive: true });
  try { await writeFile(new URL(gorsel, root), content, { encoding: 'utf8', flag: 'wx' }); created++; }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(new URL(gorsel, root), 'utf8') !== content) throw new Error(`Mevcut görselin üzerine yazılmadı: ${gorsel}`);
    reused++;
  }
}
await writeFile(new URL('tools/additions-collections.json', root), `${JSON.stringify(additions, null, 2)}\n`, 'utf8');
await writeFile(new URL('tools/extra-collections.json', root), `${JSON.stringify(pools, null, 2)}\n`, 'utf8');
console.log(`4 koleksiyon × 50 kart. ${created} yeni SVG; ${reused} değişmeyen SVG. veri.json değiştirilmedi.`);
