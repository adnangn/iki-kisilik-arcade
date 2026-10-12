import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Original 96 × 96 pixel art. This generator only adds assets owned by this
// expansion, and writes a merge feed. It never edits veri.json or older art.
const root = new URL('../', import.meta.url);
const existing = JSON.parse(await readFile(new URL('veri.json', root), 'utf8'));
const rows = {
  tatli: [
    ['Höşmerim', 'hosmerim', 'Helva', 'mound', 'cheese'],
    ['Zerde', 'zerde', 'Geleneksel', 'pudding', 'saffron'],
    ['Paluze', 'paluze', 'Geleneksel', 'pudding', 'grape'],
    ['Bici Bici', 'bici-bici', 'Geleneksel', 'ice-bowl', 'rose'],
    ['Karsambaç', 'karsambac', 'Geleneksel', 'ice-bowl', 'molasses'],
    ['Kerebiç', 'kerebic', 'Kurabiye', 'cookies', 'foam'],
    ['Acıbadem Kurabiyesi', 'acibadem-kurabiyesi', 'Kurabiye', 'cookies', 'almond'],
    ['Kavala Kurabiyesi', 'kavala-kurabiyesi', 'Kurabiye', 'cookies', 'crescent'],
    ['Un Kurabiyesi', 'un-kurabiyesi', 'Kurabiye', 'cookies', 'sugar'],
    ['Leblebi Helvası', 'leblebi-helvasi', 'Helva', 'mound', 'chickpea'],
    ['Çekme Helva', 'cekme-helva', 'Helva', 'squares', 'fibers'],
    ['Kağıt Helva', 'kagit-helva', 'Helva', 'wafer', 'round'],
    ['Vezir Parmağı', 'vezir-parmagi', 'Şerbetli', 'pastry', 'fingers'],
    ['Hanım Göbeği', 'hanim-gobegi', 'Şerbetli', 'pastry', 'dimples'],
    ['Taş Kadayıf', 'tas-kadayif', 'Şerbetli', 'pastry', 'halfmoon'],
    ['Ekmek Kadayıfı', 'ekmek-kadayifi', 'Şerbetli', 'squares', 'cream'],
    ['Tel Kadayıf', 'tel-kadayif', 'Şerbetli', 'squares', 'threads'],
    ['Laz Böreği', 'laz-boregi', 'Hamur Tatlısı', 'squares', 'custard'],
    ['Nevzine', 'nevzine', 'Şerbetli', 'squares', 'walnuts'],
    ['Hira Tatlısı', 'hira-tatlisi', 'Şerbetli', 'pastry', 'balls'],
    ['Keşkül', 'keskul', 'Sütlü', 'pudding', 'almond'],
    ['Muhallebi', 'muhallebi', 'Sütlü', 'pudding', 'plain'],
    ['Mochi', 'mochi', 'Hamur Tatlısı', 'mochi', 'pink'],
    ['Dorayaki', 'dorayaki', 'Hamur Tatlısı', 'sandwich', 'bean'],
    ['Taiyaki', 'taiyaki', 'Hamur Tatlısı', 'fish-pastry', 'bean'],
    ['Tangyuan', 'tangyuan', 'Hamur Tatlısı', 'sweet-soup', 'rice'],
    ['Mango Sticky Rice', 'mango-sticky-rice', 'Meyveli', 'rice-fruit', 'mango'],
    ['Kulfi', 'kulfi', 'Sütlü', 'frozen', 'pistachio'],
    ['Gulab Jamun', 'gulab-jamun', 'Şerbetli', 'sweet-soup', 'brown'],
    ['Rasgulla', 'rasgulla', 'Şerbetli', 'sweet-soup', 'white'],
    ['Jalebi', 'jalebi', 'Şerbetli', 'spirals', 'orange'],
    ['Beignets', 'beignets', 'Hamur Tatlısı', 'pastry', 'pillows'],
    ['Cannoli', 'cannoli', 'Hamur Tatlısı', 'rolls', 'ricotta'],
    ['Sfogliatella', 'sfogliatella', 'Hamur Tatlısı', 'pastry', 'shell'],
    ['Pastel de Nata', 'pastel-de-nata', 'Hamur Tatlısı', 'tarts', 'custard'],
    ['Pavlova', 'pavlova', 'Pasta', 'cake', 'meringue'],
    ['Baked Alaska', 'baked-alaska', 'Pasta', 'cake', 'dome'],
    ['Opera Pasta', 'opera-pasta', 'Pasta', 'cake', 'layers'],
    ['Mille-Feuille', 'mille-feuille', 'Pasta', 'cake', 'pastry'],
    ['Sachertorte', 'sachertorte', 'Pasta', 'cake', 'chocolate'],
    ['Victoria Sponge', 'victoria-sponge', 'Pasta', 'cake', 'jam'],
    ['Stollen', 'stollen', 'Kek', 'loaf', 'fruit'],
    ['Pandoro', 'pandoro', 'Kek', 'loaf', 'star'],
    ['Panettone', 'panettone', 'Kek', 'loaf', 'dome'],
    ['Banoffee Pie', 'banoffee-pie', 'Meyveli', 'pie', 'banana'],
    ['Key Lime Pie', 'key-lime-pie', 'Meyveli', 'pie', 'lime'],
    ['Lemon Meringue Pie', 'lemon-meringue-pie', 'Meyveli', 'pie', 'meringue'],
    ['Peach Cobbler', 'peach-cobbler', 'Meyveli', 'pie', 'peach'],
    ['Pecan Pie', 'pecan-pie', 'Hamur Tatlısı', 'pie', 'pecan'],
    ['Biscotti', 'biscotti', 'Kurabiye', 'biscuits', 'almond']
  ],
  yemek: [
    ['Tarhana Çorbası', 'tarhana-corbasi', 'Çorba', 'soup', 'red'],
    ['Beyran Çorbası', 'beyran-corbasi', 'Çorba', 'soup', 'meat'],
    ['İşkembe Çorbası', 'iskembe-corbasi', 'Çorba', 'soup', 'white'],
    ['Cağ Kebabı', 'cag-kebabi', 'Kebap', 'skewers', 'horizontal'],
    ['Testi Kebabı', 'testi-kebabi', 'Kebap', 'pot', 'clay'],
    ['Büryan Kebabı', 'buryan-kebabi', 'Kebap', 'roast', 'lamb'],
    ['Güveç', 'guvec', 'Et', 'pot', 'vegetables'],
    ['Orman Kebabı', 'orman-kebabi', 'Et', 'stew', 'peas'],
    ['Boeuf Bourguignon', 'boeuf-bourguignon', 'Et', 'stew', 'mushroom'],
    ['Fellah Köftesi', 'fellah-koftesi', 'Köfte', 'meatballs', 'tomato'],
    ['Sulu Köfte', 'sulu-kofte', 'Köfte', 'soup', 'meatballs'],
    ['Mercimek Köftesi', 'mercimek-koftesi', 'Köfte', 'fingers', 'lentil'],
    ['Çiğ Köfte', 'cig-kofte', 'Köfte', 'fingers', 'bulgur'],
    ['Tavuk Kapama', 'tavuk-kapama', 'Tavuk', 'roast', 'rice'],
    ['Tavuk Tandır', 'tavuk-tandir', 'Tavuk', 'roast', 'chicken'],
    ['Butter Chicken', 'butter-chicken', 'Tavuk', 'stew', 'orange'],
    ['Karides Güveç', 'karides-guvec', 'Deniz Ürünü', 'pot', 'shrimp'],
    ['Kalamar Tava', 'kalamar-tava', 'Deniz Ürünü', 'rings', 'calamari'],
    ['Somon Izgara', 'somon-izgara', 'Deniz Ürünü', 'fish', 'salmon'],
    ['Kumpir', 'kumpir', 'Sebze', 'potato', 'loaded'],
    ['Ratatouille', 'ratatouille', 'Sebze', 'vegetables', 'circles'],
    ['Bamya Yemeği', 'bamya-yemegi', 'Sebze', 'vegetables', 'okra'],
    ['Ispanak Yemeği', 'ispanak-yemegi', 'Sebze', 'vegetables', 'spinach'],
    ['Fırında Karnabahar', 'firinda-karnabahar', 'Sebze', 'vegetables', 'cauliflower'],
    ['Perde Pilavı', 'perde-pilavi', 'Pilav', 'rice', 'shell'],
    ['Özbek Pilavı', 'ozbek-pilavi', 'Pilav', 'rice', 'carrot'],
    ['Paella', 'paella', 'Pilav', 'rice', 'seafood'],
    ['Çiğ Börek', 'cig-borek', 'Hamur İşi', 'pastry', 'halfmoon'],
    ['Boşnak Böreği', 'bosnak-boregi', 'Hamur İşi', 'spirals', 'borek'],
    ['Kayseri Yağlaması', 'kayseri-yaglamasi', 'Hamur İşi', 'flatbread', 'stack'],
    ['Bao', 'bao', 'Hamur İşi', 'buns', 'folded'],
    ['Ramen', 'ramen', 'Asya', 'noodles', 'ramen'],
    ['Pho', 'pho', 'Asya', 'noodles', 'pho'],
    ['Udon', 'udon', 'Asya', 'noodles', 'udon'],
    ['Falafel', 'falafel', 'Sebze', 'meatballs', 'falafel'],
    ['Musakka', 'musakka', 'Sebze', 'casserole', 'eggplant'],
    ['Sucuklu Yumurta', 'sucuklu-yumurta', 'Kahvaltı', 'eggs', 'sausage'],
    ['Patatesli Omlet', 'patatesli-omlet', 'Kahvaltı', 'eggs', 'omelette'],
    ['Simit', 'simit', 'Kahvaltı', 'rings', 'sesame'],
    ['Fettuccine Alfredo', 'fettuccine-alfredo', 'İtalyan', 'pasta', 'alfredo'],
    ['Cacio e Pepe', 'cacio-e-pepe', 'İtalyan', 'pasta', 'pepper'],
    ['Gnocchi', 'gnocchi', 'İtalyan', 'pasta', 'dumplings'],
    ['Kısır', 'kisir', 'Salata', 'salad', 'bulgur'],
    ['Tabule', 'tabule', 'Salata', 'salad', 'herbs'],
    ['Çoban Salata', 'coban-salata', 'Salata', 'salad', 'chopped'],
    ['Tantuni', 'tantuni', 'Sokak Lezzeti', 'wrap', 'thin'],
    ['Fajita', 'fajita', 'Sokak Lezzeti', 'skillet', 'peppers'],
    ['Burrito', 'burrito', 'Sokak Lezzeti', 'wrap', 'filled'],
    ['Steak', 'steak', 'Et', 'steak', 'grill'],
    ['Fish and Chips', 'fish-and-chips', 'Deniz Ürünü', 'fish', 'chips']
  ],
  icecek: [
    ['Türk Kahvesi', 'turk-kahvesi', 'Sıcak', 'cezve', false],
    ['Filtre Kahve', 'filtre-kahve', 'Sıcak', 'carafe', false],
    ['Espresso', 'espresso', 'Sıcak', 'espresso', false],
    ['Americano', 'americano', 'Sıcak', 'mug-dark', false],
    ['Latte', 'latte', 'Sıcak', 'latte', false],
    ['Cappuccino', 'cappuccino', 'Sıcak', 'cappuccino', false],
    ['Flat White', 'flat-white', 'Sıcak', 'flat-white', false],
    ['Mocha', 'mocha', 'Sıcak', 'mocha', false],
    ['Siyah Çay', 'siyah-cay', 'Sıcak', 'tea-glass', false],
    ['Yeşil Çay', 'yesil-cay', 'Sıcak', 'tea-leaf', false],
    ['Ihlamur', 'ihlamur', 'Sıcak', 'tea-flower', false],
    ['Ada Çayı', 'ada-cayi', 'Sıcak', 'tea-sage', false],
    ['Kuşburnu Çayı', 'kusburnu-cayi', 'Sıcak', 'tea-rosehip', false],
    ['Papatya Çayı', 'papatya-cayi', 'Sıcak', 'tea-daisy', false],
    ['Salep', 'salep', 'Sıcak', 'salep', false],
    ['Sıcak Çikolata', 'sicak-cikolata', 'Sıcak', 'chocolate', false],
    ['Matcha Latte', 'matcha-latte', 'Sıcak', 'matcha', false],
    ['Su', 'su', 'Soğuk', 'water', false],
    ['Maden Suyu', 'maden-suyu', 'Soğuk', 'mineral', false],
    ['Ayran', 'ayran', 'Soğuk', 'ayran', false],
    ['Kefir', 'kefir', 'Soğuk', 'kefir', false],
    ['Şalgam', 'salgam', 'Soğuk', 'turnip', false],
    ['Boza', 'boza', 'Soğuk', 'boza', false],
    ['Limonata', 'limonata', 'Soğuk', 'lemon', false],
    ['Portakal Suyu', 'portakal-suyu', 'Soğuk', 'orange', false],
    ['Vişne Suyu', 'visne-suyu', 'Soğuk', 'cherry', false],
    ['Elma Suyu', 'elma-suyu', 'Soğuk', 'apple', false],
    ['Nar Suyu', 'nar-suyu', 'Soğuk', 'pomegranate', false],
    ['Şeftali Nektarı', 'seftali-nektari', 'Soğuk', 'peach', false],
    ['Havuç Suyu', 'havuc-suyu', 'Soğuk', 'carrot', false],
    ['Domates Suyu', 'domates-suyu', 'Soğuk', 'tomato', false],
    ['Gazoz', 'gazoz', 'Soğuk', 'soda', false],
    ['Kola', 'kola', 'Soğuk', 'cola', false],
    ['Buzlu Çay', 'buzlu-cay', 'Soğuk', 'iced-tea', false],
    ['Cold Brew', 'cold-brew', 'Soğuk', 'cold-brew', false],
    ['Frappe', 'frappe', 'Soğuk', 'frappe', false],
    ['Milkshake', 'milkshake', 'Soğuk', 'milkshake', false],
    ['Smoothie', 'smoothie', 'Soğuk', 'smoothie', false],
    ['Bubble Tea', 'bubble-tea', 'Soğuk', 'boba', false],
    ['Hindistan Cevizi Suyu', 'hindistan-cevizi-suyu', 'Soğuk', 'coconut', false],
    ['Demirhindi Şerbeti', 'demirhindi-serbeti', 'Soğuk', 'tamarind', false],
    ['Gül Şerbeti', 'gul-serbeti', 'Soğuk', 'rose', false],
    ['Bira', 'bira', 'Alkollü', 'beer', true],
    ['Kırmızı Şarap', 'kirmizi-sarap', 'Alkollü', 'red-wine', true],
    ['Beyaz Şarap', 'beyaz-sarap', 'Alkollü', 'white-wine', true],
    ['Rakı', 'raki', 'Alkollü', 'raki', true],
    ['Viski', 'viski', 'Alkollü', 'whisky', true],
    ['Cin', 'cin', 'Alkollü', 'gin', true],
    ['Tekila', 'tekila', 'Alkollü', 'tequila', true],
    ['Votka', 'votka', 'Alkollü', 'vodka', true]
  ]
};

