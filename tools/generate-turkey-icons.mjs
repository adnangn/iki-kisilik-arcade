import {mkdir,readFile,writeFile} from 'node:fs/promises';

// Original pixel portraits in symbolic historical Turkish club colours.
// A historical association is never a claim about the player's current club.
// Existing 5001–5050 identities are preserved; 5051–5120 are new identities.
const turkishDefinitions = [
  ['lefter', 'Lefter Küçükandonyadis', 'FV', "Fenerbahçe", 10, 'side', 'olive', 'moustache'],
  ['metin-oktay', 'Metin Oktay', 'FV', "Galatasaray", 10, 'side', 'olive', 'clean'],
  ['can-bartu', 'Can Bartu', 'OF', "Fenerbahçe", 10, 'side', 'light', 'clean'],
  ['turgay-seren', 'Turgay Şeren', 'KL', "Galatasaray", 1, 'side', 'light', 'clean'],
  ['senol-gunes', 'Şenol Güneş', 'KL', "Trabzonspor", 1, 'side', 'olive', 'moustache'],
  ['yasin-ozdenak', 'Yasin Özdenak', 'KL', "Galatasaray", 1, 'long-side', 'light', 'moustache'],
  ['rustu-recber', 'Rüştü Reçber', 'KL', "Fenerbahçe", 1, 'ponytail', 'olive', 'goatee'],
  ['volkan-demirel', 'Volkan Demirel', 'KL', "Fenerbahçe", 1, 'short', 'olive', 'beard'],
  ['tanju-colak', 'Tanju Çolak', 'FV', "Galatasaray", 9, 'curls', 'olive', 'moustache'],
  ['aykut-kocaman', 'Aykut Kocaman', 'FV', "Fenerbahçe", 11, 'curls', 'light', 'clean'],
  ['feyyaz-ucar', 'Feyyaz Uçar', 'FV', "Beşiktaş", 9, 'curls', 'olive', 'moustache'],
  ['hakan-sukur', 'Hakan Şükür', 'FV', "Galatasaray", 9, 'short', 'olive', 'clean'],
  ['ridvan-dilmen', 'Rıdvan Dilmen', 'OF', "Fenerbahçe", 10, 'long-curls', 'olive', 'clean'],
  ['sergen-yalcin', 'Sergen Yalçın', 'OF', "Beşiktaş", 10, 'curls', 'light', 'clean'],
  ['oguz-cetin', 'Oğuz Çetin', 'OF', "Fenerbahçe", 10, 'curls', 'olive', 'moustache'],
  ['tugay-kerimoglu', 'Tugay Kerimoğlu', 'OF', "Galatasaray", 5, 'centre', 'olive', 'clean'],
  ['hami-mandirali', 'Hami Mandıralı', 'FV', "Trabzonspor", 10, 'side', 'olive', 'moustache'],
  ['fatih-tekke', 'Fatih Tekke', 'FV', "Trabzonspor", 9, 'long-side', 'olive', 'goatee'],
  ['ertugrul-saglam', 'Ertuğrul Sağlam', 'FV', "Beşiktaş", 9, 'curls', 'light', 'clean'],
  ['arif-erdem', 'Arif Erdem', 'FV', "Galatasaray", 7, 'short', 'olive', 'clean'],
  ['ilhan-mansiz', 'İlhan Mansız', 'FV', "Beşiktaş", 17, 'top-knot', 'olive', 'goatee'],
  ['nihat-kahveci', 'Nihat Kahveci', 'FV', "Beşiktaş", 8, 'spikes', 'olive', 'stubble'],
  ['tuncay-sanli', 'Tuncay Şanlı', 'FV', "Fenerbahçe", 17, 'spikes', 'olive', 'stubble'],
  ['burak-yilmaz', 'Burak Yılmaz', 'FV', "Trabzonspor", 17, 'short', 'olive', 'beard'],
  ['semih-senturk', 'Semih Şentürk', 'FV', "Fenerbahçe", 9, 'spikes', 'light', 'stubble'],
  ['umit-karan', 'Ümit Karan', 'FV', "Galatasaray", 9, 'centre', 'olive', 'goatee'],
  ['hasan-sas', 'Hasan Şaş', 'OF', "Galatasaray", 11, 'buzz', 'olive', 'clean'],
  ['okan-buruk', 'Okan Buruk', 'OF', "Galatasaray", 7, 'centre', 'olive', 'clean'],
  ['emre-belozoglu', 'Emre Belözoğlu', 'OF', "Fenerbahçe", 5, 'spikes', 'olive', 'clean'],
  ['arda-turan', 'Arda Turan', 'OF', "Galatasaray", 10, 'sweep', 'olive', 'beard'],
  ['hamit-altintop', 'Hamit Altıntop', 'OF', "Galatasaray", 22, 'short', 'olive', 'stubble'],
  ['gokdeniz-karadeniz', 'Gökdeniz Karadeniz', 'OF', "Trabzonspor", 7, 'short', 'olive', 'stubble'],
  ['mehmet-aurelio', 'Mehmet Aurélio', 'OF', "Fenerbahçe", 6, 'buzz', 'brown', 'clean'],
  ['mehmet-topal', 'Mehmet Topal', 'OF', "Fenerbahçe", 15, 'short', 'olive', 'beard'],
  ['selcuk-inan', 'Selçuk İnan', 'OF', "Galatasaray", 8, 'sweep', 'olive', 'stubble'],
  ['tayfun-korkut', 'Tayfun Korkut', 'OF', "Fenerbahçe", 8, 'centre', 'olive', 'clean'],
  ['tumer-metin', 'Tümer Metin', 'OF', "Beşiktaş", 10, 'long-side', 'olive', 'stubble'],
  ['bulent-korkmaz', 'Bülent Korkmaz', 'DF', "Galatasaray", 3, 'short', 'olive', 'clean'],
  ['alpay-ozalan', 'Alpay Özalan', 'DF', "Beşiktaş", 5, 'short', 'olive', 'clean'],
  ['ogun-temizkanoglu', 'Ogün Temizkanoğlu', 'DF', "Trabzonspor", 4, 'curls', 'olive', 'moustache'],
  ['umit-ozat', 'Ümit Özat', 'DF', "Fenerbahçe", 16, 'short', 'light', 'clean'],
  ['hakan-unsal', 'Hakan Ünsal', 'DF', "Galatasaray", 20, 'short', 'olive', 'clean'],
  ['hakan-balta', 'Hakan Balta', 'DF', "Galatasaray", 3, 'short', 'olive', 'beard'],
  ['servet-cetin', 'Servet Çetin', 'DF', "Galatasaray", 2, 'short', 'olive', 'stubble'],
  ['fatih-akyel', 'Fatih Akyel', 'DF', "Galatasaray", 2, 'buzz', 'olive', 'clean'],
  ['emre-asik', 'Emre Aşık', 'DF', "Galatasaray", 4, 'side', 'olive', 'clean'],
  ['ibrahim-uzulmez', 'İbrahim Üzülmez', 'DF', "Beşiktaş", 3, 'receding', 'olive', 'clean'],
  ['gokhan-gonul', 'Gökhan Gönül', 'DF', "Fenerbahçe", 7, 'short', 'olive', 'stubble'],
  ['sabri-sarioglu', 'Sabri Sarıoğlu', 'DF', "Galatasaray", 22, 'spikes', 'olive', 'clean'],
  ['ibrahim-toraman', 'İbrahim Toraman', 'DF', "Beşiktaş", 4, 'sweep', 'olive', 'stubble'],
];

