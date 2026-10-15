import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Original 96 px illustrations, drawn locally from simple pixel shapes.
// Names identify real places and historic models; no source photographs are copied.
const root = new URL('../', import.meta.url);
const travel = [
  ['Kaş', 'Deniz', 'coast'], ['Bodrum', 'Deniz', 'castle'], ['Çeşme', 'Deniz', 'castle'],
  ['Alaçatı', 'Deniz', 'windmill'], ['Fethiye', 'Deniz', 'lagoon'], ['Bozcaada', 'Deniz', 'island'],
  ['Santorini', 'Deniz', 'dome'], ['Maldivler', 'Deniz', 'bungalow'], ['Bali', 'Deniz', 'temple'], ['Amalfi', 'Deniz', 'cliff'],
  ['Kapadokya', 'Doğa', 'balloon'], ['Pamukkale', 'Doğa', 'terrace'], ['Uzungöl', 'Doğa', 'lake'],
  ['Ayder Yaylası', 'Doğa', 'chalet'], ['Kaz Dağları', 'Doğa', 'forest'], ['Salda Gölü', 'Doğa', 'saltlake'],
  ['Abant', 'Doğa', 'autumn'], ['Gökçeada', 'Doğa', 'island'], ['İsviçre Alpleri', 'Doğa', 'alps'], ['Norveç Fiyortları', 'Doğa', 'fjord'],
  ['İstanbul', 'Şehir', 'istanbul'], ['Paris', 'Şehir', 'paris'], ['Roma', 'Şehir', 'rome'],
  ['Barselona', 'Şehir', 'barcelona'], ['Prag', 'Şehir', 'prague'], ['Amsterdam', 'Şehir', 'amsterdam'],
  ['Venedik', 'Şehir', 'venice'], ['Londra', 'Şehir', 'london'], ['Kyoto', 'Şehir', 'kyoto'], ['Marakeş', 'Şehir', 'marrakesh'],
  ['Uludağ', 'Kış', 'ski'], ['Erciyes', 'Kış', 'volcano'], ['Palandöken', 'Kış', 'ski'],
  ['Kartalkaya', 'Kış', 'pines'], ['Sarıkamış', 'Kış', 'pines'], ['Kartepe', 'Kış', 'lift'],
  ['Ilgaz', 'Kış', 'pines'], ['Davos', 'Kış', 'alpine-village'], ['Bansko', 'Kış', 'alpine-village'], ['Chamonix', 'Kış', 'glacier'],
];
const cars = [
  ['BMW 320i E30', 'Sedan', 'sedan', '#ad6f70', 'bmw'], ['BMW M5 E39', 'Sedan', 'sedan', '#7785a5', 'bmw'],
  ['Mercedes-Benz W124', 'Sedan', 'long-sedan', '#afb6ae', 'mercedes'], ['Mercedes-Benz 190 E W201', 'Sedan', 'sedan', '#bba27a', 'mercedes'],
  ['Mercedes-Benz W140', 'Sedan', 'long-sedan', '#656d7c', 'mercedes'], ['Tofaş Şahin', 'Sedan', 'box-sedan', '#d4d5c3', 'tofas'],
  ['Tofaş Doğan SLX', 'Sedan', 'box-sedan', '#8ca99c', 'tofas'], ['Renault 9 Broadway', 'Sedan', 'box-sedan', '#b8b5a5', 'renault'],
  ['Volvo 240', 'Sedan', 'long-sedan', '#cfb068', 'volvo'], ['Opel Vectra B', 'Sedan', 'sedan', '#8696a7', 'opel'],
  ['Toyota Supra A80', 'Spor', 'round-coupe', '#d1a264', 'wing'], ['Nissan Skyline GT-R R34', 'Spor', 'box-coupe', '#849cbd', 'wing'],
  ['Mazda RX-7 FD', 'Spor', 'round-coupe', '#cfbe6e', 'popup'], ['Honda NSX NA1', 'Spor', 'wedge', '#bd7576', 'popup'],
  ['Honda S2000', 'Spor', 'roadster', '#bfccd0', 'open'], ['Mitsubishi Lancer Evolution VI', 'Spor', 'sedan', '#d0d4ca', 'wing'],
  ['Subaru Impreza WRX STI GC8', 'Spor', 'sedan', '#7799bb', 'rally'], ['Nissan Silvia S15', 'Spor', 'round-coupe', '#bfc4c4', 'wing'],
  ['Toyota AE86', 'Spor', 'fastback', '#ede7d7', 'panda'], ['Nissan 300ZX Z32', 'Spor', 'round-coupe', '#b86768', 'targa'],
  ['Volkswagen Golf GTI Mk1', 'Kompakt', 'hatch', '#b96f73', 'gti'], ['Volkswagen Golf Mk4', 'Kompakt', 'round-hatch', '#7f92b2', 'vw'],
  ['Peugeot 205 GTI', 'Kompakt', 'hatch', '#d1c8b0', 'gti'], ['Renault Clio Williams', 'Kompakt', 'round-hatch', '#7796b4', 'gold-wheel'],
  ['Renault 5 Turbo', 'Kompakt', 'hatch', '#ab7fa4', 'widebody'], ['Ford Escort RS Cosworth', 'Kompakt', 'hatch', '#d8d7cb', 'high-wing'],
  ['Honda Civic EK9', 'Kompakt', 'hatch', '#e4dfcd', 'red-seat'], ['Opel Corsa GSi A', 'Kompakt', 'hatch', '#b66c69', 'gsi'],
  ['Mini Cooper Klasik', 'Kompakt', 'mini', '#84a090', 'white-roof'], ['Fiat Uno Turbo', 'Kompakt', 'box-hatch', '#9daeb8', 'turbo'],
  ['Ford Mustang 1967', 'Kült', 'muscle', '#9db4af', 'stripe'], ['Chevrolet Camaro 1969', 'Kült', 'muscle', '#c99061', 'stripe'],
  ['Dodge Charger 1969', 'Kült', 'long-muscle', '#c28161', 'black-roof'], ['Porsche 911 Turbo 930', 'Kült', 'beetle-coupe', '#b9a4c3', 'ducktail'],
  ['Ferrari F40', 'Kült', 'wedge', '#c96f73', 'high-wing'], ['Lamborghini Countach', 'Kült', 'wedge', '#d6bf71', 'high-wing'],
  ['DeLorean DMC-12', 'Kült', 'wedge', '#b5c0bf', 'steel'], ['Volkswagen Beetle', 'Kült', 'beetle', '#c9b88a', 'vw'],
  ['Chevrolet Corvette C3', 'Kült', 'long-coupe', '#b9aa7f', 'targa'], ['Lancia Delta Integrale', 'Kült', 'box-hatch', '#c77a76', 'rally'],
];
const travelReserve = [
  ['Esenler Otogarı', 'bus'], ['AŞTİ', 'bus'], ['İzmir Otogarı', 'bus'], ['Harem Otogarı', 'bus'],
  ['Sabiha Gökçen Havalimanı', 'airport'], ['İstanbul Havalimanı', 'airport'], ['Kadıköy İskelesi', 'ferry'], ['Yenikapı İskelesi', 'ferry'],
  ['Haydarpaşa Garı', 'station'], ['Sirkeci Garı', 'station'],
];
const carReserve = [
  ['Fiat Multipla', 'multipla', '#9eaa83'], ['Renault Thalia', 'tall-sedan', '#a9b8b8'], ['Fiat Albea', 'tall-sedan', '#d5d0b9'],
  ['Daewoo Matiz', 'bubble', '#c3bc7d'], ['Hyundai Atos', 'tall-hatch', '#a5b6bc'], ['Lada Samara', 'box-hatch', '#c49785'],
  ['Škoda Favorit', 'box-hatch', '#9da98b'], ['Trabant 601', 'mini', '#b9c9b0'], ['Tata Nano', 'bubble', '#c7b07a'], ['Peel P50', 'micro', '#b27f89'],
];
const ink = '#484554', cream = '#f5edda', white = '#fff7df';
const shades = ['#b6d5d0', '#c2d4b4', '#d4c3a3', '#c6bfd7', '#d5bec2', '#afcad2', '#d5c8a7', '#b5c9bb'];
const colors = ['#bb7672', '#9da98a', '#d2ad72', '#9d9ab6', '#78a5a6', '#ad89a4'];
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
const slug = name => name.toLocaleLowerCase('tr').replaceAll('ı','i').replaceAll('ş','s').replaceAll('ğ','g').replaceAll('ü','u').replaceAll('ö','o').replaceAll('ç','c').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function canvas(name, i, reserve) {
  const parts = [], accent = shades[i % shades.length];
  const r = (x,y,w,h,fill=ink) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
  const p = (d,fill=ink) => parts.push(`<path d="${d}" fill="${fill}"/>`);
  const t = (value,x,y,size=7,fill=ink) => parts.push(`<text x="${x}" y="${y}" fill="${fill}" font-family="monospace" font-size="${size}" font-weight="bold" text-anchor="middle">${esc(value)}</text>`);
  r(0,0,96,96,cream); r(4,4,88,88,ink); r(7,7,82,82,accent); r(10,10,76,66,'#e6e8db');
  if(reserve){r(13,78,70,8,cream);t('TESELLI',48,85,7);} else {r(13,79,70,5,cream); for(let n=0;n<5;n++)r(16+n*14,80,8,3,accent);}
  return {parts,r,p,t,accent,end:()=>`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" shape-rendering="crispEdges" role="img" aria-labelledby="title"><title id="title">${esc(name)} — özgün piksel çizim</title>${parts.join('')}</svg>\n`};
}
function placeArt(name,kind,i,reserve=false){
  const {r,p,t,end}=canvas(name,i,reserve), sand='#e5d1aa', sea='#8ebfc5', leaf='#84a58a', stone='#beac92', snow='#f1f2e5';
  r(10,10,76,66,'#c7d9da'); r(65-i%3*7,18,10,10,'#e6ca8e'); r(61-i%3*7,21,18,4,'#e6ca8e');
  const cloud=(x,y)=>{r(x,y,19,5,white);r(x+5,y-3,10,4,white);}; cloud(15+i%4*7,17+i%3*2);
  const tree=(x,y,s=1,c=leaf)=>{r(x+5*s,y+13*s,3*s,13*s,stone);p(`M${x+6*s} ${y}l${9*s} ${15*s}h-${18*s}z`,c);p(`M${x+6*s} ${y+6*s}l${11*s} ${16*s}h-${22*s}z`,c);};
  const palm=(x,y)=>{r(x+5,y+6,3,27,'#a28b6e');p(`M${x+7} ${y+8}l-14-6-1 6 13 4-6 6 4 2 6-8 9 9 3-4-9-8 13-3-2-5z`,leaf);};
  const house=(x,y,w=16,h=17,c=white)=>{r(x,y,w,h,c);p(`M${x-2} ${y}l${w/2+2}-${6+i%3} ${w/2+2} ${6+i%3}z`,colors[i%6]);r(x+3,y+5,4,5,'#7e999f');r(x+w-6,y+h-8,4,8,'#8f8175');};
  const mountain=(x,y,w,h,c=leaf)=>p(`M${x} ${y+h}l${w/2}-${h} ${w/2} ${h}z`,c);
  if(['coast','castle','windmill','lagoon','island','dome','bungalow','temple','cliff'].includes(kind)){
    r(10,43,76,33,sea); for(let k=0;k<4;k++)r(15+(k*17+i*3)%57,52+k*5,12,2,'#d4e4d8');
    p('M10 48h15v5h13v5h18v7h30v11H10z',sand);
    if(kind==='lagoon'){p('M10 33h17v8h13v6h18v7h16v8H58v-5H42v-5H28v-6H10z',leaf);r(47,47,24,3,sand);}
    else if(kind==='dome'){house(18,39,23,24);r(18,37,23,5,'#779bb5');r(22,31,15,7,'#779bb5');r(26,27,7,6,'#779bb5');house(48,44,19,20);r(54,36,8,8,'#779bb5');}
    else if(kind==='bungalow'){r(37,50,3,20,stone);r(62,50,3,20,stone);house(33,36,36,22,'#c4a777');r(24,63,44,3,stone);palm(13,31);}
    else if(kind==='temple'){r(36,31,27,33,stone);for(let n=0;n<4;n++){const y=26+n*8;r(34-n*4,y,32+n*8,4,'#847c70');r(40,y-5,18,5,'#847c70');}palm(16,33);}
    else if(kind==='cliff'){p('M48 30h12v7h12v10h14v29H40z',stone);for(let n=0;n<4;n++)house(40+n*9,33+n*7,12,17,colors[n%6]);}
    else if(kind==='castle'){r(32,34,34,29,stone);for(let n=0;n<3;n++){r(28+n*17,28,9,35,stone);r(26+n*17,25,13,6,stone);r(30+n*17,39,4,6,ink);}r(45,49,9,14,'#897967');}
    else if(kind==='windmill'){house(34,39,23,25);r(43,23,4,27,stone);p('M42 36L23 20l-4 5 23 15 22 17 4-6-22-15 17-16-5-4z',white);house(13,52,15,16);}
    else if(kind==='island'){p('M11 55l18-17 17 8 17-17 23 24v13H11z',leaf);house(23,42,14,16);house(60,39,15,19);r(47,56,17,4,white);}
    else {house(23,38,20,25);house(48,43,18,21);palm(68,35);r(15,66,21,3,'#c49875');}
  }else if(['balloon','terrace','lake','chalet','forest','saltlake','autumn','alps','fjord'].includes(kind)){
    mountain(3,27,58,43,'#9ab5a6');mountain(40,21,55,48,'#8aa7a4');r(10,60,76,16,leaf);
    if(kind==='balloon'){r(10,59,76,17,'#c8a37e');for(let n=0;n<4;n++){const x=14+n*17;p(`M${x} 68l7-27 7 27z`,'#d5bc9a');r(x+3,49,8,4,'#e2cdb0');}r(42,18,17,15,'#c88f88');r(38,22,25,8,'#c88f88');r(47,19,7,17,'#e7cfab');r(47,36,7,5,stone);}
    else if(kind==='terrace'){r(10,36,76,40,'#d9e7e2');for(let n=0;n<4;n++){const x=10+n*7,y=39+n*9;r(x,y,76-n*7,8,white);r(x+3,y+2,63-n*7,3,sea);r(x,y+6,76-n*7,3,'#dedfcc');}}
    else if(kind==='forest'){for(let n=0;n<6;n++)tree(11+n*12,32+(n%2)*8,1,n%2?leaf:'#6f9884');r(40,68,15,8,sand);}
    else if(kind==='chalet'){house(37,44,28,23,'#b39c78');for(let n=0;n<3;n++)tree(12+n*27,35+n%2*7);r(38,55,25,3,'#876f5b');}
    else if(kind==='alps'){p('M3 70l27-46 12 21 16-29 34 54z','#8dabae');p('M18 45l12-21 12 21-11-5z',snow);p('M44 39l14-23 17 24-15-6z',snow);r(10,67,76,9,leaf);house(23,59,17,14);}
    else if(kind==='fjord'){p('M10 40l18-9 10 35H10z','#7f9c91');p('M86 28l-19 10-9 31h28z','#8aa18a');p('M38 52h18l15 24H22z',sea);r(37,68,22,4,white);r(46,62,4,6,stone);}
    else{r(18,53,61,18,kind==='saltlake'?'#a7ccd0':sea);p('M10 54h9v14h60v-9h7v17H10z',kind==='saltlake'?white:leaf);for(let n=0;n<3;n++)tree(13+n*26,37+n%2*7,1,kind==='autumn'?['#b58e62','#c4a36c','#aa9973'][n]:leaf);if(kind==='lake')house(48,43,14,18);}
  }else if(['ski','volcano','pines','lift','alpine-village','glacier'].includes(kind)){
    p('M4 75l28-47 15 19 17-29 28 57z','#a5b9be');p('M16 55l16-27 14 23-14-6z',snow);p('M51 40l13-22 15 23-15-6z',snow);r(10,65,76,11,snow);
    if(kind==='volcano'){p('M20 75l28-49 28 49z',snow);p('M40 40l8-14 8 14-9-4z','#9eb3b8');}
    if(kind==='pines'||kind==='ski'){tree(15,44,1);tree(66,46,1);}
    if(kind==='alpine-village'){house(15,56,21,18);house(45,51,25,23);r(13,54,26,3,snow);r(43,49,29,4,snow);}
    if(kind==='lift'||kind==='glacier'){r(25,31,3,35,stone);r(67,19,3,40,stone);p('M10 35l76-22v2L10 37z',ink);r(42,29,2,10,ink);r(35,39,17,10,'#bd8d84');r(37,41,13,4,white);}
    if(kind==='glacier'){p('M28 76l8-27 5 27h7l10-29 5 29z','#c4dad8');}
    else{r(50,59,4,7,'#a66d7a');r(47,65,9,3,ink);p('M41 73l23-6 1 2-23 6z','#b08e68');}
  }else if(['bus','airport','ferry','station'].includes(kind)){
    r(10,59,76,17,'#b7b9ad');
    if(kind==='bus'){r(17,29,62,30,stone);r(20,32,56,9,'#c8d7d5');t(name==='AŞTİ'?'ASTI':'OTOGAR',48,39,7);r(21,47,33,17,colors[i%6]);r(24,49,27,7,'#c8d9d7');r(23,61,6,7,ink);r(45,61,6,7,ink);r(60,43,14,20,'#8e9f9d');r(63,46,8,5,white);}
    if(kind==='airport'){r(13,43,66,17,'#bac4bb');r(19,48,52,6,'#8fa8ad');r(67,22,5,26,stone);r(61,19,17,10,'#8aa3b0');p('M19 28h14l14-13h4l-8 13h22l8 5h-27l8 12h-5L35 33H19z',white);}
    if(kind==='ferry'){r(10,56,76,20,sea);p('M18 49h62l-11 18H30z',cream);r(28,37,38,14,white);r(37,31,18,6,colors[i%6]);r(31,41,8,6,'#89a8b4');r(43,41,8,6,'#89a8b4');r(55,41,8,6,'#89a8b4');r(65,18,4,30,stone);r(58,22,11,3,stone);}
    if(kind==='station'){r(16,30,63,35,stone);r(13,25,18,43,stone);r(66,25,17,43,stone);p('M11 25l11-10 11 10z','#987675');p('M64 25l11-10 10 10z','#987675');r(38,43,20,23,'#829694');for(let n=0;n<4;n++)r(20+n*17,35,5,9,cream);r(34,65,28,3,'#8f9d9b');r(36,71,24,3,'#8f9d9b');}
  }else{
    r(10,62,76,14,'#bcbaaa');
    switch(kind){
      case'istanbul':r(22,48,48,18,stone);r(34,37,24,14,stone);r(38,32,16,8,stone);for(const x of [17,70]){r(x,28,4,37,stone);p(`M${x-2} 28l4-9 4 9z`,stone);}r(10,68,76,8,sea);break;
      case'paris':p('M43 18h9l2 21 5 20 12 14H25l13-14 4-20z',ink);p('M45 42h5l3 18H40z','#c7d9da');r(31,55,34,4,'#8f8580');r(27,68,42,4,'#8f8580');break;
      case'rome':r(15,38,67,30,'#c7ad87');r(21,32,55,7,'#c7ad87');for(let y=42;y<65;y+=11)for(let x=21;x<78;x+=11){r(x,y,6,8,'#8f8a7b');r(x+1,y-2,4,3,'#8f8a7b');}r(14,67,70,4,stone);break;
      case'barcelona':for(let n=0;n<5;n++){const x=23+n*10,y=22+(n%2)*8;r(x,y,6,44,stone);p(`M${x-2} ${y}l5-11 5 11z`,'#b99b80');}r(22,50,47,18,stone);r(40,55,11,13,'#8a8376');break;
      case'prague':house(15,43,23,25);house(57,39,24,29);r(39,29,16,41,stone);p('M36 29l11-17 11 17z','#8a8587');r(44,35,7,9,white);r(10,69,76,7,sea);break;
      case'amsterdam':case'venice':r(10,63,76,13,sea);for(let n=0;n<4;n++){house(12+n*19,37+(n%2)*5,17,29,colors[(i+n)%6]);if(kind==='amsterdam'){r(16+n*19,30+(n%2)*5,9,8,colors[(i+n)%6]);}}p('M27 69h34l-8 5H35z',ink);break;
      case'london':r(31,33,20,38,stone);r(28,27,26,7,stone);r(35,20,12,9,stone);p('M34 20l7-11 7 11z',stone);r(35,38,12,13,white);r(40,40,2,7,ink);r(41,45,5,2,ink);r(58,56,23,16,'#b97d7e');r(61,58,17,5,white);break;
      case'kyoto':r(19,45,58,7,'#b9786e');r(25,49,5,25,'#b9786e');r(65,49,5,25,'#b9786e');p('M15 37l34 4 34-4v7l-34 4-34-4z','#b9786e');tree(16,22,1,'#d6abb2');tree(65,22,1,'#d6abb2');break;
      case'marrakesh':r(18,35,60,33,'#c39575');r(58,20,13,48,'#b9876b');r(61,13,7,8,'#b9876b');r(30,49,24,19,'#8e7668');r(34,44,16,8,'#8e7668');r(62,30,5,8,cream);palm(13,29);break;
      default:house(24,38,45,29);break;
    }
  }
  return end();
}