const xml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const C = { cream: '#f4e1ba', white: '#fff0d8', gold: '#d4a364', brown: '#956341', dark: '#674a3b', red: '#ba6456', green: '#6c8853', paleGreen: '#acc58e', pink: '#d99796', orange: '#dc9952', blue: '#93b9b4' };
function canvas(name, index, drink = false) {
  const pieces = [];
  const r = (x, y, w, h, fill) => pieces.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
  const oval = (x, y, w, h, fill) => { const inset = Math.min(4, Math.floor(Math.min(w, h) / 3)); r(x + inset, y, w - 2 * inset, h, fill); r(x, y + inset, w, h - 2 * inset, fill); };
  const dots = (x, y, w, h, fill, n = 12, size = 2) => {
    for (let j = 0; j < n; j++) r(x + (j * 11 + index * 3) % w, y + (j * 7 + index) % h, size, size, fill);
  };
  r(0, 0, 96, 96, ['#e6ceb8', '#d5d1e4', '#cbd8bd', '#c6dad5', '#e4d8b7'][index % 5]);
  r(0, 75, 96, 21, '#b69e87'); r(0, 75, 96, 3, '#d1baa1');
  r(7, 11, 3, 3, '#fff0d8'); r(10, 8, 3, 3, '#fff0d8'); r(84, 20, 3, 3, '#fff0d8');
  if (!drink) { oval(11, 55, 74, 24, '#82968d'); oval(14, 51, 68, 23, '#f8edcf'); oval(19, 54, 58, 16, '#e7d7b8'); }
  const finish = () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${xml(name)} için temsili piksel çizim" shape-rendering="crispEdges"><title>${xml(name)} — özgün piksel çizim</title>${pieces.join('')}</svg>\n`;
  return { r, oval, dots, finish };
}

