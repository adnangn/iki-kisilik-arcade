import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Original code-drawn, offline 96 px artwork. Names identify real food,
// broadcasts or places; reserve status is a playful game mechanic only.
const root = new URL('../', import.meta.url);
const groups = {
  'sokak-lezzetleri': {
    first: 202001, reserve: 900261,
    rows: [
      ['Döner Dürüm','Ekmek Arası','wrap'], ['Tavuk Dürüm','Ekmek Arası','wrap'],
      ['Balık Ekmek','Ekmek Arası','fish'], ['Kokoreç','Ekmek Arası','sandwich'],
      ['Islak Hamburger','Ekmek Arası','burger'], ['Ayvalık Tostu','Ekmek Arası','toast'],
      ['Kumru','Ekmek Arası','sandwich'], ['Sucuk Ekmek','Ekmek Arası','sausage'],
      ['Köfte Ekmek','Ekmek Arası','meatball'], ['Tantuni','Ekmek Arası','wrap'],
      ['Falafel Dürüm','Ekmek Arası','falafel'], ['Şavurma','Ekmek Arası','wrap'],
      ['Philly Cheesesteak','Ekmek Arası','sandwich'], ['Bánh Mì','Ekmek Arası','sandwich'],
      ['Midye Dolma','Atıştırmalık','mussel'], ['Kumpir','Atıştırmalık','potato'],
      ['Patso','Atıştırmalık','fries'], ['Tavuk Pilav','Atıştırmalık','rice'],
      ['Nohutlu Pilav','Atıştırmalık','rice'], ['Söğüş','Atıştırmalık','bowl'],
      ['Arnavut Ciğeri','Atıştırmalık','bowl'], ['Çiğ Köfte','Atıştırmalık','cigkofte'],
      ['Haşlanmış Mısır','Atıştırmalık','corn'], ['Köz Mısır','Atıştırmalık','corn'],
      ['Kestane Kebabı','Atıştırmalık','chestnuts'], ['Patates Kızartması','Atıştırmalık','fries'],
      ['Çıtır Tavuk','Atıştırmalık','chicken'],
      ['Simit','Hamur İşi','simit'], ['Poğaça','Hamur İşi','bun'], ['Açma','Hamur İşi','simit'],
      ['Su Böreği','Hamur İşi','borek'], ['Çiğ Börek','Hamur İşi','empanada'],
      ['Lahmacun','Hamur İşi','flatbread'], ['Etli Ekmek','Hamur İşi','flatbread'],
      ['Gözleme','Hamur İşi','borek'], ['Taco','Hamur İşi','taco'],
      ['Empanada','Hamur İşi','empanada'], ['Samosa','Hamur İşi','samosa'],
      ['Dilim Pizza','Hamur İşi','pizza'], ['Pretzel','Hamur İşi','pretzel']
    ],
    reserves: [
      ['Sade Ekmek','bread'], ['Haşlanmış Patates','potato'], ['Çiğ Turp','radish'],
      ['Haşlanmış Yumurta','egg'], ['Haşlanmış Havuç','carrot'], ['Haşlanmış Brokoli','broccoli'],
      ['Yeşil Biber','pepper'], ['Kereviz Sapı','celery'], ['Kuru Peksimet','bread'], ['Galeta','bread']
    ]
  },
  'tv-yarismalari': {
    first: 203001, reserve: 900271,
    rows: [
      ['Kim Milyoner Olmak İster?','Bilgi','money','MILYONER'],
      ['Kim 500 Milyar İster?','Bilgi','money','500 MILYAR'],
      ['Kim 500 Bin İster?','Bilgi','money','500 BIN'],
      ['Çarkıfelek','Bilgi','wheel','CARKIFELEK'], ['Kelime Oyunu','Bilgi','letters','KELIME'],
      ['Passaparola','Bilgi','alphabet','PASSAPAROLA'], ['Riziko!','Bilgi','quiz','RIZIKO!'],
      ['En Zayıf Halka','Bilgi','chain','ZAYIF HALKA'], ["3'te 3",'Bilgi','quiz',"3'TE 3"],
      ['Altın Petek','Bilgi','honeycomb','ALTIN PETEK'], ['Lingo Türkiye','Bilgi','letters','LINGO'],
      ['Aileler Yarışıyor','Bilgi','family','AILELER'], ['Büyük Risk','Bilgi','quiz','BUYUK RISK'],
      ['Bir Kelime Bir İşlem','Bilgi','numbers','KELIME ISLEM'],
      ['O Ses Türkiye','Yetenek','microphone','O SES'],
      ['Yetenek Sizsiniz Türkiye','Yetenek','star','YETENEK'], ['Akademi Türkiye','Yetenek','piano','AKADEMI'],
      ['Popstar Türkiye','Yetenek','microphone','POPSTAR'], ['Popstar Alaturka','Yetenek','oud','ALATURKA'],
      ['Şarkı Söylemek Lazım','Yetenek','microphone','SARKI'], ['Buzda Dans','Yetenek','skate','BUZDA DANS'],
      ['Dans Eder misin?','Yetenek','dance','DANS'], ['Bir Şarkısın Sen','Yetenek','microphone','BIR SARKISIN'],
      ['Rising Star Türkiye','Yetenek','star','RISING STAR'], ['O Ses Çocuklar','Yetenek','microphone','O SES COCUK'],
      ["Türkiye'nin Yıldızları",'Yetenek','stage','YILDIZLAR'], ['Sen Türkülerini Söyle','Yetenek','saz','TURKULER'],
      ['Survivor','Rekabet','torch','SURVIVOR'], ['MasterChef Türkiye','Rekabet','chef','MASTERCHEF'],
      ['Yemekteyiz','Rekabet','plate','YEMEKTEYIZ'], ['Var mısın Yok musun?','Rekabet','box','VAR YOK'],
      ['Ben Bilmem Eşim Bilir','Rekabet','heart','ESIM BILIR'], ['Yaparsın Aşkım','Rekabet','heart','YAPARSIN'],
      ['İşte Benim Stilim','Rekabet','dress','STILIM'], ['Doya Doya Moda','Rekabet','dress','DOYA DOYA'],
      ['Gelinim Mutfakta','Rekabet','pot','MUTFAKTA'], ['Zuhal Topal’la Sofrada','Rekabet','plate','SOFRADA'],
      ['Fear Factor Türkiye','Rekabet','spider','FEAR FACTOR'], ['Kazanmak İçin 1 Dakika','Rekabet','clock','1 DAKIKA'],
      ['Wipeout','Rekabet','obstacle','WIPEOUT']
    ],
    reserves: [
      ['Gelin Evi','house','GELIN EVI'], ['Kuaförüm Sensin','scissors','KUAFORUM'],
      ['Temizlik Benim İşim','broom','TEMIZLIK'], ['En Hamarat Benim','pot','HAMARAT'],
      ['Pişir de Görelim','chef','PISIR'], ['Şanslı Pasaport','passport','PASAPORT'],
      ['Cevap Ver Türkiye','quiz','CEVAP VER'], ['Ben Eşimi Bilmez Miyim','heart','ESIMI BILIRIM'],
      ['Yaparsın Bilirim','star','YAPARSIN'], ['Saba ile Oyuna Geldik','dice','OYUNA GELDIK']
    ]
  },
  'ikonik-mekanlar': {
    first: 204001, reserve: 900281,
    rows: [
      ['Ayasofya','Türkiye','hagia'], ['Galata Kulesi','Türkiye','galata'], ['Kız Kulesi','Türkiye','maiden'],
      ['Sultanahmet Camii','Türkiye','mosque'], ['Anıtkabir','Türkiye','anitkabir'],
      ['Topkapı Sarayı','Türkiye','palace'], ['Dolmabahçe Sarayı','Türkiye','palace'],
      ['Efes Celsus Kütüphanesi','Türkiye','library'], ['Aspendos Tiyatrosu','Türkiye','theatre'],
      ['Sümela Manastırı','Türkiye','sumela'],
      ['Eyfel Kulesi','Avrupa','eiffel'], ['Big Ben','Avrupa','bigben'], ['Kolezyum','Avrupa','colosseum'],
      ['Pisa Kulesi','Avrupa','pisa'], ['Sagrada Familia','Avrupa','sagrada'],
      ['Louvre Müzesi','Avrupa','louvre'], ['Brandenburg Kapısı','Avrupa','gate'],
      ['Aziz Vasil Katedrali','Avrupa','basil'], ['Atina Akropolisi','Avrupa','temple'],
      ['Neuschwanstein Şatosu','Avrupa','castle'],
      ['Tac Mahal','Dünya','taj'], ['Gize Piramitleri','Dünya','pyramid'], ['Çin Seddi','Dünya','wall'],
      ['Özgürlük Heykeli','Dünya','liberty'], ['Kurtarıcı İsa Heykeli','Dünya','christ'],
      ['Sidney Opera Binası','Dünya','opera'], ['Burj Khalifa','Dünya','burj'],
      ['Petra','Dünya','petra'], ['Chichén Itzá','Dünya','itza'], ['Machu Picchu','Dünya','machu'],
      ['Tower Bridge','Köprü ve Anıt','towerbridge'], ['Golden Gate Köprüsü','Köprü ve Anıt','goldengate'],
      ['Boğaziçi Köprüsü','Köprü ve Anıt','bosphorus'], ['Sydney Harbour Bridge','Köprü ve Anıt','harbour'],
      ['Mostar Köprüsü','Köprü ve Anıt','mostar'], ['Stonehenge','Köprü ve Anıt','stonehenge'],
      ['Moai Heykelleri','Köprü ve Anıt','moai'], ['Rushmore Dağı','Köprü ve Anıt','rushmore'],
      ['Büyük Gize Sfenksi','Köprü ve Anıt','sphinx'], ['Merlion Heykeli','Köprü ve Anıt','merlion']
    ],
    reserves: [
      ['Esenler Otogarı','busstation'], ['AŞTİ','busstation'],
      ['Söğütlüçeşme Metrobüs Durağı','busstop'], ['Mecidiyeköy Metrobüs Durağı','busstop'],
      ['Kızılay Meydanı','square'], ['Bornova Metro İstasyonu','metro'],
      ['Konak Vapur İskelesi','pier'], ['Bostancı Vapur İskelesi','pier'],
      ['Kadıköy Boğa Heykeli','bull'], ['İzmir Saat Kulesi','clocktower']
    ]
  }
};

