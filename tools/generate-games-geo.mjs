import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Only this feed and its own illustrations are written. Existing room/card IDs
// and veri.json are deliberately left for the catalogue integration step.
const root = new URL('../', import.meta.url);
const flagVersion = 'v7.3.2';
const flagBase = `https://raw.githubusercontent.com/lipis/flag-icons/${flagVersion}/`;
const cities = [
  ['Adana', 'Akdeniz', 'bridge'], ['Adıyaman', 'Güneydoğu Anadolu', 'nemrut'],
  ['Afyonkarahisar', 'Ege', 'hill-castle'], ['Ağrı', 'Doğu Anadolu', 'snow'],
  ['Amasya', 'Karadeniz', 'river-houses'], ['Ankara', 'İç Anadolu', 'monument'],
  ['Antalya', 'Akdeniz', 'waterfall-palm'], ['Artvin', 'Karadeniz', 'forest-mountain'],
  ['Aydın', 'Ege', 'columns-olive'], ['Balıkesir', 'Marmara', 'olive-sea'],
  ['Bilecik', 'Marmara', 'clock'], ['Bingöl', 'Doğu Anadolu', 'mountain-lake'],
  ['Bitlis', 'Doğu Anadolu', 'castle'], ['Bolu', 'Karadeniz', 'forest-lake'],
  ['Burdur', 'Akdeniz', 'white-lake'], ['Bursa', 'Marmara', 'green-mosque'],
  ['Çanakkale', 'Marmara', 'trojan-horse'], ['Çankırı', 'İç Anadolu', 'salt-cave'],
  ['Çorum', 'Karadeniz', 'hittite'], ['Denizli', 'Ege', 'terraces'],
  ['Diyarbakır', 'Güneydoğu Anadolu', 'walls'], ['Edirne', 'Marmara', 'four-minarets'],
  ['Elazığ', 'Doğu Anadolu', 'hill-castle'], ['Erzincan', 'Doğu Anadolu', 'waterfall-mountain'],
  ['Erzurum', 'Doğu Anadolu', 'twin-minarets'], ['Eskişehir', 'İç Anadolu', 'river-houses'],
  ['Gaziantep', 'Güneydoğu Anadolu', 'mosaic'], ['Giresun', 'Karadeniz', 'island-nuts'],
  ['Gümüşhane', 'Karadeniz', 'valley-bridge'], ['Hakkari', 'Doğu Anadolu', 'snow'],
  ['Hatay', 'Akdeniz', 'oldtown-laurel'], ['Isparta', 'Akdeniz', 'roses'],
  ['Mersin', 'Akdeniz', 'sea-castle'], ['İstanbul', 'Marmara', 'maiden-tower'],
  ['İzmir', 'Ege', 'clock-sea'], ['Kars', 'Doğu Anadolu', 'ruins'],
  ['Kastamonu', 'Karadeniz', 'house-castle'], ['Kayseri', 'İç Anadolu', 'snow'],
  ['Kırklareli', 'Marmara', 'forest'], ['Kırşehir', 'İç Anadolu', 'baglama'],
  ['Kocaeli', 'Marmara', 'bay-industry'], ['Konya', 'İç Anadolu', 'green-tower'],
  ['Kütahya', 'Ege', 'tile'], ['Malatya', 'Doğu Anadolu', 'apricots'],
  ['Manisa', 'Ege', 'mountain-tulips'], ['Kahramanmaraş', 'Akdeniz', 'icecream'],
  ['Mardin', 'Güneydoğu Anadolu', 'stone-houses'], ['Muğla', 'Ege', 'beach-boat'],
  ['Muş', 'Doğu Anadolu', 'mountain-tulips'], ['Nevşehir', 'İç Anadolu', 'chimneys'],
  ['Niğde', 'İç Anadolu', 'mountain-apples'], ['Ordu', 'Karadeniz', 'cable-sea'],
  ['Rize', 'Karadeniz', 'tea'], ['Sakarya', 'Marmara', 'river-bridge'],
  ['Samsun', 'Karadeniz', 'ferry'], ['Siirt', 'Güneydoğu Anadolu', 'textile'],
  ['Sinop', 'Karadeniz', 'sea-walls'], ['Sivas', 'İç Anadolu', 'twin-minarets'],
  ['Tekirdağ', 'Marmara', 'vineyard-sea'], ['Tokat', 'Karadeniz', 'wood-houses'],
  ['Trabzon', 'Karadeniz', 'cliff-monastery'], ['Tunceli', 'Doğu Anadolu', 'river-goat'],
  ['Şanlıurfa', 'Güneydoğu Anadolu', 'fish-lake'], ['Uşak', 'Ege', 'rug'],
  ['Van', 'Doğu Anadolu', 'cat-lake'], ['Yozgat', 'İç Anadolu', 'clock'],
  ['Zonguldak', 'Karadeniz', 'coal-port'], ['Aksaray', 'İç Anadolu', 'valley'],
  ['Bayburt', 'Karadeniz', 'castle'], ['Karaman', 'İç Anadolu', 'stone-arch'],
  ['Kırıkkale', 'İç Anadolu', 'river-industry'], ['Batman', 'Güneydoğu Anadolu', 'cave-bridge'],
  ['Şırnak', 'Güneydoğu Anadolu', 'mountain'], ['Bartın', 'Karadeniz', 'river-houses'],
  ['Ardahan', 'Doğu Anadolu', 'castle'], ['Iğdır', 'Doğu Anadolu', 'stork-mountain'],
  ['Yalova', 'Marmara', 'thermal'], ['Karabük', 'Karadeniz', 'wood-houses'],
  ['Kilis', 'Güneydoğu Anadolu', 'olive'], ['Osmaniye', 'Akdeniz', 'hill-castle'],
  ['Düzce', 'Karadeniz', 'waterfall-forest']
];

// Recognition is an editorial selection rather than a numerical popularity
// ranking. Character and game records are deliberately separate card types.
// name, franchise, genre, sprite, clothing colour, hair/body colour, accessory
const characters = [
  ['Mario', 'Super Mario', 'Platform', 'plumber', '#bf5a55', '#684f3c', 'red-cap'],
  ['Luigi', 'Super Mario', 'Platform', 'plumber', '#6b9b65', '#684f3c', 'green-cap'],
  ['Princess Peach', 'Super Mario', 'Platform', 'princess', '#ca91aa', '#e1bb75', 'crown'],
  ['Bowser', 'Super Mario', 'Platform', 'turtle', '#d4ac64', '#7c9b65', 'spikes'],
  ['Yoshi', 'Super Mario', 'Platform', 'dinosaur', '#77a879', '#d5dec0', 'saddle'],
  ['Donkey Kong', 'Donkey Kong', 'Platform', 'gorilla', '#8d6950', '#b99369', 'tie'],
  ['Sonic', 'Sonic the Hedgehog', 'Platform', 'hedgehog', '#628ab7', '#dfbc90', 'red-shoes'],
  ['Tails', 'Sonic the Hedgehog', 'Platform', 'fox', '#d5a35e', '#efdec0', 'two-tails'],
  ['Knuckles', 'Sonic the Hedgehog', 'Platform', 'hedgehog', '#b86a65', '#dcc395', 'gloves'],
  ['Shadow', 'Sonic the Hedgehog', 'Platform', 'hedgehog', '#4f525a', '#cf6762', 'red-stripes'],
  ['Link', 'The Legend of Zelda', 'Macera', 'elf', '#779465', '#d4ba75', 'sword-shield'],
  ['Zelda', 'The Legend of Zelda', 'Macera', 'princess', '#c6b09a', '#d6b37a', 'triforce'],
  ['Ganondorf', 'The Legend of Zelda', 'Macera', 'armour', '#657276', '#b27154', 'cape'],
  ['Kirby', 'Kirby', 'Platform', 'round', '#d4a3b5', '#b96f86', 'stars'],
  ['Pikachu', 'Pokémon', 'Rol Yapma', 'mouse', '#dfc370', '#a98048', 'lightning'],
  ['Charizard', 'Pokémon', 'Rol Yapma', 'dragon', '#c68b5f', '#79a1a4', 'flame'],
  ['Pac-Man', 'Pac-Man', 'Arcade', 'pacman', '#ddc673', '#b86c65', 'maze'],
  ['Crash Bandicoot', 'Crash Bandicoot', 'Platform', 'bandicoot', '#c78c5f', '#6c5e4c', 'blue-shorts'],
  ['Spyro', 'Spyro', 'Platform', 'dragon', '#9986b0', '#d6b367', 'horns'],
  ['Lara Croft', 'Tomb Raider', 'Macera', 'human', '#729da0', '#67503d', 'braid'],
  ['Kratos', 'God of War', 'Aksiyon', 'human', '#b29a84', '#63574d', 'red-tattoo'],
  ['Atreus', 'God of War', 'Aksiyon', 'human', '#a58d5c', '#a27b50', 'bow'],
  ['Nathan Drake', 'Uncharted', 'Macera', 'human', '#aaa28a', '#655448', 'holster'],
  ['Joel Miller', 'The Last of Us', 'Aksiyon', 'human', '#858e71', '#655a4d', 'beard-backpack'],
  ['Ellie', 'The Last of Us', 'Aksiyon', 'human', '#ab7772', '#7e5c44', 'backpack'],
  ['Aloy', 'Horizon', 'Macera', 'human', '#91a6a6', '#ae7352', 'braid-bow'],
  ['Master Chief', 'Halo', 'Aksiyon', 'armour', '#7b8e69', '#c8ac67', 'visor'],
  ['Steve', 'Minecraft', 'Sandbox', 'block', '#70a1a3', '#66513f', 'pickaxe'],
  ['Alex (Minecraft)', 'Minecraft', 'Sandbox', 'block', '#80a579', '#bd8057', 'pickaxe'],
  ['CJ (Carl Johnson)', 'Grand Theft Auto: San Andreas', 'Aksiyon', 'human', '#e0dbc4', '#484640', 'tank-top'],
  ['Tommy Vercetti', 'Grand Theft Auto: Vice City', 'Aksiyon', 'human', '#7ca6a3', '#645446', 'hawaiian'],
  ['Niko Bellic', 'Grand Theft Auto IV', 'Aksiyon', 'human', '#8e7b65', '#695547', 'jacket'],
  ['Trevor Philips', 'Grand Theft Auto V', 'Aksiyon', 'human', '#c4b8a3', '#75614c', 'receding'],
  ['Michael De Santa', 'Grand Theft Auto V', 'Aksiyon', 'human', '#717d86', '#685a4c', 'suit'],
  ['Franklin Clinton', 'Grand Theft Auto V', 'Aksiyon', 'human', '#79947c', '#444944', 'cap'],
  ['Arthur Morgan', 'Red Dead Redemption', 'Macera', 'human', '#779299', '#78604b', 'cowboy'],
  ['John Marston', 'Red Dead Redemption', 'Macera', 'human', '#a28d70', '#655647', 'cowboy-scar'],
  ['Ezio Auditore', "Assassin’s Creed", 'Macera', 'human', '#d5cfb9', '#65544c', 'hood-red'],
  ['Altaïr Ibn-La’Ahad', "Assassin’s Creed", 'Macera', 'human', '#e3dec6', '#6a5d4d', 'hood-white'],
  ['Geralt of Rivia', 'The Witcher', 'Rol Yapma', 'human', '#7a8588', '#d1cec0', 'white-hair'],
  ['Ciri', 'The Witcher', 'Rol Yapma', 'human', '#c5bfa5', '#d5d2c3', 'white-braid'],
  ['Doom Slayer', 'DOOM', 'Aksiyon', 'armour', '#81936d', '#b1765c', 'red-visor'],
  ['Leon S. Kennedy', 'Resident Evil', 'Aksiyon', 'human', '#777b79', '#c4a277', 'sweep'],
  ['Jill Valentine', 'Resident Evil', 'Aksiyon', 'human', '#7c97b2', '#6c5446', 'beret'],
  ['Chris Redfield', 'Resident Evil', 'Aksiyon', 'human', '#8d9879', '#665244', 'vest'],
  ['Solid Snake', 'Metal Gear', 'Aksiyon', 'human', '#798995', '#71634e', 'bandana'],
  ['Scorpion', 'Mortal Kombat', 'Dövüş', 'ninja', '#c8b364', '#535054', 'mask-yellow'],
  ['Sub-Zero', 'Mortal Kombat', 'Dövüş', 'ninja', '#6b98b6', '#535054', 'mask-blue'],
  ['Liu Kang', 'Mortal Kombat', 'Dövüş', 'fighter', '#b77e6c', '#4f4841', 'red-bandana'],
  ['Raiden (Mortal Kombat)', 'Mortal Kombat', 'Dövüş', 'fighter', '#a2c0c3', '#ddd8c3', 'straw-hat'],
  ['Ryu', 'Street Fighter', 'Dövüş', 'fighter', '#e3dbc3', '#635043', 'red-bandana'],
  ['Chun-Li', 'Street Fighter', 'Dövüş', 'fighter', '#7895b7', '#55493e', 'hair-buns'],
  ['Ken Masters', 'Street Fighter', 'Dövüş', 'fighter', '#c17d68', '#d2ae72', 'long-blond'],
  ['Jin Kazama', 'Tekken', 'Dövüş', 'fighter', '#7a798e', '#514a46', 'spikes-gloves'],
  ['Heihachi Mishima', 'Tekken', 'Dövüş', 'fighter', '#8b7a62', '#b6b2a2', 'side-spikes'],
  ['King (Tekken)', 'Tekken', 'Dövüş', 'jaguar', '#c5a773', '#63534a', 'wrestler'],
  ['Cloud Strife', 'Final Fantasy', 'Rol Yapma', 'human', '#7d8296', '#d6bf83', 'greatsword'],
  ['Sephiroth', 'Final Fantasy', 'Rol Yapma', 'human', '#6c727b', '#d2d0c7', 'long-silver'],
  ['Jinx', 'League of Legends', 'Strateji', 'human', '#9a8398', '#76a6b9', 'blue-braids'],
  ['Ahri', 'League of Legends', 'Strateji', 'human', '#b97e87', '#564a49', 'fox-ears']
];

