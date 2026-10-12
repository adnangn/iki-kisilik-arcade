import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Original, code-native pixel portraits. The 2026-10-12 official roster/profile
// pages and their masthead art were checked; no Riot image is used at runtime.
// This generator only writes its feed and assets, never veri.json or game state.
const root = new URL('../', import.meta.url);
const agents = [
  ['Astra', 'astra', 'Kontrol Uzmanı', '#956746', '#292937', '#826b9b', '#d2b572', 'braid', 'star'],
  ['Breach', 'breach', 'Öncü', '#d1a079', '#ad714f', '#697d62', '#c99761', 'ginger', 'quake'],
  ['Brimstone', 'brimstone', 'Kontrol Uzmanı', '#c69c7d', '#75665c', '#778590', '#ca9462', 'beret', 'orbit'],
  ['Chamber', 'chamber', 'Gözcü', '#d7b69a', '#695745', '#638799', '#d2b572', 'quiff', 'cards'],
  ['Clove', 'clove', 'Kontrol Uzmanı', '#dbbba8', '#4f5365', '#b593ad', '#9283ae', 'clove', 'butterfly'],
  ['Cypher', 'cypher', 'Gözcü', '#444c56', '#ddd5bc', '#d4cbb6', '#87b9bf', 'hat', 'camera'],
  ['Deadlock', 'deadlock', 'Gözcü', '#d9bba5', '#d5c399', '#d7d2c2', '#9bab79', 'bob', 'wire'],
  ['Fade', 'fade', 'Öncü', '#c7a68f', '#424958', '#67738c', '#b06b72', 'fade', 'eye'],
  ['Gekko', 'gekko', 'Öncü', '#c69c7e', '#b7c97b', '#95aa6b', '#c7b674', 'buzz', 'creature'],
  ['Harbor', 'harbor', 'Kontrol Uzmanı', '#ae805f', '#444849', '#6a9690', '#c5b179', 'harbor', 'wave'],
  ['Iso', 'iso', 'Düellocu', '#d5b49d', '#444758', '#afaabc', '#9a82b6', 'sweep', 'shield'],
  ['Jett', 'jett', 'Düellocu', '#dbbba5', '#dddfe0', '#719caa', '#a9d1cf', 'bun', 'wind'],
  ['KAY/O', 'kay-o', 'Öncü', '#687482', '#495461', '#657785', '#a39ccc', 'robot', 'pulse'],
  ['Killjoy', 'killjoy', 'Gözcü', '#d0b39a', '#535449', '#d6b968', '#7d9b72', 'beanie', 'turret'],
  ['Miks', 'miks', 'Kontrol Uzmanı', '#c89e7f', '#5a4d49', '#cba266', '#aabf75', 'miks', 'sound'],
  ['Neon', 'neon', 'Düellocu', '#bf977d', '#6487af', '#6382a7', '#d9c779', 'neon', 'lightning'],
  ['Omen', 'omen', 'Kontrol Uzmanı', '#343c52', '#6d718e', '#667589', '#92c5ce', 'hood', 'smoke'],
  ['Phoenix', 'phoenix', 'Düellocu', '#94684d', '#423e3c', '#d6d2c2', '#d5a26c', 'phoenix', 'flame'],
  ['Raze', 'raze', 'Düellocu', '#b98962', '#76543f', '#89916b', '#c89564', 'raze', 'boom'],
  ['Reyna', 'reyna', 'Düellocu', '#bd957d', '#575068', '#7b6b88', '#b892b7', 'long-purple', 'orb'],
  ['Sage', 'sage', 'Gözcü', '#d3b59b', '#414944', '#d9d8c7', '#89b9ac', 'ponytail', 'heal'],
  ['Skye', 'skye', 'Öncü', '#d0a77f', '#b88255', '#889d70', '#a3c591', 'braids', 'hawk'],
  ['Sova', 'sova', 'Öncü', '#d3b298', '#d6c695', '#6789a6', '#a2c1ca', 'long-blond', 'bow'],
  ['Tejo', 'tejo', 'Öncü', '#b99072', '#56564b', '#c5b483', '#a0a095', 'tejo', 'drone'],
  ['Veto', 'veto', 'Gözcü', '#916e58', '#3d4244', '#7b8992', '#98c7c8', 'veto', 'mutation'],
  ['Viper', 'viper', 'Kontrol Uzmanı', '#d5b79c', '#444c4d', '#759b7f', '#a7bc78', 'viper', 'toxin'],
  ['Vyse', 'vyse', 'Gözcü', '#aaa9b5', '#575767', '#a1a0b4', '#a79dc7', 'metal', 'rose'],
  ['Waylay', 'waylay', 'Düellocu', '#c99f82', '#c5d8cd', '#c4b56e', '#b5a8cc', 'waylay', 'prism'],
  ['Yoru', 'yoru', 'Düellocu', '#c5a389', '#495977', '#6683a8', '#ce986f', 'spikes', 'rift']
];