const additions = [
  ['ibrahima-yattara', 'İbrahima Yattara', 'OF', 'Trabzonspor', 61, 'blond-short', 'deep', 'smile'],
  ['didier-drogba', 'Didier Drogba', 'FV', 'Galatasaray', 11, 'band-long', 'deep', 'clean'],
  ['gheorghe-hagi', 'Gheorghe Hagi', 'OF', 'Galatasaray', 10, 'curls', 'olive', 'clean'],
  ['alex-de-souza', 'Alex de Souza', 'OF', 'Fenerbahçe', 10, 'receding', 'light', 'clean'],
  ['roberto-carlos', 'Roberto Carlos', 'DF', 'Fenerbahçe', 3, 'bald', 'brown', 'clean'],
  ['nicolas-anelka', 'Nicolas Anelka', 'FV', 'Fenerbahçe', 39, 'buzz', 'deep', 'goatee'],
  ['pierre-van-hooijdonk', 'Pierre van Hooijdonk', 'FV', 'Fenerbahçe', 17, 'long-curls', 'brown', 'clean'],
  ['jay-jay-okocha', 'Jay-Jay Okocha', 'OF', 'Fenerbahçe', 10, 'buzz', 'dark', 'smile'],
  ['haim-revivo', 'Haim Revivo', 'OF', 'Fenerbahçe', 10, 'centre', 'olive', 'clean'],
  ['daniel-guiza', 'Daniel Güiza', 'FV', 'Fenerbahçe', 9, 'spikes', 'olive', 'goatee'],
  ['mateja-kezman', 'Mateja Kežman', 'FV', 'Fenerbahçe', 9, 'buzz', 'light', 'stubble'],
  ['moussa-sow', 'Moussa Sow', 'FV', 'Fenerbahçe', 7, 'buzz', 'deep', 'smile'],
  ['emmanuel-emenike', 'Emmanuel Emenike', 'FV', 'Fenerbahçe', 29, 'short', 'deep', 'clean'],
  ['dirk-kuyt', 'Dirk Kuyt', 'FV', 'Fenerbahçe', 11, 'blond-curls', 'light', 'clean'],
  ['robin-van-persie', 'Robin van Persie', 'FV', 'Fenerbahçe', 11, 'short', 'olive', 'stubble'],
  ['nani', 'Nani', 'FV', 'Fenerbahçe', 17, 'short', 'dark', 'stubble'],
  ['deivid-de-souza', 'Deivid de Souza', 'FV', 'Fenerbahçe', 99, 'short', 'brown', 'goatee'],
  ['diego-ribas', 'Diego Ribas', 'OF', 'Fenerbahçe', 10, 'centre', 'light', 'stubble'],
  ['stephen-appiah', 'Stephen Appiah', 'OF', 'Fenerbahçe', 4, 'buzz', 'deep', 'goatee'],
  ['raul-meireles', 'Raul Meireles', 'OF', 'Fenerbahçe', 14, 'mohawk', 'light', 'beard'],
  ['diego-lugano', 'Diego Lugano', 'DF', 'Fenerbahçe', 2, 'long-side', 'light', 'clean'],
  ['bruno-alves', 'Bruno Alves', 'DF', 'Fenerbahçe', 22, 'long-side', 'olive', 'stubble'],
  ['joseph-yobo', 'Joseph Yobo', 'DF', 'Fenerbahçe', 6, 'buzz', 'deep', 'clean'],
  ['edu-dracena', 'Edu Dracena', 'DF', 'Fenerbahçe', 36, 'short', 'light', 'clean'],
  ['atiba-hutchinson', 'Atiba Hutchinson', 'OF', 'Beşiktaş', 13, 'buzz', 'deep', 'stubble'],
  ['ricardo-quaresma', 'Ricardo Quaresma', 'FV', 'Beşiktaş', 7, 'buzz', 'olive', 'goatee'],
  ['guti', 'Guti', 'OF', 'Beşiktaş', 14, 'blond-long', 'light', 'clean'],
  ['demba-ba', 'Demba Ba', 'FV', 'Beşiktaş', 9, 'buzz', 'deep', 'clean'],
  ['mario-gomez', 'Mario Gómez', 'FV', 'Beşiktaş', 33, 'sweep', 'olive', 'stubble'],
  ['vincent-aboubakar', 'Vincent Aboubakar', 'FV', 'Beşiktaş', 9, 'buzz', 'deep', 'clean'],
  ['pascal-nouma', 'Pascal Nouma', 'FV', 'Beşiktaş', 21, 'buzz', 'deep', 'goatee'],
  ['bobo', 'Bobô', 'FV', 'Beşiktaş', 13, 'short', 'olive', 'clean'],
  ['mert-nobre', 'Mert Nobre', 'FV', 'Beşiktaş', 11, 'short', 'olive', 'stubble'],
  ['john-carew', 'John Carew', 'FV', 'Beşiktaş', 10, 'buzz', 'brown', 'goatee'],
  ['daniel-amokachi', 'Daniel Amokachi', 'FV', 'Beşiktaş', 11, 'short', 'deep', 'smile'],
  ['les-ferdinand', 'Les Ferdinand', 'FV', 'Beşiktaş', 9, 'short', 'dark', 'clean'],
  ['filip-holosko', 'Filip Hološko', 'FV', 'Beşiktaş', 37, 'short', 'light', 'clean'],
  ['tomas-sivok', 'Tomáš Sivok', 'DF', 'Beşiktaş', 6, 'short', 'pale', 'stubble'],
  ['josef-de-souza', 'Josef de Souza', 'OF', 'Beşiktaş', 5, 'buzz', 'brown', 'beard'],
  ['fabian-ernst', 'Fabian Ernst', 'OF', 'Beşiktaş', 28, 'blond-side', 'light', 'clean'],
  ['manuel-fernandes', 'Manuel Fernandes', 'OF', 'Beşiktaş', 4, 'short', 'deep', 'stubble'],
  ['claudio-taffarel', 'Cláudio Taffarel', 'KL', 'Galatasaray', 1, 'receding', 'light', 'clean'],
  ['faryd-mondragon', 'Faryd Mondragón', 'KL', 'Galatasaray', 1, 'long-side', 'olive', 'stubble'],
  ['fernando-muslera', 'Fernando Muslera', 'KL', 'Galatasaray', 1, 'side', 'light', 'clean'],
  ['wesley-sneijder', 'Wesley Sneijder', 'OF', 'Galatasaray', 10, 'buzz', 'light', 'clean'],
  ['milan-baros', 'Milan Baroš', 'FV', 'Galatasaray', 15, 'long-side', 'olive', 'goatee'],
  ['harry-kewell', 'Harry Kewell', 'FV', 'Galatasaray', 19, 'long-side', 'light', 'stubble'],
  ['elano-blumer', 'Elano Blumer', 'OF', 'Galatasaray', 9, 'short', 'brown', 'clean'],
  ['umit-davala', 'Ümit Davala', 'DF', 'Galatasaray', 22, 'mohawk', 'olive', 'clean'],
  ['gheorghe-popescu', 'Gheorghe Popescu', 'DF', 'Galatasaray', 6, 'side', 'light', 'clean'],
  ['frank-de-boer', 'Frank de Boer', 'DF', 'Galatasaray', 5, 'side', 'light', 'clean'],
  ['tomas-ujfalusi', 'Tomáš Ujfaluši', 'DF', 'Galatasaray', 17, 'long-side', 'light', 'beard'],
  ['johan-elmander', 'Johan Elmander', 'FV', 'Galatasaray', 9, 'blond-side', 'light', 'stubble'],
  ['lukas-podolski', 'Lukas Podolski', 'FV', 'Galatasaray', 11, 'blond-buzz', 'light', 'clean'],
  ['bafetimbi-gomis', 'Bafétimbi Gomis', 'FV', 'Galatasaray', 18, 'dreads', 'deep', 'clean'],
  ['radamel-falcao', 'Radamel Falcao', 'FV', 'Galatasaray', 9, 'long-side', 'olive', 'clean'],
  ['fernando-reges', 'Fernando Reges', 'OF', 'Galatasaray', 25, 'buzz', 'brown', 'clean'],
  ['felipe-melo', 'Felipe Melo', 'OF', 'Galatasaray', 3, 'buzz', 'brown', 'goatee'],
  ['cassio-lincoln', 'Cássio Lincoln', 'OF', 'Galatasaray', 10, 'band-long', 'brown', 'clean'],
  ['rigobert-song', 'Rigobert Song', 'DF', 'Galatasaray', 4, 'blond-braids', 'deep', 'goatee'],
  ['shota-arveladze', 'Şota Arveladze', 'FV', 'Trabzonspor', 11, 'curls', 'light', 'clean'],
  ['gustavo-colman', 'Gustavo Colman', 'OF', 'Trabzonspor', 20, 'long-side', 'light', 'stubble'],
  ['marek-hamsik', 'Marek Hamšík', 'OF', 'Trabzonspor', 17, 'mohawk', 'light', 'beard'],
  ['anthony-nwakaeme', 'Anthony Nwakaeme', 'FV', 'Trabzonspor', 9, 'shaved', 'deep', 'clean'],
  ['oscar-cardozo', 'Óscar Cardozo', 'FV', 'Trabzonspor', 7, 'short', 'olive', 'clean'],
  ['jose-sosa', 'José Sosa', 'OF', 'Trabzonspor', 8, 'side', 'light', 'stubble'],
  ['pablo-batalla', 'Pablo Batalla', 'OF', 'Bursaspor', 10, 'centre', 'light', 'clean'],
  ['samuel-etoo', 'Samuel Eto’o', 'FV', 'Antalyaspor', 9, 'buzz', 'deep', 'clean'],
  ['edin-visca', 'Edin Višća', 'OF', 'Başakşehir', 7, 'short', 'light', 'stubble'],
  ['franck-ribery', 'Franck Ribéry', 'FV', 'Galatasaray', 7, 'buzz', 'light', 'stubble'],
];