function carArt(name,kind,color,detail,i,reserve=false){
  const {r,p,t,end}=canvas(name,i,reserve), glass='#bfd3d0', rim=detail==='gold-wheel'?'#c7ac6c':'#b3b9b2';
  r(10,10,76,49,'#cfd9d7');for(let n=0;n<4;n++)r(12+n*21,19+(n%2)*7,11,4,'#e8e7d9');
  r(10,59,76,17,'#aaa99f');r(10,72,76,2,'#d9d6c1');r(17,72,14,2,cream);r(47,72,14,2,cream);
  const configs={sedan:[16,81,29,61,37,20], 'long-sedan':[12,84,30,64,36,22], 'box-sedan':[15,82,30,61,37,20],
    'round-coupe':[12,85,33,64,38,18], 'box-coupe':[13,84,29,64,37,20],wedge:[10,87,43,65,40,16],roadster:[12,85,31,59,43,13],fastback:[13,84,30,62,37,20],
    hatch:[16,80,23,60,34,23], 'round-hatch':[17,80,25,61,35,22],mini:[21,77,29,59,34,23], 'box-hatch':[17,81,23,61,34,23],
    muscle:[10,87,33,64,38,20], 'long-muscle':[10,88,34,64,37,21], 'beetle-coupe':[13,84,35,62,36,21],beetle:[18,80,30,59,33,25], 'long-coupe':[10,88,38,65,39,19],
    multipla:[14,83,24,68,30,29], 'tall-sedan':[14,83,29,64,35,24],bubble:[23,77,29,61,34,25], 'tall-hatch':[21,78,28,62,28,31],micro:[32,68,38,58,30,30]};
  const [x1,x2,roof1,roof2,roofY,bodyH]=configs[kind]||configs.sedan, bodyY=roofY+bodyH-7;
  r(x1+2,bodyY+4,x2-x1-3,12,ink);
  if(['beetle','beetle-coupe','bubble'].includes(kind)){
    p(`M${x1} ${bodyY+14}v-9h6v-7h8v-9h8v-5h17v5h9v9h8v8h5v8z`,ink);
    p(`M${x1+3} ${bodyY+11}v-6h7v-7h8v-9h8v-3h11v4h9v9h8v7h5v5z`,color);
    p(`M${roof1+3} ${roofY+3}h14v14H${roof1-4}v-6z`,glass);r(roof1+17,roofY+7,9,10,glass);
  }else{
    p(`M${x1} ${bodyY+14}v-12h${roof1-x1-9}l9-${bodyY-roofY}h${roof2-roof1}l${x2-roof2-9} ${bodyY-roofY}h9v14z`,ink);
    p(`M${x1+3} ${bodyY+11}v-7h${roof1-x1-8}l8-${bodyY-roofY}h${roof2-roof1-3}l${x2-roof2-9} ${bodyY-roofY}h9v10z`,color);
    if(kind==='roadster'){r(roof1,roofY,roof2-roof1+3,8,'#cfd9d7');r(roof1+8,roofY+5,6,8,'#9d7275');r(roof1-3,roofY+1,4,13,ink);}
    else {p(`M${roof1+3} ${roofY+3}h${Math.max(7,roof2-roof1-6)}l${Math.min(11,x2-roof2-11)} ${bodyY-roofY-3}h-${Math.max(8,roof2-roof1+4)}z`,glass);r(roof1+Math.floor((roof2-roof1)/2),roofY+2,3,bodyY-roofY,ink);}
  }
  const frontWheel=kind==='micro'?57:Math.min(x2-13,68),rearWheel=kind==='micro'?40:Math.max(x1+12,28);
  const wheel=x=>{r(x-6,bodyY+6,12,12,ink);r(x-8,bodyY+9,16,6,ink);r(x-3,bodyY+9,6,6,rim);r(x-1,bodyY+11,2,2,ink);};
  r(x1+2,bodyY+10,x2-x1-4,3,detail==='panda'?ink:'#8f8c87');
  r(x1+1,bodyY+3,5,4,'#bb7a75');r(x2-6,bodyY+3,5,4,'#ece2b9');
  if(['wing','high-wing','rally'].includes(detail)){r(x1+4,bodyY-8,3,9,ink);r(x1,bodyY-(detail==='high-wing'?13:9),17,4,ink);}
  if(detail==='popup'){r(x2-12,bodyY-5,7,5,ink);r(x2-11,bodyY-4,5,3,white);}
  if(detail==='ducktail')p(`M${x1+1} ${bodyY+1}v-6h15v6z`,ink);
  if(detail==='white-roof')r(roof1,roofY,roof2-roof1,3,white);
  if(detail==='black-roof')r(roof1+1,roofY,roof2-roof1,3,ink);
  if(detail==='steel'){r(x1+8,bodyY+2,x2-x1-16,2,'#dee1d8');r(x1+11,bodyY+7,x2-x1-21,2,'#899b9a');}
  if(detail==='rally'){r(roof2+5,bodyY-2,7,2,ink);r(x1+18,bodyY+2,10,7,white);}
  if(detail==='gti'||detail==='gsi'||detail==='turbo')r(x1+4,bodyY+9,x2-x1-9,2,'#b96c69');
  if(detail==='widebody'){r(x1+7,bodyY+3,6,10,color);r(x2-16,bodyY+3,8,10,color);}
  if(detail==='stripe'){r(x1+8,bodyY+1,12,3,white);r(roof2+9,bodyY+1,11,3,white);}
  if(kind==='multipla'){r(roof2+1,roofY+10,9,4,'#ede5bc');r(x2-8,bodyY+6,6,4,'#ede5bc');r(x1+14,roofY+6,3,13,ink);}
  wheel(rearWheel);wheel(frontWheel);
  r(roof1+8,bodyY+2,5,2,ink);if(kind==='long-sedan'||kind==='sedan')r(roof2-3,bodyY+2,5,2,ink);
  const label=name.match(/E30|E39|W124|W201|W140|A80|R34|FD|NA1|GC8|S15|AE86|Z32|EK9|DMC-12|930|C3|F40/)?.[0]||name.split(' ').at(-1).slice(0,9).toLocaleUpperCase('tr');
  if(!reserve)t(label,48,23,7,'#687c7c');
  return end();
}

