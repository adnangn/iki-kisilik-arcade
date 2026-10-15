// Local, original pixel illustrations. Names identify the cards; scenes and
// colours are playful symbols, rather than copied posters or publicity photos.
const ink = '#4c445a';
const cream = '#f8edce';
const paper = '#efe5cc';
const white = '#fff9e9';
const green = '#829d71';
const darkGreen = '#58785a';
const gold = '#d5ad65';
const palettes = ['#af8bc2', '#7eaaa4', '#d5a35e', '#a0ad77', '#c58e99', '#8cacc6', '#c7b474', '#b4977e', '#a59fc7', '#83a991'];
const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

function titleLines(name) {
  const words = String(name).trim().split(/\s+/u);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > 18) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  if (lines.length <= 3) return lines;
  return [lines[0], lines[1], `${lines.slice(2).join(' ').slice(0, 16)}…`];
}

export function realConsolationArt(name, kind, variant = 0) {
  const safeName = String(name ?? 'Teselli Kartı');
  const index = Number.isFinite(Number(variant)) ? Math.abs(Math.trunc(Number(variant))) : 0;
  const accent = palettes[index % palettes.length];
  const [, family = 'game', motif = 'generic'] = String(kind).split(':');
  const shapes = [];
  const rect = (x, y, w, h, fill = ink) => shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
  const path = (d, fill = ink) => shapes.push(`<path d="${d}" fill="${fill}"/>`);
  const text = (value, x, y, size = 5, fill = ink) => shapes.push(`<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" font-weight="bold" text-anchor="middle" fill="${fill}">${escapeXml(value)}</text>`);
  const star = (x, y, fill = gold) => path(`M${x + 6} ${y}h3v6h6v3h-6v6h-3V${y + 9}h-6V${y + 6}h6z`, fill);
  const sparkle = (x, y, fill = gold) => { rect(x + 3, y, 3, 9, fill); rect(x, y + 3, 9, 3, fill); };
  const plate = () => { rect(20, 64, 56, 5, '#b6aa99'); rect(24, 61, 48, 5, white); };
  const bowl = (fill = accent) => { rect(23, 48, 50, 5); rect(27, 53, 42, 10, fill); rect(32, 62, 32, 5, fill); rect(26, 45, 44, 6, '#c5b184'); };
  const floor = (fill = '#b6c299') => { rect(14, 62, 68, 9, fill); rect(17, 66, 62, 2, '#ffffff55'); };
  const face = (x, y, scale = 1, skin = '#dfb393', hair = '#56423d') => {
    rect(x, y, 12 * scale, 14 * scale, skin);
    rect(x, y - 2 * scale, 12 * scale, 4 * scale, hair);
    rect(x + 2 * scale, y + 5 * scale, 2 * scale, 2 * scale);
    rect(x + 8 * scale, y + 5 * scale, 2 * scale, 2 * scale);
    rect(x + 4 * scale, y + 11 * scale, 4 * scale, scale, '#a67065');
  };
  const person = (x, y, shirt = accent, hair = '#56423d') => {
    rect(x - 2, y + 14, 16, 14, shirt);
    face(x, y, 1, '#dfb393', hair);
    rect(x, y + 28, 5, 6); rect(x + 7, y + 28, 5, 6);
  };
  const school = () => {
    floor('#b1ad9d'); rect(19, 28, 58, 30, '#b3c3a0'); rect(22, 31, 52, 24, '#647f70');
    rect(27, 36, 22, 2, '#e9e5c9'); rect(27, 43, 16, 2, '#e9e5c9'); rect(61, 35, 5, 10, gold);
    for (const x of [24, 53]) { rect(x, 56, 19, 5, '#b18961'); rect(x + 2, 61, 3, 9); rect(x + 14, 61, 3, 9); }
    rect(40, 44, 13, 16, '#d6aa89'); rect(40, 42, 13, 5); rect(44, 49, 2, 2); rect(49, 49, 2, 2);
  };
  const castle = () => {
    floor('#a6b492');
    rect(22, 41, 52, 24, '#a3a0af'); rect(19, 31, 17, 34, '#b3adbb'); rect(60, 31, 17, 34, '#b3adbb');
    for (const x of [19, 29, 60, 70]) rect(x, 27, 7, 8, '#b3adbb');
    rect(40, 48, 16, 17, '#67586d'); rect(44, 44, 8, 8, '#67586d');
    rect(24, 38, 6, 10, '#67586d'); rect(65, 38, 6, 10, '#67586d');
    rect(49, 27, 2, 14); path('M51 27h13l-5 5h-8z', '#b76c79');
  };
  const tv = () => {
    rect(22, 32, 52, 32); rect(25, 35, 39, 25, '#b1c2bc'); rect(67, 38, 4, 4, gold); rect(67, 47, 4, 4, gold);
    rect(28, 64, 4, 5); rect(64, 64, 4, 5); rect(44, 27, 3, 7); path('M44 27l-9-6h5l7 5 7-5h5l-12 8z');
  };

  rect(0, 0, 96, 96, cream); rect(4, 4, 88, 88); rect(7, 7, 82, 82, accent); rect(11, 11, 74, 65, paper);
  const lines = titleLines(safeName);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    text(line, 48, (lines.length === 1 ? 20 : lines.length === 2 ? 16 : 14) + i * 5.4, line.length > 18 ? 4 : 4.7);
  }
  // All drawing helpers below stay inside the card's scene area (y=27..71).
  if (family === 'series') {
    switch (motif) {
      case 'magic': case 'wand':
        floor('#c5b0cc'); rect(21, 44, 29, 23, '#d4b585'); rect(18, 40, 35, 6, '#a47869');
        rect(27, 50, 7, 12, cream); rect(39, 50, 7, 12, cream);
        person(57, 34, '#aa83b6', '#7f584c'); path('M46 56l23-24 3 3-23 24z', '#7b625b');
        sparkle(64, 26); sparkle(50, 30, '#b58cb8'); sparkle(72, 46); break;
      case 'taxi':
        floor('#c7ba9b'); rect(23, 35, 43, 17, '#d5ad65'); rect(31, 31, 27, 7, '#d5ad65');
        rect(18, 47, 60, 15, '#dfbd72'); rect(27, 38, 15, 11, '#b1c9c4'); rect(46, 38, 15, 11, '#b1c9c4');
        rect(23, 57, 11, 11); rect(61, 57, 11, 11); rect(26, 60, 5, 5, '#b0aaa0'); rect(64, 60, 5, 5, '#b0aaa0');
        rect(39, 27, 16, 7, white); text('TAKSI', 47, 32.4, 4); rect(20, 51, 6, 4, white); break;
      case 'doll':
        rect(32, 30, 33, 9, '#ba7b70'); rect(27, 36, 12, 10, '#ba7b70'); rect(59, 36, 12, 10, '#ba7b70');
        face(37, 35, 2, '#e4bd9f', '#ba7b70'); rect(32, 58, 35, 10, '#bf8da8');
        rect(27, 58, 8, 7, '#e4bd9f'); rect(65, 58, 8, 7, '#e4bd9f'); rect(37, 68, 9, 4, '#e4bd9f'); rect(55, 68, 9, 4, '#e4bd9f');
        rect(27, 33, 8, 5, '#a582bc'); rect(63, 33, 8, 5, '#a582bc'); break;
      case 'star':
        rect(15, 52, 66, 18, '#8eafbf'); rect(15, 57, 66, 3, '#b2ccc7');
        path('M48 29l6 12 14 2-11 10 2 14-11-7-12 7 3-14-11-10 14-2z', '#d7b473');
        rect(41, 46, 3, 3); rect(53, 46, 3, 3); rect(45, 54, 6, 2, '#af7b6b'); break;
      case 'group':
        floor('#b6a1c1');
        if (safeName.toLocaleLowerCase('tr-TR').includes('teletabi')) {
          for (let i = 0; i < 4; i++) {
            const x = 17 + i * 17, y = 38 + (i % 2) * 3;
            const suit = ['#9e86b5', '#94b47b', '#d5ba6e', '#ba7a83'][i];
            rect(x - 1, y - 6, 14, 15, suit); rect(x + 4, y - 12, 3, 8, suit);
            rect(x - 3, y + 7, 18, 19, suit); rect(x, y + 26, 5, 6, suit); rect(x + 7, y + 26, 5, 6, suit);
            rect(x + 2, y - 2, 8, 9, '#ddc2a2'); rect(x + 3, y + 13, 7, 7, '#bfc4bb');
          }
        } else for (let i = 0; i < 4; i++) person(18 + i * 17, 36 + (i % 2) * 3, ['#b47fa2', '#85a9a0', '#cfaf72', '#849fc2'][i], ['#bd9466', '#513e3b', '#926a49', '#513e3b'][i]);
        sparkle(72, 27); break;
      case 'hat':
        floor('#a7b397'); rect(34, 54, 29, 15, '#b38aa7'); face(37, 40, 2, '#e2b598', '#775142');
        path('M25 42h48v5H25zM33 41l17-15 12 15z', '#75658e'); rect(49, 31, 5, 9, '#c1a66e');
        rect(66, 49, 3, 19, '#876b51'); rect(61, 64, 13, 5, '#c3a36d'); sparkle(21, 32); break;
      case 'school': school(); break;
      case 'street':
        floor('#b9ba95');
        for (const [x, fill] of [[18, '#ba8f8b'], [52, '#a896be']]) {
          rect(x, 37, 26, 27, fill); path(`M${x - 2} 38l15-12 15 12z`, '#b7946f');
          rect(x + 4, 44, 6, 7, cream); rect(x + 16, 44, 6, 7, cream); rect(x + 10, 54, 7, 10, '#7f7669');
        }
        rect(18, 67, 60, 3, '#e0caa3'); rect(42, 46, 10, 3, '#a17961'); rect(46, 41, 3, 14, '#a17961'); break;
      case 'house':
        floor('#aec09a'); rect(23, 39, 51, 28, '#d6b482'); path('M18 41l31-15 30 15z', '#b48177');
        rect(31, 46, 11, 10, '#a5bfbc'); rect(56, 46, 11, 10, '#a5bfbc'); rect(45, 51, 10, 16, '#94745a');
        rect(46, 28, 3, 6, '#d4b68b'); rect(17, 60, 5, 9, green); rect(75, 57, 5, 12, green); break;
      case 'police':
        floor('#b2b6b4'); rect(25, 38, 39, 17, '#b4c6cb'); rect(20, 49, 57, 15, white);
        rect(29, 40, 13, 11, '#86a8ba'); rect(46, 40, 13, 11, '#86a8ba'); rect(20, 55, 57, 4, '#829cb9');
        rect(28, 60, 11, 10); rect(60, 60, 11, 10); rect(38, 32, 10, 6, '#b87b89'); rect(48, 32, 10, 6, '#7c9ebd'); break;
      case 'explorer':
        floor(); rect(52, 44, 16, 20, '#9f82af'); person(37, 33, '#c28d9f', '#5e443a');
        rect(32, 29, 22, 7, '#5e443a'); rect(32, 34, 6, 15, '#5e443a'); rect(49, 34, 6, 15, '#5e443a');
        rect(34, 59, 20, 5, '#d6ae71'); rect(66, 39, 9, 13, cream); rect(69, 42, 3, 7, green); break;
      case 'blue':
        floor('#b9bfac'); rect(32, 53, 31, 15, '#83aac4'); face(36, 37, 2, '#e4bea1', '#83aac4');
        rect(30, 31, 35, 11, '#83aac4'); rect(35, 27, 24, 8, '#83aac4'); rect(30, 65, 13, 6, '#668ca8'); rect(54, 65, 13, 6, '#668ca8'); break;
      case 'baby':
        floor('#d1bdac'); rect(31, 54, 34, 15, '#94b9c4'); face(34, 33, 2, '#e7c2a2', '#d3b77b');
        rect(39, 28, 14, 5, '#d3b77b'); rect(45, 25, 7, 5, '#d3b77b'); rect(25, 56, 8, 8, '#e7c2a2'); rect(64, 56, 8, 8, '#e7c2a2');
        rect(41, 60, 14, 5, cream); break;
      case 'melon':
        rect(26, 35, 44, 29, '#87a57e'); rect(22, 41, 52, 18, '#87a57e');
        rect(33, 35, 4, 29, '#678965'); rect(47, 35, 4, 29, '#678965'); rect(61, 37, 4, 25, '#678965');
        rect(35, 40, 25, 19, '#d7b5ab'); rect(39, 45, 3, 4); rect(54, 45, 3, 4); rect(44, 53, 8, 2);
        rect(44, 29, 3, 7, '#678965'); rect(47, 27, 7, 3, '#678965'); rect(31, 64, 9, 5, '#d4b574'); rect(57, 64, 9, 5, '#d4b574'); break;
      case 'plane':
        rect(37, 34, 22, 27, '#bb7b7f'); rect(32, 40, 32, 15, '#bb7b7f');
        path('M37 43l-19 10v6h24zM59 43l19 10v6H54z', '#bb7b7f'); rect(40, 36, 16, 10, '#acc4ca');
        rect(42, 39, 3, 3); rect(51, 39, 3, 3); rect(44, 52, 8, 2, cream); rect(40, 61, 5, 8); rect(51, 61, 5, 8); break;
      case 'penguin':
        floor('#c3d1ce'); rect(32, 38, 33, 29, '#6d819a'); rect(37, 45, 23, 20, white);
        rect(29, 30, 38, 14, '#82a8c0'); rect(34, 27, 28, 8, '#82a8c0'); rect(33, 38, 31, 8, '#d4b36b');
        rect(37, 39, 8, 6, '#8dabb5'); rect(51, 39, 8, 6, '#8dabb5'); rect(43, 46, 12, 5, '#d4b36b'); rect(31, 66, 15, 5, '#d4b36b'); rect(52, 66, 15, 5, '#d4b36b'); break;
      case 'bear':
        floor(); rect(28, 31, 10, 10, '#b08a63'); rect(58, 31, 10, 10, '#b08a63'); rect(29, 36, 38, 27, '#bc9a73');
        rect(24, 54, 48, 16, '#bc9a73'); rect(38, 46, 20, 15, '#dac6a2'); rect(36, 42, 4, 4); rect(56, 42, 4, 4); rect(45, 48, 7, 5); rect(44, 56, 9, 2); break;
      case 'friends':
        floor(); person(27, 35, '#b8b878', '#d5b76a'); person(54, 36, '#829eaf', '#4e403d');
        rect(22, 29, 22, 9, '#d5b76a'); rect(23, 34, 6, 14, '#d5b76a'); rect(39, 34, 6, 14, '#d5b76a');
        rect(52, 29, 19, 9, '#4e403d'); rect(58, 25, 6, 8, '#4e403d'); break;
      default: tv(); sparkle(65, 27); break;
    }
  } else if (family === 'film') {
    switch (motif) {
      case 'western': case 'cowboy':
        floor('#c7b082'); rect(17, 40, 4, 23, '#8b9d6d'); rect(14, 48, 3, 9, '#8b9d6d'); rect(21, 44, 4, 9, '#8b9d6d');
        person(42, 40, '#af8063'); rect(32, 36, 33, 5, '#896a50'); rect(39, 29, 19, 9, '#896a50');
        rect(46, 57, 5, 6, gold); rect(68, 31, 9, 9, gold); break;
      case 'castle': case 'keloglan':
        castle(); face(37, 43, 1, '#e2bb9b', '#e2bb9b'); rect(34, 57, 20, 13, '#b27868');
        rect(58, 47, 3, 21, '#a3aab4'); rect(54, 55, 11, 3, gold); break;
      case 'school': school(); rect(59, 47, 7, 4, '#b2756d'); break;
      case 'space':
        rect(14, 27, 68, 43, '#6c748f'); sparkle(20, 31, '#e3d59f'); sparkle(68, 33, '#e3d59f'); rect(30, 29, 3, 3, white);
        path('M46 35h8v5h5v16h-5v6H42v-6h-5V40h5v-5z', '#d3d7cf'); rect(42, 42, 12, 10, '#89adb8');
        rect(40, 60, 6, 7, '#c88d69'); rect(50, 60, 6, 7, '#c88d69'); rect(19, 62, 61, 8, '#a59fac');
        rect(65, 52, 10, 5, '#d3bb77'); rect(62, 56, 16, 4, '#d3bb77'); break;
      case 'recep': case 'beard':
        floor('#c4b7a0'); rect(27, 55, 43, 16, '#a16e68'); face(34, 31, 2, '#d2a17c', '#463c3a');
        rect(34, 48, 24, 13, '#463c3a'); rect(40, 49, 12, 5, '#d2a17c'); rect(38, 33, 20, 3, '#463c3a');
        rect(28, 58, 5, 10, '#e1b07c'); rect(54, 59, 5, 11, '#e1b07c'); break;
      case 'kolpacino': case 'casino': case 'dice':
        floor('#aaa48b'); rect(17, 47, 62, 20, '#628f7b'); rect(21, 49, 54, 14, '#8cb19a');
        rect(31, 35, 16, 21, white); rect(48, 32, 16, 21, '#ede5d0'); text('A', 39, 47, 9, '#ac6e76'); text('K', 56, 44, 9);
        rect(25, 58, 10, 5, '#b97f8e'); rect(61, 56, 9, 6, '#c5b273');
        if (motif === 'dice') { rect(36, 49, 12, 12, cream); rect(39, 52, 2, 2); rect(43, 56, 2, 2); rect(51, 52, 11, 11, cream); rect(53, 54, 2, 2); rect(58, 54, 2, 2); rect(55, 59, 2, 2); } break;
      case 'ceber': case 'cumali':
        floor('#b1c19d'); rect(28, 56, 41, 15, '#ab8464'); face(35, 31, 2, '#d9ae89', '#53463e');
        rect(38, 43, 3, 5); rect(51, 43, 3, 5); rect(40, 52, 16, 4, '#715344'); rect(27, 29, 12, 6, '#8c9871');
        rect(18, 52, 8, 12, '#d5b06d'); rect(20, 48, 4, 5, '#d5b06d'); break;
      case 'water':
        floor('#b9b4b8'); rect(40, 27, 17, 7, '#7195ad'); rect(36, 34, 25, 8, '#91b6c5');
        rect(29, 42, 40, 23, '#91b6c5'); rect(33, 39, 32, 29, '#91b6c5'); rect(34, 45, 30, 4, '#a9c6cf'); rect(34, 58, 30, 4, '#a9c6cf');
        rect(38, 50, 23, 7, cream); text('SU', 49, 55.5, 6, '#7898ab'); rect(72, 38, 3, 19, '#b49665'); rect(67, 44, 13, 3, '#b49665'); break;
      case 'camera':
        floor('#b7acbd'); person(31, 36, '#8a9cae'); rect(48, 43, 26, 17); rect(45, 47, 6, 9, '#a9aaa0');
        rect(53, 47, 10, 10, '#8ba5b0'); rect(56, 50, 4, 4, '#c1d1cf'); rect(65, 46, 6, 3, '#c88d91'); rect(55, 60, 3, 10); break;
      case 'broom':
        floor('#b6ba9d'); person(31, 35, '#9b8b78'); path('M59 33h4l-6 30h-4z', '#a8895e');
        path('M50 59h13l5 11H44z', '#ceb27d'); rect(49, 64, 3, 6, '#ac8d5f'); rect(57, 64, 3, 6, '#ac8d5f'); rect(25, 31, 21, 7, '#8e6f56'); break;
      case 'hero':
        floor('#a3b5bd'); path('M37 43L24 69h43L57 43z', '#b77e86'); rect(36, 51, 25, 18, '#8b9fb7'); face(37, 30, 2, '#d7ad8a', '#5e4640');
        rect(43, 54, 12, 9, '#b77e86'); rect(47, 56, 5, 5, cream); rect(50, 56, 3, 5, '#b77e86'); rect(39, 67, 7, 4); rect(53, 67, 7, 4); break;
      default:
        rect(24, 34, 48, 32); rect(27, 40, 42, 23, '#bba3b9');
        for (let i = 0; i < 4; i++) { path(`M${27 + i * 11} 34h7l-4 6h-7z`, cream); }
        path('M43 46l13 6-13 6z', white); rect(35, 28, 25, 4, gold); break;
    }
  } else if (family === 'singer') {
    rect(14, 28, 68, 43, '#b8a3bd'); rect(14, 28, 9, 35, '#967d9d'); rect(73, 28, 9, 35, '#967d9d');
    rect(23, 65, 50, 6, '#8f7e8d'); rect(30, 55, 37, 14, ['#b16b82', '#6f8e9f', '#af9362', '#87976d'][index % 4]);
    const hair = motif.includes('blond') ? '#c6a572' : motif.includes('red') ? '#a36e53' : '#51413f';
    face(36, 32, 2, '#dcb18e', hair);
    if (motif.includes('long') || motif.includes('curly')) {
      rect(31, 30, 8, 28, hair); rect(57, 30, 8, 28, hair);
      if (motif.includes('curly')) { for (const [x, y] of [[30, 29], [35, 25], [45, 25], [56, 26], [61, 34], [30, 44], [60, 48]]) rect(x, y, 7, 7, hair); }
    } else if (motif.includes('spike')) {
      for (let i = 0; i < 5; i++) rect(35 + i * 5, 26 + i % 2 * 3, 4, 6, hair);
    } else if (motif.includes('bald')) rect(36, 28, 24, 7, '#dcb18e');
    else { rect(34, 27, 27, 8, hair); rect(34, 32, 5, 9, hair); }
    rect(60, 48, 5, 20, '#776c70'); rect(57, 43, 10, 9); rect(59, 44, 6, 6, '#a6aaa4');
    rect(27, 39, 3, 9, gold); rect(24, 45, 5, 3, gold); rect(68, 32, 3, 9, gold); rect(65, 38, 5, 3, gold);
  } else if (family === 'vegetable') {
    plate();
    switch (motif) {
      case 'leek':
        for (const [x, y, h] of [[30, 37, 22], [42, 32, 27], [54, 37, 22]]) { rect(x, y, 8, h, '#e7e4c1'); rect(x, y - 9, 8, 12, green); rect(x - 3, y - 11, 5, 10, darkGreen); }
        break;
      case 'okra':
        for (const [x, y] of [[27, 39], [42, 33], [56, 40], [36, 48]]) { path(`M${x} ${y}h8l3 18-7 5-4-11z`, green); rect(x + 2, y - 3, 4, 6, darkGreen); rect(x + 3, y + 5, 2, 12, '#a5ba7d'); } break;
      case 'cabbage':
        rect(29, 36, 38, 26, '#a7bb83'); rect(33, 31, 30, 35, '#a7bb83'); rect(25, 43, 46, 13, '#a7bb83');
        path('M33 36l11 7-5 16h3l7-15 10-8h-5l-8 6-9-6z', '#728e64'); rect(48, 47, 3, 15, '#728e64'); rect(55, 53, 10, 3, '#728e64'); break;
      case 'sprouts':
        for (const [x, y] of [[28, 36], [48, 32], [42, 49]]) { rect(x, y + 3, 19, 15, green); rect(x + 4, y, 11, 21, green); rect(x + 5, y + 4, 10, 12, '#acc28b'); rect(x + 9, y + 5, 2, 12, darkGreen); rect(x + 3, y + 10, 14, 2, darkGreen); } break;
      case 'cauliflower':
        path('M25 56l7-12 12 5 8-6 17 13-8 8H33z', darkGreen);
        for (const [x, y] of [[30, 39], [40, 31], [52, 37], [36, 46], [49, 46]]) { rect(x, y, 16, 16, '#e8e3c7'); rect(x + 4, y - 3, 8, 22, '#e8e3c7'); rect(x + 5, y + 4, 3, 4, '#cfc9ab'); } break;
      case 'broccoli':
        rect(42, 48, 12, 14, '#a6bc7c'); path('M42 52l-9-12 5-3 10 12 10-12 5 3-9 14z', '#a6bc7c');
        for (const [x, y] of [[24, 34], [38, 28], [53, 34]]) { rect(x, y, 19, 16, green); rect(x + 4, y - 3, 11, 22, green); rect(x + 5, y + 3, 4, 4, darkGreen); } break;
      case 'celery':
        bowl('#b3956c'); rect(33, 40, 27, 18, '#ded6b2'); rect(37, 36, 19, 24, '#ded6b2');
        rect(42, 27, 5, 12, green); path('M44 32l-8-5h-7v5l14 5 14-6v-6h-7z', green); rect(36, 46, 4, 4, '#bea877'); rect(52, 50, 4, 4, '#bea877'); break;
      case 'chard':
        for (const [x, y] of [[27, 35], [42, 30], [55, 38]]) { path(`M${x} ${y}h13l5 12-8 12-11-4-3-11z`, green); rect(x + 6, y + 7, 3, 25, '#b9c58e'); path(`M${x + 6} ${y + 16}l-6-6v-3l8 7 7-7v4z`, darkGreen); } break;
      case 'radish':
        for (const [x, y] of [[27, 43], [46, 45]]) { rect(x, y, 19, 16, '#c17b8d'); rect(x + 3, y + 13, 13, 6, '#e8d8cb'); rect(x + 8, y + 18, 4, 4, white); path(`M${x + 8} ${y}l-5-12h5l4 9 6-10h4l-6 13z`, green); } break;
      case 'onion':
        for (const [x, y, color] of [[28, 42, '#d8cba5'], [48, 38, '#c4b18b']]) {
          rect(x, y + 4, 20, 15, color); rect(x + 4, y, 12, 24, color); rect(x + 8, y - 5, 4, 8, '#b69e79');
          rect(x + 6, y + 4, 2, 14, '#b6a47d'); rect(x + 12, y + 4, 2, 14, '#b6a47d'); rect(x + 8, y + 22, 4, 3, '#a1845e');
        } break;
      case 'potato':
        for (const [x, y] of [[27, 41], [47, 34], [46, 50]]) { rect(x, y, 20, 14, '#d6c095'); rect(x + 3, y - 3, 14, 20, '#d6c095'); rect(x + 5, y + 4, 3, 2, '#ae966e'); rect(x + 12, y + 8, 3, 2, '#ae966e'); } break;
      case 'turnip':
        bowl('#a4b18a'); rect(34, 39, 26, 20, '#d8c1cc'); rect(38, 36, 18, 8, '#af839e');
        rect(39, 29, 4, 9, green); rect(49, 27, 4, 11, green); rect(37, 49, 19, 6, white); break;
      default: bowl(green); rect(34, 37, 28, 12, green); rect(38, 33, 19, 18, green); break;
    }
  } else if (family === 'dessert') {
    plate();
    if (['pelte', 'hosmerim', 'pudding', 'paluze', 'zerde', 'asure', 'bowl', 'porridge', 'grape'].includes(motif)) {
      bowl(['zerde', 'hosmerim'].includes(motif) ? '#cca84c' : '#bb9674');
      rect(27, 43, 42, 7, motif === 'grape' ? '#9f7b98' : motif === 'zerde' ? '#d9b866' : motif === 'paluze' ? '#d6bf88' : '#dac8a2');
      for (const [x, y] of [[33, 45], [46, 42], [59, 46]]) rect(x, y, 4, 3, '#8f7952');
      if (motif === 'grape') { rect(32, 35, 7, 6, '#8e698b'); rect(39, 36, 7, 6, '#9f7b98'); rect(35, 40, 7, 5, '#8e698b'); rect(38, 30, 3, 6, green); }
    } else if (['helva', 'tahin', 'flour', 'irmik', 'semolina'].includes(motif)) {
      rect(28, 45, 39, 17, '#b49b75'); rect(33, 38, 29, 11, '#c6ae87'); rect(40, 34, 15, 10, '#c6ae87');
      if (safeName.toLocaleLowerCase('tr-TR').includes('pirinç')) { rect(28, 45, 39, 17, '#dfd9b5'); rect(33, 38, 29, 11, '#e9e3c6'); rect(40, 34, 15, 10, '#e9e3c6'); }
      for (const [x, y] of [[34, 46], [46, 39], [57, 50]]) rect(x, y, 4, 3, '#9e805f');
    } else if (motif === 'jelly') {
      rect(29, 39, 38, 24, '#ba8b7a'); rect(34, 32, 28, 10, '#d1ab85'); rect(38, 29, 20, 8, '#d1ab85');
      rect(34, 42, 4, 15, '#e6c3a0'); rect(43, 38, 3, 20, '#c29983'); rect(56, 42, 4, 15, '#c29983');
    } else if (motif === 'fruit' || motif === 'carrot') {
      rect(27, 44, 44, 17, '#c79a68'); rect(31, 40, 36, 7, '#d6ae7a');
      for (const x of [34, 47, 60]) { rect(x, 43, 2, 18, '#9d7753'); rect(x - 3, 47, 2, 2, '#e1c798'); }
      if (motif === 'carrot') { path('M26 32h9l-4 12z', '#c29165'); rect(29, 27, 3, 6, green); rect(25, 28, 4, 3, green); }
    } else if (motif === 'bread') {
      rect(28, 38, 39, 23, '#bb9568'); rect(32, 34, 31, 31, '#bb9568'); rect(32, 39, 31, 21, '#e3cc99');
      for (const [x, y] of [[37, 42], [50, 45], [57, 53], [42, 55], [57, 41], [35, 50]]) rect(x, y, 3, 3, white);
    } else {
      rect(28, 39, 40, 24, '#c4a480'); rect(28, 38, 40, 5, '#e2cf9f'); rect(28, 50, 40, 4, '#9f7a5f');
      rect(33, 43, 4, 14, '#e2cf9f'); rect(56, 43, 4, 14, '#e2cf9f');
    }
  } else if (family === 'drink') {
    const colours = { salgam: '#885472', boza: '#d5bc86', kefir: '#e3dfc9', soda: '#b9d1bd', water: '#b6ccc4', ayran: '#e8e2cc', tea: '#a77a50', vinegar: '#b6905c', pickle: '#aab57c', tomato: '#b57868', turnip: '#885472', milk: '#e3dfc9', green: '#9eaf7b', pink: '#c58ea4', beet: '#a16c86', cucumber: '#b3c396', fennel: '#c3bd8e', hibiscus: '#b17d99', grape: '#a086a3' };
    const liquid = colours[motif] || accent;
    rect(34, 30, 28, 39); rect(37, 33, 22, 33, '#e2dec7'); rect(38, 43, 20, 22, liquid);
    rect(40, 45, 3, 17, '#ffffff66'); rect(33, 68, 31, 3, '#b1a58d');
    if (['tea', 'boza', 'kefir', 'milk'].includes(motif)) { rect(62, 39, 10, 19); rect(65, 42, 4, 13, paper); }
    if (['soda', 'water'].includes(motif)) { rect(47, 48, 3, 3, white); rect(52, 57, 3, 3, white); rect(48, 36, 3, 3, '#c4d5cb'); }
    if (motif === 'boza') { rect(42, 43, 11, 3, '#967653'); rect(44, 42, 3, 3, '#bda16d'); }
    if (['pickle', 'salgam', 'turnip'].includes(motif)) { rect(22, 54, 8, 13, green); rect(24, 51, 4, 3, green); }
    if (['green', 'fennel', 'tea'].includes(motif)) { rect(22, 42, 3, 25, darkGreen); path('M23 49l-8-7v-4l9 8 7-9v5zM23 59l-7-6v-4l8 6 7-6v4z', green); }
    if (motif === 'pink' || motif === 'beet') { rect(18, 54, 12, 12, motif === 'beet' ? '#a16c86' : '#c58ea4'); rect(22, 49, 3, 6, green); rect(19, 47, 5, 3, green); }
    if (motif === 'cucumber') { rect(18, 50, 13, 15, green); rect(21, 53, 7, 9, '#d5dfb1'); rect(24, 55, 2, 5, green); }
    if (motif === 'hibiscus') { rect(23, 52, 3, 15, green); rect(18, 49, 14, 5, '#c28a9c'); rect(23, 44, 5, 15, '#c28a9c'); rect(23, 50, 5, 4, gold); }
    if (motif === 'grape') { for (const [x, y] of [[18, 52], [24, 52], [21, 57], [24, 61]]) rect(x, y, 6, 6, '#92718e'); rect(24, 47, 3, 5, green); }
  } else if (family === 'game' && ['goat', 'bread', 'hammer', 'runner', 'bird', 'octopus', 'goose', 'human', 'rat', 'rabbit', 'goomba', 'turtle', 'fish', 'fighter', 'waluigi', 'toad', 'duck', 'frog', 'tingle', 'paimon'].includes(motif)) {
    floor('#b4c19f');
    switch (motif) {
      case 'goat':
        rect(25, 45, 35, 16, '#b7b6aa'); rect(52, 35, 16, 20, '#c8c7b7'); rect(60, 43, 13, 8, '#c8c7b7');
        rect(57, 30, 4, 7, '#947e60'); rect(65, 29, 4, 9, '#947e60'); rect(62, 39, 3, 3); rect(64, 51, 3, 7, '#a9a594');
        for (const x of [29, 39, 50, 56]) rect(x, 60, 4, 10, '#9b9d94'); rect(19, 42, 7, 4, '#b7b6aa'); break;
      case 'bread':
        rect(29, 37, 38, 26, '#bb9260'); rect(34, 31, 28, 38, '#bb9260'); rect(34, 38, 28, 24, '#e4cb98');
        rect(39, 46, 3, 3); rect(54, 46, 3, 3); rect(44, 55, 9, 2, '#ac7c63'); rect(22, 51, 8, 4, '#bb9260'); rect(67, 51, 8, 4, '#bb9260'); break;
      case 'hammer':
        rect(30, 52, 36, 16, '#72777a'); rect(34, 49, 28, 5, '#a8a5a1'); face(41, 33, 1, '#d8b18f', '#d8b18f');
        rect(37, 45, 22, 10, '#d8b18f'); path('M54 48l12-15 3 3-12 15z', '#a98b62'); rect(61, 28, 15, 7, '#8a9398');
        rect(17, 60, 8, 11, '#b6ac9c'); rect(20, 55, 10, 7, '#b6ac9c'); break;
      case 'runner':
        face(38, 28, 1, '#9f7961', '#4c413c'); rect(37, 42, 15, 16, '#a9bec8');
        path('M38 56h6l-7 10H24v-4h10zM46 56h6l8 8h12v4H57z', '#9f7961');
        path('M38 44l-11 9-3-3 13-11zM49 44l12-5 2 4-12 6z', '#9f7961'); rect(21, 68, 54, 3, '#d2bc93'); break;
      case 'bird':
        rect(14, 27, 68, 35, '#b7cfcc'); rect(20, 47, 10, 23, green); rect(17, 45, 16, 7, green); rect(67, 27, 10, 18, green); rect(64, 41, 16, 6, green);
        rect(37, 39, 23, 17, '#d9bb71'); rect(33, 44, 13, 8, '#cfa368'); rect(48, 36, 12, 12, white); rect(54, 40, 3, 4); rect(58, 48, 13, 5, '#bd8766'); break;
      case 'octopus':
        rect(36, 30, 25, 21, '#d2aa70'); rect(32, 36, 33, 11, '#d2aa70'); rect(36, 51, 25, 13, '#7d94aa');
        rect(39, 35, 7, 7, white); rect(52, 35, 7, 7, white); rect(42, 37, 3, 4); rect(53, 37, 3, 4); rect(45, 51, 5, 13, '#bc7d83');
        path('M36 57h6v13H26v-5h10zM56 57h5v8h12v5H56zM45 61h5v10h-5z', '#d2aa70'); break;
      case 'goose':
        rect(30, 50, 27, 15, white); rect(48, 37, 9, 23, white); rect(49, 32, 15, 11, white); rect(59, 36, 3, 3);
        rect(64, 38, 12, 4, '#cea36b'); path('M31 52l-11-5v9l12 5z', white); rect(36, 65, 4, 5, '#cea36b'); rect(49, 65, 4, 5, '#cea36b'); rect(33, 69, 10, 3, '#cea36b'); break;
      case 'human':
        rect(38, 29, 20, 18, '#e9e6d8'); rect(34, 47, 28, 16, '#e9e6d8'); rect(39, 61, 7, 10, '#e9e6d8'); rect(52, 61, 7, 10, '#e9e6d8');
        path('M34 49l-12-5-2 5 14 7zM62 49l10-11 4 3-14 15z', '#e9e6d8'); rect(42, 36, 3, 3, '#9c9d96'); rect(52, 36, 3, 3, '#9c9d96'); break;
      case 'rat':
        rect(30, 48, 32, 15, '#9b9e99'); rect(51, 41, 17, 17, '#9b9e99'); rect(53, 36, 8, 9, '#ae9495'); rect(63, 47, 3, 3); rect(66, 53, 8, 4, '#c19697');
        path('M31 58H20v-9h-5v15h17z', '#bd9994'); rect(37, 62, 8, 5, '#bd9994'); rect(55, 60, 8, 5, '#bd9994'); break;
      case 'rabbit':
        rect(35, 27, 8, 18, '#b3c68b'); rect(52, 27, 8, 18, '#b3c68b'); rect(33, 42, 30, 19, '#b3c68b'); rect(39, 60, 20, 10, '#b3c68b');
        rect(38, 30, 3, 13, '#d6b0b3'); rect(55, 30, 3, 13, '#d6b0b3'); rect(39, 46, 5, 5); rect(53, 46, 5, 5); rect(45, 54, 6, 3, '#c49095'); break;
      case 'goomba':
        path('M31 37h34l9 20-8 7H29l-8-7z', '#a77c5c'); rect(30, 60, 35, 8, '#dbc29a'); rect(24, 66, 20, 5, '#735e50'); rect(54, 66, 20, 5, '#735e50');
        rect(34, 43, 9, 12, white); rect(53, 43, 9, 12, white); rect(39, 46, 4, 8); rect(53, 46, 4, 8); path('M31 41l14 4v-4l-14-5zM51 41v4l14-4v-5z'); break;
      case 'turtle':
        rect(36, 42, 27, 25, green); rect(40, 39, 18, 31, green); rect(42, 46, 15, 14, '#b9c68e'); rect(46, 46, 3, 18, darkGreen);
        rect(32, 29, 19, 20, '#d5bd79'); rect(27, 37, 15, 9, '#d5bd79'); rect(39, 33, 5, 7, white); rect(42, 34, 2, 5); rect(28, 65, 15, 6, '#a78d62'); rect(58, 64, 14, 7, '#a78d62'); break;
      case 'fish':
        rect(28, 41, 36, 21, '#cf976e'); rect(35, 35, 23, 32, '#cf976e'); path('M29 48l-12-9v24l12-9z', '#d0b87a');
        rect(49, 42, 11, 12, white); rect(55, 46, 4, 5); rect(63, 51, 7, 7, '#e6d5ac'); path('M41 35l5-9 9 9zM40 64l8 7 8-7z', '#d0b87a'); rect(37, 49, 6, 8, '#d0b87a'); break;
      case 'fighter':
        face(40, 30, 1, '#d6aa88', '#58433e'); rect(34, 43, 28, 20, '#c194b5'); rect(38, 43, 8, 13, '#dfb595'); rect(34, 56, 28, 4, '#7b6380');
        rect(27, 43, 9, 7, '#d6aa88'); rect(62, 42, 9, 7, '#d6aa88'); rect(34, 63, 10, 7, '#c194b5'); rect(52, 63, 10, 7, '#c194b5'); break;
      case 'waluigi':
        rect(38, 31, 22, 17, '#d9b28e'); rect(40, 26, 20, 8, '#9a82af'); rect(35, 32, 29, 4, '#9a82af');
        rect(48, 38, 19, 5, '#d9b28e'); rect(43, 36, 3, 3); rect(43, 43, 14, 3); rect(37, 48, 25, 16, '#9a82af'); rect(40, 57, 8, 13, '#5e627a'); rect(53, 57, 8, 13, '#5e627a'); break;
      case 'toad':
        rect(25, 34, 46, 19, white); rect(31, 28, 34, 31, white); rect(39, 28, 17, 15, '#b77c84'); rect(25, 39, 9, 10, '#b77c84'); rect(64, 39, 7, 10, '#b77c84');
        rect(37, 51, 23, 12, '#dfbd99'); rect(42, 54, 3, 4); rect(53, 54, 3, 4); rect(34, 63, 29, 7, '#8ea4b9'); rect(40, 63, 15, 7, cream); break;
      case 'duck':
        rect(34, 35, 29, 24, '#d5bc7f'); rect(29, 51, 40, 18, '#d5bc7f'); rect(36, 56, 31, 7, '#caa86d');
        rect(36, 42, 8, 8, white); rect(53, 42, 8, 8, white); rect(39, 44, 3, 3); rect(55, 44, 3, 3); rect(42, 49, 17, 8, '#bda079');
        rect(42, 29, 3, 8); rect(48, 27, 3, 9); rect(54, 30, 3, 7); rect(25, 48, 10, 5, '#d5bc7f'); rect(64, 48, 10, 5, '#d5bc7f'); break;
      case 'frog':
        rect(32, 34, 34, 24, '#9bb283'); rect(29, 30, 14, 13, '#9bb283'); rect(55, 30, 14, 13, '#9bb283');
        rect(33, 32, 7, 8, white); rect(59, 32, 7, 8, white); rect(36, 34, 3, 4); rect(60, 34, 3, 4); rect(38, 48, 23, 2);
        rect(34, 57, 30, 13, '#a3afbf'); rect(44, 58, 10, 9, '#d4bc82'); rect(28, 39, 6, 11, '#858b9a'); rect(66, 39, 5, 11, '#858b9a'); break;
      case 'tingle':
        path('M32 48l16-22 17 22z', '#7c9f72'); rect(34, 47, 29, 22, '#7c9f72'); rect(39, 38, 19, 20, '#dfb591');
        rect(42, 44, 3, 3); rect(52, 44, 3, 3); rect(45, 49, 9, 2, '#a76f6c'); rect(39, 59, 20, 4, '#b7767c'); rect(45, 60, 7, 3, gold); rect(18, 35, 3, 27, '#b5a170'); rect(15, 28, 10, 10, '#bd8d9e'); break;
      case 'paimon':
        rect(32, 34, 32, 21, '#e6e1ce'); rect(28, 40, 9, 19, '#e6e1ce'); rect(60, 40, 9, 19, '#e6e1ce'); rect(38, 42, 22, 18, '#e1bd9e');
        rect(41, 47, 3, 4, '#8098af'); rect(54, 47, 3, 4, '#8098af'); rect(36, 60, 28, 10, '#e8e1cc'); rect(32, 62, 7, 7, '#bb91a2'); rect(61, 62, 7, 7, '#bb91a2');
        rect(38, 28, 22, 3, '#c3a57d'); rect(34, 31, 30, 3, '#c3a57d'); rect(45, 26, 8, 3, '#c3a57d'); sparkle(69, 34, '#c3a57d'); break;
    }
  } else {
    // A recognizable game case/handheld scene is also a useful safe fallback.
    rect(25, 30, 46, 36); rect(29, 34, 38, 24, '#a5baa8'); rect(36, 62, 24, 7, '#8e839b');
    if (motif.includes('football') || motif.includes('soccer')) {
      rect(31, 36, 34, 20, '#88a585'); rect(47, 36, 2, 20, cream); rect(43, 43, 10, 8, cream); rect(46, 45, 4, 4, ink);
    } else if (motif.includes('race')) {
      path('M40 35h17l9 22H30z', '#8c8991'); rect(47, 36, 3, 7, cream); rect(47, 47, 3, 7, cream); rect(39, 46, 7, 9, '#bd7f7f');
    } else if (motif.includes('farm')) {
      rect(31, 46, 34, 10, '#9eb67f'); rect(35, 39, 10, 12, '#c69771'); path('M33 40l7-6 8 6z', '#aa7473'); rect(56, 40, 3, 15, '#a5855f'); rect(51, 36, 12, 8, '#73966b');
    } else { rect(36, 43, 9, 3); rect(39, 40, 3, 9); rect(56, 41, 4, 4, '#b57e8d'); rect(52, 48, 4, 4, '#bbab6e'); }
    rect(16, 48, 6, 16, gold); rect(74, 44, 5, 20, gold);
  }
  rect(13, 78, 70, 8, cream); text('TESELLI', 48, 85, 7);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" shape-rendering="crispEdges" role="img" aria-label="${escapeXml(safeName)}"><title>${escapeXml(safeName)}</title>${shapes.join('')}</svg>\n`;
}