// name, franchise, genre, illustration, short cartridge label
const games = [
  ['Super Mario Bros.', 'Super Mario', 'Platform', 'mushroom', 'MARIO'],
  ['Mario Kart 8 Deluxe', 'Super Mario', 'Yarış', 'kart', 'KART 8'],
  ['The Legend of Zelda: Breath of the Wild', 'The Legend of Zelda', 'Macera', 'sword', 'ZELDA'],
  ['Pokémon Red / Blue', 'Pokémon', 'Rol Yapma', 'pokeball', 'POKE'],
  ['Sonic the Hedgehog', 'Sonic', 'Platform', 'rings', 'SONIC'],
  ['Minecraft', 'Minecraft', 'Sandbox', 'blocks', 'CRAFT'],
  ['Grand Theft Auto V', 'Grand Theft Auto', 'Aksiyon', 'city-car', 'GTA V'],
  ['Grand Theft Auto: San Andreas', 'Grand Theft Auto', 'Aksiyon', 'palm-car', 'GTA SA'],
  ['Red Dead Redemption 2', 'Red Dead Redemption', 'Macera', 'western', 'RDR 2'],
  ['God of War (2018)', 'God of War', 'Aksiyon', 'axe', 'GOW'],
  ['The Last of Us', 'The Last of Us', 'Aksiyon', 'overgrown', 'TLOU'],
  ['Uncharted 4: A Thief’s End', 'Uncharted', 'Macera', 'treasure', 'UC 4'],
  ['Resident Evil 4', 'Resident Evil', 'Aksiyon', 'village', 'RE 4'],
  ['Metal Gear Solid', 'Metal Gear', 'Aksiyon', 'radar', 'MGS'],
  ['Assassin’s Creed II', 'Assassin’s Creed', 'Macera', 'hood', 'AC II'],
  ['The Witcher 3: Wild Hunt', 'The Witcher', 'Rol Yapma', 'wolf', 'WITCH 3'],
  ['The Elder Scrolls V: Skyrim', 'The Elder Scrolls', 'Rol Yapma', 'dragon', 'SKYRIM'],
  ['Halo 3', 'Halo', 'Aksiyon', 'helmet', 'HALO 3'],
  ['Call of Duty 4: Modern Warfare', 'Call of Duty', 'Aksiyon', 'soldier', 'COD 4'],
  ['Counter-Strike 2', 'Counter-Strike', 'Aksiyon', 'crosshair', 'CS 2'],
  ['Fortnite', 'Fortnite', 'Aksiyon', 'bus', 'FORT'],
  ['PUBG: Battlegrounds', 'PUBG', 'Aksiyon', 'helmet-pan', 'PUBG'],
  ['Rocket League', 'Rocket League', 'Spor', 'rocket-car', 'RL'],
  ['EA SPORTS FC 25', 'EA SPORTS FC', 'Spor', 'pitch', 'FC 25'],
  ['PES 2013', 'Pro Evolution Soccer', 'Spor', 'stadium', 'PES 13'],
  ['Tekken 3', 'Tekken', 'Dövüş', 'fist', 'TEKKEN'],
  ['Mortal Kombat 11', 'Mortal Kombat', 'Dövüş', 'dragon-disc', 'MK 11'],
  ['Street Fighter II', 'Street Fighter', 'Dövüş', 'fight', 'SF II'],
  ['Need for Speed: Underground 2', 'Need for Speed', 'Yarış', 'night-car', 'NFS U2'],
  ['Gran Turismo 7', 'Gran Turismo', 'Yarış', 'track-car', 'GT 7'],
  ['Forza Horizon 5', 'Forza', 'Yarış', 'desert-car', 'FH 5'],
  ['Crash Bandicoot (Oyun)', 'Crash Bandicoot', 'Platform', 'crate', 'CRASH'],
  ['Spyro the Dragon', 'Spyro', 'Platform', 'purple-dragon', 'SPYRO'],
  ['Tetris', 'Tetris', 'Arcade', 'tetromino', 'TETRIS'],
  ['Pac-Man (Oyun)', 'Pac-Man', 'Arcade', 'maze', 'PACMAN'],
  ['The Sims 4', 'The Sims', 'Simülasyon', 'house-gem', 'SIMS 4'],
  ['Age of Empires II', 'Age of Empires', 'Strateji', 'castle', 'AOE II'],
  ['League of Legends', 'League of Legends', 'Strateji', 'crystal', 'LOL'],
  ['Valorant', 'Valorant', 'Aksiyon', 'tactical', 'VALOR'],
  ['Final Fantasy VII', 'Final Fantasy', 'Rol Yapma', 'meteor', 'FF VII']
];

// Turkish display names, ISO 3166-1 alpha-2, UN M49 broad geographical area.
// Transcontinental Türkiye is grouped in Western Asia, Russia in Europe,
// following UN statistical geography rather than a territorial claim.
const countries = [
  ['Türkiye', 'tr', 'Asya'], ['Amerika Birleşik Devletleri', 'us', 'Amerika'],
  ['Almanya', 'de', 'Avrupa'], ['Fransa', 'fr', 'Avrupa'], ['İtalya', 'it', 'Avrupa'],
  ['İspanya', 'es', 'Avrupa'], ['Birleşik Krallık', 'gb', 'Avrupa'], ['Portekiz', 'pt', 'Avrupa'],
  ['Hollanda', 'nl', 'Avrupa'], ['Belçika', 'be', 'Avrupa'], ['İsviçre', 'ch', 'Avrupa'],
  ['Avusturya', 'at', 'Avrupa'], ['İsveç', 'se', 'Avrupa'], ['Norveç', 'no', 'Avrupa'],
  ['Danimarka', 'dk', 'Avrupa'], ['Finlandiya', 'fi', 'Avrupa'], ['İzlanda', 'is', 'Avrupa'],
  ['İrlanda', 'ie', 'Avrupa'], ['Polonya', 'pl', 'Avrupa'], ['Çekya', 'cz', 'Avrupa'],
  ['Macaristan', 'hu', 'Avrupa'], ['Yunanistan', 'gr', 'Avrupa'], ['Bulgaristan', 'bg', 'Avrupa'],
  ['Romanya', 'ro', 'Avrupa'], ['Sırbistan', 'rs', 'Avrupa'], ['Hırvatistan', 'hr', 'Avrupa'],
  ['Bosna-Hersek', 'ba', 'Avrupa'], ['Arnavutluk', 'al', 'Avrupa'], ['Ukrayna', 'ua', 'Avrupa'],
  ['Rusya', 'ru', 'Avrupa'], ['Japonya', 'jp', 'Asya'], ['Çin', 'cn', 'Asya'],
  ['Güney Kore', 'kr', 'Asya'], ['Kuzey Kore', 'kp', 'Asya'], ['Hindistan', 'in', 'Asya'],
  ['Pakistan', 'pk', 'Asya'], ['Bangladeş', 'bd', 'Asya'], ['Sri Lanka', 'lk', 'Asya'],
  ['Nepal', 'np', 'Asya'], ['Tayland', 'th', 'Asya'], ['Vietnam', 'vn', 'Asya'],
  ['Kamboçya', 'kh', 'Asya'], ['Endonezya', 'id', 'Asya'], ['Malezya', 'my', 'Asya'],
  ['Singapur', 'sg', 'Asya'], ['Filipinler', 'ph', 'Asya'], ['Moğolistan', 'mn', 'Asya'],
  ['Kazakistan', 'kz', 'Asya'], ['Özbekistan', 'uz', 'Asya'], ['Azerbaycan', 'az', 'Asya'],
  ['Gürcistan', 'ge', 'Asya'], ['Ermenistan', 'am', 'Asya'], ['Suudi Arabistan', 'sa', 'Asya'],
  ['Birleşik Arap Emirlikleri', 'ae', 'Asya'], ['Katar', 'qa', 'Asya'], ['İran', 'ir', 'Asya'],
  ['Irak', 'iq', 'Asya'], ['Ürdün', 'jo', 'Asya'], ['İsrail', 'il', 'Asya'],
  ['Mısır', 'eg', 'Afrika'], ['Fas', 'ma', 'Afrika'], ['Cezayir', 'dz', 'Afrika'],
  ['Tunus', 'tn', 'Afrika'], ['Güney Afrika', 'za', 'Afrika'], ['Nijerya', 'ng', 'Afrika'],
  ['Kenya', 'ke', 'Afrika'], ['Etiyopya', 'et', 'Afrika'], ['Gana', 'gh', 'Afrika'],
  ['Senegal', 'sn', 'Afrika'], ['Kanada', 'ca', 'Amerika'], ['Meksika', 'mx', 'Amerika'],
  ['Brezilya', 'br', 'Amerika'], ['Arjantin', 'ar', 'Amerika'], ['Şili', 'cl', 'Amerika'],
  ['Kolombiya', 'co', 'Amerika'], ['Peru', 'pe', 'Amerika'], ['Küba', 'cu', 'Amerika'],
  ['Uruguay', 'uy', 'Amerika'], ['Avustralya', 'au', 'Okyanusya'], ['Yeni Zelanda', 'nz', 'Okyanusya']
];