function foodArt(name, motif, variant, index, dessert) {
  const { r, oval: o, dots, finish } = canvas(name, index);
  const { cream, white, gold, brown, dark, red, green, paleGreen, pink, orange } = C;
  const bowl = fill => { r(19, 38, 58, 16, '#d8c8ad'); r(23, 54, 50, 13, '#c6ab8c'); r(29, 67, 38, 5, '#a48771'); o(22, 33, 52, 20, fill); r(20, 39, 56, 3, white); };
  const cube = (x, y, fill = gold, w = 14) => { r(x, y + 3, w, 10, brown); r(x, y, w, 9, fill); r(x + 2, y + 1, w - 4, 2, cream); };
  const ball = (x, y, fill, size = 14) => { o(x, y, size, size, fill); r(x + 4, y + 2, Math.max(3, size - 8), 2, cream); };
  if (motif === 'mound') {
    o(25, 47, 46, 17, gold); o(31, 38, 34, 18, variant === 'cheese' ? '#daba6d' : '#c1a170'); o(38, 31, 20, 15, cream);
    dots(28, 42, 36, 18, variant === 'cheese' ? gold : brown, 24); r(45, 28, 8, 4, green);
  } else if (motif === 'pudding' || motif === 'ice-bowl' || motif === 'sweet-soup' || motif === 'soup') {
    const fill = ({ saffron: '#e4c768', grape: '#aa8395', rose: pink, molasses: '#b39274', brown: '#e1ba79', white: cream, rice: '#e9dacf', red, meat: '#c69165', meatballs: '#d5ab84', almond: cream, plain: white })[variant] || cream;
    bowl(fill);
    if (motif === 'pudding') {
      if (variant === 'plain') { dots(36, 35, 22, 10, brown, 8); r(38, 30, 20, 3, pink); }
      else if (variant === 'saffron') { dots(26, 36, 42, 11, red, 8); r(44, 36, 7, 7, dark); }
      else if (variant === 'almond') dots(26, 37, 40, 9, green, 20);
      else { r(34, 38, 26, 3, '#795a73'); r(37, 34, 17, 2, '#d4b5c0'); }
    } else if (motif === 'ice-bowl') {
      for (let y = 22; y <= 35; y += 7) for (let x = 28 + (y % 3) * 3; x <= 62; x += 11) r(x, y, 8, 7, white);
      r(30, 27, 33, 4, variant === 'rose' ? red : dark); r(37, 22, 23, 3, fill);
      if (variant === 'rose') { r(64, 20, 3, 22, '#9866a0'); r(64, 18, 11, 3, '#9866a0'); }
    } else if (motif === 'sweet-soup') {
      for (const [x, y] of [[29, 32], [48, 29], [38, 43], [58, 41]]) ball(x, y, variant === 'brown' ? brown : white, 12);
    } else {
      dots(28, 37, 35, 9, variant === 'white' ? brown : green, 15);
      if (variant === 'meat' || variant === 'meatballs') for (const [x, y] of [[31, 35], [48, 40], [60, 34]]) ball(x, y, brown, 8);
      r(74, 18, 3, 34, '#8ca3a0'); r(71, 18, 9, 9, '#dbe2ca');
    }
  } else if (motif === 'cookies') {
    for (const [x, y] of [[25, 34], [46, 30], [35, 50], [59, 49]]) {
      ball(x, y, variant === 'sugar' || variant === 'foam' ? cream : gold, 16);
      if (variant === 'crescent') { r(x + 8, y, 8, 7, '#e7d7b8'); r(x + 12, y + 7, 4, 3, '#e7d7b8'); }
      else if (variant === 'almond') { r(x + 5, y + 3, 6, 8, brown); r(x + 6, y + 4, 3, 5, cream); }
      else dots(x + 3, y + 4, 10, 7, white, 7);
    }
    if (variant === 'foam') { o(56, 19, 21, 20, white); r(61, 14, 12, 11, white); dots(58, 25, 12, 8, green, 9); }
  } else if (motif === 'squares') {
    for (let y = 32; y <= 49; y += 17) for (let x = 25; x <= 59; x += 17) {
      cube(x, y, variant === 'fibers' || variant === 'custard' ? cream : gold);
      if (variant === 'threads' || variant === 'fibers') for (let j = 0; j < 4; j++) r(x + 1, y + j * 2, 12, 1, variant === 'threads' ? brown : white);
      else if (variant === 'cream') r(x + 3, y - 3, 8, 5, white);
      else if (variant === 'walnuts') { r(x + 4, y + 3, 6, 5, dark); r(x + 6, y + 2, 2, 7, gold); }
      else r(x + 1, y + 4, 12, 4, white);
    }
  } else if (motif === 'wafer') {
    for (let y = 31; y <= 43; y += 4) o(23, y, 52, 21, y % 8 ? cream : gold);
    for (let x = 29; x <= 66; x += 5) r(x, 32, 1, 14, gold);
    for (let y = 34; y <= 44; y += 5) r(27, y, 43, 1, gold);
  } else if (motif === 'pastry') {
    if (variant === 'halfmoon' || variant === 'shell') {
      for (const [x, y] of [[23, 33], [42, 48]]) { o(x, y, 30, 17, gold); r(x, y, 30, 5, brown); for (let j = 0; j < 4; j++) r(x + 4 + j * 5, y + 6, 2, 7, variant === 'shell' ? brown : cream); }
    } else if (variant === 'fingers') {
      for (let y = 29; y < 61; y += 11) { o(28, y, 42, 8, gold); dots(32, y + 2, 31, 3, brown, 6); }
    } else if (variant === 'pillows') {
      for (const [x, y] of [[23, 31], [46, 34], [32, 52], [57, 52]]) { cube(x, y, gold, 18); dots(x + 2, y + 1, 12, 8, white, 10); }
    } else {
      for (const [x, y] of [[27, 32], [49, 31], [36, 51]]) { ball(x, y, gold, 18); if (variant === 'dimples') r(x + 6, y + 6, 6, 6, dark); else dots(x + 3, y + 4, 11, 10, cream, 12); }
    }
  } else if (motif === 'mochi') {
    for (const [x, y, fill] of [[24, 34, pink], [46, 30, paleGreen], [38, 50, white]]) { ball(x, y, fill, 22); dots(x + 4, y + 7, 13, 7, '#ead9c9', 5); }
    r(51, 53, 6, 12, '#9c6768'); r(54, 53, 3, 5, white);
  } else if (motif === 'sandwich') {
    o(26, 40, 45, 22, gold); o(28, 35, 41, 17, dark); o(25, 28, 47, 21, gold); r(32, 32, 32, 3, cream);
  } else if (motif === 'fish-pastry') {
    o(20, 33, 48, 30, gold); r(64, 28, 7, 38, gold); r(71, 32, 5, 30, gold); r(28, 41, 4, 4, dark);
    for (let x = 36; x < 62; x += 8) for (let y = 40; y < 60; y += 8) { r(x, y, 3, 5, brown); r(x + 3, y + 3, 3, 2, brown); }
    r(32, 57, 15, 6, brown);
  } else if (motif === 'rice-fruit') {
    o(23, 38, 25, 25, white); dots(27, 41, 15, 18, cream, 25, 1);
    for (let j = 0; j < 4; j++) { r(52 + j * 5, 31 + j * 3, 6, 26, orange); r(53 + j * 5, 33 + j * 3, 2, 20, '#f6c776'); }
    r(25, 60, 24, 4, '#e8d5bb');
  } else if (motif === 'frozen') {
    for (const [x, y] of [[29, 22], [53, 28]]) { r(x + 7, y + 29, 4, 19, brown); r(x, y + 5, 19, 28, cream); r(x + 4, y, 11, 8, cream); dots(x + 2, y + 9, 14, 16, green, 12); }
  } else if (motif === 'spirals') {
    const fill = variant === 'orange' ? orange : gold;
    for (const [x, y] of [[23, 30], [46, 35], [34, 52]]) { r(x + 3, y, 17, 3, fill); r(x, y + 3, 3, 13, fill); r(x + 20, y + 3, 3, 13, fill); r(x + 3, y + 16, 17, 3, fill); r(x + 6, y + 6, 11, 3, fill); r(x + 6, y + 9, 3, 4, fill); r(x + 9, y + 13, 8, 3, fill); }
  } else if (motif === 'rolls') {
    for (let y = 30; y <= 52; y += 19) { r(26, y + 2, 43, 14, gold); r(26, y, 43, 4, brown); r(22, y + 2, 10, 14, white); r(63, y + 2, 10, 14, white); dots(28, y + 6, 33, 6, brown, 11); r(23, y + 6, 6, 4, green); r(66, y + 6, 5, 4, dark); }
  } else if (motif === 'tarts') {
    for (const [x, y] of [[23, 33], [49, 35], [36, 52]]) { o(x, y, 24, 17, brown); o(x + 3, y - 2, 18, 14, gold); dots(x + 6, y + 1, 12, 8, dark, 6); }
  } else if (motif === 'cake') {
    if (variant === 'dome' || variant === 'meringue') {
      r(24, 50, 48, 15, variant === 'dome' ? gold : white); r(27, 36, 42, 17, white); r(33, 27, 30, 15, white); r(41, 21, 14, 10, white);
      if (variant === 'dome') { dots(30, 35, 30, 18, gold, 18); r(24, 59, 48, 5, dark); }
      else for (const [x, y] of [[31, 26], [47, 21], [58, 30]]) { ball(x, y, red, 9); r(x + 3, y - 3, 3, 4, green); }
    } else {
      r(27, 31, 44, 33, variant === 'chocolate' ? dark : cream);
      if (variant === 'layers' || variant === 'pastry') for (let y = 35; y < 63; y += 8) { r(27, y, 44, 3, variant === 'layers' ? dark : gold); r(27, y + 3, 44, 2, white); }
      else r(27, 44, 44, 5, variant === 'jam' ? red : brown);
      r(25, 28, 48, 7, variant === 'chocolate' || variant === 'layers' ? dark : white);
      if (variant === 'jam') { ball(44, 20, red, 11); r(49, 16, 3, 5, green); }
      if (variant === 'chocolate') { r(37, 30, 22, 2, brown); r(37, 30, 2, 7, brown); r(57, 30, 2, 7, brown); }
    }
  } else if (motif === 'loaf') {
    if (variant === 'star') { r(32, 24, 32, 38, gold); r(26, 31, 44, 27, gold); r(22, 39, 52, 15, gold); r(39, 17, 18, 12, cream); dots(30, 29, 35, 29, white, 35); }
    else if (variant === 'dome') { r(28, 39, 42, 26, '#a47a55'); r(24, 30, 50, 18, gold); r(30, 23, 38, 13, gold); dots(29, 30, 36, 12, dark, 14); for (let x = 31; x < 68; x += 6) r(x, 44, 2, 19, brown); }
    else { o(22, 37, 54, 25, gold); r(25, 36, 47, 7, white); dots(27, 44, 41, 12, red, 13); r(62, 39, 10, 21, cream); dots(64, 41, 6, 14, dark, 7); }
  } else if (motif === 'pie') {
    const fill = ({ banana: cream, lime: paleGreen, meringue: '#e4c673', peach: orange, pecan: brown })[variant];
    r(22, 42, 53, 23, brown); r(24, 37, 49, 23, gold); o(25, 29, 48, 23, fill);
    if (variant === 'banana') for (let x = 29; x < 69; x += 9) { o(x, 32, 8, 8, white); r(x + 3, 35, 2, 2, gold); }
    else if (variant === 'lime') { r(33, 24, 31, 7, white); r(47, 21, 14, 9, green); r(50, 22, 8, 6, '#d4dda0'); }
    else if (variant === 'meringue') for (let x = 26; x < 68; x += 10) { r(x, 26, 10, 17, white); r(x + 3, 21, 4, 8, gold); }
    else if (variant === 'peach') for (let x = 28; x < 68; x += 10) { r(x, 31, 8, 15, cream); dots(x + 1, 32, 5, 10, gold, 5); }
    else for (let x = 29; x < 69; x += 9) { r(x, 30, 5, 16, dark); r(x + 1, 31, 2, 14, gold); }
  } else if (motif === 'biscuits') {
    for (let y = 31; y <= 55; y += 9) { o(24 + y % 4, y, 47, 9, gold); dots(30, y + 2, 34, 4, dark, 7); }
  } else if (motif === 'skewers') {
    for (let y = 30; y < 65; y += 13) { r(15, y + 6, 66, 2, '#718580'); for (let x = 25; x < 70; x += 12) { cube(x, y, brown, 10); r(x + 2, y + 2, 6, 2, dark); } }
    ball(19, 54, red, 10); r(69, 46, 7, 16, green);
  } else if (motif === 'pot') {
    if (variant === 'clay') { r(36, 21, 25, 7, brown); r(32, 27, 33, 11, '#aa7860'); o(25, 36, 46, 30, '#b98260'); r(32, 43, 32, 10, '#674a3b'); r(41, 58, 11, 4, gold); r(26, 51, 9, 3, cream); }
    else { r(14, 38, 9, 13, brown); r(74, 38, 9, 13, brown); r(19, 37, 58, 22, '#b98260'); r(24, 59, 48, 10, brown); o(21, 28, 54, 21, red); if (variant === 'shrimp') for (const [x, y] of [[30, 30], [45, 36], [59, 30]]) { r(x, y, 9, 4, pink); r(x, y + 4, 4, 7, pink); r(x + 4, y + 9, 7, 3, pink); } else { dots(26, 32, 40, 12, green, 11, 4); dots(30, 35, 35, 11, brown, 12, 4); } }
  } else if (motif === 'roast') {
    if (variant === 'lamb') { o(22, 33, 45, 24, brown); r(55, 45, 23, 7, cream); r(75, 42, 5, 12, white); dots(27, 37, 33, 13, dark, 15); }
    else { o(31, 29, 36, 28, gold); o(22, 46, 20, 15, brown); o(61, 45, 15, 15, brown); r(19, 51, 9, 4, cream); r(74, 50, 6, 4, cream); r(39, 33, 18, 3, cream); if (variant === 'rice') dots(21, 61, 54, 5, white, 30, 1); else { r(26, 57, 7, 7, green); r(59, 56, 9, 7, green); } }
  } else if (motif === 'stew') {
    o(22, 32, 53, 29, variant === 'orange' ? orange : variant === 'peas' ? '#b7875d' : '#996552');
    for (const [x, y] of [[27, 34], [44, 37], [59, 31], [38, 49], [56, 51]]) cube(x, y, variant === 'orange' ? gold : brown, 11);
    if (variant === 'mushroom') for (const [x, y] of [[30, 48], [56, 40]]) { r(x, y, 12, 5, cream); r(x + 4, y + 5, 4, 8, cream); }
    else if (variant === 'peas') dots(25, 37, 42, 22, green, 23, 3);
    else { r(34, 32, 30, 3, cream); r(51, 36, 4, 10, cream); }
  } else if (motif === 'meatballs' || motif === 'fingers') {
    r(21, 45, 53, 20, paleGreen); dots(23, 44, 44, 16, green, 21, 3);
    if (motif === 'meatballs') for (const [x, y] of [[24, 31], [45, 29], [33, 49], [58, 48]]) { ball(x, y, variant === 'falafel' ? '#9e8b52' : red, 16); dots(x + 3, y + 4, 10, 8, brown, 6); }
    else for (const [x, y] of [[23, 29], [43, 31], [34, 48], [56, 49]]) { o(x, y, 19, 12, variant === 'lentil' ? orange : '#ac7655'); r(x + 4, y + 3, 3, 5, brown); r(x + 11, y + 3, 3, 5, brown); }
    r(71, 31, 5, 15, '#e4cf76');
  } else if (motif === 'rings') {
    if (variant === 'sesame') { o(22, 27, 51, 36, gold); o(33, 36, 29, 19, '#e7d7b8'); dots(26, 31, 40, 27, white, 50, 1); o(37, 40, 21, 11, '#e7d7b8'); }
    else { for (const [x, y] of [[23, 29], [45, 33], [30, 50], [57, 51]]) { o(x, y, 20, 17, gold); r(x + 6, y + 5, 8, 7, '#e7d7b8'); } r(68, 23, 8, 7, '#eddd8c'); }
  } else if (motif === 'fish') {
    if (variant === 'salmon') { r(26, 33, 38, 28, pink); r(26, 56, 38, 6, '#82675b'); for (let y = 37; y < 55; y += 5) { r(28, y, 16, 2, cream); r(44, y + 2, 18, 2, cream); } r(68, 47, 7, 15, green); }
    else { o(22, 30, 42, 20, gold); dots(26, 33, 32, 11, brown, 14); for (const [x, y] of [[29, 54], [42, 51], [56, 48], [64, 54]]) { r(x, y, 6, 16, '#e9bf75'); r(x + 1, y, 2, 15, cream); } }
    r(65, 27, 11, 8, '#e4d087'); r(69, 27, 2, 8, cream);
  } else if (motif === 'potato') {
    o(19, 30, 59, 34, brown); o(23, 31, 51, 28, cream); r(27, 44, 42, 4, gold);
    for (const [x, y, fill] of [[31, 34, orange], [44, 37, green], [57, 33, red], [38, 49, pink], [55, 47, dark]]) r(x, y, 7, 6, fill);
    r(64, 23, 3, 14, '#8d73a3');
  } else if (motif === 'vegetables') {
    if (variant === 'circles') for (let x = 23; x < 69; x += 7) { o(x, 30 + (x % 3) * 4, 14, 27, x % 2 ? green : red); r(x + 5, 35, 3, 15, cream); }
    else if (variant === 'okra') for (const [x, y] of [[22, 32], [38, 34], [55, 29], [28, 49], [48, 48], [66, 45]]) { r(x, y + 4, 7, 16, green); r(x + 2, y, 3, 7, paleGreen); r(x + 2, y + 7, 1, 11, paleGreen); }
    else if (variant === 'spinach') { for (const [x, y] of [[25, 33], [40, 28], [57, 32], [30, 48], [50, 48]]) { o(x, y, 17, 17, green); r(x + 5, y + 2, 3, 12, paleGreen); } dots(29, 42, 39, 17, white, 18, 1); }
    else for (const [x, y] of [[23, 30], [41, 25], [58, 31], [32, 46], [53, 48]]) { o(x, y, 18, 18, cream); r(x + 5, y - 3, 8, 7, white); dots(x + 2, y + 4, 12, 10, gold, 6); r(x + 6, y + 16, 4, 7, green); }
  } else if (motif === 'rice') {
    if (variant === 'shell') { r(28, 31, 42, 29, gold); r(32, 24, 34, 10, gold); dots(31, 29, 32, 23, brown, 10); r(26, 54, 18, 10, cream); dots(27, 55, 14, 8, white, 15, 1); }
    else { o(21, 35, 55, 28, variant === 'seafood' ? '#d4b15d' : cream); dots(26, 39, 45, 17, white, 50, 1); if (variant === 'carrot') { for (let j = 0; j < 8; j++) r(25 + j * 5, 39 + (j % 3) * 7, 3, 11, orange); dots(26, 43, 35, 15, brown, 10, 4); } else { r(25, 30, 14, 9, '#748878'); r(55, 41, 13, 8, '#748878'); r(35, 44, 10, 5, pink); r(35, 49, 4, 7, pink); r(60, 25, 6, 16, red); } }
  } else if (motif === 'flatbread') {
    for (let y = 31; y <= 54; y += 7) { o(22, y, 53, 12, gold); r(24, y + 3, 48, 3, red); dots(27, y + 3, 40, 4, brown, 13, 2); }
    r(43, 27, 15, 7, white); r(48, 24, 5, 5, green);
  } else if (motif === 'buns') {
    for (const [x, y] of [[23, 33], [48, 44]]) { o(x, y, 25, 24, white); r(x + 5, y + 9, 18, 7, brown); r(x + 5, y + 7, 18, 3, green); r(x + 4, y + 2, 14, 6, cream); }
  } else if (motif === 'noodles') {
    bowl(variant === 'pho' ? '#d1b78a' : '#b1936a');
    for (let j = 0; j < 7; j++) { const y = 35 + j * 2; r(27 + j % 3, y, 35, variant === 'udon' ? 3 : 1, cream); r(59 - j % 3, y, 2, 8, cream); }
    if (variant === 'ramen') { o(26, 26, 15, 17, white); r(31, 31, 6, 7, gold); r(53, 27, 11, 10, brown); r(64, 27, 5, 15, green); }
    else if (variant === 'pho') { r(30, 29, 18, 5, pink); r(46, 30, 17, 5, brown); r(63, 30, 8, 5, green); dots(31, 33, 27, 8, green, 12); }
    else { r(29, 28, 9, 12, '#faf0d7'); r(31, 32, 5, 4, pink); r(59, 26, 9, 14, brown); }
    r(73, 16, 2, 24, brown); r(79, 17, 2, 23, brown);
  } else if (motif === 'casserole') {
    r(22, 30, 52, 34, gold); r(23, 36, 50, 5, brown); r(23, 45, 50, 6, '#a27782'); r(23, 54, 50, 7, red); r(24, 27, 48, 10, cream); dots(26, 28, 40, 7, gold, 14);
  } else if (motif === 'eggs') {
    o(21, 31, 55, 31, '#65786e'); r(75, 43, 13, 7, '#65786e');
    if (variant === 'sausage') { o(27, 35, 22, 21, white); r(34, 40, 9, 9, gold); for (const [x, y] of [[52, 35], [55, 49], [31, 54]]) { ball(x, y, red, 10); dots(x + 2, y + 2, 6, 6, dark, 5, 1); } }
    else { o(26, 35, 43, 23, gold); r(28, 46, 35, 3, cream); dots(30, 37, 30, 12, brown, 10, 3); dots(30, 35, 28, 13, green, 11, 1); }
  } else if (motif === 'pasta') {
    if (variant === 'dumplings') { for (let y = 31; y <= 57; y += 13) for (let x = 24 + y % 3; x < 67; x += 15) { o(x, y, 13, 9, cream); r(x + 3, y + 2, 1, 5, gold); r(x + 6, y + 2, 1, 5, gold); } dots(28, 34, 39, 23, green, 12); }
    else { for (let j = 0; j < 12; j++) { r(25 + j % 4, 30 + j * 3, 40 - j % 5, 2, cream); r(63 - j % 4, 31 + j * 2, 3, 12, gold); } if (variant === 'pepper') dots(29, 34, 34, 24, dark, 25, 1); else { r(40, 30, 20, 5, white); dots(29, 33, 32, 22, green, 13, 1); } }
  } else if (motif === 'salad') {
    o(23, 31, 52, 32, variant === 'bulgur' ? '#b77b59' : green);
    dots(26, 34, 43, 24, variant === 'chopped' ? paleGreen : cream, 24, variant === 'chopped' ? 5 : 1);
    dots(30, 37, 38, 21, red, 18, variant === 'chopped' ? 5 : 3); dots(26, 40, 40, 18, green, 17, 3);
    if (variant === 'herbs') dots(23, 31, 45, 27, paleGreen, 25, 2);
    r(68, 25, 9, 9, '#ead98f');
  } else if (motif === 'wrap') {
    r(26, 33, 48, 13, cream); r(22, 40, 53, 20, gold); r(24, 45, 44, 5, cream);
    if (variant === 'filled') { r(64, 33, 10, 23, brown); r(66, 35, 7, 6, red); r(64, 43, 9, 4, green); r(68, 48, 6, 4, cream); }
    else { r(23, 33, 45, 6, brown); dots(27, 34, 36, 4, green, 11); r(24, 55, 51, 4, '#eae5d6'); r(23, 54, 10, 10, '#ddd4c2'); }
  } else if (motif === 'skillet') {
    o(20, 32, 55, 32, '#65756c'); r(74, 45, 13, 6, '#65756c');
    for (let j = 0; j < 7; j++) { r(26 + j * 6, 36 + j % 3 * 6, 4, 18, j % 3 === 0 ? red : j % 3 === 1 ? green : brown); r(27 + j * 6, 36 + j % 3 * 6, 1, 15, gold); }
  } else if (motif === 'steak') {
    o(22, 31, 47, 30, brown); r(28, 34, 34, 5, '#ad7860'); r(37, 38, 9, 17, '#edd5b6');
    for (let x = 27; x < 66; x += 10) r(x, 41, 3, 15, dark);
    r(66, 44, 5, 17, green); r(73, 48, 4, 15, green); r(70, 26, 7, 8, red);
  } else throw new Error(`Unknown food motif: ${motif}`);
  return finish();
}