const ink='#4b4358', cream='#f6edcf', white='#fff9e9', sky='#d6e5d5';
const accents=['#aab98c','#c08d97','#88aaa8','#d0ad72','#a89abd','#88a6be','#bb9a78','#b0bd9a'];
const esc = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const slug=value=>value.toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function draw(name, collection, kind, index, caption, reserve=false) {
  const out=[],accent=accents[index%accents.length], gold='#dab875', brown='#a67a50', green='#91a574', red='#ba7972';
  const r=(x,y,w,h,f=ink)=>out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`);
  const p=(d,f=ink)=>out.push(`<path d="${d}" fill="${f}"/>`);
  const t=(v,x,y,s=7,f=ink)=>out.push(`<text x="${x}" y="${y}" text-anchor="middle" font-family="monospace" font-size="${s}" font-weight="bold" fill="${f}">${esc(v)}</text>`);
  const plate=()=>{r(17,66,62,5,'#c5b89e');r(23,62,50,6,white);};
  const arch=(x,y,w,h,f=cream)=>{r(x,y+5,w,h-5,f);r(x+3,y,w-6,h,f);};
  const windows=(x,y,cols,rows,dx=10,dy=12)=>{for(let a=0;a<cols;a++)for(let b=0;b<rows;b++)r(x+a*dx,y+b*dy,4,6,ink);};
  r(0,0,96,96,cream);r(4,4,88,88,ink);r(7,7,82,82,accent);r(11,11,74,64,collection==='ikonik-mekanlar'?sky:'#f0e5cd');
  if(collection==='sokak-lezzetleri') {
    plate();
    const specks=(n=10,color=gold)=>{for(let j=0;j<n;j++)r(24+(j*17+index*3)%45,35+(j*7)%23,3,2,color);};
    switch(kind){
      case 'wrap': case 'falafel': p('M26 27h44L59 65H37z',brown);p('M29 27h38L56 62H38z','#e3c796');p('M29 28h36l-4 10H32z',green);for(let j=0;j<5;j++)r(32+j*6,27+(j%2)*4,5,5,kind==='falafel'?'#99794c':index%2?'#d3a36d':'#9b6954');p('M32 43l26 4-5 16H37z',cream);break;
      case 'burger': r(23,36,50,26,brown);p('M23 37v-8h8v-7h34v7h8v8z','#d1a56a');r(25,39,46,6,green);r(24,47,48,8,'#845b48');r(25,57,46,8,'#cb9a62');specks(6,cream);break;
      case 'fish':case 'sandwich':case 'sausage':case 'meatball':
        p('M19 43l8-12h44l8 12v16l-8 8H27l-8-8z','#b78a57');r(22,43,54,12,cream);r(24,45,49,8,green);r(25,49,46,9,kind==='fish'?'#9caba9':red);for(let j=0;j<3;j++)r(31+j*13,49,9,7,kind==='meatball'?'#815941':kind==='sausage'?red:cream);if(kind==='fish'){p('M34 47h24v8H34l-7-4z','#b3c1ba');r(55,49,2,2);}specks(6);break;
      case 'toast':case 'borek':case 'bread':r(24,28,48,36,brown);r(28,30,40,30,'#e0bc82');for(let j=0;j<4;j++){r(31+j*9,33,3,23,'#b38755');if(kind==='borek')r(28,36+j*7,40,2,'#f5d8a4');}if(kind==='toast'){r(24,44,48,4,'#b27661');r(24,48,48,3,gold);}break;
      case 'mussel':for(let j=0;j<4;j++){let x=24+j%2*25,y=32+Math.floor(j/2)*21;p(`M${x} ${y}l16-5 8 10-10 11-16-5z`,'#676563');p(`M${x+3} ${y+3}l13-4 4 6-9 7-11-3z`,gold);}r(65,22,10,10,'#e4cb7f');break;
      case 'potato':p('M25 42l7-15h32l10 15-4 20H30z',brown);p('M31 34h32l6 16-7 11H34l-5-11z','#e1c488');r(33,40,30,14,cream);for(let j=0;j<10;j++)r(34+(j*7)%27,39+(j*5)%14,4,3,j%3===0?red:j%3===1?green:gold);break;
      case 'fries':p('M29 42h40l-6 24H35z',red);for(let j=0;j<6;j++)r(28+j*7,24+j%3*5,5,27,gold);r(39,52,20,5,cream);break;
      case 'rice':case 'bowl':case 'cigkofte':case 'chicken':
        r(22,48,52,7,accent);r(27,55,42,10,accent);r(32,64,32,4,accent);
        if(kind==='rice'){p('M26 47v-9h8v-7h28v7h8v9z',white);for(let j=0;j<10;j++)r(32+j%5*7,35+Math.floor(j/5)*7,4,3,index===18?gold:'#d6b984');}
        else if(kind==='cigkofte'){r(25,41,45,10,green);for(let j=0;j<5;j++){r(28+j*8,34+j%2*5,7,14,'#af7958');r(30+j*8,37+j%2*5,2,7,'#d19a6f');}}
        else{for(let j=0;j<8;j++){r(27+(j*9)%38,35+Math.floor(j/4)*9,10,8,kind==='chicken'?'#c09862':j%2?red:green);}}break;
      case 'corn':r(39,23,19,39,gold);for(let j=0;j<21;j++)r(40+j%3*6,25+Math.floor(j/3)*5,4,3,index%2?'#b28d55':'#f3d887');p('M38 57L25 43v15l17 10h13l16-20-17 11z',green);break;
      case 'chestnuts':for(let j=0;j<6;j++){let x=25+j%3*17,y=34+Math.floor(j/3)*20;p(`M${x} ${y}h11l4 5v9h-18v-9z`,'#835d44');r(x+1,y+4,7,3,gold);}break;
      case 'simit':case 'pretzel':r(25,26,45,37,brown);r(20,33,55,24,brown);r(34,35,27,19,'#f0e5cd');if(kind==='pretzel'){r(43,25,8,39,brown);p('M27 29l7-4 33 36-8 5z',brown);}specks(15,cream);break;
      case 'bun':p('M24 54V39l10-10h31l10 10v15l-10 10H34z','#c99c66');p('M31 36h33v7H31z','#deb981');for(let j=0;j<4;j++)r(34+j*8,32+j%2*5,2,3,cream);break;
      case 'flatbread':p('M20 40l11-13h37l10 13v14L67 64H32L20 54z','#d2ab70');p('M27 40l9-7h27l9 7v11l-9 6H36l-9-7z','#b8785a');specks(14,green);break;
      case 'empanada':p('M21 50l15-24h24l17 24-8 15H30z',gold);p('M25 50h47l-7 10H32z','#b88c59');for(let j=0;j<7;j++)r(27+j*6,54+j%2*3,3,3,cream);break;
      case 'taco':p('M21 59V43l12-16h29l13 16v16z',gold);p('M26 48l10-16h24l11 16z',green);for(let j=0;j<5;j++)r(30+j*8,36+j%2*6,5,6,red);r(22,50,52,12,'#e0bd76');break;
      case 'samosa':p('M21 61l27-38 27 38z',gold);p('M48 28l6 27-25 4z','#dfc58b');for(let j=0;j<6;j++)r(34+j*4,51+j%2*5,2,3,brown);break;
      case 'pizza':p('M26 27h44L48 68z',gold);p('M30 34h35L48 61z','#dba26c');for(const[x,y]of[[36,37],[52,38],[44,49]]){r(x,y,7,7,red);r(x+2,y+2,2,2,cream);}r(26,26,44,7,brown);break;
      case 'radish':r(34,34,27,25,'#bc7c8d');p('M35 53h25l-10 14h-7z',white);p('M46 35L30 25h14v-8h6v13l15-11-2 14-12 5z',green);break;
      case 'egg':p('M38 25h18l9 18v14l-9 9H37l-9-9V43z',white);r(39,45,17,15,gold);break;
      case 'carrot':p('M34 35h28L48 69z','#cf9b60');p('M45 36L34 21h8l6 11 8-15h8L53 37z',green);r(41,42,11,3,brown);break;
      case 'broccoli':r(43,45,12,24,'#a8b882');for(const[x,y]of[[23,31],[36,21],[50,24],[62,32]]){r(x,y,14,18,green);r(x-4,y+5,22,8,green);}break;
      case 'pepper':p('M34 30h28v22L49 67H34l10-9 6-19H34z',green);r(38,20,7,13,'#7d9164');break;
      case 'celery':for(let j=0;j<4;j++){r(33+j*8,31+j%2*5,5,35,'#a7b68b');r(28+j*8,22+j%2*5,14,13,green);}break;
      default: throw new Error(`Unknown food art ${kind}`);
    }
  } else if(collection==='tv-yarismalari') {
    r(15,18,66,48,ink);r(19,22,58,39,accent);r(29,63,39,5,ink);r(37,68,23,4,ink);
    const star=(x,y,size=10)=>p(`M${x} ${y-size}l3 ${size-3}h${size-1}l-${size-4} 5 2 ${size-1}-${size-6}-${size-5}-${size-5} ${size-5} 2-${size-1}-${size-4}-5h${size-1}z`,gold);
    switch(kind){
      case 'money':r(31,27,35,25,cream);t('₺',48,46,18);r(25,30,5,19,gold);r(68,30,5,19,gold);break;
      case 'wheel':p('M38 25h20l12 12v12L58 59H38L26 49V37z',gold);p('M48 26v31L29 46z',red);p('M48 26l19 12-19 7z',green);r(43,36,10,12,cream);p('M45 23h7l-4 8z');break;
      case 'letters':case 'numbers':case 'quiz':case 'alphabet':for(let j=0;j<6;j++){r(26+j%3*15,27+Math.floor(j/3)*14,13,12,cream);t((kind==='numbers'?['3','+','7','=','1','0']:kind==='quiz'?['?','A','B','C','D','?']:['K','E','L','I','M','E'])[j],32+j%3*15,36+Math.floor(j/3)*14,9);}break;
      case 'chain':for(let j=0;j<4;j++){r(26+j*11,32+j%2*9,14,12,gold);r(29+j*11,35+j%2*9,8,6,accent);}p('M42 26h5l-2 14h-5z',cream);break;
      case 'honeycomb':for(let j=0;j<7;j++){let x=30+j%3*15,y=28+Math.floor(j/3)*11;p(`M${x} ${y}h8l4 6-4 6h-8l-4-6z`,j%2?gold:cream);}break;
      case 'family':for(let j=0;j<3;j++){r(28+j*17,28,10,10,cream);r(25+j*17,40,16,13,j%2?red:gold);}break;
      case 'microphone':r(43,26,12,20,cream);r(40,31,18,10,cream);r(47,47,4,11);r(38,57,22,3);r(28,35,5,16,gold);r(66,29,5,21,gold);break;
      case 'star':case 'stage':star(48,40,16);r(24,50,48,4,cream);r(21,22,8,30,red);r(68,22,8,30,red);break;
      case 'piano':r(26,33,45,22,cream);for(let j=0;j<8;j++){r(27+j*5,34,1,19);if(j<7&&j%3!==2)r(30+j*5,34,3,11);}break;
      case 'oud':case 'saz':r(45,27,6,22,brown);r(34,44,28,15,gold);r(39,39,18,22,gold);r(44,47,8,7,ink);r(48,26,1,31,cream);break;
      case 'skate':r(33,28,14,18,cream);r(33,44,29,9,cream);r(28,55,39,3,ink);r(34,52,3,5);r(58,52,3,5);break;
      case 'dance':r(43,25,9,8,cream);p('M43 35h9l10 20H32z',red);p('M43 35L28 28l-2 5 15 8z',cream);p('M51 35l16-8 2 4-16 11z',cream);r(39,55,5,6,cream);r(53,55,5,6,cream);break;
      case 'torch':r(44,44,9,15,brown);p('M39 46V33l7-10v11l8-10 6 12-4 10z',gold);p('M46 45V34l8 5v6z',red);break;
      case 'chef':r(35,36,26,20,cream);r(31,30,34,10,cream);r(37,25,22,12,cream);r(35,51,26,4,red);break;
      case 'plate':r(31,27,34,28,cream);r(26,34,44,14,cream);r(36,32,24,18,gold);r(23,26,3,29);r(72,26,3,29);break;
      case 'box':r(31,31,35,24,gold);r(28,28,41,7,cream);r(45,30,7,24,red);t('?',48,48,13);break;
      case 'heart':p('M28 31h13l7 7 7-7h13v17L48 61 28 48z',red);r(32,34,7,3,cream);break;
      case 'dress':p('M38 27h8v5h6v-5h8l-3 14 11 18H29l12-18z',cream);r(40,40,17,4,gold);break;
      case 'pot':r(31,34,36,20,cream);r(26,37,6,9,gold);r(67,37,6,9,gold);r(32,29,34,4);r(43,25,12,4);break;
      case 'spider':r(41,35,16,15,ink);r(44,29,10,8,ink);for(let j=0;j<3;j++){p(`M42 ${37+j*5}H${28-j*3}v-4h4v2h10z`);p(`M56 ${37+j*5}H${69+j*3}v-4h-4v2H56z`);}r(46,31,2,2,cream);r(51,31,2,2,cream);break;
      case 'clock':r(32,26,32,30,cream);r(27,32,42,18,cream);r(47,31,3,14);r(48,43,12,3);t('60',48,55,7);break;
      case 'obstacle':for(let j=0;j<3;j++){r(27+j*18,35,13,14,red);r(29+j*18,32,9,20,red);r(29+j*18,55,9,6,cream);}break;
      case 'house':p('M28 39l20-16 22 16z',red);r(32,39,33,19,cream);r(44,45,9,13,brown);break;
      case 'scissors':r(31,30,11,11,cream);r(55,30,11,11,cream);r(34,33,5,5,accent);r(58,33,5,5,accent);p('M40 39l24 18-3 4-24-19z',cream);p('M57 39L32 57l3 4 25-19z',cream);break;
      case 'broom':p('M54 24h5L45 50h-5z',brown);p('M38 45h11l8 14H29z',gold);for(let j=0;j<5;j++)r(34+j*4,51,1,8,brown);break;
      case 'passport':r(34,25,28,33,'#6e8e9c');r(43,34,11,12,gold);r(39,50,18,3,gold);break;
      case 'dice':r(34,28,30,29,cream);for(const[x,y]of[[40,34],[53,34],[46,42],[40,49],[53,49]])r(x,y,4,4,ink);break;
      default:throw new Error(`Unknown TV art ${kind}`);
    }
    r(19,55,58,7,ink);t(caption||name.toUpperCase(),48,60,Math.min(6,58/(caption||name).length*1.5),cream);
  } else {
    r(12,66,72,9,'#b5c49f');r(68,16,9,9,'#e1c785');
    switch(kind){
      case 'hagia':case 'mosque':r(25,44,46,22,'#c9b89a');p('M32 44V32l7-8h19l8 8v12z','#b7a99b');r(43,19,12,8,gold);for(const x of kind==='mosque'?[17,26,68,77]:[18,75]){r(x,25,3,42,cream);p(`M${x-1} 25l3-9 3 9z`,ink);}arch(42,48,14,18,ink);windows(29,49,4,1);break;
      case 'galata':r(34,36,29,32,'#b9b49d');r(30,34,37,6,cream);p('M31 33l17-20 18 20z','#8b9b9b');r(45,10,5,8,ink);windows(39,43,2,2,12,12);break;
      case 'maiden':r(19,66,59,6,'#89adb6');r(34,45,30,21,cream);r(39,29,20,18,'#c6b18e');p('M36 29l13-13 13 13z','#8a8784');r(46,10,4,10,ink);windows(42,34,2,2,9,14);break;
      case 'anitkabir':r(19,58,58,9,cream);r(23,31,50,9,gold);for(let j=0;j<7;j++)r(25+j*7,40,4,18,'#d1ba8e');r(23,29,50,3,ink);r(16,66,64,4,'#c2b499');break;
      case 'palace':r(19,35,59,32,cream);r(16,32,65,5,gold);windows(24,40,6,2,9,12);r(40,51,17,17,'#baa88c');if(index===5){p('M31 34V26l6-7 6 7v8z',red);p('M54 34V26l6-7 6 7v8z',red);}else{r(43,23,11,10,gold);r(38,29,21,5,cream);}break;
      case 'library':case 'petra':r(21,29,54,39,kind==='petra'?'#c59b84':'#d2bd99');r(17,25,62,7,cream);for(let j=0;j<5;j++)r(25+j*10,33,4,31,cream);r(18,47,60,4,gold);p('M22 24l26-10 27 10z',kind==='petra'?'#d0aa8a':cream);arch(43,50,12,18,ink);break;
      case 'theatre':p('M17 37h62v32H17z','#c9b28e');for(let j=0;j<5;j++){r(22+j*5,40+j*5,52-j*10,3,cream);}r(40,57,16,10,'#a08f7d');break;
      case 'sumela':p('M15 70V29l16-15h23l25 34v22z','#9ba091');r(25,33,43,22,cream);windows(29,36,5,2,7,10);r(23,55,48,5,brown);r(42,60,7,10,cream);break;
      case 'eiffel':p('M45 14h6l3 25 18 29H58l-6-16h-8l-6 16H24l18-29z','#9b8b7f');r(34,45,28,4,ink);r(40,32,16,3,ink);p('M46 53h4l5 15H40z',sky);break;
      case 'bigben':r(36,29,25,39,'#c9ad78');p('M35 29l13-18 14 18z',brown);r(32,64,33,5,brown);r(39,31,19,18,cream);r(47,34,3,10,ink);r(48,42,7,3,ink);windows(40,53,2,1,10);break;
      case 'colosseum':p('M17 37l12-10h38l12 10v29H17z','#c8b18e');for(let j=0;j<7;j++){arch(22+j*8,35,5,9,'#8e8273');arch(22+j*8,50,5,12,'#8e8273');}r(18,46,60,3,cream);r(22,29,53,3,cream);break;
      case 'pisa':p('M42 20h23l-13 49H28z',cream);for(let j=0;j<6;j++){r(40-j*2,23+j*7,23,3,'#aaa394');r(44-j*2,26+j*7,3,4,ink);r(54-j*2,26+j*7,3,4,ink);}break;
      case 'sagrada':for(let j=0;j<4;j++){let x=25+j*13,y=17+(j%2)*7;r(x,y+9,8,48-j%2*7,'#c8af87');p(`M${x} ${y+9}l4-10 4 10z`,gold);}r(24,55,48,14,'#c7b092');arch(43,54,12,15,ink);break;
      case 'louvre':r(17,32,61,30,'#b9b19c');windows(22,38,7,2,8,10);p('M24 69l25-35 25 35z','#9ab7b7');p('M49 34v35H24z','#b3ceca');p('M30 61h38v2H30zM38 48h22v2H38zM48 36h2v32h-2z',cream);break;
      case 'gate':r(18,34,60,7,cream);for(let j=0;j<6;j++)r(23+j*9,41,5,26,'#c4ba9f');r(18,28,60,7,gold);r(36,22,25,6,'#87a49a');r(33,18,5,10,'#87a49a');r(61,18,5,10,'#87a49a');break;
      case 'basil':r(25,43,47,26,red);for(const[x,y,f]of[[23,31,green],[39,21,gold],[56,30,'#a0b6ac'],[68,39,'#bc8ba0']]){r(x,y,9,17,f);p(`M${x-3} ${y}l7-10 8 10z`,f);r(x+3,y-13,2,5,ink);}windows(29,52,4,1);break;
      case 'temple':p('M18 34l30-16 31 16z','#d1c2a1');r(19,35,60,5,cream);for(let j=0;j<7;j++)r(25+j*7,40,4,25,cream);r(17,65,63,5,'#c5b69b');break;
      case 'castle':r(25,39,48,28,cream);for(const[x,y]of[[24,28],[37,20],[61,25]]){r(x,y,11,40,cream);p(`M${x-3} ${y}l8-13 8 13z`,'#7892a0');}windows(29,44,4,2,10,12);break;
      case 'taj':r(25,43,46,25,cream);p('M32 43V33l9-11h15l9 11v10z',white);r(46,16,4,8,gold);for(const x of[18,75]){r(x,26,4,42,cream);r(x-2,24,8,4,gold);}arch(42,46,14,22,'#8d9d98');break;
      case 'pyramid':p('M16 68l29-45 29 45z',gold);p('M45 23v45h29z','#b3996d');p('M43 68l20-32 20 32z','#dac28d');p('M63 36v32h20z','#c2a773');break;
      case 'wall':p('M14 67l16-24 18 7 15-21 20 4v13l-17-3-16 23-18-8-13 17z','#b4ab93');for(let j=0;j<4;j++){let x=18+j*18,y=[56,43,47,30][j];r(x,y-10,10,17,'#c7bca1');r(x-2,y-13,14,5,cream);}break;
      case 'liberty':r(35,58,29,12,'#b7b396');p('M43 37h12l8 21H37z','#8aa79b');r(44,25,11,12,'#8aa79b');p('M42 26l-4-5 7 2 3-8 3 8 8-2-5 5z','#8aa79b');p('M43 37L32 23l4-3 12 18z','#8aa79b');r(31,15,5,9,gold);r(57,39,7,13,'#a0b6aa');break;
      case 'christ':p('M44 30h10l9 30H35z','#c2c4b3');r(43,19,13,12,'#c2c4b3');r(21,32,55,7,'#c2c4b3');p('M22 70l12-15h30l15 15z','#94a28b');break;
      case 'opera':r(16,62,65,7,'#acb4a4');p('M23 61l4-30 23 30z',cream);p('M39 61l9-42 22 42z',white);p('M55 61l12-30 12 30z',cream);p('M18 70h64v4H18z','#8fb0b3');break;
      case 'burj':r(43,36,12,34,'#a3b9b6');r(46,22,7,18,'#a3b9b6');r(49,11,2,13,'#a3b9b6');r(38,47,21,23,'#a3b9b6');r(32,60,33,10,'#a3b9b6');for(let j=0;j<7;j++)r(43,39+j*4,10,1,cream);break;
      case 'itza':for(let j=0;j<6;j++)r(20+j*4,61-j*6,57-j*8,7,'#c6b18c');r(39,22,19,10,'#bfa987');r(44,25,8,8,ink);p('M45 33h7v35h-7z',cream);break;
      case 'machu':p('M13 68l15-31 14 18 17-37 24 50z','#8ca68a');for(let j=0;j<5;j++){r(20+j*5,63-j*5,36,3,'#d1c49f');r(42+j*4,53-j*4,24,3,'#b4ba9c');}r(29,55,12,9,'#b3b79b');r(58,45,10,12,'#b3b79b');break;
      case 'towerbridge':r(24,31,13,37,'#c8c0a4');r(60,31,13,37,'#c8c0a4');p('M21 31l9-12 10 12z','#90a5aa');p('M57 31l9-12 10 12z','#90a5aa');r(17,56,62,5,ink);r(35,36,27,4,'#b4bda8');windows(28,38,1,2,10,12);windows(64,38,1,2,10,12);break;
      case 'goldengate':case 'bosphorus':r(24,23,5,47,kind==='goldengate'?red:cream);r(66,23,5,47,kind==='goldengate'?red:cream);r(17,54,62,5,kind==='goldengate'?red:cream);p('M28 28l19 21 20-21 2 3-21 23-22-23z',kind==='goldengate'?red:cream);for(let j=0;j<7;j++)r(31+j*5,36+Math.abs(3-j)*-3,1,18+Math.abs(3-j)*3,ink);r(15,68,68,4,'#8dabb0');break;
      case 'harbour':p('M16 55l5-14 12-14h31l13 14 5 14h-5L66 33H30L21 55z','#879a98');r(18,55,63,5,ink);r(18,39,7,29,'#c1b89e');r(74,39,7,29,'#c1b89e');for(let j=0;j<7;j++)r(30+j*6,32,2,23,'#879a98');break;
      case 'mostar':p('M17 62v-10l13-16 18-6 18 6 13 16v10H65V49L49 42 32 50v12z','#c4bfa3');r(18,33,10,26,cream);r(68,33,10,26,cream);r(17,64,62,8,'#8dafad');break;
      case 'stonehenge':for(const[x,y]of[[23,32],[43,30],[63,34]]){r(x,y,8,35,'#a5a798');r(x-2,y-6,17,8,'#a5a798');}r(31,50,8,17,'#b5b5a3');r(54,46,8,21,'#b5b5a3');break;
      case 'moai':for(let j=0;j<3;j++){let x=24+j*19,y=25+j%2*5;r(x,y,14,35,'#a0a28f');r(x-2,y+6,18,20,'#a0a28f');r(x+3,y+11,3,3,ink);r(x+8,y+11,3,3,ink);r(x+6,y+15,5,11,'#858c7f');r(x+3,y+29,9,2,ink);r(x-2,y+35,18,7,'#a0a28f');}break;
      case 'rushmore':p('M16 68V36l13-15h40l13 20v27z','#a4ac9b');for(let j=0;j<4;j++){let x=22+j*14;r(x,29+j%2*5,11,23,'#c7c8b5');r(x+2,35+j%2*5,2,3,ink);r(x+7,35+j%2*5,2,3,ink);r(x+4,39+j%2*5,3,6,'#a0a995');}break;
      case 'sphinx':r(24,49,48,15,'#c3aa7f');r(27,28,24,25,gold);p('M24 31l14-11 16 11v19H24z',gold);r(31,30,15,20,'#d5bc8f');r(33,36,3,3,ink);r(41,36,3,3,ink);r(36,40,5,6,'#b69b72');r(20,62,55,6,'#d1bc94');break;
      case 'merlion':p('M39 65V40h18l9 10-7 6 4 9z',cream);p('M35 38V25l10-7 17 10-7 13z',white);r(46,27,3,3,ink);p('M37 34L18 44v5l20-12z','#8eb4bc');for(let j=0;j<4;j++)r(41,46+j*4,15,2,'#c0ccbf');r(32,65,37,6,'#c8c5ae');break;
      case 'busstation':r(19,28,58,33,'#bdbaa4');r(16,23,64,7,cream);r(24,39,48,21,ink);r(29,45,36,17,accent);r(33,47,27,7,'#bfd5cb');r(32,60,5,7);r(57,60,5,7);t(name==='AŞTİ'?'ASTI':'OTOGAR',48,35,6);break;
      case 'busstop':r(20,29,56,6,ink);r(24,35,4,33,ink);r(69,35,4,33,ink);r(33,49,29,5,brown);r(37,54,4,14);r(57,54,4,14);r(38,37,19,9,cream);t('M',48,44,7);break;
      case 'square':r(17,57,62,12,'#c7c4b0');for(let j=0;j<3;j++){r(21+j*22,31+j%2*7,16,26-j%2*7,cream);windows(24+j*22,36+j%2*7,2,2,7,9);}r(44,47,8,15,red);break;
      case 'metro':r(22,30,52,36,'#b5c0b3');r(27,35,42,26,ink);r(33,40,30,21,accent);r(37,44,22,9,'#c4d8cb');r(44,64,8,5,cream);t('M',48,25,12);break;
      case 'pier':r(20,43,57,20,cream);p('M16 43l32-18 33 18z',red);windows(25,49,5,1,10);r(17,64,63,5,brown);for(let j=0;j<3;j++)r(17,69+j*3,63,1,'#8aacb2');break;
      case 'bull':p('M22 43h34l10 11 11-3v7H62L52 50H25z',brown);r(27,48,6,16,brown);r(50,48,6,16,brown);r(23,33,15,15,brown);p('M23 36l-8-11h5l9 8 8-9h5l-7 13z',gold);r(28,38,2,3,ink);r(20,65,57,5,'#c4b798');break;
      case 'clocktower':r(30,57,36,11,cream);r(38,32,21,25,cream);r(35,28,27,5,gold);r(41,17,15,12,cream);p('M38 17l10-8 11 8z',gold);r(44,34,10,10,gold);r(48,35,2,7,ink);break;
      default:throw new Error(`Unknown place art ${kind}`);
    }
  }
  r(13,78,70,8,cream);t(reserve?'TESELLI':collection==='sokak-lezzetleri'?'SOKAK LEZZETI':collection==='tv-yarismalari'?'TV YARISMASI':'IKONIK MEKAN',48,85,6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" shape-rendering="crispEdges" role="img" aria-label="${esc(name)}"><title>${esc(name)}</title>${out.join('')}</svg>\n`;
}