const xml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const slug = value => value.toLocaleLowerCase('tr-TR').replaceAll('ı', 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ink = '#494750', cream = '#eee4c9', green = '#77916d', water = '#86aeb5', stone = '#b79d7c';
function drawing(name, type = 'özgün temsili piksel çizim') {
  const parts = [];
  const r = (x, y, w, h, fill) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
  const p = (d, fill) => parts.push(`<path d="${d}" fill="${fill}"/>`);
  const c = (cx, cy, radius, fill) => parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}"/>`);
  return { r, p, c, parts, finish: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${xml(name)} — ${xml(type)}" shape-rendering="crispEdges"><title>${xml(name)} — ${xml(type)}</title>${parts.join('')}</svg>\n` };
}
const font = {
  A: ['010','101','111','101','101'], B: ['110','101','110','101','110'], C: ['011','100','100','100','011'],
  D: ['110','101','101','101','110'], E: ['111','100','110','100','111'], F: ['111','100','110','100','100'],
  G: ['011','100','101','101','011'], H: ['101','101','111','101','101'], I: ['111','010','010','010','111'],
  J: ['001','001','001','101','010'], K: ['101','101','110','101','101'], L: ['100','100','100','100','111'],
  M: ['101','111','111','101','101'], N: ['101','111','111','111','101'], O: ['010','101','101','101','010'],
  P: ['110','101','110','100','100'], Q: ['010','101','101','111','011'], R: ['110','101','110','101','101'],
  S: ['011','100','010','001','110'], T: ['111','010','010','010','010'], U: ['101','101','101','101','111'],
  V: ['101','101','101','101','010'], W: ['101','101','111','111','101'], X: ['101','101','010','101','101'],
  Y: ['101','101','010','010','010'], Z: ['111','001','010','100','111'],
  0: ['111','101','101','101','111'], 1: ['010','110','010','010','111'], 2: ['110','001','010','100','111'],
  3: ['110','001','010','001','110'], 4: ['101','101','111','001','001'], 5: ['111','100','110','001','110'],
  6: ['011','100','111','101','111'], 7: ['111','001','010','010','010'], 8: ['111','101','111','101','111'],
  9: ['111','101','111','001','110'], ' ': ['000','000','000','000','000']
};
function stamp(d, label, x, y, scale = 2, color = ink) {
  for (const [i, char] of [...label].entries()) for (const [row, pixels] of (font[char] || font[' ']).entries()) for (let col = 0; col < 3; col++) if (pixels[col] === '1') d.r(x + i * 4 * scale + col * scale, y + row * scale, scale, scale, color);
}
function hills(d, snow = false, index = 0) {
  const { r, p } = d;
  p(`M0 68V52h8v-8h9v-9h8V22h12v14h9v12h11V35h9V19h10v12h8v14h12v23z`, ['#9ca496', '#aaa393', '#b3a28d'][index % 3]);
  if (snow) { p('M22 35V22h15v14h-4v-5h-7v4z', '#ece8d4'); p('M64 31V19h12v12h-5v-6h-3v6z', '#ece8d4'); }
  r(0, 66, 96, 24, '#89a078');
}
function tree(d, x, y, color = '#64896c') {
  d.r(x + 6, y + 17, 4, 12, '#8e7256'); d.p(`M${x + 5} ${y}h7v5h5v6h4v9H${x - 4}v-9h4v-6h5v-5z`, color);
}
function palm(d, x, y) {
  d.r(x + 10, y + 11, 4, 27, '#967554');
  d.p(`M${x} ${y + 9}v-5h10V${y}h6v5h11v5h-9v-3h-4v7h-4v-7H6z`.replace('H6z', `H${x + 6}z`), '#789a75');
}
function castle(d, x = 20, y = 38, width = 57, dark = false) {
  const { r } = d, color = dark ? '#73776f' : stone;
  r(x, y, width, 34, color); r(x - 4, y - 8, 12, 42, color); r(x + width - 8, y - 8, 12, 42, color);
  for (let dx = 0; dx < width; dx += 10) r(x + dx, y - 4, 5, 6, color);
  for (const tx of [x - 4, x + width - 8]) { r(tx, y - 13, 4, 6, color); r(tx + 8, y - 13, 4, 6, color); r(tx + 5, y + 2, 3, 8, '#5d635d'); }
  r(x + width / 2 - 6, y + 16, 12, 18, '#746a5c'); r(x + 12, y + 4, 5, 7, '#746a5c'); r(x + width - 17, y + 4, 5, 7, '#746a5c');
}
function house(d, x, y, w = 23, h = 29, body = cream) {
  d.r(x, y, w, h, body); d.p(`M${x - 3} ${y}v-4h5v-5h${w - 4}v5h5v4z`, '#a66e58');
  d.r(x + w / 2 - 3, y + h - 10, 6, 10, '#826953'); for (const dx of [4, w - 9]) d.r(x + dx, y + 5, 5, 8, '#77979c');
}
function bridge(d, y = 57, stoneColor = stone) {
  d.r(4, y, 88, 19, stoneColor); d.r(0, y - 4, 96, 5, '#d0b99a');
  for (let x = 12; x < 90; x += 23) { d.r(x, y + 7, 14, 13, water); d.r(x + 3, y + 3, 8, 4, water); }
}
function dome(d, x, y, w = 36, color = '#98aa96') {
  d.r(x, y + 13, w, 27, cream); d.p(`M${x - 3} ${y + 14}v-5h5v-5h5v-5h${w - 14}v5h5v5h5v5z`, color); d.r(x + w / 2, y - 6, 2, 7, '#b6a875');
  d.r(x + w / 2 - 4, y + 27, 9, 13, '#7b7161');
}
function flower(d, x, y, tulip = false, color = '#bd879b') {
  d.r(x + 3, y + 5, 2, 14, '#6d946f'); d.r(x - 1, y + 9, 5, 3, '#6d946f'); d.r(x + 4, y + 12, 5, 3, '#6d946f');
  d.r(x, y, 8, 7, color); if (tulip) { d.r(x, y - 3, 2, 4, color); d.r(x + 6, y - 3, 2, 4, color); } else { d.r(x - 2, y + 2, 12, 3, color); d.r(x + 2, y - 2, 4, 11, color); d.r(x + 3, y + 2, 2, 2, '#d4b579'); }
}
function cityArt(def, index) {
  const [name, , style] = def, d = drawing(name), { r, p } = d;
  r(0, 0, 96, 96, ['#cadbd9', '#d4d8dd', '#ded6c0', '#d3ddc8'][index % 4]);
  r(72, 12, 10, 10, '#e5cc88'); r(69, 15, 16, 4, '#e5cc88'); r(9, 13, 23, 3, cream); r(15, 10, 10, 3, cream);
  hills(d, style.includes('snow') || style.includes('mountain'), index); r(0, 87, 96, 9, '#a6a08b');
  const lake = () => { r(0, 60, 96, 25, water); r(5, 72, 26, 2, '#bad5cc'); r(57, 79, 30, 2, '#bad5cc'); };
  if (['bridge', 'river-bridge', 'valley-bridge', 'cave-bridge'].includes(style)) { lake(); bridge(d, 50, style === 'cave-bridge' ? '#b29677' : stone); if (style === 'cave-bridge') for (let i = 0; i < 4; i++) r(8 + i * 24, 38 + i % 2 * 4, 8, 7, '#766e5d'); }
  else if (style === 'nemrut') { for (const [x, color] of [[15, '#c0aa89'], [39, '#b7a180'], [63, '#d0b894']]) { r(x, 39, 18, 32, color); r(x - 3, 27, 24, 23, color); r(x + 2, 24, 14, 4, '#9d896c'); r(x + 1, 36, 5, 2, '#796d5b'); r(x + 12, 36, 5, 2, '#796d5b'); r(x + 7, 38, 4, 7, '#a18a6d'); r(x + 4, 46, 11, 2, '#796d5b'); } }
  else if (['castle', 'hill-castle', 'sea-castle', 'walls', 'sea-walls', 'house-castle'].includes(style)) { if (style.includes('sea')) lake(); if (style.includes('hill')) p('M10 80V66h10V54h12V38h32v16h12v12h11v14z', '#9a947d'); castle(d, style === 'house-castle' ? 49 : 20, style.includes('hill') ? 27 : 39, style === 'house-castle' ? 31 : 57, style.includes('walls')); if (style === 'house-castle') house(d, 8, 48, 32, 30); }
  else if (style.includes('houses') || style === 'oldtown-laurel' || style === 'stone-houses') { if (style.includes('river')) lake(); for (const [x, y, w] of [[4, 42, 27], [34, 48, 27], [65, 35, 27]]) house(d, x, y, w, 31, style === 'stone-houses' ? '#c3ac8c' : cream); if (style === 'wood-houses') for (const x of [9, 39, 70]) { r(x, 45, 3, 24, '#926e51'); r(x + 14, 45, 3, 24, '#926e51'); } if (style === 'oldtown-laurel') { tree(d, 4, 55); tree(d, 74, 52); } }
  else if (style === 'monument') { r(13, 75, 70, 7, stone); r(19, 67, 58, 8, '#cdb492'); r(24, 38, 48, 29, cream); r(20, 32, 56, 7, '#c6ac89'); for (let x = 29; x < 71; x += 8) r(x, 41, 4, 23, '#8e7b64'); }
  else if (style.includes('waterfall')) { if (style.includes('forest')) for (const x of [3, 25, 61, 79]) tree(d, x, 37); if (style.includes('palm')) { palm(d, 4, 32); palm(d, 64, 32); } r(32, 31, 34, 49, '#a6a48b'); r(39, 31, 20, 49, '#c5d9d3'); r(44, 31, 5, 48, '#94b7bf'); r(24, 76, 51, 8, water); }
  else if (style.startsWith('forest') || style === 'mountain-lake' || style === 'white-lake') { if (style.includes('lake')) lake(); if (style === 'white-lake') { r(0, 61, 96, 7, '#efe8ce'); r(8, 68, 80, 16, '#b6d9d4'); } else for (let i = 0; i < 5; i++) tree(d, 1 + i * 20, 35 + i % 2 * 9, i % 2 ? '#719575' : '#60866a'); }
  else if (style === 'columns-olive' || style === 'olive-sea' || style === 'olive') { if (style.includes('sea')) lake(); for (const x of [9, 63]) { tree(d, x, 38, '#7d9975'); r(x, 48, 4, 4, '#535f4c'); r(x + 12, 44, 4, 4, '#535f4c'); } if (style.includes('columns')) { for (const x of [30, 46]) { r(x, 42, 10, 33, cream); r(x - 2, 37, 14, 5, '#d2b994'); r(x - 2, 74, 14, 4, '#d2b994'); } } }
  else if (style.startsWith('clock')) { if (style.includes('sea')) lake(); r(38, 35, 22, 44, stone); r(34, 75, 30, 6, '#d6bb98'); r(34, 31, 30, 5, '#d6bb98'); r(42, 21, 14, 11, stone); r(45, 18, 8, 3, stone); r(43, 39, 12, 12, cream); r(48, 42, 2, 6, ink); r(49, 46, 4, 2, ink); r(44, 66, 10, 13, '#7e725e'); }
  else if (['green-mosque', 'four-minarets', 'twin-minarets', 'green-tower', 'fish-lake'].includes(style)) { if (style === 'fish-lake') lake(); dome(d, 31, 31, 35, style === 'green-tower' ? '#73a394' : '#acbaa7'); for (const x of style === 'four-minarets' ? [10, 22, 72, 84] : [18, 76]) { r(x, 30, 5, 44, '#ccb697'); r(x - 1, 23, 7, 8, cream); r(x + 2, 18, 1, 6, ink); } if (style === 'green-tower') { r(42, 28, 15, 34, '#6a9c87'); p('M40 29v-5h4v-9h10v9h4v5z', '#78aa96'); } if (style === 'fish-lake') for (const x of [15, 49, 72]) { r(x, 79, 8, 3, '#778b87'); r(x + 8, 77, 3, 7, '#778b87'); } }
  else if (style === 'trojan-horse') { r(23, 37, 44, 21, '#aa8762'); r(55, 23, 10, 27, '#aa8762'); r(65, 22, 16, 13, '#aa8762'); r(63, 18, 3, 7, '#aa8762'); r(22, 57, 7, 20, '#8a6b4e'); r(58, 57, 7, 20, '#8a6b4e'); r(15, 39, 8, 4, '#8a6b4e'); r(73, 26, 3, 3, ink); for (let x = 28; x < 62; x += 8) r(x, 40, 2, 16, '#896c50'); r(19, 77, 52, 4, '#8a6b4e'); }
  else if (style === 'salt-cave' || style === 'valley') { p('M0 83V37h15v13h14v11h10v22z', '#bdaf95'); p('M96 83V32H81v13H70v17H57v21z', '#a49d87'); r(37, 53, 20, 29, style === 'valley' ? water : '#f0e8ce'); r(43, 68, 8, 14, '#dddac4'); }
  else if (style === 'hittite') { r(42, 26, 12, 44, '#a7865c'); r(20, 32, 56, 6, '#a7865c'); r(15, 27, 6, 43, '#a7865c'); r(75, 27, 6, 43, '#a7865c'); r(19, 69, 58, 5, '#a7865c'); for (let i = 0; i < 6; i++) r(23 + i * 9, 17 + i % 2 * 4, 5, 12, '#a7865c'); r(22, 77, 53, 5, '#d0b289'); }
  else if (style === 'terraces') { for (let i = 0; i < 5; i++) { const y = 39 + i * 9, x = 18 - i * 3; r(x, y, 55 + i * 7, 9, '#eee8d1'); r(x + 4, y + 1, 49 + i * 7, 4, '#a4cac8'); } }
  else if (style === 'mosaic' || style === 'tile' || style === 'textile' || style === 'rug') { r(17, 22, 64, 61, '#b29b76'); r(22, 27, 54, 51, cream); const cols = ['#8a9dab', '#aa816a', '#c6a35c', '#78997e']; for (let i = 0; i < 8; i++) for (let j = 0; j < 7; j++) { const x = 24 + i * 6, y = 29 + j * 7; r(x, y, 4, 5, cols[(i + j * (style === 'tile' ? 2 : 3) + index) % 4]); } if (style === 'mosaic') { r(33, 46, 29, 5, '#645d52'); r(36, 47, 9, 3, '#dcd1b8'); r(49, 47, 9, 3, '#dcd1b8'); r(42, 60, 14, 3, '#ab816e'); } }
  else if (style === 'island-nuts') { lake(); p('M22 60v-7h7v-8h26v8h11v7z', '#749473'); tree(d, 32, 29); for (const x of [9, 68, 79]) { r(x, 78, 9, 7, '#aa8966'); r(x + 2, 76, 5, 2, '#735a40'); } }
  else if (style === 'roses' || style === 'mountain-tulips') for (let i = 0; i < 7; i++) flower(d, 3 + i * 13, 58 + i % 2 * 7, style.includes('tulips'), i % 2 ? '#c1a15f' : '#bd879b');
  else if (style === 'maiden-tower') { lake(); r(27, 76, 49, 6, '#d2b793'); r(36, 50, 31, 25, cream); r(45, 33, 12, 23, stone); p('M42 34v-4h5v-9h7v9h5v4z', '#a87360'); r(49, 43, 4, 7, '#69878a'); r(40, 59, 7, 8, '#69878a'); r(55, 59, 7, 8, '#69878a'); r(5, 32, 6, 30, '#9c9381'); r(83, 27, 6, 35, '#9c9381'); r(8, 43, 78, 3, '#bdb09c'); }
  else if (style === 'ruins' || style === 'stone-arch') { r(21, 43, 11, 35, stone); r(64, 43, 11, 35, stone); r(29, 33, 38, 10, stone); r(33, 28, 30, 5, stone); r(37, 44, 23, 34, '#b8c0a2'); p('M36 45v-7h6v-5h12v5h6v7z', '#8f806c'); for (const x of [23, 66]) for (let y = 49; y < 73; y += 8) r(x, y, 6, 2, '#d4bd99'); }
  else if (style === 'baglama') { r(29, 49, 28, 30, '#b18b5d'); r(23, 55, 41, 15, '#b18b5d'); r(47, 18, 7, 36, '#9a7951'); r(46, 13, 10, 10, '#9a7951'); r(40, 57, 5, 5, '#695a49'); r(31, 70, 23, 2, '#d5b483'); }
  else if (style.includes('industry') || style === 'coal-port') { if (style.includes('bay') || style === 'coal-port') lake(); house(d, 10, 52, 42, 24, '#b1a491'); for (const x of [17, 36, 65]) { r(x, 33, 8, 36, '#a89580'); r(x - 1, 30, 10, 4, '#897b6b'); r(x + 1, 24, 10, 4, '#c0c3b2'); } if (style === 'coal-port') { r(61, 62, 23, 15, '#5b625d'); r(57, 76, 30, 3, '#858d7f'); } }
  else if (style === 'apricots' || style === 'mountain-apples') { tree(d, 10, 28, '#7a9871'); tree(d, 64, 31, '#7a9871'); for (const [x, y] of [[11, 39], [27, 44], [20, 31], [68, 45], [80, 39], [77, 53]]) { r(x, y, 7, 7, style === 'apricots' ? '#d7a766' : '#b9806e'); r(x + 2, y - 2, 2, 3, '#6e7f58'); } }
  else if (style === 'icecream') { r(39, 59, 20, 25, '#c5a572'); r(44, 72, 10, 12, '#b38e5f'); r(31, 48, 35, 15, '#f0e5c9'); r(35, 40, 28, 10, '#f0e5c9'); r(42, 33, 16, 8, '#f0e5c9'); r(59, 33, 5, 32, '#937957'); }
  else if (style === 'beach-boat' || style === 'ferry') { lake(); r(0, 82, 96, 5, '#d9c28e'); r(20, 62, 57, 14, '#d4d7c3'); p('M16 65h65l-10 15H30z', '#967e68'); r(35, 49, 27, 13, cream); r(39, 45, 20, 4, '#b58770'); for (const x of [38, 47, 56]) r(x, 52, 5, 6, '#7c9899'); if (style === 'beach-boat') { palm(d, 0, 40); r(49, 30, 2, 19, '#967957'); } else { r(42, 37, 7, 12, '#6b7070'); r(50, 31, 15, 4, '#c0c7b8'); } }
  else if (style === 'chimneys') { for (const [x, y] of [[13, 47], [39, 42], [69, 53]]) { r(x, y, 15, 29, '#c5a47f'); p(`M${x - 3} ${y}v-5h6v-9h8v9h7v5z`, '#967856'); } r(50, 16, 17, 13, '#ba8392'); r(47, 20, 23, 7, '#ba8392'); r(54, 31, 10, 6, '#a38361'); r(54, 28, 1, 5, ink); r(63, 28, 1, 5, ink); }
  else if (style === 'cable-sea') { lake(); r(7, 25, 3, 47, '#9a8a6f'); r(84, 17, 3, 55, '#9a8a6f'); p('M8 28h9v-2h16v-2h17v-2h17v-2h18v3H69v2H51v2H34v2H18v2H8z', '#736f66'); r(42, 28, 2, 8, '#736f66'); r(33, 36, 23, 18, '#b18574'); r(37, 39, 15, 8, '#b3d1cc'); }
  else if (style === 'tea' || style === 'vineyard-sea') { if (style.includes('sea')) lake(); for (let i = 0; i < 5; i++) { const y = 45 + i * 8; r(4 + i % 2 * 7, y, 82 - i % 2 * 8, 5, i % 2 ? '#7c9b71' : '#638b64'); } if (style === 'tea') { r(40, 45, 18, 21, '#cf9c74'); r(35, 65, 28, 4, cream); r(40, 44, 18, 3, '#d8c9a7'); r(42, 49, 14, 12, '#af7655'); } }
  else if (style === 'cliff-monastery') { p('M20 82V24h18v12h17v13h13v33z', '#929880'); r(31, 31, 46, 35, cream); r(28, 27, 53, 6, '#b3a084'); for (let x = 35; x < 76; x += 10) { r(x, 37, 5, 9, '#807660'); r(x, 52, 5, 8, '#807660'); } tree(d, 3, 45); tree(d, 77, 57); }
  else if (style === 'river-goat') { r(36, 43, 15, 41, water); r(53, 63, 24, 9, '#c7bfaa'); r(55, 71, 4, 11, '#9c927c'); r(72, 70, 4, 12, '#9c927c'); r(76, 56, 7, 12, '#c7bfaa'); r(75, 49, 3, 8, '#8d826b'); r(82, 48, 3, 9, '#8d826b'); }
  else if (style === 'cat-lake') { lake(); r(33, 42, 29, 29, '#ede9d6'); r(37, 69, 21, 12, '#ede9d6'); r(33, 32, 9, 13, '#ede9d6'); r(53, 32, 9, 13, '#ede9d6'); r(37, 49, 5, 5, '#6c9cb5'); r(53, 49, 5, 5, '#af9a5e'); r(45, 58, 5, 3, '#c98a96'); r(24, 59, 10, 2, '#9e9787'); r(62, 59, 10, 2, '#9e9787'); }
  else if (style === 'stork-mountain') { r(42, 48, 18, 23, cream); r(52, 31, 7, 25, cream); r(59, 31, 15, 3, '#be825e'); r(41, 69, 3, 14, '#be825e'); r(57, 69, 3, 14, '#be825e'); r(32, 56, 20, 8, '#7d8280'); }
  else if (style === 'thermal') { r(9, 60, 79, 22, stone); r(15, 60, 67, 15, '#a7cbc5'); for (const x of [26, 47, 68]) { r(x, 31, 4, 10, '#e6e2cf'); r(x - 3, 40, 4, 10, '#e6e2cf'); r(x, 49, 4, 8, '#e6e2cf'); } }
  else if (style === 'snow' || style === 'mountain') { r(13, 77, 28, 4, '#9f947b'); r(64, 74, 24, 4, '#9f947b'); if (index % 2) tree(d, 12, 53); else r(44, 68, 10, 15, '#aaa089'); }
  else throw new Error(`Unillustrated city motif: ${style}`);
  // The actual province plate code prevents similar landscape families from
  // looking interchangeable and helps users recognise the geography cards.
  r(70, 4, 22, 15, '#eee8d3'); r(71, 5, 3, 13, '#798faa'); stamp(d, String(index + 1).padStart(2, '0'), 76, 7, 2);
  return d.finish();
}

function spriteArt(def, index) {
  const [name, , , type, outfit, hair, accessory] = def, d = drawing(name), { r, p } = d;
  r(0, 0, 96, 96, ['#d2d8c2', '#c6d8db', '#ddd0d9', '#e0d6be'][index % 4]);
  r(0, 76, 96, 20, '#a7aa91'); r(0, 76, 96, 4, '#bfd0a3'); r(12, 83, 72, 5, '#939b88');
  const face = '#d5ad89', faceDark = '#b98e70', eye = '#47484c';
  if (type === 'pacman') { p('M31 24h29v5h9v9H49v17h20v10h-9v6H31v-6H21V34h10z', outfit); r(42, 29, 4, 6, eye); for (const x of [60, 72, 84]) r(x, 44, 5, 5, cream); r(22, 73, 17, 6, hair); r(51, 73, 17, 6, hair); }
  else if (type === 'round') { p('M30 30h36v6h9v31h-9v7H30v-7h-9V36h9z', outfit); r(19, 50, 10, 12, outfit); r(67, 50, 10, 12, outfit); r(28, 72, 18, 9, hair); r(53, 72, 18, 9, hair); r(39, 40, 4, 13, eye); r(54, 40, 4, 13, eye); r(37, 54, 7, 3, '#c2869d'); r(57, 54, 7, 3, '#c2869d'); r(46, 60, 9, 5, '#ab6c80'); }
  else if (['hedgehog', 'fox', 'bandicoot', 'dinosaur', 'dragon', 'mouse', 'gorilla', 'turtle', 'jaguar'].includes(type)) {
    r(30, 49, 35, 28, outfit); r(34, 61, 27, 15, type === 'bandicoot' ? '#7a8baa' : hair); r(31, 21, 34, 33, outfit); r(27, 29, 7, 22, outfit); r(63, 31, 7, 20, outfit);
    if (type === 'hedgehog' || type === 'bandicoot') { p('M30 25h-8V17h14v-6h11v8h16v5h12v7H64v-4H30z', outfit); r(34, 38, 29, 15, hair); r(40, 29, 8, 15, cream); r(53, 29, 8, 15, cream); r(44, 32, 3, 10, eye); r(54, 32, 3, 10, eye); r(48, 45, 8, 5, eye); }
    else if (type === 'fox') { r(32, 12, 8, 17, outfit); r(57, 12, 8, 17, outfit); r(34, 35, 28, 18, cream); r(40, 31, 4, 8, eye); r(54, 31, 4, 8, eye); r(45, 47, 7, 4, eye); p('M20 51h-8v13h6v13h12V61z', outfit); p('M72 53h9v13h-6v12H63V63z', outfit); r(11, 61, 8, 6, cream); r(75, 65, 7, 6, cream); }
    else if (type === 'mouse') { r(28, 6, 8, 27, outfit); r(60, 6, 8, 27, outfit); r(28, 6, 8, 7, eye); r(60, 6, 8, 7, eye); r(34, 38, 5, 6, eye); r(55, 38, 5, 6, eye); r(30, 47, 7, 6, '#bd7665'); r(58, 47, 7, 6, '#bd7665'); r(45, 46, 4, 3, eye); p('M69 47h15v9h-7v9h-8v-8h7v-3h-7z', outfit); }
    else if (type === 'dragon') { r(26, 16, 8, 18, outfit); r(62, 16, 8, 18, outfit); r(28, 12, 5, 8, '#d7bb78'); r(63, 12, 5, 8, '#d7bb78'); r(39, 35, 4, 6, eye); r(55, 35, 4, 6, eye); r(39, 44, 23, 11, '#d7bb78'); p('M25 48H10V32h8v7h7z', hair); p('M68 48h17V32h-8v7h-9z', hair); r(72, 66, 11, 5, outfit); if (accessory === 'flame') { r(83, 61, 6, 10, '#d8a25d'); r(85, 57, 2, 5, '#c67a61'); } }
    else if (type === 'dinosaur') { r(57, 32, 18, 21, outfit); r(47, 30, 9, 16, cream); r(51, 33, 3, 8, eye); r(65, 44, 3, 3, eye); r(37, 52, 19, 18, cream); r(29, 49, 10, 9, '#b97665'); }
    else if (type === 'gorilla') { r(19, 50, 16, 26, outfit); r(64, 50, 16, 26, outfit); r(35, 29, 26, 25, hair); r(36, 25, 25, 7, outfit); r(39, 36, 5, 5, eye); r(53, 36, 5, 5, eye); r(43, 46, 12, 4, '#77543e'); r(44, 56, 8, 6, '#ba7064'); p('M48 62h4l4 11-6 5-7-5z', '#ba7064'); }
    else if (type === 'turtle') { r(18, 47, 12, 26, hair); r(63, 47, 14, 26, hair); r(32, 36, 31, 19, '#c6b180'); r(37, 33, 5, 6, eye); r(54, 33, 5, 6, eye); for (const x of [16, 25, 69, 78]) p(`M${x} 43h6v8h-6z`, cream); r(31, 19, 34, 7, '#b4775a'); r(23, 70, 14, 9, outfit); r(61, 70, 14, 9, outfit); }
    else if (type === 'jaguar') { r(27, 17, 10, 10, outfit); r(59, 17, 10, 10, outfit); r(32, 40, 31, 14, cream); r(37, 32, 5, 5, eye); r(55, 32, 5, 5, eye); r(45, 44, 7, 5, eye); for (const [x, y] of [[32, 27], [51, 26], [58, 42], [35, 45], [43, 22]]) r(x, y, 4, 4, '#725749'); r(31, 63, 34, 8, '#796f9e'); }
    r(21, 56, 12, 12, type === 'gorilla' ? outfit : cream); r(63, 56, 12, 12, type === 'gorilla' ? outfit : cream); r(27, 78, 19, 6, type === 'mouse' ? hair : '#ba746c'); r(54, 78, 19, 6, type === 'mouse' ? hair : '#ba746c');
    if (accessory === 'red-stripes') { r(32, 18, 17, 4, hair); r(60, 25, 6, 12, hair); r(54, 78, 19, 3, hair); }
    if (accessory === 'gloves') { r(20, 55, 15, 11, cream); r(62, 55, 15, 11, cream); r(22, 52, 3, 6, '#d2d1be'); r(71, 52, 3, 6, '#d2d1be'); }
  } else {
    const skin = ['CJ (Carl Johnson)', 'Franklin Clinton'].includes(name) ? '#a18062' : name === 'Kratos' ? '#d4cfbc' : face;
    r(28, 50, 39, 30, outfit); r(21, 53, 9, 25, outfit); r(66, 53, 9, 25, outfit); r(21, 71, 9, 9, skin); r(66, 71, 9, 9, skin); r(37, 43, 19, 11, skin); r(31, 20, 31, 27, skin); r(29, 29, 4, 12, skin); r(61, 29, 4, 12, skin);
    r(31, 17, 31, 9, hair); r(30, 24, 5, 10, hair); r(58, 24, 5, 10, hair); r(37, 30, 5, 3, eye); r(52, 30, 5, 3, eye); r(44, 33, 4, 8, faceDark); r(40, 43, 14, 2, '#a17b63');
    r(29, 80, 16, 8, '#686d76'); r(50, 80, 17, 8, '#686d76'); r(25, 88, 22, 5, '#5b5953'); r(50, 88, 22, 5, '#5b5953');
    if (type === 'plumber') { r(30, 13, 33, 9, outfit); r(26, 19, 42, 6, outfit); r(42, 14, 12, 7, cream); r(38, 41, 20, 5, hair); r(32, 51, 5, 24, '#778fa9'); r(59, 51, 5, 24, '#778fa9'); r(32, 62, 32, 16, '#778fa9'); r(35, 58, 3, 3, '#d5bc72'); r(58, 58, 3, 3, '#d5bc72'); }
    if (type === 'princess') { r(28, 18, 7, 32, hair); r(61, 18, 7, 32, hair); p('M20 81v-10h8V58h38v13h9v10z', outfit); r(40, 10, 19, 9, '#d4b878'); r(42, 6, 4, 8, '#d4b878'); r(53, 6, 4, 8, '#d4b878'); r(47, 14, 4, 3, '#849da8'); }
    if (type === 'elf') { r(25, 27, 7, 6, skin); r(62, 27, 7, 6, skin); p('M28 20v-8h31v8H42v4H28z', outfit); r(34, 55, 27, 3, '#b4a07a'); r(33, 69, 33, 5, '#99805e'); }
    if (type === 'armour') { r(25, 46, 12, 12, outfit); r(59, 46, 13, 12, outfit); r(33, 17, 29, 29, outfit); r(31, 27, 33, 11, hair); r(39, 20, 13, 5, '#879a83'); r(34, 52, 26, 12, '#92a183'); r(40, 59, 14, 4, '#606e68'); r(32, 69, 32, 8, '#626c61'); }
    if (type === 'block') { r(29, 17, 36, 33, skin); r(29, 17, 36, 9, hair); r(36, 33, 6, 5, eye); r(53, 33, 6, 5, eye); r(40, 42, 16, 5, hair); r(22, 54, 9, 29, skin); r(66, 54, 9, 29, skin); }
    if (type === 'ninja') { r(29, 17, 35, 30, hair); r(34, 28, 25, 8, skin); r(37, 31, 4, 2, eye); r(52, 31, 4, 2, eye); r(34, 36, 25, 12, outfit); r(39, 52, 17, 26, hair); r(28, 66, 39, 5, '#b29b76'); }
    if (accessory.includes('braid') || accessory === 'long-silver') { r(25, 20, 6, 34, hair); r(63, 21, 6, 37, hair); for (let i = 0; i < 5; i++) r(64 - i % 2 * 3, 47 + i * 5, 5, 5, hair); }
    if (accessory === 'blue-braids') { r(24, 21, 7, 52, hair); r(63, 21, 7, 52, hair); for (let i = 0; i < 5; i++) { r(22 + i % 2 * 3, 39 + i * 7, 7, 6, hair); r(66 - i % 2 * 3, 39 + i * 7, 7, 6, hair); } }
    if (accessory.includes('bow')) { r(79, 29, 3, 43, '#a38b60'); r(76, 23, 3, 8, '#a38b60'); r(76, 69, 3, 8, '#a38b60'); r(71, 27, 1, 47, cream); }
    if (accessory.includes('backpack') || accessory === 'holster') { r(26, 47, 6, 29, '#85755c'); r(63, 47, 6, 29, '#85755c'); }
    if (accessory.includes('beard') || name === 'Geralt of Rivia' || name === 'Kratos') { r(34, 40, 26, 7, hair); r(38, 47, 18, 4, hair); r(41, 41, 13, 3, skin); }
    if (accessory === 'red-tattoo') { r(33, 24, 5, 16, '#b97972'); r(31, 52, 7, 25, '#b97972'); r(53, 57, 10, 4, '#a38667'); }
    if (accessory.includes('cowboy')) { r(32, 10, 28, 11, '#977e5d'); r(22, 20, 47, 5, '#806b51'); r(32, 55, 30, 5, '#c7b89b'); if (accessory.includes('scar')) r(34, 35, 8, 1, '#aa8067'); }
    if (accessory.startsWith('hood')) { r(27, 16, 8, 35, outfit); r(60, 16, 8, 35, outfit); r(33, 11, 29, 10, outfit); p('M31 22h10v-7h14v7h9v-5H31z', outfit); r(28, 69, 39, 5, '#bd7d6c'); }
    if (accessory === 'fox-ears') { p('M29 21v-13h5v5h6v9z', hair); p('M56 21v-13h5v5h6v9z', hair); p('M12 78V53h7v8h7v17z', cream); p('M72 78V48h7v12h7v18z', cream); }
    if (accessory.includes('bandana')) { r(29, 22, 35, 4, accessory === 'bandana' ? '#7b909b' : '#bd7b6f'); r(64, 24, 11, 3, '#bd7b6f'); }
    if (accessory === 'hair-buns') { r(22, 17, 12, 12, hair); r(60, 17, 12, 12, hair); r(22, 23, 12, 3, cream); r(60, 23, 12, 3, cream); r(41, 54, 3, 20, '#d1bd7f'); }
    if (accessory === 'straw-hat') { p('M18 24v-4h7v-5h8v-5h31v5h8v5h7v4z', '#c8b691'); r(20, 23, 59, 3, '#a78e65'); }
    if (accessory.includes('spikes') || accessory === 'greatsword') { p('M28 20V12h8V7h8v6h8V5h7v10h8v7z', hair); }
    if (accessory === 'side-spikes') { r(37, 17, 22, 7, skin); p('M29 27H18V17h5V9h6v9h6z', hair); p('M61 27h11V17h-5V9h-6v9h-6z', hair); }
    if (accessory === 'sweep') { r(31, 22, 18, 10, hair); r(37, 27, 7, 7, hair); }
    if (accessory === 'beret' || accessory === 'cap') { r(27, 15, 39, 12, outfit); r(28, 23, 40, 4, outfit); }
    if (accessory === 'receding') r(39, 17, 16, 7, skin);
    if (accessory === 'suit') { p('M34 50h9l5 11 6-11h9l-12 23h-8z', cream); r(46, 55, 4, 14, '#aa7768'); }
    if (accessory === 'hawaiian') for (const [x, y] of [[34, 58], [55, 68], [24, 62], [67, 56]]) { r(x, y, 5, 2, cream); r(x + 2, y - 2, 2, 6, cream); }
    if (accessory === 'tank-top') { r(29, 52, 8, 14, skin); r(58, 52, 8, 14, skin); }
    if (accessory === 'jacket' || accessory === 'vest') { r(43, 51, 8, 29, '#d1c4a8'); r(47, 52, 1, 27, '#7c7568'); }
    if (accessory === 'sword-shield' || accessory === 'greatsword' || accessory === 'white-hair' || accessory === 'long-silver') { r(76, 17, accessory === 'greatsword' ? 9 : 4, 48, '#c6cbc4'); r(71, 62, 15, 4, '#9f8c65'); r(77, 66, 4, 13, '#7f7565'); if (accessory === 'sword-shield') { r(13, 53, 17, 20, '#8d9caf'); r(17, 59, 9, 8, '#c4ba83'); } }
    if (accessory === 'pickaxe') { r(74, 39, 4, 39, '#9d7f55'); r(60, 32, 29, 6, '#8ba6a2'); r(57, 38, 5, 8, '#8ba6a2'); r(85, 38, 5, 8, '#8ba6a2'); }
  }
  // A small character stamp differentiates portraits from game cartridges.
  r(5, 6, 13, 13, cream); r(9, 8, 5, 5, '#8c8398'); r(7, 14, 9, 3, '#8c8398');
  return d.finish();
}

function gameArt(def, index) {
  const [name, , , style, label] = def, d = drawing(name), { r, p } = d;
  const bg = ['#d1d6bd', '#c6d7d4', '#d9ceda', '#ded3bb'][index % 4];
  r(0, 0, 96, 96, bg); r(10, 4, 78, 90, '#8c8990'); r(6, 8, 80, 84, '#aea7a0'); r(10, 11, 72, 64, '#eee5cd'); r(13, 14, 66, 58, '#b9ced0'); r(21, 89, 7, 5, '#726f79'); r(68, 89, 7, 5, '#726f79');
  const car = (color, y = 48) => { r(24, y, 43, 15, color); r(30, y - 9, 25, 10, color); r(34, y - 7, 18, 7, '#b8d0c8'); r(29, y + 11, 9, 7, ink); r(56, y + 11, 9, 7, ink); r(25, y + 3, 5, 4, cream); r(62, y + 3, 5, 4, '#c3a46b'); };
  const sword = () => { r(43, 19, 6, 33, '#d1d9cb'); r(35, 49, 23, 5, '#b5a374'); r(44, 54, 5, 12, '#867655'); };
  if (style === 'mushroom') { r(16, 59, 60, 13, '#91ab78'); r(31, 36, 33, 22, '#ba7b6a'); r(25, 42, 45, 12, '#ba7b6a'); r(34, 56, 23, 13, '#e9dcbb'); r(32, 43, 8, 7, cream); r(53, 38, 7, 7, cream); r(58, 47, 6, 6, cream); r(41, 60, 3, 6, ink); r(52, 60, 3, 6, ink); }
  else if (style.includes('car') || style === 'kart') { r(13, 58, 66, 14, '#8a9189'); if (style.includes('city') || style.includes('night')) for (let i = 0; i < 5; i++) { const x = 16 + i * 13; r(x, 22 + i % 3 * 5, 10, 28, '#909b9c'); r(x + 2, 27 + i % 3 * 5, 3, 3, cream); } if (style === 'palm-car') { palm(d, 12, 21); palm(d, 60, 21); } if (style === 'desert-car') r(13, 56, 66, 16, '#c9b082'); if (style === 'track-car') { r(13, 65, 66, 3, cream); for (let x = 15; x < 78; x += 8) r(x, 65, 4, 3, ink); } car(['#b57d71', '#7b9aa5', '#9c86ac', '#b7a169'][index % 4]); if (style === 'rocket-car') { r(70, 50, 8, 8, '#dfba75'); r(74, 52, 5, 4, '#c79168'); } if (style === 'kart') { r(40, 33, 12, 11, '#bf7a6e'); r(44, 29, 9, 6, '#bf7a6e'); } }
  else if (style === 'sword' || style === 'axe') { p('M13 65V51h13V35h12v19h14V43h13v22z', '#91a386'); sword(); if (style === 'axe') { r(27, 25, 17, 21, '#b7c5bd'); r(32, 23, 10, 25, '#b7c5bd'); r(48, 30, 8, 11, '#b7c5bd'); } }
  else if (style === 'pokeball') { p('M32 27h27v5h9v27h-9v6H32v-6h-8V32h8z', cream); r(25, 33, 43, 16, '#bd7b73'); r(24, 47, 44, 4, ink); r(41, 43, 11, 11, ink); r(44, 46, 5, 5, cream); }
  else if (style === 'rings') { r(13, 59, 66, 13, '#85a473'); for (const x of [22, 43, 64]) { r(x, 30, 11, 4, '#ceb77a'); r(x - 3, 34, 4, 15, '#ceb77a'); r(x + 10, 34, 4, 15, '#ceb77a'); r(x, 49, 11, 4, '#ceb77a'); } }
  else if (style === 'blocks') { r(20, 40, 54, 32, '#9f856b'); r(20, 35, 54, 9, '#7d9e77'); for (const [x, y] of [[25, 49], [39, 60], [58, 49], [65, 64]]) r(x, y, 6, 4, '#b39a75'); r(28, 18, 32, 23, '#96ae7b'); r(33, 23, 6, 6, '#60705c'); r(49, 23, 6, 6, '#60705c'); r(40, 31, 9, 7, '#60705c'); }
  else if (style === 'western') { r(13, 14, 66, 58, '#c59b80'); r(22, 21, 23, 18, '#e1c286'); r(42, 38, 13, 12, '#8c7156'); r(35, 48, 31, 4, '#705e4d'); r(44, 52, 13, 20, '#705e4d'); p('M13 72V59h10v-5h16v18z', '#a88367'); }
  else if (style === 'overgrown' || style === 'village') { for (const x of [19, 51]) house(d, x, style === 'village' ? 36 : 28, 25, 35, '#b3b6a0'); if (style === 'overgrown') for (const [x, y] of [[21, 39], [25, 51], [51, 32], [63, 41], [66, 56]]) r(x, y, 6, 10, '#71936b'); else { r(13, 14, 66, 8, '#949b91'); r(43, 43, 5, 25, '#806b51'); } }
  else if (style === 'treasure') { r(23, 41, 43, 25, '#b29365'); r(27, 34, 36, 9, '#b29365'); r(23, 47, 43, 4, '#cbbb85'); r(30, 35, 4, 31, '#77654d'); r(57, 35, 4, 31, '#77654d'); r(42, 47, 6, 9, '#dac281'); }
  else if (style === 'radar' || style === 'crosshair' || style === 'tactical') { r(13, 14, 66, 58, style === 'radar' ? '#7f9d89' : '#9eaea3'); for (const x of [23, 37, 51, 65]) r(x, 17, 1, 51, '#b4c6b0'); for (const y of [24, 38, 52, 66]) r(16, y, 59, 1, '#b4c6b0'); r(44, 21, 3, 20, ink); r(44, 51, 3, 17, ink); r(21, 43, 17, 3, ink); r(53, 43, 19, 3, ink); r(41, 40, 10, 10, '#cfc29c'); if (style === 'radar') p('M45 44V22l22 22z', '#8bc095'); if (style === 'tactical') { r(23, 28, 11, 11, '#a18069'); r(24, 40, 9, 18, '#7b807e'); } }
  else if (style === 'hood') { p('M23 62V32h9V23h29v9h9v30z', cream); r(36, 35, 23, 17, '#b89676'); p('M32 33h29v8H32z', '#8f8c80'); r(25, 57, 43, 6, '#bf8b79'); }
  else if (style === 'wolf' || style === 'dragon-disc') { p('M24 24h10v8h25v-8h10v29H58v13H35V53H24z', style === 'wolf' ? '#bdc2b7' : '#c1a36a'); r(33, 39, 7, 4, '#6d756c'); r(54, 39, 7, 4, '#6d756c'); p('M39 51h15l-8 12z', '#6d756c'); if (style === 'dragon-disc') { r(17, 21, 4, 39, '#c1a36a'); r(72, 22, 4, 36, '#c1a36a'); r(22, 62, 48, 4, '#c1a36a'); } }
  else if (style === 'dragon' || style === 'purple-dragon') { const col = style === 'dragon' ? '#b2bbb0' : '#9c8db1'; p('M19 57V29h8v11h11V23h7v21h15V29h9v28H59v10H31V57z', col); r(39, 47, 19, 16, '#c9b57d'); r(35, 35, 5, 7, ink); r(51, 35, 5, 7, ink); }
  else if (style === 'helmet' || style === 'helmet-pan' || style === 'soldier') { r(28, 28, 38, 29, '#7f9479'); r(34, 21, 26, 9, '#7f9479'); r(24, 40, 46, 5, '#6a7f67'); r(33, 44, 28, 11, style === 'helmet' ? '#c7ac77' : '#676f69'); r(33, 58, 30, 14, '#909a82'); if (style === 'helmet-pan') { r(67, 45, 5, 16, '#6a7068'); r(62, 32, 15, 15, '#6a7068'); } }
  else if (style === 'bus') { r(22, 35, 48, 26, '#819dae'); r(27, 23, 39, 14, '#d4c395'); r(30, 37, 6, 8, '#c7d8cf'); r(40, 37, 6, 8, '#c7d8cf'); r(50, 37, 6, 8, '#c7d8cf'); r(59, 37, 7, 14, '#c7d8cf'); r(28, 57, 10, 10, ink); r(57, 57, 10, 10, ink); r(46, 15, 3, 8, '#888a79'); }
  else if (style === 'pitch' || style === 'stadium') { r(13, 33, 66, 39, '#86a67a'); r(19, 39, 53, 28, '#aec1a1'); r(21, 41, 49, 24, '#86a67a'); r(44, 39, 2, 28, '#d5dec4'); r(38, 47, 14, 3, '#d5dec4'); r(38, 57, 14, 3, '#d5dec4'); r(38, 49, 3, 9, '#d5dec4'); r(49, 49, 3, 9, '#d5dec4'); if (style === 'stadium') { r(13, 20, 66, 9, '#c7b793'); for (let x = 16; x < 76; x += 7) r(x, 22, 3, 4, '#ac8c79'); } }
  else if (style === 'fist' || style === 'fight') { r(31, 35, 26, 26, '#cba681'); r(28, 43, 11, 19, '#cba681'); r(33, 28, 6, 13, '#cba681'); r(40, 25, 6, 15, '#cba681'); r(47, 28, 6, 12, '#cba681'); r(54, 31, 6, 13, '#cba681'); r(30, 61, 30, 8, style === 'fight' ? '#bc8477' : '#9b809a'); }
  else if (style === 'crate') { r(24, 28, 43, 40, '#ba986b'); r(24, 28, 43, 5, '#8f7353'); r(24, 63, 43, 5, '#8f7353'); r(24, 28, 5, 40, '#8f7353'); r(62, 28, 5, 40, '#8f7353'); p('M29 34h6l26 28h-6z', '#8f7353'); p('M55 34h6L35 62h-6z', '#8f7353'); }
  else if (style === 'tetromino') { for (const [x, y, color] of [[21, 60, '#a38cae'], [30, 60, '#a38cae'], [39, 60, '#a38cae'], [30, 51, '#a38cae'], [51, 51, '#bf9770'], [60, 51, '#bf9770'], [51, 60, '#bf9770'], [60, 60, '#bf9770'], [30, 21, '#81a6aa'], [39, 21, '#81a6aa'], [48, 21, '#81a6aa'], [57, 21, '#81a6aa']]) { r(x, y, 8, 8, color); r(x + 1, y + 1, 5, 1, cream); } }
  else if (style === 'maze') { r(13, 14, 66, 58, '#747f95'); for (const [x, y, w, h] of [[20, 21, 17, 4], [20, 21, 4, 16], [44, 21, 28, 4], [55, 21, 4, 17], [20, 47, 16, 4], [33, 38, 4, 25], [45, 49, 27, 4], [20, 62, 52, 4]]) r(x, y, w, h, '#acbed0'); p('M45 33h12v3h-7v7h7v3H45v-3h-3V36h3z', '#d9c37c'); for (const x of [63, 70]) r(x, 40, 3, 3, cream); }
  else if (style === 'house-gem') { house(d, 22, 45, 48, 26); p('M46 19h5l8 11-10 13-10-13z', '#81aa88'); r(46, 23, 3, 12, '#b4ccb0'); }
  else if (style === 'castle') castle(d, 24, 39, 43);
  else if (style === 'crystal' || style === 'meteor') { p('M38 25h18l11 17-17 24-23-17z', style === 'meteor' ? '#94b4ac' : '#8e9fb5'); r(41, 30, 7, 24, '#bfcebb'); if (style === 'meteor') { p('M55 37h8l16-21v13L67 47z', '#b2c9b8'); r(68, 15, 7, 4, '#b2c9b8'); } }
  else throw new Error(`Unillustrated game motif: ${style}`);
  r(10, 77, 72, 11, cream); stamp(d, label, 46 - (label.length * 4 - 1), 78, 2, '#635e6b');
  return d.finish();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Source download ${response.status}: ${url}`);
  return response.text();
}
async function flagArt(def, index, license) {
  const [name, iso] = def, target = new URL(`assets/images/countries/${iso}.svg`, root);
  const preserveNamespaces = markup => markup.includes('xmlns:xlink=') ? markup : markup.replace(/^<svg\s/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ');
  // A completed build remains reproducible offline; only missing SVGs are
  // fetched from the fixed, documented upstream release.
  try {
    const existing = await readFile(target, 'utf8');
    if (existing.includes(`flag-icons ${flagVersion}`) && !/<script|<foreignObject|https?:\/\/[^"<]*\.(png|jpg)|\son\w+=/i.test(existing)) return preserveNamespaces(existing);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const upstream = await fetchText(`${flagBase}flags/4x3/${iso}.svg`);
  assert.match(upstream, /^<svg\s/);
  assert.ok(!/<script|<foreignObject|\son\w+=|(?:href|src)="(?!#)/i.test(upstream), `Unsafe flag SVG ${iso}`);
  const viewBox = upstream.match(/viewBox="([^"]+)"/)?.[1];
  assert.ok(viewBox, `Missing flag viewBox ${iso}`);
  const body = upstream.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const d = drawing(name, 'ülke bayrağı');
  // The flag itself stays in a 4:3 viewport. Complex national emblems use the
  // upstream vector geometry, avoiding invented or misleading symbols.
  d.r(0, 0, 96, 96, ['#ded4bf', '#d0d9cc', '#d8d0dd', '#ccdadd'][index % 4]);
  d.r(5, 20, 86, 62, '#a39b91'); d.r(3, 17, 86, 62, '#6a6570'); d.r(5, 19, 82, 58, cream);
  d.parts.push(`<svg x="7" y="20" width="78" height="55" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${body}</svg>`);
  d.r(8, 86, 15, 3, '#9b9181'); d.r(72, 8, 15, 3, '#b4a892');
  const result = d.finish();
  return preserveNamespaces(result.replace('<title>', `<!-- flag-icons ${flagVersion}; ${flagBase}flags/4x3/${iso}.svg; MIT license\n${license.replace(/--/g, '—')}\n-->\n<title>`));
}

assert.equal(cities.length, 81);
assert.equal(characters.length, 60);
assert.equal(games.length, 40);
assert.equal(countries.length, 80);
for (const [name, rows] of [['cities', cities], ['characters', characters], ['games', games], ['countries', countries]]) {
  assert.equal(new Set(rows.map(row => row[0].toLocaleLowerCase('tr-TR'))).size, rows.length, `Duplicate ${name}`);
}
const dirs = ['turkiye-cities', 'game-world', 'countries'];
for (const dir of dirs) await mkdir(new URL(`assets/images/${dir}/`, root), { recursive: true });
const feed = { 'turkiye-sehirleri': [], 'oyun-evreni': [], ulkeler: [] };
for (const [index, def] of cities.entries()) {
  const [name, region, motif] = def, image = `assets/images/turkiye-cities/${slug(name)}.svg`;
  const record = { id: 14001 + index, isim: name, gorsel: image, etiket: region, plaka: String(index + 1).padStart(2, '0'), tip: 'il', motif };
  feed['turkiye-sehirleri'].push(record); await writeFile(new URL(image, root), cityArt(def, index), 'utf8');
}
for (const [index, def] of characters.entries()) {
  const [name, franchise, genre] = def, image = `assets/images/game-world/character-${slug(name)}.svg`;
  feed['oyun-evreni'].push({ id: 15001 + index, isim: name, gorsel: image, etiket: genre, tip: 'karakter', evren: franchise });
  await writeFile(new URL(image, root), spriteArt(def, index), 'utf8');
}
for (const [index, def] of games.entries()) {
  const [name, franchise, genre] = def, image = `assets/images/game-world/game-${slug(name)}.svg`;
  feed['oyun-evreni'].push({ id: 15061 + index, isim: name, gorsel: image, etiket: genre, tip: 'oyun', evren: franchise });
  await writeFile(new URL(image, root), gameArt(def, index), 'utf8');
}
let existingSources = null;
try { existingSources = JSON.parse(await readFile(new URL('tools/games-geo-sources.json', root), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const license = existingSources?.flags?.licenseText || await fetchText(`${flagBase}LICENSE`);
const batches = Array.from({ length: Math.ceil(countries.length / 8) }, (_, i) => countries.slice(i * 8, i * 8 + 8));
for (const [batchIndex, batch] of batches.entries()) await Promise.all(batch.map(async (def, offset) => {
  const index = batchIndex * 8 + offset, [name, iso, continent] = def, image = `assets/images/countries/${iso}.svg`;
  feed.ulkeler[index] = { id: 16001 + index, isim: name, gorsel: image, etiket: continent, tip: 'ulke', iso2: iso.toUpperCase() };
  await writeFile(new URL(image, root), await flagArt(def, index, license), 'utf8');
}));
const sources = {
  verifiedAt: '2026-10-12',
  notes: [
    'İl adları ve toplam 81 il İçişleri Bakanlığının valilikler diziniyle doğrulandı; plaka sırası standart il trafik kodudur.',
    'Şehir görselleri harita veya güncel bina durumu iddiası içermeyen, o ilin doğa ve kültür çağrışımlarından özgün temsili piksel çizimlerdir.',
    'Oyun havuzu editoryal tanınırlık seçkisidir; en çok satanlar veya güncel popülerlik sıralaması iddiası değildir.',
    'Oyun karakterleri ve oyun kutuları farklı tip alanları taşır; çizimler resmi kapak veya ekran görüntüsü değildir.',
    '80 ülke BM üyesidir; etiketler BM M49 coğrafi gruplamasının geniş kıta seviyesine uyarlanır.'
  ],
  geography: [
    { title: 'T.C. İçişleri Bakanlığı — Valilikler', url: 'https://www.icisleri.gov.tr/valilikler', dataset: 'turkiye-sehirleri', ids: feed['turkiye-sehirleri'].map(card => card.id) },
    { title: 'United Nations — Member States', url: 'https://www.un.org/about-us/member-states', dataset: 'ulkeler', ids: feed.ulkeler.map(card => card.id) },
    { title: 'UN Statistics Division — M49 Standard', url: 'https://unstats.un.org/unsd/methodology/m49/', dataset: 'ulkeler', ids: feed.ulkeler.map(card => card.id) }
  ],
  games: [
    { title: 'Nintendo — Mario characters', url: 'https://mario.nintendo.com/ca/characters/', franchises: ['Super Mario', 'Donkey Kong'] },
    { title: 'Nintendo — amiibo character lineup', url: 'https://www.nintendo.com/en-ca/amiibo/line-up/', franchises: ['The Legend of Zelda', 'Kirby'] },
    { title: 'SEGA — Sonic Superstars characters', url: 'https://asia.sega.com/SonicSuperStars/en/character/', franchises: ['Sonic', 'Sonic the Hedgehog'] },
    { title: 'PlayStation — Sonic characters', url: 'https://www.playstation.com/en-ca/explore-sonic-the-hedgehog/', franchises: ['Sonic', 'Sonic the Hedgehog'] },
    { title: 'Pokémon — Official Pokédex', url: 'https://www.pokemon.com/pokedex/', franchises: ['Pokémon'] },
    { title: 'PlayStation — Games and franchises', url: 'https://www.playstation.com/en-us/games/', franchises: ['God of War', 'The Last of Us', 'Uncharted', 'Horizon', 'Crash Bandicoot', 'Spyro', 'Gran Turismo'] },
    { title: 'Rockstar Games — Games', url: 'https://www.rockstargames.com/games', franchises: ['Grand Theft Auto', 'Grand Theft Auto: San Andreas', 'Grand Theft Auto: Vice City', 'Grand Theft Auto IV', 'Grand Theft Auto V', 'Red Dead Redemption'] },
    { title: 'Capcom — Resident Evil portal', url: 'https://game.capcom.com/residentevil/en/', franchises: ['Resident Evil'] },
    { title: 'Capcom — Street Fighter IV character manual', url: 'https://static.capcom.com/manuals/sfiv/SFIV_360_DMNL_EN.pdf', franchises: ['Street Fighter'] },
    { title: 'Bandai Namco — Tekken', url: 'https://tekken.com/', franchises: ['Tekken'] },
    { title: 'Bandai Namco — PAC-MAN', url: 'https://www.bandainamcoent.com/games/pac-man-museum-plus', franchises: ['Pac-Man'] },
    { title: 'Warner Bros. — Mortal Kombat roster', url: 'https://www.mortalkombat.com/en-us/roster', franchises: ['Mortal Kombat'] },
    { title: 'Square Enix — Final Fantasy VII', url: 'https://ffvii.square-enix-games.com/', franchises: ['Final Fantasy'] },
    { title: 'Tomb Raider — Official website', url: 'https://www.tombraider.com/', franchises: ['Tomb Raider'] },
    { title: 'Ubisoft — Assassin’s Creed', url: 'https://www.ubisoft.com/en-us/game/assassins-creed', franchises: ['Assassin’s Creed'] },
    { title: 'CD Projekt Red — The Witcher', url: 'https://www.thewitcher.com/', franchises: ['The Witcher'] },
    { title: 'Bethesda — Games', url: 'https://bethesda.net/en/games', franchises: ['The Elder Scrolls', 'DOOM'] },
    { title: 'Halo — Official website', url: 'https://www.halowaypoint.com/', franchises: ['Halo'] },
    { title: 'Minecraft — Official website', url: 'https://www.minecraft.net/', franchises: ['Minecraft'] },
    { title: 'Konami — Metal Gear', url: 'https://www.konami.com/mg/', franchises: ['Metal Gear'] },
    { title: 'PlayStation — Interview with Konami PES 2013 team', url: 'https://blog.playstation.com/?p=76737', franchises: ['Pro Evolution Soccer'] },
    { title: 'Riot Games — League of Legends champions', url: 'https://www.leagueoflegends.com/en-us/champions/', franchises: ['League of Legends'] },
    { title: 'Riot Games — Valorant', url: 'https://playvalorant.com/', franchises: ['Valorant'] },
    { title: 'EA — Games', url: 'https://www.ea.com/games', franchises: ['EA SPORTS FC', 'The Sims', 'Need for Speed'] },
    { title: 'Xbox — Forza Horizon 5', url: 'https://www.xbox.com/en-US/games/forza-horizon-5', franchises: ['Forza'] },
    { title: 'Xbox — Age of Empires II', url: 'https://www.ageofempires.com/games/age-of-empires-ii-definitive-edition/', franchises: ['Age of Empires'] },
    { title: 'Activision — Call of Duty', url: 'https://www.callofduty.com/', franchises: ['Call of Duty'] },
    { title: 'Valve — Counter-Strike 2', url: 'https://www.counter-strike.net/cs2', franchises: ['Counter-Strike'] },
    { title: 'Epic Games — Fortnite', url: 'https://www.fortnite.com/', franchises: ['Fortnite'] },
    { title: 'PUBG — Official website', url: 'https://pubg.com/', franchises: ['PUBG'] },
    { title: 'Psyonix — Rocket League', url: 'https://www.rocketleague.com/', franchises: ['Rocket League'] },
    { title: 'The Tetris Company — About Tetris', url: 'https://tetris.com/about-us', franchises: ['Tetris'] }
  ],
  flags: {
    name: 'flag-icons', author: 'Panayiotis Lipiridis', version: flagVersion,
    source: 'https://github.com/lipis/flag-icons', license: 'MIT', licenseUrl: `${flagBase}LICENSE`, licenseText: license.trim(),
    description: 'Yerel bayrak SVG dosyaları sabit sürümden alınmış, özgün kart çerçevesi içine yerleştirilmiştir. Kaynak ve tam MIT bildirimi her SVG içinde korunur.',
    files: countries.map(([, iso]) => ({ iso2: iso.toUpperCase(), source: `${flagBase}flags/4x3/${iso}.svg`, local: `assets/images/countries/${iso}.svg` }))
  }
};
const knownFranchises = new Set(sources.games.flatMap(item => item.franchises));
for (const card of feed['oyun-evreni']) assert.ok(knownFranchises.has(card.evren), `Missing publisher source: ${card.isim}`);
for (const source of sources.games) source.ids = feed['oyun-evreni'].filter(card => source.franchises.includes(card.evren)).map(card => card.id);
await writeFile(new URL('tools/games-geo.json', root), `${JSON.stringify(feed, null, 2)}\n`, 'utf8');
await writeFile(new URL('tools/games-geo-sources.json', root), `${JSON.stringify(sources, null, 2)}\n`, 'utf8');
console.log(`Generated ${cities.length} cities, ${characters.length} characters + ${games.length} games, ${countries.length} flags: 261 cards.`);