function drinkArt(name, style, index) {
  const { r, oval: o, dots, finish } = canvas(name, index, true);
  const { cream, white, gold, brown, dark, red, green, paleGreen, pink, orange, blue } = C;
  const steam = () => { r(33, 17, 3, 10, white); r(36, 13, 3, 5, white); r(47, 12, 3, 10, white); r(50, 8, 3, 5, white); };
  const cup = (fill, foam = false, small = false) => {
    const y = small ? 43 : 32, h = small ? 18 : 29;
    r(23, y, 41, h, '#e9d8b8'); r(28, y + h, 31, 7, '#c5ab8e'); r(62, y + 4, 13, h - 7, '#e9d8b8'); r(65, y + 7, 6, h - 13, '#d5d1e4');
    o(25, y - 4, 37, 13, foam ? cream : fill); r(28, y, 31, 5, fill); r(20, 69, 54, 4, blue); r(25, 67, 45, 4, white); steam();
  };
  const glass = (fill, tall = true) => {
    const y = tall ? 24 : 39, h = tall ? 45 : 30;
    r(29, y, 38, h, blue); r(33, y + 5, 30, h - 10, fill); r(35, y + 5, 3, h - 11, white); r(31, y, 34, 3, '#d6e6d4'); r(32, y + h, 32, 5, '#7fa29e');
  };
  const bottle = (fill, label, slim = false) => {
    const x = slim ? 38 : 31, w = slim ? 24 : 36;
    r(x + 8, 14, w - 16, 17, fill); r(x + 6, 11, w - 12, 5, '#ac9181'); r(x + 4, 29, w - 8, 7, fill); r(x, 35, w, 38, fill); r(x + 3, 38, 3, 30, white); r(x + 6, 44, w - 12, 19, label); r(x + 9, 50, w - 18, 3, fill);
  };
  const lemon = (x, y) => { o(x, y, 16, 15, gold); o(x + 3, y + 3, 10, 9, '#ede08e'); r(x + 7, y + 3, 2, 9, white); r(x + 3, y + 7, 10, 2, white); };
  const leaves = (x, y, color = green) => { r(x + 6, y, 2, 22, color); r(x, y + 2, 6, 8, color); r(x + 8, y + 7, 7, 7, color); r(x + 1, y + 12, 5, 7, color); };
  const fruit = (kind, x = 67, y = 52) => {
    if (kind === 'lemon' || kind === 'orange') lemon(x, y);
    else if (kind === 'cherry') { ballFruit(x, y + 5, red, 10); ballFruit(x + 10, y + 9, red, 10); r(x + 5, y, 10, 3, green); r(x + 7, y, 2, 7, green); r(x + 14, y + 1, 2, 8, green); }
    else if (kind === 'carrot') { r(x + 2, y + 6, 12, 8, orange); r(x + 4, y + 14, 8, 6, orange); r(x + 6, y + 20, 4, 4, orange); leaves(x, y - 8); }
    else { ballFruit(x, y, kind === 'apple' ? green : kind === 'peach' ? pink : red, 19); r(x + 9, y - 4, 2, 7, brown); r(x + 10, y - 4, 7, 4, green); if (kind === 'pomegranate') dots(x + 4, y + 4, 10, 10, cream, 12); }
  };
  const ballFruit = (x, y, fill, size) => { o(x, y, size, size, fill); r(x + 4, y + 3, 4, 3, cream); };
  const coffeeStyles = ['espresso', 'mug-dark', 'cappuccino', 'flat-white', 'mocha', 'salep', 'chocolate', 'matcha'];
  if (style === 'cezve') {
    r(20, 31, 21, 7, brown); r(17, 37, 27, 24, '#b78359'); r(21, 61, 20, 6, brown); r(40, 34, 22, 4, dark); r(61, 28, 4, 9, dark); o(19, 28, 24, 10, dark);
    r(48, 52, 21, 17, white); r(67, 55, 8, 10, cream); r(70, 57, 3, 5, '#e6ceb8'); o(49, 49, 19, 8, dark); r(45, 70, 31, 4, blue); steam();
  } else if (style === 'carafe') {
    r(29, 24, 35, 9, dark); r(27, 33, 39, 9, blue); r(23, 42, 47, 28, blue); r(28, 43, 37, 23, dark); r(30, 44, 4, 18, white); r(65, 36, 12, 22, dark); r(69, 40, 5, 13, '#e6ceb8'); r(26, 19, 42, 5, brown); steam();
  } else if (coffeeStyles.includes(style)) {
    const fill = ({ salep: cream, matcha: '#98b077', mocha: '#a88267', 'flat-white': '#bc9b7a', cappuccino: '#b99571', chocolate: dark })[style] || dark;
    cup(fill, style !== 'espresso' && style !== 'mug-dark', style === 'espresso');
    if (style === 'cappuccino') { o(34, 28, 20, 8, white); dots(32, 30, 21, 6, brown, 12, 1); }
    if (style === 'flat-white') { r(40, 28, 3, 7, cream); r(36, 29, 12, 3, cream); r(38, 33, 8, 3, cream); }
    if (style === 'mocha') { r(29, 28, 28, 2, dark); r(37, 24, 2, 14, dark); r(47, 23, 2, 15, dark); r(67, 60, 11, 11, dark); }
    if (style === 'salep') { dots(31, 28, 24, 7, brown, 14, 1); r(69, 52, 3, 19, brown); r(74, 51, 3, 18, brown); }
    if (style === 'chocolate') { r(36, 24, 8, 8, white); r(47, 26, 8, 8, white); r(69, 59, 14, 12, dark); r(70, 63, 12, 2, brown); }
    if (style === 'matcha') { r(73, 41, 2, 27, brown); r(68, 38, 12, 5, brown); r(69, 40, 1, 12, gold); r(73, 40, 1, 12, gold); r(77, 40, 1, 12, gold); }
  } else if (style === 'latte') {
    glass('#c19771'); r(33, 43, 30, 12, cream); r(33, 31, 30, 8, white); r(35, 28, 26, 5, cream); steam();
  } else if (style === 'tea-glass') {
    r(31, 27, 33, 7, blue); r(35, 34, 25, 13, red); r(38, 47, 19, 13, '#9d6445'); r(34, 60, 27, 8, red); r(30, 68, 35, 4, blue); r(18, 73, 60, 4, white); r(33, 31, 3, 10, cream); r(39, 48, 3, 13, cream); r(72, 47, 3, 23, '#7a938c'); steam();
  } else if (style.startsWith('tea-')) {
    const fill = style === 'tea-rosehip' ? '#c58772' : style === 'tea-sage' ? '#b9be85' : '#d5c590';
    glass(fill, false); r(65, 44, 12, 18, blue); r(69, 48, 5, 10, '#cbd8bd'); steam();
    if (style === 'tea-leaf' || style === 'tea-sage') leaves(12, 42, style === 'tea-sage' ? '#94a17c' : green);
    else if (style === 'tea-rosehip') { fruit('cherry', 12, 53); leaves(13, 40); }
    else { leaves(14, 49); r(12, 39, 13, 14, white); r(8, 43, 21, 6, white); r(16, 43, 5, 5, gold); if (style === 'tea-flower') { r(22, 55, 9, 9, cream); r(25, 58, 3, 3, gold); } }
  } else if (style === 'water' || style === 'mineral') {
    if (style === 'water') { glass('#c5ddd2'); r(73, 21, 11, 12, blue); r(70, 32, 17, 39, '#b2cbc1'); r(72, 43, 13, 14, cream); }
    else { bottle('#7c9b70', cream, true); dots(42, 35, 9, 34, '#dbeac5', 16, 2); r(60, 45, 16, 26, blue); r(63, 48, 10, 18, '#c5ddd2'); }
  } else if (style === 'ayran' || style === 'kefir' || style === 'turnip' || style === 'boza') {
    if (style === 'kefir') { bottle(cream, blue); r(35, 17, 27, 4, blue); r(31, 36, 36, 4, white); }
    else if (style === 'turnip') { bottle('#885967', cream, true); r(59, 45, 17, 26, blue); r(62, 48, 11, 18, '#995d6d'); r(14, 59, 15, 11, pink); leaves(15, 41); }
    else { glass(style === 'ayran' ? white : '#d0b482'); if (style === 'ayran') { r(33, 29, 30, 5, white); dots(35, 29, 25, 5, '#dfd7bd', 8); } else { dots(36, 31, 23, 7, brown, 11, 1); for (const [x, y] of [[72, 55], [78, 62], [68, 66]]) ballFruit(x, y, gold, 8); } }
  } else if (['lemon', 'orange', 'cherry', 'apple', 'pomegranate', 'peach', 'carrot', 'tomato'].includes(style)) {
    const fill = ({ lemon: '#e0d287', orange, cherry: '#a76271', apple: '#cdbf7d', pomegranate: red, peach: '#dfa07c', carrot: '#cc854f', tomato: '#bd6656' })[style];
    glass(fill); fruit(style); if (style === 'lemon') { r(57, 13, 3, 22, '#9d78a8'); r(57, 13, 11, 3, '#9d78a8'); lemon(56, 24); }
    if (style === 'orange') { r(34, 29, 27, 4, '#f1be7a'); dots(34, 34, 24, 24, '#e8aa68', 11, 1); }
  } else if (style === 'soda' || style === 'cola') {
    bottle(style === 'soda' ? '#b9cfc3' : '#785240', style === 'soda' ? '#daca81' : red);
    r(70, 44, 16, 27, blue); r(73, 48, 10, 19, style === 'soda' ? '#cddbb2' : dark); dots(36, 35, 22, 31, style === 'soda' ? white : gold, 12, 2);
  } else if (style === 'iced-tea' || style === 'cold-brew' || style === 'frappe' || style === 'milkshake' || style === 'smoothie' || style === 'boba') {
    const fill = ({ 'iced-tea': '#c99460', 'cold-brew': dark, frappe: '#ab8468', milkshake: pink, smoothie: '#b389ae', boba: '#c29d7c' })[style];
    glass(fill); r(58, 11, 3, 26, '#9c79a4'); r(58, 11, 10, 3, '#9c79a4');
    if (style === 'iced-tea' || style === 'cold-brew') { for (const [x, y] of [[36, 29], [49, 33], [40, 43]]) r(x, y, 9, 8, '#d8d8bc'); if (style === 'iced-tea') lemon(66, 51); else { r(72, 61, 7, 10, brown); r(74, 62, 2, 8, dark); } }
    else if (style === 'frappe' || style === 'milkshake') { o(33, 19, 30, 17, white); r(39, 15, 18, 9, white); r(45, 10, 7, 9, white); if (style === 'milkshake') { ballFruit(48, 9, red, 7); r(71, 57, 10, 14, pink); } else dots(38, 23, 18, 8, dark, 12, 1); }
    else if (style === 'smoothie') { fruit('cherry', 68, 52); ballFruit(39, 20, '#89719b', 8); ballFruit(48, 22, '#b76283', 7); }
    else { for (const [x, y] of [[36, 57], [45, 61], [54, 56], [38, 48], [51, 47]]) ballFruit(x, y, dark, 6); r(32, 22, 33, 4, cream); }
  } else if (style === 'coconut') {
    o(19, 36, 54, 33, brown); r(25, 31, 42, 9, cream); r(29, 30, 33, 7, white); r(48, 15, 3, 23, '#92779d'); r(48, 15, 16, 3, '#92779d'); for (let x = 27; x < 68; x += 9) r(x, 42, 2, 18, dark);
  } else if (style === 'tamarind' || style === 'rose') {
    glass(style === 'tamarind' ? '#b68c6b' : pink); r(26, 24, 45, 3, brown); r(25, 25, 5, 16, brown); r(66, 25, 5, 16, brown); r(36, 70, 24, 4, brown);
    if (style === 'tamarind') { o(70, 51, 9, 21, brown); r(74, 56, 8, 4, dark); r(71, 63, 8, 3, dark); }
    else { r(75, 59, 3, 17, green); o(68, 48, 18, 15, red); r(71, 52, 12, 5, pink); r(76, 54, 3, 4, red); }
  } else if (style === 'beer') {
    r(23, 29, 41, 40, blue); r(27, 35, 33, 29, gold); r(63, 36, 14, 24, blue); r(67, 40, 6, 16, '#cbd8bd'); o(25, 21, 37, 16, white); r(30, 16, 12, 8, white); r(45, 19, 10, 6, white); dots(31, 42, 21, 18, cream, 15, 2); r(27, 69, 33, 4, '#7b9b95');
  } else if (style === 'red-wine' || style === 'white-wine') {
    r(29, 22, 39, 21, blue); r(33, 43, 31, 12, blue); r(39, 55, 19, 5, blue); r(46, 60, 5, 14, blue); r(34, 74, 28, 4, blue);
    r(33, 31, 31, 13, style === 'red-wine' ? '#9b6070' : '#d7c47e'); r(39, 44, 19, 8, style === 'red-wine' ? '#9b6070' : '#d7c47e'); r(34, 24, 3, 17, white);
    r(72, 55, 6, 17, style === 'red-wine' ? '#9b6070' : gold);
  } else if (style === 'raki') {
    glass('#e6e5cd'); r(36, 32, 24, 31, white); r(72, 29, 8, 11, blue); r(69, 40, 15, 32, blue); r(72, 47, 9, 14, cream); r(72, 14, 9, 15, '#789b75');
  } else if (style === 'whisky') {
    glass('#b7854e', false); r(36, 43, 9, 8, '#ded5b5'); r(50, 48, 9, 8, '#ded5b5'); r(71, 25, 10, 13, dark); r(67, 38, 18, 33, brown); r(70, 48, 12, 14, cream); r(71, 29, 9, 5, gold);
  } else if (style === 'gin') {
    r(31, 29, 34, 19, blue); r(36, 48, 24, 10, blue); r(45, 58, 6, 15, blue); r(33, 74, 30, 4, blue); r(35, 34, 26, 14, '#dce3c3'); lemon(57, 24); leaves(16, 45); dots(18, 59, 12, 13, '#718197', 6, 3);
  } else if (style === 'tequila') {
    glass('#dec999', false); r(26, 38, 42, 4, white); lemon(69, 56); r(17, 55, 3, 19, green); r(11, 49, 4, 18, green); r(23, 46, 4, 21, green); r(7, 66, 24, 8, brown);
  } else if (style === 'vodka') {
    bottle('#b4c9c2', '#7899ad', true); r(61, 47, 16, 24, blue); r(64, 51, 10, 17, '#d9e1c5'); r(63, 46, 13, 3, white); r(42, 13, 16, 5, '#a9bfd0');
  } else throw new Error(`Unknown drink motif: ${style}`);
  return finish();
}