const clubs = {
  'Galatasaray': { shirt: '#e1bd5b', trim: '#b55b52', detail: '#eee4cb', pattern: 'halves', flag: ['#e1bd5b', '#b55b52'] },
  'Fenerbahçe': { shirt: '#e6ca68', trim: '#455c7c', detail: '#eee4cb', pattern: 'stripes', flag: ['#e6ca68', '#455c7c'] },
  'Beşiktaş': { shirt: '#eee8d4', trim: '#444b4d', detail: '#b96058', pattern: 'stripes', flag: ['#eee8d4', '#444b4d'] },
  'Trabzonspor': { shirt: '#72a1b5', trim: '#955b68', detail: '#eee4cb', pattern: 'stripes', flag: ['#72a1b5', '#955b68'] },
  'Bursaspor': { shirt: '#eee8d4', trim: '#639377', detail: '#3d6955', pattern: 'stripes', flag: ['#eee8d4', '#639377'] },
  'Antalyaspor': { shirt: '#eee8d4', trim: '#b96058', detail: '#45514d', pattern: 'stripes', flag: ['#eee8d4', '#b96058'] },
  'Başakşehir': { shirt: '#d99b6a', trim: '#4a668a', detail: '#eee4cb', pattern: 'plain', flag: ['#d99b6a', '#4a668a'] },
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
  if (type === 'blond-curls') type = 'curls';
  if (type === 'blond-braids') type = 'dreads';
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
  if (type === 'shaved') return '';
  if (type === 'blond-short') return rect(32, 18, 32, 8, colour)
    + rect(30, 24, 4, 6, colour) + rect(62, 24, 4, 6, colour)
    + rect(35, 18, 25, 2, shadow) + rect(40, 21, 5, 2, shadow);
  if (type === 'blond-ponytail') type = 'ponytail';
  if (type === 'blond-curls') type = 'curls';
  if (type === 'blond-braids') type = 'dreads';
  if (type === 'mohawk') return rect(43, 12, 10, 15, colour) + rect(40, 18, 16, 7, colour)
    + rect(30, 25, 4, 6, shadow) + rect(62, 25, 4, 6, shadow);
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
  if (!isKeeper && theme.pattern === 'halves') art += rect(48, 56, 18, 36, theme.trim) + rect(61, 57, 13, 17, theme.trim);
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
  const [, name, tag, clubName, number, hair, skinType, face] = definition;
  const theme = clubs[clubName];
  const [skin, skinShade] = skins[skinType];
  const blond = hair.startsWith('blond');
  const hairColour = hair === 'blond-short' ? '#edc85b' : blond ? '#b99c64' : id % 4 === 0 ? '#554b40' : '#3c4140';
  const hairShade = hair === 'blond-short' ? '#ffe18a' : blond ? '#dbc084' : '#676150';
  const browColour = hair === 'blond-short' ? '#3c4140' : hairColour;
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
  if (hair === 'shaved') art += rect(35, 18, 26, 4, skin) + rect(39, 16, 18, 2, skin)
    + rect(37, 19, 13, 2, '#946c54');
  art += hairFront(hair, hairColour, hairShade, skin);
  const browY = id % 3 === 0 ? 32 : 31;
  art += rect(37, browY, 7, 2, browColour) + rect(52, browY, 7, 2, browColour)
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
  if (['alex-de-souza', 'ibrahima-yattara', 'gheorghe-hagi', 'didier-drogba', 'volkan-demirel', 'bulent-korkmaz', 'atiba-hutchinson', 'fernando-muslera'].includes(definition[0])) {
    art += rect(22, 64, 10, 4, '#e8d99f') + rect(23, 65, 8, 2, '#7b8065');
  }
  art += rect(7, 77, 9, 9, '#ece5cd') + rect(10, 80, 3, 3, '#42624f')
    + rect(7, 80, 3, 3, '#42624f') + rect(13, 77, 3, 3, '#42624f');
  if (definition[0] === 'rustu-recber') {
    art += rect(36, 39, 9, 2, '#354240') + rect(51, 39, 9, 2, '#354240');
  }
  if (['ricardo-quaresma', 'raul-meireles', 'felipe-melo'].includes(definition[0])) {
    art += rect(22, 76, 6, 2, '#65554d') + rect(25, 80, 4, 2, '#65554d')
      + rect(66, 76, 6, 2, '#65554d');
  }
  if (definition[0] === 'franck-ribery') art += rect(35, 37, 2, 8, '#bb8a72');
  const label = `${name} — ${clubName} tarihî kulüp renkleriyle temsili piksel portre`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${escapeXml(label)}" shape-rendering="crispEdges"><title>${escapeXml(label)}</title>${art}</svg>\n`;
}