const normal={},reserves={};
for(const [collection,group] of Object.entries(groups)){
  assert.equal(group.rows.length,40,`${collection} normal count`);
  assert.equal(group.reserves.length,10,`${collection} reserve count`);
  assert.equal(new Set(group.rows.map(row=>row[0])).size,40,`${collection} unique names`);
  const tags=Object.groupBy(group.rows,row=>row[1]);
  assert.ok(Object.values(tags).reduce((sum,rows)=>sum+Math.floor(rows.length/3),0)>=11);
  await mkdir(new URL(`assets/images/${collection}/`,root),{recursive:true});
  await mkdir(new URL('assets/images/consolation/',root),{recursive:true});
  normal[collection]=[];reserves[collection]=[];
  for(const [index,[name,tag,kind,caption]]of group.rows.entries()){
    const path=`assets/images/${collection}/${slug(name)}.svg`;
    normal[collection].push({id:group.first+index,isim:name,gorsel:path,etiket:tag});
    await writeFile(new URL(path,root),draw(name,collection,kind,index,caption));
  }
  for(const[index,[name,kind,caption]]of group.reserves.entries()){
    assert.ok(!group.rows.some(row=>row[0]===name));
    const path=`assets/images/consolation/${collection}-${slug(name)}.svg`;
    reserves[collection].push({id:group.reserve+index,isim:name,gorsel:path,etiket:'Teselli',teselli:true,...index>=8?{teselliArsiv:true}:{}});
    await writeFile(new URL(path,root),draw(name,collection,kind,index,caption,true));
  }
}
await writeFile(new URL('tools/lifestyle-culture.json',root),JSON.stringify(normal,null,2)+'\n');
await writeFile(new URL('tools/lifestyle-culture-consolation.json',root),JSON.stringify(reserves,null,2)+'\n');
console.log('Generated 3 collections: 120 normal cards, 24 active and 6 archived reserve cards, 150 original local SVGs.');