const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
const colours = { outline: '#474550', paper: '#ece4ce', light: '#f3ebd7', shadow: '#a89a8d' };

function portrait([name, slug, role, skin, hair, coat, accent, style, power]) {
  const pieces = [];
  const r = (x, y, w, h, fill) => pieces.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
  const p = (points, fill) => pieces.push(`<path d="${points}" fill="${fill}"/>`);
  const blocks = (fill, list) => list.forEach(([x, y, w, h]) => r(x, y, w, h, fill));
  const roleBg = { 'Düellocu': '#e2cdbb', 'Öncü': '#d7ddc6', 'Kontrol Uzmanı': '#dad2e0', 'Gözcü': '#ccdcdd' }[role];
  r(0, 0, 96, 96, colours.outline); r(3, 3, 90, 90, colours.paper);
  r(6, 6, 84, 81, roleBg);
  for (let x = 9; x < 90; x += 8) r(x, 7, 1, 79, '#d1c9ba');
  for (let y = 10; y < 86; y += 8) r(7, y, 81, 1, '#d1c9ba');
  // Compact ability silhouettes frame the portrait instead of covering the face.
  r(8, 13, 16, 16, colours.paper); r(10, 15, 12, 12, accent);
  r(72, 43, 16, 28, accent); r(74, 45, 12, 24, colours.paper);
  const glyph = {
    star: [[78,48,4,18],[72,55,16,4]], quake: [[75,50,5,5],[79,55,5,5],[75,60,5,5]],
    orbit: [[76,48,8,3],[74,52,3,12],[76,64,8,3],[84,52,3,12]], cards: [[76,48,7,14],[78,52,7,14]],
    butterfly: [[74,50,5,6],[81,50,5,6],[77,56,6,6]], camera: [[75,49,10,6],[78,54,4,9]],
    wire: [[74,50,12,2],[74,55,12,2],[74,60,12,2]], eye: [[74,54,12,5],[78,50,4,13]],
    creature: [[75,50,9,10],[73,47,4,5],[82,47,4,5]], wave: [[74,51,6,3],[79,54,7,3],[74,60,7,3]],
    shield: [[75,49,10,3],[74,52,3,10],[83,52,3,10],[77,62,6,3]], wind: [[74,51,11,2],[78,56,8,2],[74,61,9,2]],
    pulse: [[74,56,4,3],[77,51,3,11],[80,55,5,3]], turret: [[75,50,10,5],[78,55,4,10],[75,64,10,2]],
    sound: [[74,54,3,6],[78,50,3,14],[82,53,3,8]], lightning: [[80,48,5,6],[77,54,5,5],[75,59,5,6]],
    smoke: [[75,48,7,5],[78,53,7,6],[74,59,9,6]], flame: [[79,49,3,5],[76,54,8,9],[79,62,3,3]],
    boom: [[77,48,6,3],[74,53,12,9],[77,63,6,3]], orb: [[77,49,6,3],[74,52,12,10],[77,62,6,3]],
    heal: [[78,50,4,14],[73,55,14,4]], hawk: [[73,52,6,4],[81,52,6,4],[78,54,4,10]],
    bow: [[76,49,5,3],[80,52,3,9],[76,61,5,3],[76,53,2,8]], drone: [[73,51,6,3],[81,51,6,3],[77,54,6,7]],
    mutation: [[76,50,4,5],[79,55,5,5],[74,61,8,4]], toxin: [[78,48,4,5],[75,53,10,11]],
    rose: [[77,50,6,6],[74,53,12,3],[79,56,3,9]], prism: [[78,48,4,4],[74,52,12,10],[78,62,4,3]],
    rift: [[75,49,9,3],[82,52,3,5],[77,57,7,3],[74,60,3,5]]
  }[power];
  blocks(accent, glyph);
  // Distinct long hair, hoods, and costume silhouettes are drawn behind the head.
  if (['long-purple', 'ponytail', 'long-blond', 'fade', 'braids', 'harbor'].includes(style)) {
    r(30, 23, 36, 40, hair); r(27, 38, 6, 29, hair); r(63, 37, 6, 29, hair);
  }
  if (style === 'braid') blocks(hair, [[30,17,32,10],[60,23,9,8],[63,31,7,21],[65,52,5,12]]);
  if (['hood', 'miks'].includes(style)) p('M31 20h34v6h6v32H25V26h6Z', style === 'miks' ? accent : hair);
  // Bust outline and sleeve shapes, with a contrasting undershirt and lapels.
  blocks(colours.outline, [[28,64,40,24],[20,70,56,18],[32,59,32,10]]);
  blocks(coat, [[30,65,36,23],[22,72,10,16],[64,72,10,16]]);
  r(39,61,18,27, colours.light); r(41,55,14,12, skin);
  r(38,65,4,23, accent); r(55,65,4,23, accent);
  // The chunky face is kept at 2px increments for a true retro silhouette.
  blocks(colours.outline, [[32,26,32,24],[36,50,24,8]]);
  blocks(skin, [[34,28,28,21],[38,49,20,7],[30,36,4,9],[62,36,4,9]]);
  r(36,31,4,14, '#e0b99b'); r(58,35,4,14, skin);
  blocks(hair, [[33,23,30,9],[35,21,24,5],[33,30,5,7],[58,30,5,7]]);
  r(40,38,4,3, colours.outline); r(53,38,4,3, colours.outline);
  r(45,43,5,4, '#b98b71'); r(44,51,10,2, '#875e50');
  const beard = colour => { r(37,46,5,9,colour); r(55,46,5,9,colour); r(41,51,16,7,colour); r(42,46,14,3,colour); r(45,48,8,3,skin); };
  const glasses = colour => { blocks(colour, [[36,35,11,2],[36,35,2,8],[45,35,2,8],[36,41,11,2],[51,35,11,2],[51,35,2,8],[60,35,2,8],[51,41,11,2],[47,37,4,2]]); };
  switch (style) {
    case 'braid':
      blocks(hair, [[32,21,7,10],[37,18,8,7],[43,20,8,7],[51,18,8,7]]);
      blocks(accent, [[63,31,7,3],[63,40,7,3],[63,49,7,3],[63,58,7,3]]);
      r(22,72,10,16,accent); r(24,75,6,4,'#ece0b9'); r(33,68,6,16,'#9981b3'); break;
    case 'ginger':
      beard(hair); blocks(hair, [[36,18,24,6],[59,22,5,18],[60,42,4,8]]);
      r(22,71,11,17,'#85928c'); r(63,71,11,17,'#85928c');
      blocks(accent, [[22,74,11,4],[63,74,11,4],[26,82,7,4],[63,82,7,4]]); break;
    case 'beret':
      beard('#706357'); blocks(accent, [[31,21,33,10],[34,18,27,7],[33,30,32,3]]);
      r(39,24,7,5,colours.paper); r(31,67,36,8,'#909da5'); r(37,76,23,6,'#56616c'); break;
    case 'quiff':
      blocks(hair, [[36,18,8,8],[39,20,22,7],[52,22,9,8]]); glasses('#9f875b');
      r(46,66,6,20,'#af7f68'); r(43,70,12,4,accent); r(29,66,9,20,coat); r(59,66,7,20,coat); break;
    case 'clove':
      blocks(hair, [[28,21,9,7],[35,19,28,7],[29,26,7,15],[62,24,5,12]]);
      r(33,26,6,6,'#aaa0c2'); r(27,19,4,4,colours.paper); r(39,28,14,2,'#829aa4');
      blocks(accent, [[24,75,10,3],[61,75,10,3],[43,71,11,11]]); break;
    case 'hat':
      r(33,20,30,16,hair); r(24,33,48,5,hair); r(39,23,18,7,colours.paper);
      r(34,38,28,18,'#44515b'); blocks(accent, [[39,39,7,4],[52,39,7,4]]);
      r(35,65,5,22,'#a89d85'); r(57,65,5,22,'#a89d85'); r(46,63,6,17,'#89745f'); break;
    case 'bob':
      blocks(hair, [[31,22,8,31],[59,25,8,31],[35,20,27,8],[34,26,14,5]]);
      r(61,69,10,19,'#8c9b9c'); r(63,72,6,4,colours.paper); r(39,68,18,6,'#8ea070'); break;
    case 'fade':
      blocks('#bbc4cc', [[37,24,5,19],[42,24,3,11],[61,31,4,25]]);
      r(39,36,8,2,'#484758'); r(52,36,8,2,'#484758'); r(52,40,5,2,'#7e9da6');
      r(39,47,2,5,'#566170'); r(47,65,5,19,accent); r(29,73,8,4,'#606879'); break;
    case 'buzz':
      r(34,27,28,8,skin); r(36,23,24,5,hair); r(38,22,20,3,hair);
      blocks('#7f647b', [[24,72,5,3],[24,78,5,3],[24,84,5,3]]);
      r(38,65,22,19,'#6b7850'); r(46,69,9,9,accent); r(49,72,3,3,colours.paper);
      r(12,59,12,10,'#d4b468'); r(15,56,6,4,'#d4b468'); r(15,62,3,3,colours.outline); break;
    case 'harbor':
      beard(hair); r(34,20,25,6,hair); r(55,22,9,12,hair);
      r(22,73,10,15,skin); r(64,73,10,15,skin); r(23,76,9,6,accent); r(24,78,7,2,'#86b6bf');
      r(43,66,12,16,'#527c7a'); r(42,69,15,3,'#bfd3c3'); break;
    case 'sweep':
      p('M31 22h24v4h10v11h-8v-6H39v7h-8Z',hair);
      r(29,65,37,6,'#c4bdcc'); r(40,70,18,13,'#5c596e'); r(45,72,9,7,accent);
      r(25,67,5,8,'#9d8bbb'); r(66,67,5,8,'#9d8bbb'); break;
    case 'bun':
      blocks(hair, [[44,12,13,10],[40,17,18,8],[31,23,32,8],[31,28,9,11]]);
      r(53,18,5,5,accent); r(25,72,8,16,skin); r(64,72,8,16,skin);
      r(45,69,7,13,accent); r(43,73,11,3,colours.paper); break;
    case 'robot':
      blocks('#5d6977', [[32,23,32,33],[36,20,24,7]]); r(37,27,23,22,'#454859');
      blocks(accent, [[42,31,3,12],[45,33,3,12],[48,35,3,12],[51,33,3,12],[54,31,3,12]]);
      r(37,59,25,21,'#536572'); r(43,64,13,10,'#b7bce0'); r(45,66,9,6,accent);
      r(23,75,10,5,'#a7bac0'); r(63,75,10,5,'#a7bac0'); break;
    case 'beanie':
      r(32,19,32,15,accent); r(30,29,36,5,accent); r(40,22,14,3,'#a5bc8c');
      r(31,34,7,24,hair); r(60,34,7,24,hair); glasses('#454b53');
      r(36,67,24,8,'#ead28c'); r(40,77,16,6,'#c4a65d'); r(64,78,8,4,'#ad86a3'); break;
    case 'miks':
      blocks('#8572a2', [[30,25,6,29],[60,25,6,29],[33,52,31,6]]);
      blocks(hair, [[34,20,8,10],[42,24,8,5],[50,21,9,9],[57,26,7,7]]);
      r(21,72,11,16,skin); r(64,72,11,16,skin); r(26,75,3,10,'#967957');
      r(40,68,18,4,'#a87953'); r(34,80,30,5,'#b78c5b'); r(63,70,10,3,accent); break;
    case 'neon':
      blocks(hair, [[30,16,9,18],[25,10,8,11],[61,16,9,18],[66,10,8,11]]);
      blocks(accent, [[25,11,4,9],[68,11,4,9],[34,25,5,5],[57,25,5,5]]);
      r(22,73,10,15,skin); r(64,73,10,15,skin); r(43,65,11,18,'#384e66');
      blocks('#a7c9d0', [[33,69,5,13],[58,69,5,13],[41,79,15,3]]); break;
    case 'hood':
      p('M31 23h34v6h4v28H27V29h4Z',hair); r(35,30,26,23,'#343b51');
      blocks(accent, [[40,36,3,13],[47,34,3,17],[54,36,3,13]]);
      r(25,67,47,9,'#93a1b0'); r(31,75,34,7,'#535e76'); r(43,83,11,5,'#789194'); break;
    case 'phoenix':
      blocks(hair, [[33,21,6,11],[41,18,6,10],[49,20,6,10],[57,19,6,12]]);
      blocks('#c59b72', [[34,20,4,4],[49,20,3,4],[57,20,4,3]]);
      r(39,66,19,22,'#626368'); r(31,65,9,23,coat); r(59,65,9,23,coat); r(35,71,4,5,accent); break;
    case 'raze':
      r(31,21,33,10,accent); r(36,18,24,4,accent); r(34,24,27,5,'#9e724e');
      blocks('#c4b395', [[26,30,7,17],[63,30,7,17]]); r(29,32,3,12,colours.outline); r(65,32,3,12,colours.outline);
      r(22,73,10,15,skin); r(64,73,10,15,skin); r(40,63,19,11,'#58635b');
      r(30,76,34,4,accent); r(36,82,5,6,'#b09572'); r(53,82,5,6,'#b09572'); break;
    case 'long-purple':
      blocks('#9b78a4', [[27,49,6,22],[63,48,6,24]]); r(37,23,25,7,hair);
      r(40,38,4,3,accent); r(53,38,4,3,accent); r(41,66,17,19,'#665573');
      r(43,67,13,6,accent); r(47,71,5,8,'#d5b8ca'); r(25,73,5,12,skin); break;
    case 'ponytail':
      blocks(hair, [[42,13,12,9],[46,8,7,7],[60,27,6,36],[63,43,5,22]]);
      r(43,16,11,4,accent); r(42,65,15,19,'#626f70'); r(44,67,11,5,accent);
      r(36,80,24,4,accent); r(12,67,11,11,'#9cc8b5'); r(15,64,5,3,'#9cc8b5'); break;
    case 'braids':
      r(33,28,30,5,'#6e8d66'); blocks(hair, [[28,38,7,29],[62,37,7,31]]);
      blocks('#d9ab75', [[29,42,5,3],[29,52,5,3],[29,62,5,3],[63,43,5,3],[63,53,5,3],[63,63,5,3]]);
      r(22,73,10,15,skin); r(64,73,10,15,skin); r(39,65,20,16,'#78925e'); r(44,69,10,8,accent); break;
    case 'long-blond':
      r(32,26,7,31,hair); r(59,27,7,32,hair); r(37,23,19,7,'#e5d2a6');
      r(39,38,4,3,'#96c4d0'); r(45,36,2,11,'#ad8c76');
      p('M24 65h11v8h12v6H29v9h-5Z', '#dce0d5'); p('M62 65h12v23H62Z','#93b0c0');
      r(44,68,8,20,'#9aa0a0'); break;
    case 'tejo':
      beard('#676055'); r(32,23,33,6,hair); r(36,20,24,5,hair);
      glasses('#aa915a'); r(38,37,7,3,'#baaa6e'); r(53,37,7,3,'#baaa6e');
      r(40,65,18,23,'#6e6c5e'); r(31,65,9,23,coat); r(58,65,9,23,coat); r(34,68,3,10,colours.paper); break;
    case 'veto':
      beard(hair); r(35,22,26,8,hair); blocks('#747779', [[38,23,2,4],[44,23,2,4],[50,23,2,4],[56,23,2,4]]);
      r(37,65,24,23,'#d4cebc'); r(28,65,10,23,coat); r(60,65,8,23,coat);
      r(66,73,8,15,'#5d7b85'); blocks(accent, [[66,75,8,3],[68,80,5,4],[66,85,6,3]]);
      r(43,66,14,2,'#aeae89'); r(49,69,3,9,'#829fac'); break;
    case 'viper':
      blocks(hair, [[31,25,7,28],[59,26,7,28],[39,22,24,8]]);
      r(36,44,26,11,'#515f59'); r(43,48,13,3,'#899c83');
      r(40,65,18,22,'#577262'); r(47,67,5,18,accent); r(24,79,8,4,accent); r(64,79,8,4,accent); break;
    case 'metal':
      p('M30 24h8v-9h5v7h13v-7h5v9h6v29H30Z',hair);
      r(34,31,29,21,'#b6b8c3'); r(38,36,22,8,'#676477');
      blocks(accent, [[39,38,6,3],[53,38,6,3]]); r(45,44,7,9,'#d0cfd5');
      r(30,65,39,17,'#b2b4c0'); r(42,68,16,7,'#757287'); r(42,79,16,7,accent); break;
    case 'waylay':
      blocks(hair, [[32,22,5,14],[38,18,8,12],[47,20,8,10],[56,22,8,12]]);
      blocks('#84b7bc', [[39,23,5,8],[49,24,4,6],[58,26,4,7]]);
      r(41,65,17,23,'#667286'); r(44,68,10,3,'#d1d0db'); r(31,65,10,23,coat); r(58,65,10,23,coat);
      blocks(accent, [[26,74,6,8],[65,74,6,8],[38,84,24,3]]); break;
    case 'spikes':
      p('M31 29v-8h7v-7h5v7h6v-9h5v9h7v5h4v9H56v-6H40v6h-9Z',hair);
      r(40,23,6,5,'#7293b6'); r(34,65,30,9,'#455976'); r(45,73,10,13,'#dad2bc');
      blocks(accent, [[45,76,3,3],[51,76,3,3],[48,80,3,4],[25,74,6,4],[65,74,6,4]]); break;
  }
  // A 2px stitched hem and understated corner details match the local card set.
  r(22,86,52,2,colours.outline); r(9,79,4,4,accent); r(83,12,4,4,accent);
  r(6,89,84,1,colours.shadow);
  const title = `${name} — özgün temsili piksel portre`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${escape(title)}" shape-rendering="crispEdges"><title>${escape(title)}</title>${pieces.join('')}</svg>\n`;
}

await mkdir(new URL('assets/images/valorant/', root), { recursive: true });
const records = agents.map((agent, index) => ({ id: 17001 + index, isim: agent[0], gorsel: `assets/images/valorant/${agent[1]}.svg`, etiket: agent[2], evren: 'Valorant', tip: 'karakter' }));
assert.equal(records.length, 29);
for (const key of ['id', 'isim', 'gorsel']) assert.equal(new Set(records.map(record => record[key])).size, 29);
assert.deepEqual(Object.fromEntries(['Düellocu', 'Öncü', 'Kontrol Uzmanı', 'Gözcü'].map(role => [role, records.filter(record => record.etiket === role).length])), { 'Düellocu': 8, 'Öncü': 7, 'Kontrol Uzmanı': 7, 'Gözcü': 7 });
for (const agent of agents) await writeFile(new URL(`assets/images/valorant/${agent[1]}.svg`, root), portrait(agent));
await writeFile(new URL('tools/valorant-agents.json', root), JSON.stringify({ 'valorant-ajanlari': records }, null, 2) + '\n');
console.log('Valorant: 29 agents, 29 original local pixel portraits.');