const canonical = name => name.normalize('NFKC').toLocaleLowerCase('tr').replace(/[\s’'\-]+/g, ' ').trim();
const feeds = {}, assets = [];
for (const [key, folder, start] of [['tatli', 'desserts', 1051], ['yemek', 'meals', 2051], ['icecek', 'drinks', 9001]]) {
  if (rows[key].length !== 50) throw new Error(`${key}: exactly 50 additions required.`);
  const known = existing[key] || [], names = new Set(known.map(card => canonical(card.isim)));
  const allExistingIds = new Set(Object.values(existing).flat().map(card => card.id));
  const seen = new Set();
  feeds[key] = rows[key].map(([isim, slug, etiket, motif, detail], index) => {
    const id = start + index, normalized = canonical(isim);
    const gorsel = `assets/images/${folder}/${slug}.svg`;
    // Idempotent reruns accept the identical added record after the root merges
    // the feed, but do not repurpose any existing card or image.
    const prior = known.find(card => card.id === id);
    if (seen.has(normalized)) throw new Error(`Duplicate new name: ${isim}`);
    seen.add(normalized);
    if (names.has(normalized) && !(prior?.isim === isim && prior?.gorsel === gorsel)) throw new Error(`Duplicate existing name: ${isim}`);
    if (allExistingIds.has(id) && !(prior?.isim === isim && prior?.gorsel === gorsel)) throw new Error(`Existing ID collision: ${key}/${id}`);
    const card = { id, isim, gorsel, etiket, ...(key === 'icecek' ? { alkol: detail } : {}) };
    assets.push({ gorsel, content: key === 'icecek' ? drinkArt(isim, motif, index) : foodArt(isim, motif, detail, index, key === 'tatli') });
    return card;
  });
}
if (feeds.icecek.filter(card => card.alkol).length !== 8) throw new Error('The drink list must have 8 alcoholic and 42 nonalcoholic entries.');
let created = 0, reused = 0;
for (const { gorsel, content } of assets) {
  await mkdir(new URL(gorsel.slice(0, gorsel.lastIndexOf('/') + 1), root), { recursive: true });
  try { await writeFile(new URL(gorsel, root), content, { encoding: 'utf8', flag: 'wx' }); created++; }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(new URL(gorsel, root), 'utf8') !== content) throw new Error(`Refused to overwrite existing art: ${gorsel}`);
    reused++;
  }
}
await writeFile(new URL('tools/expansion-menu.json', root), `${JSON.stringify(feeds, null, 2)}\n`, 'utf8');
console.log(`50 new desserts + 50 new meals + 50 drinks. Alcohol: 8/50. ${created} new SVG; ${reused} identical SVG. veri.json was not edited.`);