async function saveArt(folder,name,svg){
  assert(!/<(?:script|foreignObject|image)\b|https?:\/\/(?!www\.w3\.org\/2000\/svg)|on\w+=/i.test(svg),name);
  const path=`assets/images/${folder}/${slug(name)}.svg`;
  await mkdir(new URL(`assets/images/${folder}/`,root),{recursive:true});
  await writeFile(new URL(path,root),svg,'utf8');return path;
}
const data={'tatil-rotalari':[],'efsane-otomobiller':[]}, reserves={'tatil-rotalari':[],'efsane-otomobiller':[]};
for(let i=0;i<travel.length;i++){
  const [isim,etiket,kind]=travel[i];data['tatil-rotalari'].push({id:200001+i,isim,gorsel:await saveArt('tatil-rotalari',isim,placeArt(isim,kind,i)),etiket});
}
for(let i=0;i<cars.length;i++){
  const [isim,etiket,kind,color,detail]=cars[i];data['efsane-otomobiller'].push({id:201001+i,isim,gorsel:await saveArt('efsane-otomobiller',isim,carArt(isim,kind,color,detail,i)),etiket});
}
for(let i=0;i<10;i++){
  const [isim,kind]=travelReserve[i];reserves['tatil-rotalari'].push({id:900241+i,isim,gorsel:await saveArt('consolation',`tatil-rotalari-${isim}`,placeArt(isim,kind,i,true)),etiket:'Teselli',teselli:true,...(i>=8?{teselliArsiv:true}:{})});
  const [carName,carKind,color]=carReserve[i];reserves['efsane-otomobiller'].push({id:900251+i,isim:carName,gorsel:await saveArt('consolation',`efsane-otomobiller-${carName}`,carArt(carName,carKind,color,'',i,true)),etiket:'Teselli',teselli:true,...(i>=8?{teselliArsiv:true}:{})});
}
for(const [key,rows]of Object.entries(data)){
  assert.equal(rows.length,40,key);assert.equal(new Set(rows.map(x=>x.id)).size,40);assert.equal(new Set(rows.map(x=>x.isim)).size,40);
  const groups=Object.groupBy(rows,x=>x.etiket);assert.equal(Object.keys(groups).length,4);for(const group of Object.values(groups))assert.equal(group.length,10);
  assert.equal(reserves[key].filter(row=>!row.teselliArsiv).length,8);
}
await writeFile(new URL('tools/lifestyle-travel-cars.json',root),JSON.stringify(data,null,2)+'\n');
await writeFile(new URL('tools/lifestyle-travel-cars-consolation.json',root),JSON.stringify(reserves,null,2)+'\n');
console.log('Travel and cars: 80 normal cards, 16 active + 4 saved-room consolation cards, 100 original pixel SVGs.');