const root = new URL('../', import.meta.url);
const legacy = JSON.parse(await readFile(new URL('tools/expansion-football.json', root), 'utf8'))['turkiye-efsaneleri'];
if (turkishDefinitions.length !== 50 || additions.length !== 70) throw new Error('50 preserved identities and 70 additions are required.');
const definitions = [...turkishDefinitions, ...additions];
const cards = definitions.map((definition, index) => {
  const [slug, isim, etiket, takim] = definition;
  const id = 5001 + index;
  if (index < 50 && (legacy[index].id !== id || legacy[index].isim !== isim)) {
    throw new Error(`Preserved identity changed: ${id}/${isim}`);
  }
  return { id, isim, gorsel: `assets/images/turkish-legends/${slug}.svg`, etiket, takim,
    takimTuru: 'kulup', takimNotu: 'Türkiye kariyerinden tarihî kulüp; güncel takım bilgisi değildir.' };
});
if (new Set(cards.map(card => card.id)).size !== 120 || new Set(cards.map(card => card.isim)).size !== 120) {
  throw new Error('Every card needs one unique preserved or new identity.');
}
const featuredIds = [5051, 5052, 5053, 5054];
// Present the newer Turkish club icons first, recent Turkish players next,
// and the six earliest historical Turkish figures last. IDs never change.
const ordered = [...cards.filter(card => card.id >= 5051), ...cards.filter(card => card.id >= 5007 && card.id <= 5050), ...cards.filter(card => card.id <= 5006)];
if (ordered.slice(0, 4).some((card, index) => card.id !== featuredIds[index])) throw new Error('The requested four preview icons must stay first.');
const directory = new URL('assets/images/turkish-legends/', root);
await mkdir(directory, { recursive: true });
let written = 0;
for (const [index, definition] of definitions.entries()) {
  const svg = portrait(definition, 5001 + index);
  if (/<(?:script|foreignObject)|(?:href|onload)=/i.test(svg)) throw new Error('Only original static SVG primitives are allowed.');
  const path = new URL(`${definition[0]}.svg`, directory);
  let previous;
  try { previous = await readFile(path, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous !== svg) { await writeFile(path, svg, 'utf8'); written++; }
}
await writeFile(new URL('tools/turkey-icons.json', root), JSON.stringify({ 'turkiye-efsaneleri': ordered }, null, 2) + '\n', 'utf8');
console.log(`120 Turkish club icons; IDs 5001–5120, 50 original identities preserved; ${written} portraits written.`);
console.log(`Featured preview: ${ordered.slice(0, 4).map(card => card.isim).join(', ')}`);
console.log(JSON.stringify(Object.fromEntries(['FV', 'OF', 'DF', 'KL'].map(tag => [tag, cards.filter(card => card.etiket === tag).length]))));
