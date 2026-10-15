import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { realConsolationPools } from './consolation-real-pools.mjs';
import { realConsolationArt } from './consolation-real-art.mjs';
import { consolationCountryFlag } from './consolation-country-flags.mjs';
import { playableCollections, CONSOLATION_POOL_SIZE, CONSOLATION_DATASET_IDS as ALL_CONSOLATION_DATASET_IDS, consolationRange } from '../js/consolation.js';

// Original, local 96 px art. These playful auction reserves are not a ranking
// of real people or places. Football colours are symbolic, never current clubs.
// Eight active cards plus two saved-room cards share each stable ten-ID range.
const root = new URL('../', import.meta.url);
const rows = realConsolationPools;

export const CONSOLATION_DATASET_IDS = Object.keys(rows);
assert.equal(CONSOLATION_DATASET_IDS.length, 24);
const ink = '#4c445a', cream = '#f8edce', white = '#fff9e9';
const palette = ['#af8bc2', '#7eaaa4', '#d5a35e', '#a0ad77', '#c58e99', '#8cacc6', '#c7b474', '#b4977e', '#a59fc7', '#83a991'];
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
function art(name, kind, variant) {
  if (kind.startsWith('real:')) return realConsolationArt(name, kind, variant);
  if (kind.startsWith('flag:')) return consolationCountryFlag(name, kind.slice(5));
  const accent = palette[variant % palette.length];
  const parts = [];
  const r = (x, y, w, h, fill = ink) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
  const p = (d, fill = ink) => parts.push(`<path d="${d}" fill="${fill}"/>`);
  const line = (x, y, w, h = 3, fill = ink) => r(x, y, w, h, fill);
  const text = (value, x, y, size = 8, fill = ink) => parts.push(`<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" font-weight="bold" text-anchor="middle" fill="${fill}">${esc(value)}</text>`);
  const plate = () => { r(18, 66, 60, 6, '#b8a99a'); r(22, 63, 52, 6, white); };
  const face = (x = 39, y = 33, fill = '#edc29a') => { r(x, y, 20, 21, fill); r(x + 3, y + 7, 3, 4); r(x + 14, y + 7, 3, 4); r(x + 7, y + 15, 7, 2); };
  const bottle = (fill = accent) => { r(41, 18, 14, 11); r(43, 20, 10, 7, accent); r(38, 29, 20, 10, fill); r(34, 39, 28, 32, fill); r(38, 44, 20, 15, cream); r(39, 46, 18, 3, accent); r(39, 64, 18, 3, '#ffffff66'); };
  const cup = (fill = '#9c7454', handle = true) => { r(29, 37, 36, 31); r(32, 40, 30, 25, fill); r(35, 43, 24, 7, '#65513e'); if (handle) { r(65, 43, 12, 18); r(68, 47, 5, 10, cream); } r(26, 68, 43, 4, white); };
  const page = (fill = white) => { r(29, 23, 38, 49); r(32, 26, 32, 43, fill); line(37, 34, 22); line(37, 42, 17); line(37, 50, 22); line(37, 58, 13); };
  const screen = () => { r(19, 24, 58, 41); r(23, 28, 50, 33, '#d9e6ce'); r(41, 65, 14, 5); r(32, 70, 32, 4); };
  const arrow = (x, y, fill = ink) => p(`M${x} ${y}h12v-6l12 12-12 12v-6H${x}z`, fill);
  r(0, 0, 96, 96, cream); r(4, 4, 88, 88, ink); r(7, 7, 82, 82, accent); r(11, 11, 74, 65, '#efe5cc');
  for (let i = 0; i < 4; i++) { r(14 + i * 19, 14 + (i % 2) * 4, 3, 3, accent); r(16 + i * 19, 69 - (i % 2) * 3, 2, 2, accent); }
  r(13, 78, 70, 8, cream); text('TESELLI', 48, 85, 7);
  r(73, 18, 6, 3, '#d7b66e'); r(76, 15, 3, 9, '#d7b66e');
  if (kind.startsWith('portrait:')) {
    const [, hair, skin, shirt, number] = kind.split(':');
    const skinFill = { light: '#eac5a7', olive: '#d0a57e', brown: '#b78966', deep: '#825b45' }[skin];
    const kit = { red: '#b75c62', blue: '#728ca9', green: '#829c75', white: '#f2eddd', yellow: '#d4b86e' }[shirt];
    r(14, 50, 68, 23, '#b7c39a'); line(14, 62, 68, 2, '#f4ebcf');
    r(28, 55, 40, 19); r(31, 57, 34, 17, kit); r(24, 58, 9, 11, skinFill); r(63, 58, 9, 11, skinFill);
    r(38, 45, 20, 15, skinFill); r(31, 24, 34, 31); r(34, 27, 28, 28, skinFill); r(30, 36, 5, 10, skinFill); r(61, 36, 5, 10, skinFill);
    r(38, 38, 4, 4); r(54, 38, 4, 4); r(44, 49, 10, 2, '#a47265');
    const hc = hair === 'side' && variant % 2 ? '#8c6b46' : '#50423c';
    if (hair === 'buzz') r(34, 25, 28, 5, hc);
    if (hair === 'short') { r(32, 22, 32, 8, hc); r(32, 28, 5, 9, hc); r(59, 28, 5, 9, hc); }
    if (hair === 'side') { r(32, 23, 32, 7, hc); r(32, 29, 8, 9, hc); r(37, 27, 15, 5, hc); }
    if (hair === 'long') { r(30, 22, 36, 8, hc); r(30, 28, 6, 26, hc); r(60, 28, 6, 26, hc); }
    if (hair === 'spikes') { r(32, 25, 32, 6, hc); for (let i = 0; i < 5; i++) r(33 + i * 6, 19 + i % 2 * 3, 5, 8, hc); }
    if (hair === 'crest') { r(34, 25, 28, 4, hc); r(44, 17, 10, 11, hc); r(41, 20, 16, 6, hc); }
    r(44, 57, 8, 3, cream); text(number, 48, 71, 9, shirt === 'white' || shirt === 'yellow' ? ink : white);
    r(16, 25, 9, 10, cream); text('?', 20.5, 33, 9); // a surprise reserve, not a quality rating
  } else {
    switch (kind) {
      case 'page': page('#ddd5bd'); break;
      case 'sling':
        p('M29 22h8l13 20 12-20h8L54 49v23H44V49z', '#a3845c');
        p('M32 23l15 11 17-11 3 4-20 14-18-14z', '#b47f6b');
        r(44, 32, 7, 7, '#777d79'); break;
      case 'carob':
        plate(); p('M23 36l14 3 11 11 16 2 9 8-5 6-19-6-15-14-13-3z', '#725940');
        p('M27 26l14 4 12 10 16 3 7 8-6 4-17-7-17-12-12-3z', '#88694c'); break;
      case 'candy':
        plate(); for (const [x,y,c] of [[29,43,'#c78483'],[46,34,'#d8b16c'],[58,50,'#a3b67d']]) {
          r(x,y,13,13,c); r(x+3,y-3,7,19,c); r(x+3,y+2,4,3,white);
        } break;
      case 'seed':
        plate(); for (const [x,y] of [[26,42],[40,34],[54,40],[35,54],[54,55]]) {
          p(`M${x} ${y}l5-8 6 8-2 9h-7z`, '#d4d3b6'); r(x+4,y-3,2,9,'#8a9479');
        } break;
      case 'cookie': case 'cracker': case 'chickpea':
        plate(); r(27, 30, 42, 33, '#bb8e56'); r(23, 37, 50, 18, '#cda76c');
        for (const [x, y] of [[33, 38], [47, 34], [57, 44], [38, 51], [53, 55]]) r(x, y, kind === 'chickpea' ? 6 : 4, 4, '#8a684b');
        r(60, 28, 13, 12, '#efe5cc'); r(65, 38, 8, 8, '#efe5cc'); break;
      case 'melt': r(22, 64, 52, 7, '#c7959a'); r(28, 58, 40, 10, '#d6adb0'); r(32, 31, 30, 24, '#e6c29e'); r(28, 39, 38, 13, '#e6c29e'); r(38, 52, 8, 15, '#e6c29e'); r(57, 50, 5, 12, '#e6c29e'); r(47, 23, 4, 10, '#987256'); break;
      case 'bowl': case 'rice': case 'soup': case 'salad':
        plate(); r(23, 43, 50, 10); r(28, 53, 40, 10, accent); r(33, 62, 30, 5, accent); r(26, 40, 44, 9, kind === 'salad' ? '#91a46e' : kind === 'soup' ? '#a3835b' : '#f3e0b0');
        for (let i = 0; i < 5; i++) r(30 + i * 7, 39 + i % 2 * 4, 5, 3, kind === 'salad' ? '#bc745f' : '#e6bd73'); r(63, 24, 4, 20, '#a0a7a0'); break;
      case 'cupcake': case 'bun': case 'puff':
        plate(); r(30, 42, 37, 21, '#b78a58'); r(35, 34, 27, 10, '#cda36b'); r(39, 37, 19, 10, '#9c744f'); r(37, 50, 4, 10, '#e0be87'); r(53, 50, 4, 10, '#e0be87'); break;
      case 'cube': case 'pudding':
        plate(); r(32, 33, 32, 30, '#c5a276'); r(29, 32, 38, 7, '#8b674e'); r(39, 39, 4, 18, '#dec08b'); r(64, 51, 8, 8, '#efe5cc'); break;
      case 'cake':
        plate(); p('M27 61V37l37-12v36z', '#d1a574'); p('M27 37l37-12 8 10-36 12z', '#e7ce9f'); line(29, 47, 35, 4, '#8c6851'); r(65, 42, 6, 12, '#efe5cc'); break;
      case 'cone': p('M29 37h38L48 72z', '#bd945d'); line(32, 45, 28, 3, '#e0bc85'); line(37, 54, 18, 3, '#e0bc85'); p('M46 42l7 7-9 8 8 6-4 10 10-11-6-6 9-9-9-9z', '#efe5cc'); break;
      case 'wafer': case 'toast': case 'bread': case 'sandwich':
        plate(); r(24, 31, 47, 30, '#b48553'); r(27, 29, 41, 29, '#dfbd84'); line(29, 39, 37, 3, '#af8358'); line(29, 49, 37, 3, '#af8358');
        for (let i = 0; i < 4; i++) r(31 + i * 9, 31, 2, 24, '#c69e68'); r(60, 26, 15, 11, '#efe5cc'); if (kind === 'sandwich') line(25, 46, 45, 4, '#93a66b'); break;
      case 'pasta': plate(); for (let i = 0; i < 7; i++) { r(24 + i * 6, 34 + i % 3 * 4, 4, 24, '#d9b86c'); r(25 + i * 6, 39 + i % 3 * 4, 11, 4, '#e5c982'); } r(65, 23, 3, 25, '#929a9a'); break;
      case 'fries': r(29, 45, 38, 26, '#bc7471'); for (let i = 0; i < 5; i++) r(29 + i * 8, 24 + i % 2 * 6, 6, 31, '#d9b96f'); r(37, 53, 22, 6, cream); break;
      case 'olive': plate(); r(39, 43, 19, 18, '#768360'); r(43, 39, 11, 25, '#768360'); r(43, 43, 5, 5, '#b3bd88'); r(48, 49, 5, 8, '#4f5945'); break;
      case 'pickle': r(32, 27, 32, 44, '#a9b9a0'); r(36, 21, 24, 7, accent); r(40, 34, 15, 28, '#78915e'); for (let i = 0; i < 5; i++) r(42 + i % 2 * 7, 36 + i * 5, 3, 3, '#a8b877'); line(35, 64, 26, 3, '#81967a'); break;
      case 'tea': cup('#c69877'); r(40, 23, 3, 9, '#a0a499'); r(48, 17, 3, 12, '#a0a499'); r(56, 24, 3, 8, '#a0a499'); break;
      case 'coffee': case 'mug': cup(accent); if (kind === 'coffee') for (let i = 0; i < 7; i++) r(36 + i * 3, 46 + i % 2 * 5, 2, 2); break;
      case 'bottle': bottle('#98b0a2'); text('0', 48, 56, 10); r(63, 21, 3, 3, '#98b0a2'); r(68, 15, 2, 2, '#98b0a2'); break;
      case 'water': case 'glass': case 'lemonade': case 'milk': case 'juice':
        r(30, 25, 36, 44); r(33, 28, 30, 38, '#f3efe0'); r(34, kind === 'glass' ? 59 : 43, 28, kind === 'glass' ? 6 : 22, ({ lemonade: '#e2cc82', milk: '#dddcc7', juice: '#d4a574' })[kind] || '#a4bac1');
        if (kind === 'lemonade') { r(53, 25, 17, 16, '#cbb25d'); r(56, 28, 11, 10, '#f3d989'); } if (kind === 'juice') r(54, 17, 4, 33, accent); break;
      case 'pouch': case 'wrapper':
        p('M27 24h42l-4 45H31z', accent); r(27, 24, 42, 6); r(30, 64, 36, 6); r(33, 35, 30, 21, cream); text('?', 48, 51, 16); if (kind === 'pouch') r(58, 17, 4, 25, '#a2aeab'); break;
      case 'television': case 'screen': case 'loading': case 'caption':
        screen(); if (kind === 'loading') { r(29, 40, 38, 12); r(32, 43, 8, 6, accent); text('1%', 48, 34, 7); } else if (kind === 'caption') { r(26, 49, 42, 10, ink); text('...?', 47, 56, 8, cream); } else { r(28, 32, 39, 23, kind === 'screen' ? '#83a477' : '#a6a0b3'); for (let i = 0; i < 4; i++) line(29, 35 + i * 5, 37, 2, '#cbd4bd'); } break;
      case 'clapper': r(25, 35, 47, 34); r(28, 38, 41, 28, accent); p('M22 28l45-11 4 10-45 11z'); for (let i = 0; i < 5; i++) r(29 + i * 8, 24 - i * 2, 4, 7, cream); line(33, 45, 31, 3, cream); line(33, 54, 21, 3, cream); break;
      case 'filmstrip': r(26, 20, 44, 54); r(34, 26, 28, 15, accent); r(34, 48, 28, 18, '#a9b695'); for (let i = 0; i < 5; i++) { r(28, 25 + i * 9, 3, 4, cream); r(65, 25 + i * 9, 3, 4, cream); } break;
      case 'clock': case 'metronome':
        if (kind === 'clock') { r(28, 24, 41, 43); r(23, 32, 51, 26); r(30, 27, 37, 36, cream); r(34, 23, 29, 43, cream); r(46, 33, 4, 17); line(48, 47, 13, 4); }
        else { p('M35 21h26l12 48H23z', '#ae8d68'); p('M39 26h18l7 36H32z', cream); p('M45 61l14-34 4 2-14 34z'); r(52, 38, 9, 6, accent); } break;
      case 'cushion': r(24, 32, 49, 32, accent); r(29, 28, 39, 40, accent); r(29, 35, 39, 3, cream); r(32, 59, 33, 3, '#81756d'); r(45, 44, 6, 6, '#c3a6ba'); break;
      case 'repeat': arrow(24, 29, accent); p('M48 25h19v33h-9V34H48z', accent); p('M48 65H29V43h9v13h10v-6l13 10-13 11z', '#819a83'); break;
      case 'remote': r(35, 20, 26, 53); r(38, 23, 20, 47, '#8c9190'); r(42, 27, 6, 6, '#b76f77'); for (let i = 0; i < 9; i++) r(40 + i % 3 * 6, 39 + Math.floor(i / 3) * 9, 4, 5, i % 2 ? cream : accent); break;
      case 'calendar': page(); r(32, 25, 32, 10, accent); r(38, 18, 4, 13); r(53, 18, 4, 13); text('?', 48, 59, 23, accent); break;
      case 'cassette': r(20, 29, 57, 36); r(24, 33, 49, 28, '#8b8e8f'); r(28, 36, 41, 18, cream); r(32, 39, 10, 10); r(54, 39, 10, 10); r(35, 42, 4, 4, cream); r(57, 42, 4, 4, cream); line(40, 44, 16, 2); p('M36 54h25l6 9H30z', '#b5aca0'); if (variant % 2) p('M21 62h-6v9h16v-7h-9v-9h-6v-8h10v4H20v10h8v7H18v-2h6v-3z'); break;
      case 'camera': r(24, 34, 49, 30); r(30, 25, 17, 10); r(37, 38, 23, 21, '#8f9a9a'); r(42, 42, 13, 13, accent); r(62, 39, 6, 5, cream); break;
      case 'popcorn': p('M28 40h42l-6 32H34z', '#c78982'); for (let i = 0; i < 4; i++) r(35 + i * 7, 43, 3, 25, cream); for (const [x, y] of [[28, 31], [39, 27], [53, 30], [61, 33]]) { r(x, y, 12, 10, '#d5bd7a'); r(x + 3, y - 4, 5, 16, '#e5cf91'); } break;
      case 'cloud': r(24, 36, 48, 23, white); r(32, 26, 27, 39, white); r(61, 45, 14, 13, white); r(36, 40, 4, 4); r(53, 40, 4, 4); line(42, 50, 10, 2); r(19, 60, 6, 6, '#bac9c0'); r(14, 68, 3, 3, '#bac9c0'); break;
      case 'door': r(26, 22, 45, 51); r(30, 26, 37, 47, '#9f7f66'); r(34, 29, 29, 20, '#bea284'); r(58, 53, 5, 5, '#d5bb74'); text('?', 48, 44, 15); break;
      case 'alien': r(30, 25, 37, 30, '#93aa7e'); r(25, 32, 47, 16, '#93aa7e'); r(34, 35, 10, 7); r(53, 35, 10, 7); r(44, 49, 9, 3); r(38, 55, 22, 14, accent); r(32, 61, 8, 12, '#93aa7e'); r(59, 61, 8, 12, '#93aa7e'); break;
      case 'speaker': r(29, 21, 38, 51); r(33, 25, 30, 43, '#9a9198'); r(40, 30, 16, 12); r(36, 49, 24, 15); r(42, 52, 12, 9, accent); line(73, 34, 4, 20, accent); break;
      case 'chair': r(29, 24, 38, 29, accent); r(25, 54, 46, 10, accent); r(29, 64, 7, 10); r(60, 64, 7, 10); line(34, 30, 28, 3, '#d4c6d7'); break;
      case 'shower': r(33, 22, 25, 5); r(55, 22, 5, 19); r(46, 39, 23, 7, '#9aa9ac'); for (let i = 0; i < 4; i++) { r(48 + i * 5, 49 + i % 2 * 4, 2, 8, '#91b4bd'); r(48 + i * 5, 62 + i % 2 * 4, 2, 5, '#91b4bd'); } r(25, 29, 5, 15, accent); r(22, 39, 11, 3, accent); break;
      case 'drill': r(25, 28, 37, 20, accent); r(32, 48, 15, 23, '#8f8170'); r(61, 33, 17, 8, '#a6a9a0'); line(63, 35, 14, 2); r(25, 31, 6, 14, cream); break;
      case 'flute': r(43, 20, 11, 54, '#bd9c6b'); r(40, 20, 17, 10, cream); for (let i = 0; i < 5; i++) r(46, 34 + i * 7, 4, 3); r(56, 30, 7, 4, accent); r(61, 24, 3, 10, accent); break;
      case 'microphone': r(37, 23, 22, 29); r(34, 29, 28, 17); r(40, 26, 16, 22, '#a5a8a3'); for (let i = 0; i < 4; i++) line(41, 29 + i * 5, 14, 2); r(45, 52, 6, 17); r(34, 69, 28, 4); break;
      case 'guitar': r(43, 18, 10, 30, '#aa815b'); r(39, 16, 18, 10); r(30, 43, 37, 23, '#c99b67'); r(35, 36, 27, 33, '#c99b67'); r(44, 47, 10, 10); r(47, 21, 2, 42, cream); line(40, 62, 18, 4); break;
      case 'pot': r(25, 37, 47, 29, '#9ba6a3'); r(19, 40, 8, 9); r(70, 40, 8, 9); r(29, 31, 39, 6); r(42, 26, 13, 5); line(30, 42, 34, 3, cream); break;
      case 'headphones': p('M26 55V33h8v-8h29v8h8v22h-7V35h-5v-4H38v4h-5v20z'); r(23, 44, 13, 21, accent); r(61, 44, 13, 21, accent); p('M31 65v7h30v-5H43v-5h10v-4H41v11H34v-4z', '#877975'); break;
      case 'drum': r(26, 36, 46, 31, accent); r(23, 31, 52, 8, cream); line(24, 33, 49, 3); r(25, 65, 48, 6); for (let i = 0; i < 4; i++) r(29 + i * 12, 39, 3, 25, '#bdad96'); p('M33 17l4-3 24 19-4 3z', '#9c784f'); break;
      case 'busstop': r(23, 23, 50, 6); r(27, 29, 4, 43); r(65, 29, 4, 43); r(34, 52, 28, 7, accent); r(37, 59, 4, 13); r(55, 59, 4, 13); r(39, 35, 19, 12, '#a8c1bd'); break;
      case 'hill': p('M15 70l26-44 14 23 10-15 17 36z', '#9bab7f'); p('M28 70l14-24 11 11 13-11 10 24z', '#c6b48f'); p('M40 70l5-10 7 4 7-6 8 12z', cream); break;
      case 'map': p('M21 28l18-7 20 7 17-7v44l-17 7-20-7-18 7z', '#c3caa2'); p('M39 21l20 7v44l-20-7z', '#e0c699'); p('M25 57l14-13 16 10 15-17 3 3-17 20-17-10-11 10z', cream); r(53, 41, 7, 8, accent); r(55, 47, 3, 7, accent); break;
      case 'sign': r(45, 27, 6, 47, '#9b815e'); p('M23 23h42l10 10-10 10H23z', accent); p('M67 46H28l-9 10 9 10h39z', '#a6b893'); text('?', 47, 37, 12); text('?', 45, 60, 12); break;
      case 'bus': case 'train': r(23, 27, 50, 36, accent); r(28, 31, 39, 15, '#b9d0c6'); line(28, 48, 39, 3); r(26, 58, 8, 11); r(61, 58, 8, 11); r(27, 52, 6, 4, '#e9ce8d'); r(63, 52, 6, 4, '#e9ce8d'); r(42, 31, 3, 15); if (kind === 'train') { line(22, 71, 53, 3, '#919891'); r(41, 20, 15, 5); } break;
      case 'stairs': for (let i = 0; i < 5; i++) r(20 + i * 11, 60 - i * 8, 11, 13 + i * 8, '#a79b8b'); arrow(26, 23, accent); break;
      case 'bench': r(24, 32, 49, 9, '#ac895f'); r(24, 44, 49, 8, '#b6966e'); r(22, 55, 53, 7, '#ac895f'); r(27, 62, 6, 12); r(64, 62, 6, 12); break;
      case 'roundabout': r(26, 24, 45, 46, '#b4b6a4'); r(35, 33, 27, 28, '#efe5cc'); r(43, 42, 11, 10, '#96a77b'); arrow(31, 23, cream); break;
      case 'compass': r(29, 26, 39, 39); r(24, 33, 49, 25); r(32, 29, 33, 33, cream); r(29, 35, 39, 20, cream); p('M48 32l9 18-9 11-8-11z', accent); p('M48 32v29l-8-11z', '#9cacac'); text('?', 48, 21, 10); break;
      case 'station': r(24, 32, 49, 39, '#b8ac94'); p('M18 33l30-16 31 16z', accent); r(40, 47, 16, 24); r(28, 42, 8, 10, '#cee0d5'); r(61, 42, 8, 10, '#cee0d5'); text('?', 48, 36, 10); break;
      case 'pier': r(19, 57, 59, 7, '#a08763'); for (let i = 0; i < 4; i++) r(23 + i * 17, 49, 4, 22, '#997c58'); for (let i = 0; i < 3; i++) line(17, 65 + i * 5, 64, 2, '#91b3b6'); r(42, 24, 5, 31); arrow(47, 26, accent); break;
      case 'boat': p('M19 50h60L67 67H32z', '#899da4'); r(32, 34, 34, 17, cream); r(40, 23, 9, 12, accent); r(38, 39, 7, 6, '#91b2bc'); r(53, 39, 7, 6, '#91b2bc'); line(17, 70, 63, 3, '#91b3b6'); break;
      case 'ticket': r(28, 24, 40, 47, accent); r(31, 28, 34, 39, cream); text('?', 48, 52, 24); for (let i = 0; i < 8; i++) r(35 + i * 3, 58, 1 + i % 2, 7); break;
      case 'seagull': r(34, 33, 27, 19, white); r(49, 24, 16, 14, white); r(62, 31, 11, 4, '#d5af64'); r(57, 28, 3, 3); p('M36 38l-17-9 10 21 19-2z', '#b7c3c2'); r(40, 51, 3, 12, '#bc975e'); r(52, 51, 3, 12, '#bc975e'); r(50, 63, 20, 9, '#c59a60'); r(56, 65, 8, 4, cream); break;
      case 'bridge': r(22, 33, 5, 38); r(68, 33, 5, 38); line(20, 55, 56, 7, '#a38f7d'); p('M26 35h4l18 17 19-17h4L49 57z', accent); for (let i = 0; i < 3; i++) line(17, 65 + i * 5, 63, 2, '#94afb0'); break;
      case 'suitcase': r(26, 31, 45, 38, '#af8b68'); r(39, 21, 20, 10); r(43, 24, 12, 7, cream); r(33, 32, 5, 35, '#d0b78c'); r(60, 32, 5, 35, '#d0b78c'); r(29, 69, 7, 6); r(61, 69, 7, 6); r(43, 44, 12, 11, accent); break;
      case 'postcard': r(21, 28, 55, 38, white); r(26, 33, 25, 27, '#c9d6b9'); r(56, 32, 13, 10, accent); line(55, 49, 15, 2); line(55, 55, 13, 2); break;
      case 'teahouse': r(25, 36, 47, 35, '#cfb898'); p('M19 36l29-17 30 17z', '#b9857c'); r(32, 43, 14, 17, '#a6c2bd'); r(52, 46, 15, 25, '#8a735b'); text('ÇAY', 48, 36, 7, cream); break;
      case 'barrier': r(21, 37, 56, 13, cream); for (let i = 0; i < 5; i++) p(`M${21 + i * 12} 37h7l-7 13h-7z`, '#c98d75'); r(27, 50, 5, 23); r(65, 50, 5, 23); break;
      case 'flag': r(30, 20, 5, 54); p('M35 23h33v26H35z', accent); r(45, 31, 13, 10, cream); text('?', 52, 40, 12); break;
      case 'island': r(19, 63, 58, 10, '#9bbabe'); r(29, 60, 39, 9, '#d6bb83'); r(45, 32, 5, 30, '#9b805a'); p('M48 32L24 25l6-7 18 9 14-9 11 7-22 7 13 11-13-3z', '#91a874'); break;
      case 'passport': r(30, 22, 36, 50, '#8398a9'); r(34, 26, 28, 42, '#8398a9'); r(41, 36, 14, 16, '#dac188'); line(37, 58, 22, 3, '#dac188'); r(47, 34, 3, 20, '#8398a9'); break;
      case 'building': r(25, 32, 47, 39, '#c7b99f'); p('M20 32l28-15 29 15z', accent); for (let i = 0; i < 3; i++) r(30 + i * 15, 37, 7, 31, cream); line(23, 68, 51, 5); break;
      case 'plane': p('M45 20h7v21l25 17v8L52 55v14l8 5H37l8-5V55L20 66v-8l25-17z', '#a7b4b7'); r(46, 24, 5, 20, '#dce5df'); break;
      case 'castle': r(25, 35, 48, 36, '#b0a7a6'); r(22, 22, 15, 48, '#b0a7a6'); r(60, 22, 15, 48, '#b0a7a6'); for (let i = 0; i < 3; i++) { r(22 + i * 6, 18, 4, 9, '#b0a7a6'); r(60 + i * 6, 18, 4, 9, '#b0a7a6'); } r(42, 53, 14, 18); r(29, 35, 4, 8, accent); r(65, 35, 4, 8, accent); break;
      case 'hero': case 'cape': p('M32 40l-10 31h52L63 40z', accent); face(38, 26); r(36, 48, 28, 23, '#90aab0'); r(42, 53, 16, 12, '#e1c57b'); text('?', 50, 63, 12); break;
      case 'robot': r(31, 24, 36, 28, '#9eaeb0'); r(28, 31, 42, 15, '#9eaeb0'); r(37, 33, 7, 6, accent); r(55, 33, 7, 6, accent); line(41, 44, 17, 3); r(36, 56, 27, 16, accent); r(24, 55, 9, 14, '#9eaeb0'); r(66, 55, 9, 14, '#9eaeb0'); r(46, 17, 5, 7); r(43, 14, 11, 5, accent); break;
      case 'potato': r(32, 29, 31, 37, '#b99b6c'); r(27, 37, 41, 23, '#b99b6c'); r(38, 39, 4, 4); r(54, 39, 4, 4); r(44, 53, 10, 3); r(31, 48, 3, 4, '#967650'); r(57, 59, 3, 3, '#967650'); break;
      case 'frame': r(24, 23, 48, 48); r(29, 28, 38, 38, '#b5c9b0'); face(37, 35, '#e1bd93'); r(31, 18, 8, 9, '#b0a393'); r(58, 66, 9, 9, '#b0a393'); break;
      case 'monster': r(28, 30, 43, 35, '#a4b784'); r(34, 22, 31, 48, '#a4b784'); r(27, 19, 7, 15, accent); r(64, 19, 7, 15, accent); r(35, 35, 10, 9, cream); r(54, 35, 10, 9, cream); r(39, 38, 4, 5); r(56, 38, 4, 5); r(41, 53, 18, 6); r(44, 53, 4, 4, cream); break;
      case 'dummy': r(43, 47, 9, 26, '#ac8c65'); r(26, 47, 44, 7, '#ac8c65'); r(35, 27, 24, 22, '#c7ad82'); r(39, 31, 3, 3); r(52, 31, 3, 3); line(42, 41, 10, 2); r(32, 69, 31, 4, '#ac8c65'); break;
      case 'battery': r(34, 28, 28, 43); r(41, 21, 14, 7); r(38, 32, 20, 35, '#9caa8d'); r(42, 35, 12, 4, cream); r(46, 31, 4, 12, cream); line(42, 60, 12, 3, cream); break;
      case 'coin': case 'pogs': r(29, 25, 39, 43, '#b69962'); r(24, 32, 49, 29, '#b69962'); r(33, 29, 31, 35, '#dfc482'); r(29, 35, 39, 23, '#dfc482'); text(kind === 'coin' ? '?' : 'T', 48, 55, 23, accent); break;
      case 'sock': r(40, 23, 23, 35, accent); r(31, 52, 31, 17, accent); r(24, 57, 14, 12, accent); line(42, 28, 18, 4, cream); r(43, 49, 10, 10, cream); break;
      case 'antenna': r(29, 48, 39, 23, '#8b9a9e'); r(42, 26, 5, 22); p('M44 27l-15-14-3 3 15 14z'); p('M48 26l12-10 3 3-12 10z'); r(53, 14, 10, 4, '#efe5cc'); r(36, 54, 6, 6, accent); r(54, 54, 6, 6, accent); break;
      case 'pencil': p('M34 62l18-42 10 5-18 42-12 8z', '#d8b967'); p('M34 62l10 5-12 8z', '#d5b28c'); p('M32 75l2-8 5 3z'); p('M51 23l3-7 10 5-3 7z', '#a4a59d'); break;
      case 'floppy': r(26, 22, 44, 50, '#8d9ba7'); r(34, 22, 28, 18, '#c4c6bd'); r(50, 24, 8, 13, '#868c8b'); r(34, 48, 28, 21, cream); line(39, 54, 18, 2, '#c8bca4'); line(39, 61, 13, 2, '#c8bca4'); break;
      case 'stick': p('M30 66l28-44 7 5-28 44z', '#d3b072'); for (let i = 0; i < 5; i++) r(35 + i * 5, 59 - i * 8, 2, 3, cream); plate(); break;
      case 'bagel': r(28, 33, 41, 30, '#b68a57'); r(34, 27, 29, 41, '#b68a57'); r(39, 39, 19, 18, '#efe5cc'); r(63, 25, 10, 17, '#efe5cc'); for (let i = 0; i < 9; i++) r(30 + i % 4 * 10, 34 + Math.floor(i / 4) * 13, 2, 3, '#e2ca96'); break;
      case 'book': page('#dad6b9'); r(28, 23, 6, 49, accent); text('?', 50, 58, 18, accent); break;
      case 'button': r(30, 29, 36, 39); r(24, 37, 48, 24); r(32, 27, 32, 32, accent); r(28, 33, 40, 21, accent); text('A', 48, 49, 17, cream); break;
      case 'sprout': r(26, 62, 46, 10, '#a28766'); r(45, 37, 5, 26, '#8b9c6e'); p('M45 43H29V28h8l10 9z', '#8ba477'); p('M50 39V27l17-7v15z', '#a5ba86'); break;
      case 'maze': r(24, 23, 49, 48, '#a7b8a0'); p('M24 23h49v8H32v11h19v-6h22v35H24V49h8v14h33V44h-6v11H40V34H24z'); r(27, 24, 8, 7, accent); r(64, 63, 8, 7, '#d9be7d'); break;
      case 'gamepad': p('M29 34h39l10 26-6 10-17-10H40L24 70l-7-10z', '#959e9a'); r(30, 42, 5, 18); r(24, 48, 17, 5); r(59, 46, 7, 7, accent); r(67, 53, 7, 7, '#c4919b'); r(44, 52, 9, 3); break;
      case 'keyboard': r(18, 33, 61, 30, '#969f9e'); for (let i = 0; i < 21; i++) r(22 + i % 7 * 8, 37 + Math.floor(i / 7) * 8, 5, 5, (i + variant) % 6 ? cream : accent); break;
      case 'heart': p('M23 32h19v7h12v-7h19v7h7v17L49 75 17 56V39h6z', '#bd8996'); p('M23 37h13v5H23z', '#e0b4bb'); p('M45 34h7v11h-7l7 12-6 14-4-2 4-12-8-12h7z', '#efe5cc'); break;
      case 'snail': r(23, 58, 49, 13, '#a5b58c'); r(22, 39, 30, 25, '#c1a37c'); r(27, 34, 21, 32, '#c1a37c'); r(30, 43, 15, 14, '#8d775c'); r(35, 47, 6, 6, '#c1a37c'); r(65, 44, 5, 17, '#a5b58c'); r(57, 42, 4, 18, '#a5b58c'); r(57, 42, 3, 3); r(66, 44, 3, 3); break;
      case 'chest': r(24, 37, 49, 31, '#a17f56'); r(29, 28, 39, 11, '#b4956b'); r(24, 41, 49, 6, '#d4b77c'); r(44, 41, 11, 15, '#d4b77c'); r(48, 45, 3, 5); r(28, 29, 7, 37, '#d4b77c'); r(62, 29, 7, 37, '#d4b77c'); break;
      case 'sword': case 'dagger': p('M56 20l11 2-1 12-24 24-10-10z', kind === 'sword' ? '#ba9a70' : '#aeb9b5'); p('M30 43l19 19-5 5-19-19z', '#9b7d56'); p('M32 55l9 9-12 10-8-8z', '#87705e'); p('M40 47l20-21 3 3-20 21z', cream); break;
      case 'farmer': r(26, 29, 43, 8, '#c4a673'); r(36, 20, 26, 15, '#c4a673'); face(38, 35); r(34, 58, 29, 15, accent); r(39, 58, 4, 15, '#a7b5b6'); r(55, 58, 4, 15, '#a7b5b6'); break;
      case 'shield': p('M28 23h40v33L48 74 28 56z', '#ac8a61'); p('M34 29h28v24L48 66 34 53z', '#c9aa7b'); r(46, 30, 4, 34, '#927450'); line(35, 44, 26, 4, '#927450'); break;
      case 'guard': face(38, 32); r(33, 25, 31, 10, '#9ba8aa'); r(38, 20, 21, 10, '#9ba8aa'); r(34, 57, 30, 15, accent); text('Z', 70, 29, 11); text('z', 76, 18, 8); break;
      case 'chicken': r(33, 38, 27, 25, white); r(51, 26, 16, 18, white); r(54, 20, 11, 7, '#b77d7d'); r(65, 34, 9, 4, '#d6b16d'); r(58, 31, 3, 3); p('M34 43l-12-9v22l15 2z', '#d9cdb4'); r(39, 62, 3, 10, '#cba568'); r(52, 62, 3, 10, '#cba568'); break;
      case 'magazine': p('M35 23h26v43l-7 8H35z', '#8d9694'); r(39, 28, 18, 9, '#c4b899'); for (let i = 0; i < 3; i++) line(40, 43 + i * 8, 15, 3); break;
      case 'flash': p('M44 18h12l-5 20h16L41 75l5-25H30z', '#d7be7b'); r(24, 27, 7, 3, accent); r(64, 19, 3, 9, accent); r(69, 59, 8, 3, accent); break;
      case 'smoke': r(23, 45, 52, 18, '#b2b5b0'); r(32, 32, 38, 30, '#bfc3b9'); r(39, 23, 23, 39, '#c8cdbf'); r(19, 61, 60, 8, '#a8b1aa'); line(32, 40, 27, 3, '#dce0d3'); break;
      case 'device': r(30, 29, 37, 40, '#949a92'); r(35, 35, 27, 17, '#bbcfad'); text('?', 48, 49, 15); r(38, 60, 5, 4, accent); r(53, 60, 5, 4, accent); r(45, 22, 7, 7); break;
      case 'toolbox': r(25, 35, 48, 35, accent); r(37, 25, 23, 10); r(41, 28, 15, 7, cream); line(25, 46, 48, 4); r(43, 43, 11, 12, cream); break;
      case 'target': r(29, 24, 39, 43, accent); r(24, 31, 49, 28, accent); r(35, 31, 27, 29, cream); r(30, 38, 37, 15, cream); r(41, 39, 15, 14, '#b7807c'); arrow(18, 43); break;
      case 'boots': r(27, 31, 17, 30, '#927d65'); r(24, 57, 29, 13, '#927d65'); r(54, 27, 17, 30, accent); r(51, 53, 28, 13, accent); line(31, 36, 9, 3, cream); line(58, 32, 9, 3, cream); line(24, 68, 29, 3); line(51, 64, 28, 3); break;
      case 'staff': r(43, 29, 7, 44, '#a58863'); r(35, 21, 23, 11, accent); r(39, 15, 15, 24, accent); r(43, 20, 7, 13, '#e4cee3'); break;
      case 'totem': r(37, 28, 24, 36, '#a98c67'); r(42, 64, 14, 10, '#a98c67'); r(29, 34, 40, 15, '#bd9d71'); r(35, 37, 9, 7, '#c3ce9e'); r(54, 37, 9, 7, '#c3ce9e'); r(45, 51, 8, 4); r(42, 18, 14, 10, '#a98c67'); break;
      case 'crab': r(32, 40, 32, 20, '#c08a77'); r(36, 35, 24, 30, '#c08a77'); r(20, 34, 13, 12, '#c08a77'); r(64, 34, 13, 12, '#c08a77'); r(21, 27, 5, 11, '#c08a77'); r(72, 27, 5, 11, '#c08a77'); r(39, 34, 4, 8); r(54, 34, 4, 8); for (let i = 0; i < 3; i++) { r(24, 48 + i * 8, 12, 3, '#ac7a68'); r(61, 48 + i * 8, 12, 3, '#ac7a68'); } break;
      case 'potion': r(39, 23, 19, 16, '#bec8b7'); r(31, 40, 35, 28, '#bec8b7'); r(36, 35, 25, 38, '#bec8b7'); r(35, 23, 27, 7, '#a58a67'); r(35, 54, 27, 11, '#c09bab'); r(42, 57, 5, 5, '#e5d1d9'); break;
      case 'rune': p('M34 21h29l9 20-5 31H29l-5-29z', '#a5aaa2'); p('M46 29h9l-7 14h10L43 64l3-15h-8z', '#c1b0d1'); break;
      default: throw new Error(`Missing illustration: ${kind}`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${esc(name)} için temsili piksel çizim" shape-rendering="crispEdges"><title>${esc(name)} — teselli kartı</title>${parts.join('')}</svg>\n`;
}

const normal = playableCollections(JSON.parse(await readFile(new URL('veri.json', root), 'utf8')));
const cards = {};
const assets = new Map();
for (const [ordinal, datasetId] of CONSOLATION_DATASET_IDS.entries()) {
  assert.equal(rows[datasetId].length, 10, datasetId);
  assert.equal(new Set(rows[datasetId].map(([name]) => name)).size, 10, datasetId);
  cards[datasetId] = [];
  for (const [offset, [isim, icon]] of rows[datasetId].entries()) {
    const stem = isim.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const gorsel = `assets/images/consolation/${stem}.svg`;
    // Repeated names in volume pairs or football decks use exactly the same art.
    if (!assets.has(gorsel)) {
      if (icon === 'source') {
        const source = normal[datasetId].find(card => card.isim === isim);
        assert.ok(source, datasetId + ': illustration source missing for ' + isim);
        const original = await readFile(new URL(source.gorsel, root), 'utf8');
        assets.set(gorsel, original.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(isim) + ' — teselli kartı</title>').replace('</svg>', '<rect x="2" y="2" width="92" height="92" fill="none" stroke="#d5b66d" stroke-width="4"/><rect x="16" y="79" width="64" height="12" fill="#f8edce"/><text x="48" y="88" text-anchor="middle" font-family="monospace" font-size="8" font-weight="bold" fill="#4c445a">TESELLI</text></svg>'));
      } else assets.set(gorsel, art(isim, icon, offset));
    }
    cards[datasetId].push({ id: 900001 + ordinal * 10 + offset, isim, gorsel, etiket: 'Teselli', teselli: true, ...(offset >= CONSOLATION_POOL_SIZE ? { teselliArsiv: true } : {}) });
  }
}
await mkdir(new URL('assets/images/consolation/', root), { recursive: true });
await Promise.all([...assets].map(([path, svg]) => writeFile(new URL(path, root), svg, 'utf8')));
// Expansion generators own their artwork; keep all reserve metadata in the
// same feed without regenerating those illustrations with unrelated motifs.
for (const source of ['tools/lifestyle-travel-cars-consolation.json', 'tools/lifestyle-culture-consolation.json']) {
  const extra = JSON.parse(await readFile(new URL(source, root), 'utf8'));
  for (const [datasetId, reserve] of Object.entries(extra)) {
    assert.ok(ALL_CONSOLATION_DATASET_IDS.includes(datasetId) && !cards[datasetId], `${datasetId}: unexpected reserve feed.`);
    const range = consolationRange(datasetId);
    assert.equal(reserve.length, 10, datasetId);
    assert.ok(reserve.every(card => card.teselli === true && card.id >= range.min && card.id <= range.max), datasetId);
    for (const card of reserve) await readFile(new URL(card.gorsel, root));
    cards[datasetId] = reserve;
  }
}
assert.deepEqual(Object.keys(cards).sort(), [...ALL_CONSOLATION_DATASET_IDS].sort());
await writeFile(new URL('tools/consolation-cards.json', root), JSON.stringify(cards, null, 2) + '\n', 'utf8');
console.log(`${Object.values(cards).flat().length} consolation records; ${assets.size} base illustrations plus the five collection-specific reserves.`);
