// The first eight entries are dealt in new rounds. The final two keep saved
// ten-card rounds readable. These are playful table surprises, not ratings.
const football = [
  ['Sabri Sarıoğlu', 'portrait:spikes:olive:red:22'],
  ['Nicklas Bendtner', 'portrait:side:light:blue:52'],
  ['Emile Heskey', 'portrait:buzz:deep:white:18'],
  ['Bebé', 'portrait:short:brown:red:33'],
  ['Ali Dia', 'portrait:short:deep:blue:14'],
  ['Massimo Taibi', 'portrait:long:olive:green:1'],
  ['Yaya Sanogo', 'portrait:short:deep:red:22'],
  ['Boško Balaban', 'portrait:side:light:blue:19'],
  ['Park Chu-young', 'portrait:long:light:red:9'],
  ['Marouane Chamakh', 'portrait:crest:olive:white:29']
];
const turkey = [
  ['Orhan Şam', 'portrait:short:olive:yellow:67'],
  ['Bekir İrtegün', 'portrait:spikes:olive:yellow:4'],
  ['Serdar Kesimal', 'portrait:side:light:blue:53'],
  ['Alper Potuk', 'portrait:long:olive:yellow:26'],
  ['Sezer Öztürk', 'portrait:short:light:red:10'],
  ['Oğuzhan Özyakup', 'portrait:side:light:white:15'],
  ['Serdar Özkan', 'portrait:spikes:olive:white:21'],
  ['Aydın Yılmaz', 'portrait:short:light:red:7'],
  ['Batuhan Karadeniz', 'portrait:crest:light:white:9'],
  ['Yekta Kurtuluş', 'portrait:long:olive:red:35']
];
const dessert = [
  ['Sade Pelte', 'real:dessert:jelly'], ['Su Muhallebisi', 'real:dessert:pudding'],
  ['Sade Jöle', 'real:dessert:jelly'], ['Kabak Pestili', 'real:dessert:fruit'],
  ['İrmik Lapası', 'real:dessert:semolina'], ['Şekerli Ekmek', 'real:dessert:bread'],
  ['Hasuta', 'real:dessert:porridge'], ['Aside Tatlısı', 'real:dessert:porridge'],
  ['Pepeçura', 'real:dessert:grape'], ['Havuç Cezeryesi', 'real:dessert:carrot']
];
const meal = [
  ['Pırasa Haşlama', 'real:vegetable:leek'], ['Çiğ Bamya', 'real:vegetable:okra'],
  ['Kereviz Haşlama', 'real:vegetable:celery'], ['Lahana Haşlama', 'real:vegetable:cabbage'],
  ['Brokoli Haşlama', 'real:vegetable:broccoli'], ['Pirinç Lapası', 'real:dessert:semolina'],
  ['Soğan Haşlama', 'real:vegetable:onion'], ['Brüksel Lahanası', 'real:vegetable:sprouts'],
  ['Patates Haşlama', 'real:vegetable:potato'], ['Şalgam Yemeği', 'real:vegetable:turnip']
];
const games = [
  ['Goat Simulator', 'real:game:goat'], ['I Am Bread', 'real:game:bread'],
  ['Getting Over It', 'real:game:hammer'], ['QWOP', 'real:game:runner'],
  ['Flappy Bird', 'real:game:bird'], ['Octodad: Dadliest Catch', 'real:game:octopus'],
  ['Untitled Goose Game', 'real:game:goose'], ['Human: Fall Flat', 'real:game:human'],
  ['Bad Rats', 'real:game:rat'], ['Super Bunny Man', 'real:game:rabbit']
];
const characters = [
  ['Goomba', 'real:game:goomba'], ['Koopa Troopa', 'real:game:turtle'],
  ['Magikarp', 'real:game:fish'], ['Dan Hibiki', 'real:game:fighter'],
  ['Waluigi', 'real:game:waluigi'], ['Toad', 'real:game:toad'],
  ['Psyduck', 'real:game:duck'], ['Slippy Toad', 'real:game:frog'],
  ['Tingle', 'real:game:tingle'], ['Paimon', 'real:game:paimon']
];
export const realConsolationPools = {
  futbol: football,
  superlig: turkey,
  'turkiye-efsaneleri': turkey,
  'dunya-yildizlari': football,
  'tatli-vol1': dessert,
  tatli: dessert,
  'yemek-vol1': meal,
  yemek: meal,
  icecek: [
    ['Lahana Suyu', 'real:drink:green'], ['Turp Suyu', 'real:drink:pink'],
    ['Maydanoz Suyu', 'real:drink:green'], ['Kereviz Suyu', 'real:drink:green'],
    ['Pancar Suyu', 'real:drink:beet'], ['Salatalık Suyu', 'real:drink:cucumber'],
    ['Kekik Çayı', 'real:drink:tea'], ['Rezene Çayı', 'real:drink:fennel'],
    ['Ebegümeci Çayı', 'real:drink:hibiscus'], ['Üzüm Hoşafı', 'real:drink:grape']
  ],
  dizi: [
    ['Selena', 'real:series:magic'], ['Akasya Durağı', 'real:series:taxi'],
    ['Bez Bebek', 'real:series:doll'], ['Deniz Yıldızı', 'real:series:star'],
    ['Hepsi 1', 'real:series:group'], ['Sihirli Annem', 'real:series:wand'],
    ['Acemi Cadı', 'real:series:hat'], ['Cennet Mahallesi', 'real:series:street'],
    ['Türk Malı', 'real:series:house'], ['Arka Sokaklar', 'real:series:police']
  ],
  film: [
    ['Cumali Ceber: Allah Seni Alsın', 'real:film:ceber'], ['Laz Kit', 'real:film:western'],
    ["Keloğlan Kara Prens'e Karşı", 'real:film:castle'], ['Çılgın Dersane', 'real:film:school'],
    ['Dünyayı Kurtaran Adamın Oğlu', 'real:film:space'], ['Kutsal Damacana', 'real:film:water'],
    ['Enes Batur Hayal mi Gerçek mi?', 'real:film:camera'], ['Kolpaçino', 'real:film:dice'],
    ['Oğlum Bak Git', 'real:film:broom'], ['SüperTürk', 'real:film:hero']
  ],
  'yerli-sanatcilar': [
    ['Ajdar', 'real:singer:curly'], ['Atilla Taş', 'real:singer:short'],
    ['İsmail YK', 'real:singer:spikes'], ['Hilal Cebeci', 'real:singer:blonde'],
    ['Doğuş', 'real:singer:buzz'], ['Petek Dinçöz', 'real:singer:blonde'],
    ['Nihat Doğan', 'real:singer:long'], ['Mustafa Topaloğlu', 'real:singer:bald'],
    ['Ankaralı Namık', 'real:singer:short'], ['Çılgın Sedat', 'real:singer:short']
  ],
  'ankara-ilceleri': [
    ['Sincan', 'source'], ['Mamak', 'source'], ['Pursaklar', 'source'], ['Altındağ', 'source'],
    ['Bala', 'source'], ['Haymana', 'source'], ['Şereflikoçhisar', 'source'], ['Evren', 'source'],
    ['Güdül', 'source'], ['Kalecik', 'source']
  ],
  'istanbul-ilceleri': [
    ['Esenyurt', 'source'], ['Bağcılar', 'source'], ['Esenler', 'source'], ['Sultangazi', 'source'],
    ['Güngören', 'source'], ['Sultanbeyli', 'source'], ['Gaziosmanpaşa', 'source'], ['Arnavutköy', 'source'],
    ['Sancaktepe', 'source'], ['Pendik', 'source']
  ],
  'turkiye-sehirleri': [
    ['Yozgat', 'source'], ['Bayburt', 'source'], ['Bilecik', 'source'], ['Kırıkkale', 'source'],
    ['Çankırı', 'source'], ['Kırşehir', 'source'], ['Uşak', 'source'], ['Aksaray', 'source'],
    ['Karaman', 'source'], ['Niğde', 'source']
  ],
  ulkeler: [
    ['Tuvalu', 'flag:tv'], ['Nauru', 'flag:nr'], ['Kiribati', 'flag:ki'], ['Vanuatu', 'flag:vu'],
    ['Tonga', 'flag:to'], ['Samoa', 'flag:ws'], ['Palau', 'flag:pw'], ['Marshall Adaları', 'flag:mh'],
    ['Mikronezya', 'flag:fm'], ['Doğu Timor', 'flag:tl']
  ],
  'cocukluk-cizgifilmleri': [
    ['Teletabiler', 'real:series:group'], ['Dora', 'real:series:explorer'],
    ['Pocoyo', 'real:series:blue'], ['Bebefinn', 'real:series:baby'],
    ['CoComelon', 'real:series:melon'], ['Harika Kanatlar', 'real:series:plane'],
    ['Pororo', 'real:series:penguin'], ['Boonie Bears', 'real:series:bear'],
    ['Angela Anaconda', 'real:series:school'], ['Limon ile Zeytin', 'real:series:friends']
  ],
  'doksanlar-nostalji': [
    ['Karbon Kâğıdı', 'page'], ['Dantel Televizyon Örtüsü', 'television'],
    ['Plastik Terlik', 'boots'], ['Perdeli Sinek Kapısı', 'door'],
    ['Tahta Mandal', 'stick'], ['Gırgır Süpürge', 'toolbox'],
    ['Bakkal Veresiye Defteri', 'book'], ['Lastik Sapan', 'sling'],
    ['Eski Gazete', 'page'], ['Naylon Önlük', 'cape']
  ],
  'kantin-bakkal': [
    ['Sade Galeta', 'stick'], ['Sarı Leblebi', 'chickpea'], ['Tuzlu Leblebi', 'chickpea'],
    ['Pirinç Patlağı', 'cracker'], ['Kepekli Bisküvi', 'cookie'], ['Keçiboynuzu', 'carob'],
    ['Kavrulmuş Mısır', 'popcorn'], ['Sade Akide Şekeri', 'candy'],
    ['Kabak Çekirdeği', 'seed'], ['Nohut Şekeri', 'chickpea']
  ],
  oyunlar: games,
  'oyun-karakterleri': characters,
  'valorant-ajanlari': [
    ['Yoru', 'source'], ['Harbor', 'source'], ['Deadlock', 'source'], ['Astra', 'source'],
    ['Breach', 'source'], ['Brimstone', 'source'], ['Phoenix', 'source'], ['Chamber', 'source'],
    ['Neon', 'source'], ['Iso', 'source']
  ],
  'lol-sampiyonlari': [
    ['Teemo', 'source'], ['Yuumi', 'source'], ['Shaco', 'source'], ['Singed', 'source'],
    ['Dr. Mundo', 'source'], ['Rammus', 'source'], ['Amumu', 'source'], ['Heimerdinger', 'source'],
    ['Gragas', 'source'], ['Ivern', 'source']
  ],
  'oyun-evreni': [...games.slice(0, 2), games[3], games[4], characters[0], characters[2], characters[3], characters[4], games[8], characters[8]]
};
