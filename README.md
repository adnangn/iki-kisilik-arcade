# İKİ KİŞİLİK

HTML, CSS ve Vanilla JavaScript ile geliştirilen, GitHub Pages üzerinde klasör altından çalışabilen nostaljik mini oyun SPA'sı. Yedi ana kategoride 23 seçilebilir koleksiyon bulunur. Oyun ana kategorisi Oyunlar, Oyun Karakterleri, Valorant Ajanları ve LoL Şampiyonları olarak dört ayrı havuz sunar. Vol. 1 seçkileri mevcut kartların kopyalarını kullanır; Vol. 2 tam havuzları içerir. Çevrimiçi odalar Firebase Authentication ve Realtime Database kullanır. Kör Sıralama ve O mu, Bu mu? izleyici beklemeden başlayabilir; arkadaş aynı kodla sonradan katılabilir. Uygulama sunucusu, build adımı veya bir framework gerekmez.

## Klasör mimarisi

```text
oyun/
├── index.html             # Lobi, bekleme odası, altı oyun modu, sonuç ekranları
├── styles.css             # Retro tema, Grid/Flex, 100dvh, mobil düzen
├── cooperative.css        # Frekans ve Çifte Sıralama'nın mobil piksel görünümü
├── app.js                 # SPA akışı, DOM, veri fetch, demo, reaksiyonlar
├── firebase-config.js     # Adoapp Firebase Web yapılandırması; emulator kapalı
├── veri.json              # Tek, salt okunur veri dosyası
├── metinler.json          # Metin Atölyesi ile hazırlanmış site metni değişiklikleri
├── metin-duzenleyici.html # Kod açmadan başlık/düğme/cümle düzenleme aracı
├── editor.css            # Metin Atölyesi'nin mobil retro görünümü
├── js/
│   ├── auction.js         # Saf ve deterministik açık artırma motoru
│   ├── blind-ranking.js   # 10 kart, kilitli sıralar ve aktif/izleyici yetkisi
│   ├── bracket.js         # 16/32 kart, 15/31 maç, 4/5 tur eleme ağacı
│   ├── team-draft.js      # İki bağımsız oyuncu, 11 tur, kilitli roller
│   ├── team-command.js    # Rakipten bağımsız, kendi eski atamasını reddeden işlem
│   ├── cooperative.js     # Ortak puan, seri bonusu ve sekiz kartlık uyum motoru
│   ├── cooperative-online.js # Gizli seçimler, özel sayaçlar ve kilitli kayıtlar
│   ├── cooperative-view.js # Ortak tur açılışı ve karşılaştırmalı sonuçlar
│   ├── game-setup.js      # Transaction dışında karıştırma ve aynı etiketli üçlüler
│   ├── game-view.js       # Turnuva geçmişi, aday kartlar ve takım/saha görünümü
│   ├── ranking-view.js    # Canlı ve sonuç ekranlarının ortak sıralama görünümü
│   ├── demo-bot.js        # Yalnız kendi sırasında teklif/pas yapan demo botu
│   ├── datasets.js        # Yedi kategori, 23 seçim ve eski odalar için arşiv
│   ├── texts.js           # Metin yükleme, güvenli şablonlar ve yerel önizleme
│   ├── text-catalog.js    # Düzenleyici alanları ve varsayılan metin kataloğu
│   ├── text-catalog-expansion.js # Kategori/koleksiyonlar ve tek oyuncu akışının 84 metin alanı
│   ├── text-editor.js     # Taslak, arama, önizleme ve JSON aktarımı
│   ├── invites.js        # Davet bağlantısı, kod ayrıştırma ve yerel QR
│   ├── next-game-view.js # Sonuç ekranındaki seçim ve hazır onayları
│   ├── next-game-command.js # Eşzamanlı onaylar ve eski onay koruması
│   ├── room-state.js      # Üyelik, sürüm kontrolü, tur ve rövanş geçişleri
│   ├── room-lifecycle.js # 7 günlük süre, kod rezervasyonu ve güvenli temizlik
│   └── firebase-room.js   # Kalıcı kimlik, transaction, dinleyiciler, presence
├── assets/
│   ├── images/            # Yerel piksel kartları, veri seti ve reaksiyon ikonları
│   │   ├── legends/       # 100 efsanenin özgün piksel portresi
│   │   ├── superlig/      # 100 Süper Lig oyuncusunun kulüp renkli portresi
│   │   ├── turkish-legends/ # Türkiye'de oynamış 120 kulüp ikonunun piksel portresi
│   │   ├── world-stars/   # 100 güncel dünya yıldızının piksel portresi
│   │   ├── desserts/      # Yeni tatlı kartları
│   │   ├── meals/         # Yeni ana yemek kartları
│   │   ├── drinks/        # 50 içecek için özgün piksel çizimleri
│   │   ├── series/        # Yeni dizi kartları
│   │   ├── movies/        # 50 film için özgün piksel sahneleri
│   │   ├── artists/       # 100 yerli sanatçı ve grubun temsili piksel çizimleri
│   │   ├── ankara/        # 25 ilçenin temsili mimari/doğa çizimleri
│   │   ├── istanbul/      # 39 ilçenin temsili mimari/doğa çizimleri
│   │   ├── cartoons/      # 60 çocukluk çizgi filmi ve karakterinin piksel çizimleri
│   │   ├── nostalgia/     # 35 okul/mahalle/teknoloji hatırasının piksel çizimleri
│   │   ├── snacks/        # 35 kantin/bakkal kartının temsili ürün çizimleri
│   │   ├── turkiye-cities/ # Türkiye'nin 81 ilinin temsili piksel manzaraları
│   │   ├── game-world/    # 60 karakter ve 40 oyun için temsili piksel çizimleri
│   │   ├── valorant/      # 29 ajan için özgün temsili piksel portreler
│   │   ├── lol/           # 173 resmi şampiyon ikonunun yerel piksel SVG uyarlaması
│   │   └── countries/    # 80 ülke bayrağı; flag-icons MIT bildirimi SVG'lerde
│   └── fonts/             # Yerel Press Start 2P / VT323 yazı tipleri ve OFL lisansları
├── firebase.rules.json    # RTDB erişim ve veri doğrulama kuralları
├── firebase.json          # İsteğe bağlı Firebase emulator ayarları
├── tests/
│   ├── auction.test.js
│   ├── blind-ranking.test.js
│   ├── bracket.test.js
│   ├── team-draft.test.js
│   ├── team-command.test.js
│   ├── cooperative.test.js # Puan, seri, sıra mesafesi ve bozuk durumlar
│   ├── cooperative-room.test.js # İki aktif oyuncu ve rövanş geçişleri
│   ├── cooperative-online.test.js # Özel kayıt, eski tıklama ve dinleyici kurtarma
│   ├── game-setup.test.js
│   ├── firebase-session.test.js # Bağlantı/kimlik/presence yaşam döngüsü
│   ├── demo-bot.test.js
│   ├── room-state.test.js
│   ├── football-data.test.js # Kart sayıları, metadata ve görsel dosyaları
│   ├── firebase-emulator.mjs # Önceki modların RTDB kuralları ve eşzamanlı yazmaları
│   └── cooperative-firebase.mjs # Gizli kayıt, sonuç doğrulama ve iki yeni mod
├── tools/
│   ├── serve.mjs          # Sadece bilgisayarda geliştirme önizlemesi
│   ├── preflight.mjs      # 24 veri havuzu, altı mod, yerel yollar ve çevrimiçi ayarlar
│   ├── build-site.mjs     # Yalnız çalışma dosyalarını artifacts/site içine kopyalar
│   ├── expansion-*.json  # Futbol/menü/kültür ek kartları ve kaynak kayıtları
│   ├── generate-expansion-*.mjs # İlk 12 Ekim genişlemesindeki 325 SVG'nin üreteçleri
│   ├── generate-turkey-icons.mjs # 120 kartın tarihî Türkiye kulüp formaları
│   ├── turkey-icons.json / turkey-icons-sources.json # Türkiye kartları ve kaynakları
│   ├── generate-world-stars-extra.mjs # 50 yeni güncel futbolcu portresi
│   ├── world-stars-extra.json / world-stars-extra-sources.json # Ek kartlar ve kaynakları
│   ├── generate-culture-extra.mjs # 50 sanatçı ve 39 İstanbul ilçesinin çizimleri
│   ├── culture-extra.json / culture-extra-sources.json # Ek kartlar ve kaynakları
│   ├── generate-nostalgia-sets.mjs # Üç nostalji setindeki 130 SVG
│   ├── nostalgia-sets.json / nostalgia-sets-sources.json # Kartlar ve kaynak notları
│   ├── generate-games-geo.mjs # 81 şehir, 100 oyun kartı ve 80 ülke bayrağı
│   ├── games-geo.json / games-geo-sources.json # Kartlar, kaynaklar ve bayrak lisansı
│   ├── generate-valorant-agents.mjs # 29 özgün 96×96 ajan portresi
│   ├── valorant-agents.json / valorant-agents-sources.json # Ajanlar, dört rol ve resmi referanslar
│   ├── generate-lol-champions.mjs # Data Dragon 16.20.1 ikonlarının 173 piksel uyarlaması
│   ├── lol-champions.json / lol-champions-sources.json # Şampiyonlar, altı sınıf ve üretim anlık görüntüsü
│   ├── collection-volumes.json # Vol. 1 için mevcut tatlı/yemek kartı ID seçkileri
│   └── integrate-expansion.mjs # 24 havuzu veri.json'a birleştirir ve RTDB koleksiyon listesini üretir
├── .github/workflows/pages.yml # Kontrol, test ve statik Pages yayını
├── package.json           # Önizleme ve test komutları; runtime bağımlılığı yok
├── .nojekyll              # GitHub Pages için
└── .gitignore
```

## Metin Atölyesi

Lobinin altındaki **Metin Atölyesi** bağlantısını açın. Başlık, slogan, düğme, koleksiyon açıklaması, oyun içi mesaj veya oyun kuralını arayıp ilgili kutuda değiştirin. Değişiklikler bu tarayıcıda otomatik taslak olarak saklanır. Oyuncu adı ve sayaç gibi otomatik doldurulan `{player}`, `{count}` alanları korunmalıdır; düzenleyici bunları kontrol eder.

**Önizlemeyi aç** yalnız `?metin-onizleme=1` adresindeki sayfaya bu cihazın taslağını uygular. Normal adres ve diğer oyuncular yayımlanmış metinleri görmeye devam eder. Önizlemeyi kapatıp oyun sayfasını yenileyerek normal metinlere dönebilirsiniz. Oyun verisi ve Firebase oturumu bu araçla değiştirilmez.

**Metinleri indir** bir `metinler.json` dosyası üretir. Herkesin değişiklikleri görmesi için depodaki aynı dosyayı bununla değiştirin ve GitHub Pages yayınının tamamlanmasını bekleyin. Daha sonra bu dosyayı **Dosyadan yükle** ile tekrar düzenleyebilirsiniz. GitHub Pages statik olduğu için düzenleyicideki taslak kaydı doğrudan GitHub'a dosya yazmaz.

Varsayılanlar `js/text-catalog-static.js`, `js/text-catalog-runtime.js`, `js/text-catalog-expansion.js` ve `js/text-catalog-cooperative.js` içinde merkezi olarak tutulur; `metinler.json` yalnız değişiklikleri içerir. Düzenleyici **552 alan** sunar. Oda ve davet kataloğundaki 33 alan yeni oyun seçimi, hazır onayı ve QR/davet mesajlarını özelleştirir. Birlikte oynama kataloğunun 71 alanı Frekans ve Çifte Sıralama kurallarını, düğmelerini, bekleme mesajlarını ve sonuçlarını özelleştirir. Genişleme kataloğunun 84 alanı yeni kategori/koleksiyonları, Oyun altındaki dört havuzu, Vol. 1/Vol. 2 seçimini ve izleyici beklemeden başlama açıklamalarını içerir. 12 Ekim 2026 tarihli `metinler (4).json` aktarımındaki **28 özelleştirme** depodaki `metinler.json` dosyasına uygulanmıştır ve sonraki genişlemelerde korunmuştur. Hiç değişiklik yoksa `{"version":1,"texts":{}}` yeterlidir. Bilinmeyen alan, eksik otomatik alan veya geçersiz metin içeren dosya reddedilir; metinler HTML olarak çalıştırılmaz. Yayın hazırlık kontrolü bu dosyayı da doğrular.

## Oynanabilir modlar

Lobi, 6 rakamlı kodla oda kurma/katılma, bekleme ekranı, altı oyun modu ve aynı kodla rövanş hazırdır. 23 seçilebilir koleksiyonun tamamı altı modla kullanılabilir. Açık Artırma, Start, Bench, Cut, Frekans ve Çifte Sıralama iki aktif oyuncu bağlanınca başlar. Kör Sıralama ve O mu, Bu mu? odasını kuran oyuncu izleyici gelmeden **Oyunu Başlat** diyebilir ve tek başına devam edebilir; boş ikinci koltuğa aynı kodla sonradan katılan kişi oyunun o anki durumunu izler. Bu katılım oyunu yeniden başlatmaz.

Her oyuncu 20 TL ve beş kartlık kontenjanla başlar. Açılış teklifini sistem 1 TL olarak yapar, hamle diğer oyuncuya geçer. Tam sayı teklif mevcut fiyattan büyük ve oyuncunun bütçesi içinde olmalıdır. Pas, son teklif sahibine kartı verir ve yalnızca kazananın bütçesini düşürür. Yeni kartta açılış sırası değişir. Açılış ve fiyat artırma kart satın almaz; bütçe yalnızca gerçek bir Pas hamlesiyle kapanan açık artırmada düşer. Her normal Pas bir açık artırmayı kapatır; son kapanışta eksik kadrolar için sürpriz kartlar da dağıtılabilir. Bir oyuncunun bütçesi veya kontenjanı dolsa bile sonraki kartlar otomatik dağıtılmaz; o oyuncu sırası geldiğinde Pas diyerek kartı son teklif sahibine bırakır. Teklif veremeyen oyuncunun açılış sırası, açılış yapabilen rakibine geçer. İki oyuncu da kart alamayınca kalan karıştırılmış desteden ücretsiz kartlar dağıtılır, iki kadro da beşe tamamlanır ve sonuç ekranı açılır. Puanlama ölçütü tanımlanmadığı için sonuç ekranı kadroları ve kalan bütçeyi karşılaştırır.

**Açık artırmada kadro tamamlama:** Bütçesi sıfır olan oyuncunun eksik kadrosu, rakibin normal açık artırmalarını bitirmesinden sonra kullanılmamış rastgele kartlarla tamamlanır. İki bütçe de sıfırlanırsa ikisinin de eksikleri aynı şekilde tamamlanır. Kartlar `price: 0, source: 'completion'` ve `completionAwards` ile işaretlenir; bütçeden ücret düşmez, sonuçta SÜRPRİZ rozeti görünür. Yeni rastgelelik transaction içinde üretilmez; önceden karıştırılmış destenin kalan benzersiz kartları kullanılır. Kartlar tekrarlanmaz ve kontenjan aşılmaz. Her gerçek koleksiyonda en az 20 kart vardır; kısa yapay test desteleri tükendiğinde kart türetilmez.

Kör Sıralama, aynı 23 seçilebilir koleksiyonun kartlarını ve yerel görsellerini kullanır. Karıştırılan havuzdan 10 kart seçilir; ekranda yalnızca mevcut kart gösterilir. Aktif oyuncu kartı 1–10 arasındaki boş bir sıraya yerleştirir (1 en iyi, 10 en alt); dolu sıra kilitlenir, sonraki kart açılır. İzleyicide seçim düğmeleri gizlenir, mevcut kart ve sıralama anlık güncellenir; reaksiyonlar kullanılabilir. Onuncu seçimde tam liste sonuç ekranında gösterilir. Rövanş oda kodunu korur ve yeni 10 kart seçer. İkinci oyuncu varsa sıralayan/izleyen rolleri değişir; henüz kimse katılmadıysa oda sahibi aktif kalır.

**O mu, Bu mu?** lobide seçilen 16 veya 32 benzersiz kartla başlar. 16 kart 4 tur/15 seçim, 32 kart 5 tur/31 seçim gerektirir. 32 karttan küçük koleksiyonlarda büyük seçenek kapalıdır ve açıklama gösterilir. Seçilen büyüklük odada saklanır ve rövanşta korunur; eski büyüklük alanı olmayan odalar 16 kartla devam eder. Aktif oyuncu her eşleşmede iki karttan birini seçer; kazananlar büyük turnuvada son 32, ardından son 16, çeyrek final, yarı final ve final sırasıyla üst tura çıkar. 15 veya 31 seçim sonunda tek şampiyon ve dört turluk şampiyonluk yolu gösterilir. İzleyici kartları ve tur geçmişini görür, seçim yapamaz. Rövanşta ikinci oyuncu varsa aktif oyuncu değişir; izleyici katılmadıysa oda sahibi aktif kalır. Demoda bot turnuvayı oynarken izlersin.

**Start, Bench, Cut** her oyuncu için 11 bağımsız turdan oluşur. İki oyuncu aynı etiketli üçlü dizisini kullanır; her oyuncunun tur indeksi ayrı tutulur. Önce bir kart seçilir, sonra boş Start/Bench/Cut rolüne atanır. Kart ve rol bu tur için kilitlenir; üçüncü atama kendi sonraki turunu açar. İlk bitiren diğerini bekler. İki taraf da 11 turu tamamlayınca yalnızca Start seçimleri üstlü/altlı piksel saha üzerinde sergilenir. Bir düello puanlama kuralı belirtilmediği için otomatik kazanan ilan edilmez.

Üçlü üretiminde aynı etiketten en az üç kart içeren gruplar kullanılır. Futbol koleksiyonlarında 11 turun tam biri KL etiketli kaleci üçlüsüdür; havuz yenilense de kaleci tekrar gelmez. Diğer 10 turda saha oyuncuları bulunur. Kaleci havuzu olmayan koleksiyonlar genel etiket kuralıyla devam eder. Her üçlüde üç farklı kart bulunur. Mevcut uygun havuzdan artık üçlü çıkmıyorsa havuz yeniden karıştırılır; bu nedenle küçük koleksiyonlarda bir kart farklı turlarda tekrar aday olabilir ve farklı Start seçimlerinde yeniden bulunabilir. Bu kural `reusePolicy: 'pool-reset'` olarak odada saklanır; rövanş yeni 11 üçlüyle başlar.

**Frekans** seçilen koleksiyondan 20 benzersiz kartla 10 bağımsız eşleşme oluşturur. İki oyuncu aynı çiftten gizlice seçim yapar; cevaplar kilitlenir ve ikisi seçince birlikte açılır. Aynı seçim ortak kasaya 100 puan ekler, farklı seçim seriyi sıfırlar. Kesintisiz serinin 5. ve 10. eşleşmeleri ayrıca 250 puan verir; 10 tam uyum 1.500 puandır. Açılan seçimleri görmek için süre baskısı yoktur; iki oyuncudan biri **Sonraki eşleşme** ile ilerletir. Sonuçta ortak puan, uyumlu eşleşme sayısı ve en uzun seri gösterilir.

**Çifte Sıralama** aynı sekiz kartı aynı sırayla tek tek gösterir. İki oyuncu bağımsız hızda kendi gizli 1–8 yuvalarını doldurur; seçilen yuva kilitlenir. Diğerine yalnız tamamlanan kart sayısı görünür. İlk bitiren bekler, iki liste de tamamlanınca yan yana açılır. Uyum yüzdesi kartların sıra farklarının toplamı üzerinden `round(100 × (1 − mesafe / 32))` ile hesaplanır: aynı listeler %100, tam ters listeler %0, bitişik iki kartın yer değiştirmesi %94. Sonuç kartların farklarını büyükten küçüğe gösterir; kişisel kazanan ilan edilmez.

İki yeni modda gizli kayıtlar, ortak odadan ayrı `privateGames/{code}/r{round}` altında tutulur. Firebase kuralları kendi kaydını okumaya ve ilerleme sayacını paylaşmaya izin verir; diğer oyuncunun seçimleri Frekans eşleşmesinde ikisi kilitlenmeden, sıralamada ikisi sekiz kartı bitirmeden okunamaz. Hamleler transaction kullanır, önceki kartın veya rövanşın gecikmiş tıklaması sonraki karta uygulanmaz. Odadan çıkmak kimliği korur; yenileme ve aynı kodla dönüş kendi gizli seçimlerini geri getirir. Oturum kapatmak anonim kimliği bırakır. Rövanş aynı kodla yeni kartlar ve ayrı bir özel tur kaydı oluşturur. Bir oyuncu kopunca yeni seçim düğmeleri bağlantı geri gelene kadar bekler.

Yeni bir veri setinin altı modda da kullanılabilmesi için 20–200 benzersiz kart ve aynı etiketten en az üç kart içeren bir grup gerekir. Kör Sıralama motorunun alt sınırı 10, Çifte Sıralama'nın 8'dir. Hazırlık kontrolü 23 seçilebilir koleksiyonu ve eski odalar için korunan bir arşiv havuzunu bu koşullara göre denetler.

## Aynı odada yeni oyun ve davet

Sonuç ekranındaki **Aynı odada devam** bölümünde kategori, koleksiyon, oyun ve gerekirse 16/32 kartlık turnuva seçilir. **Seçimi paylaş** mevcut sonuçları değiştirmeden seçimi iki oyuncuya gösterir. Her oyuncu yalnız kendi **Hazırım** onayını verir; son onay yeni turu tek transaction ile açar. Oda kodu, oyuncu kimlikleri ve bağlantı korunur; tur bir artar, başlangıç/aktif rol değişir. Seçim değiştirilirse iki onay sıfırlanır. Oyuncu kendi onayını geri alabilir. Paylaşılan bir seçim beklerken eski Rövanş düğmesi onayları atlayamaz.

Aynı anda verilen iki onay, aynı seçime ait oldukları sürece birleşir. Eski seçim, aynı oyuncunun çift tıklaması veya hazır/geri alma döngüsünden kalan gecikmiş onay yeni tura taşınmaz. Kör Sıralama/turnuva tek oyuncuyla yeni bir tek oyunculu oyuna geçebilir. İki aktif oyunculu hedef için ikinci oyuncu ve iki onay gerekir. İzleyici sonradan aynı kodla katılabilir. Yenilemede paylaşılan seçim ve onaylar Firebase'den geri gelir. Demoda Atari Bot kendi onayını verir.

Oda ve sonuç ekranlarındaki **Davet et** bağlantıyı ve QR kodunu gösterir. Adres GitHub Pages alt klasörünü korur ve yalnız `?oda=123456` kodunu içerir. Davetle açılan sayfa kodu doldurur; kullanıcı adını yazıp Katıl der. Farklı bir davet açıldığında eski kayıtlı oda kendiliğinden öne geçmez. QR cihazda üretilir, oda kodu bir QR servisine gönderilmez. Destekleyen cihazlarda sistem paylaşım menüsü açılabilir; clipboard kullanılamıyorsa bağlantı seçilerek elle kopyalanır.

QR üretimi resmi MIT lisanslı `qrcode-generator` kaynaklarıyla yapılır. Lisans ve kaynak bilgileri `js/vendor/` içindedir. Orta hata düzeltme ve dört modüllük beyaz boşluk kullanılır. Üretim, yerel, uzun alt klasör ve Türkçe adresleri içeren dört gerçek SVG, bağımsız QR okuyucuyla başarıyla çözüldü.

Bu ekleme **211 birim testi** ve **76 + 24 + 11 + 14 = 125 Firebase emülatör kontrolü** ile doğrulandı. Yeni güvenlik kontrolü 36 mod geçişini, tüm seçilebilir koleksiyonları, sahte onayları, sonuçların değiştirilmesini, eski tur yazılarını ve silme kilidini kapsar. GitHub Pages yayını ile canlı Firebase kural yayını aynı sürüm için tamamlanmalıdır.

## Yerel önizleme

Node.js 20.11 veya üzeriyle proje klasöründe:

```sh
npm start
```

[Yerel önizlemeyi aç](http://127.0.0.1:4173/oyun/). `/oyun/` yolu GitHub Pages depo alt klasörünü taklit eder. Dosyaları `file://` ile açmayın: ES modülleri ve `fetch('./veri.json')` bir HTTP sunucusu gerektirir.

**Botla hemen oyna** ile Firebase bağlantısından bağımsız olarak Atari Bot'a karşı oynanabilir. Bot, mümkün olduğunda 1 TL açılışa fiyat artırarak cevap verir. Botun kendi 1 TL açılışında hamle oyuncudadır; oyuncu Pas demeden bot o kartı alamaz. Bu demo yalnızca o sekmede çalışır; farklı cihazları bağlamaz ve yenileyince sıfırlanır. Ses varsayılan olarak kapalıdır. Ses düğmesine basınca tarayıcının izin verdiği Web Audio üzerinden 8-bit efektler üretilir; ses dosyası indirilmez.

Kör Sıralama modunu seçince aynı düğme **Kör Sıralamayı Dene** olur. İlk turu sen sıralarsın; rövanşta Atari Bot her kart için boş bir sıra seçerken izlersin. Bir sonraki rövanşta tekrar sen sıralarsın. Yerel demo turu yenilenince sıfırlanır; çevrimiçi odanın sıraları veritabanından geri yüklenir.

Turnuvada **Turnuvayı Dene**, takım kurmada **Botla Takım Kur** düğmeleri kullanılır. Takım kurmada bot kendi 33 rol atamasını yapar; insanın atamalarını değiştirmez. Her iki modun bitişinde rövanş ve lobiye dönüş bulunur.

Frekans ve Çifte Sıralama'nın yerel demolarında bot bağımsız rastgele seçimler yapar; insanın cevabını kopyalamaz. Botun seçimleri de ortak açılış veya sonuç ekranından önce gösterilmez. Demo yenilenince sıfırlanır; çevrimiçi gizli kayıtlar Firebase'den geri yüklenir.

## 8-bit arayüz

Piksel başlıklar, terminal yazısı, kare konsol panelleri ve yerel SVG ikonları kullanılır. Yazı tipleri [Press Start 2P](https://github.com/google/fonts/tree/main/ofl/pressstart2p) ve [VT323](https://github.com/google/fonts/tree/main/ofl/vt323), `assets/fonts/` içinde OFL lisanslarıyla saklanır; harici font isteği yapılmaz.

Veri seti önizlemesi kartları gösterir; oyuncu adı bu cihazda hatırlanır. Mobilde veri seti ve oyuncu adı aynı giriş panelindedir. Firebase yapılandırılmadığında botla oynama düğmesi öncelikli görünür. Açık artırmadaki +1 / +2 / +5 TL kısayolları mevcut teklifi artırarak doğrudan hamle yapar. Sıra, bütçe ve bağlantı koşulları hem kısayollara hem normal teklif alanına uygulanır. Beş karelik kadro göstergesi ilerlemeyi gösterir. Dar ekranda input odağı ve `VisualViewport` değişimleri, giriş alanı ile ilgili eylem düğmelerini görünür tutar; sayfanın tamamı kaydırılabilir.

Ekran geçişi, kart açılışı, teklif artışı, kart kazanımı ve sonuç konfeti efektleri kısa, adımlı animasyonlarla çalışır. `prefers-reduced-motion` etkinse hareketler kapatılır. Bağlantı ve işlem tekrarlarında oyun animasyonları yeniden başlamaz; yeniden bağlanılan eski sonuç ekranında konfeti oynatılmaz.

Kör Sıralama'da seçim düğmeleri 5×2 düzenindedir; mobilde yatay kart ve eylemler listenin üstündedir. İlerleme sayacı dar ekranda da görünür; 320×740 görünümünde kart ve 10 seçim düğmesi kaydırmadan kullanılabilir. Her seçimde kilit simgesi, kısa piksel animasyonu ve açık sesle 8-bit efekt kullanılır. Klavyeyle seçim yaptıktan sonra odak bir sonraki boş sıraya geçer; işlem sürerken seçimler kapanır. Uzun kart isimleri sıralama tablosunda satıra yayılır.

Turnuvanın iki kartı mobilde yan yana kalır; tur geçmişi alt bölümde görünür. Takım kurmada üç aday ve üç rol düğmesi birlikte gösterilir. 320×740 testinde rol alanı ekranın ilk 688 pikselinde tamamlandı; düğmeler en az 48 piksel yüksekliğinde. Klavye odağı karttan boş role, atamadan sonra sonraki boş karta, kendi 11'i tamamlanınca bekleme başlığına geçer. Oda/kolleksiyon değişiminde önceki kartların önbelleği temizlenir. Demo kodu paylaşılabilir bir çevrimiçi oda olmadığından kopyalama kapalıdır.

## Firebase kurulumu

11 Ekim 2026'da **Adoapp** Firebase projesi (`adoapp-858f7`) Spark planında oluşturuldu. Anonymous giriş etkinleştirildi, `adnangn.github.io` yetkili alan adlarına eklendi ve Realtime Database `europe-west1` bölgesinde oluşturuldu. Projenin Web uygulama bilgileri ve tam veritabanı adresi `firebase-config.js` dosyasına eklendi; emulator kapalıdır. O tarihteki `firebase.rules.json` içeriği Firebase Console'da yayımlandı. Gerçek bulut bağlantısıyla yapılan kontrollerin kapsamı ve tarihleri aşağıdaki Doğrulama bölümündedir.

Başka bir Firebase projesiyle kullanmak için genel kurulum adımları:

1. Firebase Console'da bir proje ve Web uygulaması oluşturun.
2. **Authentication → Sign-in method → Anonymous** giriş yöntemini açın.
3. **Realtime Database** oluşturun. Bölgenize ait tam `databaseURL` değerini alın.
4. Web uygulamasının yapılandırma bilgilerini `firebase-config.js` içine ekleyin. `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId` alanları gerekir. Bunlar istemci yapılandırmasıdır; servis hesabı veya özel anahtar koymayın.
5. **Realtime Database → Rules** bölümüne `firebase.rules.json` içeriğini uygulayın. Firestore kuralları bu uygulamada kullanılmaz.
6. Authentication → Settings → Authorized domains listesine `KULLANICI.github.io` alan adınızı, gerekirse yerel deneme için `localhost` ve `127.0.0.1` ekleyin.
7. Birinci cihazda isim, veri seti ve oyun modunu seçip oda kurun. İkinci cihazda isim ve kodla katılın. Açık Artırma ve Start, Bench, Cut için oda sahibi iki oyuncu da bağlanınca oyunu başlatır. Kör Sıralama ve O mu, Bu mu? izleyici olmadan başlatılabilir; izleyici aynı kodla sonradan katılır.

Yeni mod veya koleksiyon eklerken güncel `firebase.rules.json` içeriğini **Realtime Database → Rules** bölümünde ayrıca yayımlayın; eski kurallar yeni koleksiyon kimliklerini veya yeni hamleleri kabul etmeyebilir. Bu gereklilik Adoapp projesi için de geçerlidir: Web yapılandırmasını değiştirmek veya GitHub Pages'e yüklemek veritabanı kurallarını güncellemez. Node veya yerel önizleme sunucusu GitHub Pages'te çalışmaz; Firebase istemcisi dışında bir backend gerekmez.

Aynı site kökenini kullanan aynı tarayıcı profilindeki sekmeler aynı Firebase anonim kimliğini paylaşır; ikinci oyuncuyu test etmek için farklı cihaz, farklı tarayıcı profili veya gizli pencere kullanın. Aynı kimlik yeni bir koltuk tüketmez, mevcut koltuğa döner.

## GitHub Pages'e yayınlama

1. Dosyaları bir GitHub deposunun köküne yükleyin.
2. Depoda **Settings → Pages → Build and deployment → Source → GitHub Actions** seçin.
3. Varsayılan dala gönderim, `.github/workflows/pages.yml` iş akışını çalıştırır. Testler ve hazırlık kontrolü geçince yalnız çalışma dosyalarından statik paket hazırlanır ve Pages'e yayımlanır. Pull request'lerde yalnız kontroller ve paketleme çalışır.
4. Site `https://KULLANICI.github.io/DEPO/` adresinde açılır. İş akışını elle çalıştırırken `require_online: true` seçilirse boş Firebase alanları veya açık emulator ayarı yayını durdurur.

İş akışı Node.js 24 kullanır, npm bağımlılığı kurmaz. Dağıtım işinde yalnız Pages/id-token yazma yetkileri bulunur; kaynak alma işinde yalnız okuma yetkisi vardır. `artifacts/site/` içinde testler, araçlar, emulator dosyaları, README ve depo içeriği yer almaz. Firebase kuralları bu paketle otomatik yayımlanmaz; Console adımı ayrıca tamamlanmalıdır. İsterseniz Actions yerine dal kaynağından `/(root)` yayınlamak da mümkündür; hazırlık ve test kontrollerini yerelde çalıştırın.

```sh
npm run check
npm run check:online
npm run build
```

`check`, 24 havuzda dört motoru sonuna kadar oynatır; kart/görsel dosyalarını, göreli yolları ve dosya adlarının harf büyüklüğünü doğrular. Bunların 23'ü lobi seçimi, biri eski odaları sürdüren arşiv havuzudur. `check:online` ayrıca beş Firebase alanının doluluğunu, HTTPS databaseURL ve kapalı emulator ayarını kontrol eder; Firebase'e bağlanıp hesabın veya yayımlanmış kuralların çalıştığını kanıtlamaz. Adoapp yapılandırması bu alanları içerir; eksik alan, HTTPS olmayan veya yerel bir veritabanı adresi ya da açık emulator ayarı kontrolü durdurur. `build` yalnız yerel `artifacts/site/` paketini yeniler, GitHub'a dosya göndermez.

İç yollar `./styles.css`, `./app.js`, `./veri.json` ve `./assets/images/...` biçimindedir. URL yönlendirme/history routing yoktur; ekran değişimleri DOM ile yapılır, böylece yenileme 404'e yol açmaz. Firebase SDK'sı resmi CDN'den sabit 13.0.0 sürümüyle gerektiğinde yüklenir; internet bağlantısı gerekir. Yerel `tools/serve.mjs` canlı ortamda çalıştırılmaz.

Paketleme, çalışma dosyalarının içeriğinden ortak bir sürüm özeti üretir. HTML/CSS/JS içindeki yerel modül, stil, veri ve statik görsel adreslerine aynı `?v=` değeri eklenir; `js/assets.js` oyun kartlarının görsellerini de aynı sürümle açar. Böylece GitHub Pages'in eski modül veya portre önbelleği yeni yayına taşınmaz. `veri.json` kart kimlikleri/görsel yolları ve Firebase'in sabit CDN adresleri değiştirilmez. Bu davranışın önceki koleksiyon revizesindeki beş regresyon kontrolüyle o aşamadaki birim testi toplamı **125/125** oldu. Veriler yüklenirken erken kategori seçildiğinde kart sayaçları gerçek sayılarla yeniden çizilir ve seçilmiş volüm korunur.

## Veri formatı

`veri.json` içinde 24 kart havuzu aynı kart sözleşmesini kullanır. Yedi ana kategori Futbolcular, Yemekler ve İçecekler, Diziler ve Filmler, Yerli Müzik, Şehirler ve Ülkeler, Nostalji ve Oyun'dur. Lobide 23 koleksiyon seçilebilir; eski birleşik `oyun-evreni` havuzu yalnız mevcut odaların devamı için korunur ve yeni oda seçimi olarak gösterilmez. Seçilen havuz oda kurarken kaydedilir; bot, katılan oyuncu ve rövanş aynı havuzu kullanır. Ana kategoriye geri dönünce o kategorinin son alt seçimi hatırlanır. Kart galerisi isim, takım, oyun serisi veya etiketle aranabilir.

Yemekler ve İçecekler içinde önce **Tatlılar**, **Ana Yemekler** veya **İçecekler** seçilir. Tatlılar ve Ana Yemekler ikinci aşamada **Vol. 1 — Bilindikler** ile **Vol. 2 — Tam Koleksiyon** seçeneklerini açar; her ailenin son seçimi hatırlanır. Vol. 1 tatlılarda 35, ana yemeklerde 50 mevcut kartın birebir kopyasını kullanır. ID, isim, etiket ve görsel yolu yeniden üretilmez; Vol. 2 havuzlarının 100'er kartı değişmeden kalır. Bilindikler seçkisi editoryal bir tercihtir, ölçülmüş bilinirlik sıralaması değildir.

| Ana kategori | Koleksiyon | JSON anahtarı | Kart |
| --- | --- | --- | ---: |
| Futbolcular | Efsaneler | `futbol` | 100 |
| Futbolcular | Türkiye Süper Lig | `superlig` | 100 |
| Futbolcular | Türkiye Efsaneleri | `turkiye-efsaneleri` | 120 |
| Futbolcular | Güncel Dünya Yıldızları | `dunya-yildizlari` | 100 |
| Yemekler ve İçecekler | Tatlılar · Vol. 1 — Bilindikler | `tatli-vol1` | 35 |
| Yemekler ve İçecekler | Tatlılar · Vol. 2 — Tam Koleksiyon | `tatli` | 100 |
| Yemekler ve İçecekler | Ana Yemekler · Vol. 1 — Bilindikler | `yemek-vol1` | 50 |
| Yemekler ve İçecekler | Ana Yemekler · Vol. 2 — Tam Koleksiyon | `yemek` | 100 |
| Yemekler ve İçecekler | İçecekler | `icecek` | 50 |
| Diziler ve Filmler | Diziler | `dizi` | 50 |
| Diziler ve Filmler | Filmler | `film` | 50 |
| Yerli Müzik | Şarkıcılar ve Gruplar | `yerli-sanatcilar` | 100 |
| Şehirler ve Ülkeler | Ankara İlçeleri | `ankara-ilceleri` | 25 |
| Şehirler ve Ülkeler | İstanbul İlçeleri | `istanbul-ilceleri` | 39 |
| Şehirler ve Ülkeler | Türkiye Şehirleri | `turkiye-sehirleri` | 81 |
| Şehirler ve Ülkeler | Ülkeler | `ulkeler` | 80 |
| Nostalji | Çocukluk Çizgi Filmleri | `cocukluk-cizgifilmleri` | 60 |
| Nostalji | 90'lar Nostaljisi | `doksanlar-nostalji` | 35 |
| Nostalji | Kantin ve Bakkal | `kantin-bakkal` | 35 |
| Oyun | Oyunlar | `oyunlar` | 40 |
| Oyun | Oyun Karakterleri | `oyun-karakterleri` | 60 |
| Oyun | Valorant Ajanları | `valorant-ajanlari` | 29 |
| Oyun | LoL Şampiyonları | `lol-sampiyonlari` | 173 |

Tablo yalnız lobideki 23 seçeneği gösterir. Oyun ana kategorisindeki dört koleksiyon aynı `veri.json` dosyasında ayrı ayrı tutulur; bir oyunun destesi yalnız seçilen koleksiyondan gelir. Arşivdeki `oyun-evreni` 100 kartlık eski birleşik havuzdur; Oyun Karakterleri ve Oyunlar havuzları onun kartlarını `tip` alanına göre ayrı ayrı kopyalar. Yeni oyunlarda bir karakter ile bir oyun eşleştirilmez; eski odalar kendi kayıtlı birleşik destelerini tamamlayabilir.

```json
{
  "futbol": [
    { "id": 1, "isim": "Lionel Messi", "gorsel": "assets/images/legends/messi.svg", "etiket": "FV", "takim": "Arjantin", "takimTuru": "milli" }
  ],
  "superlig": [],
  "turkiye-efsaneleri": [],
  "dunya-yildizlari": [],
  "tatli-vol1": [],
  "tatli": [],
  "yemek-vol1": [],
  "yemek": [],
  "icecek": [],
  "dizi": [],
  "film": [],
  "yerli-sanatcilar": [],
  "ankara-ilceleri": [],
  "istanbul-ilceleri": [],
  "turkiye-sehirleri": [],
  "ulkeler": [],
  "cocukluk-cizgifilmleri": [],
  "doksanlar-nostalji": [],
  "kantin-bakkal": [],
  "oyun-karakterleri": [],
  "oyunlar": [],
  "oyun-evreni": []
}
```

Örnek, kart sözleşmesini gösterir; uygulamada her veri seti 10–200 benzersiz kart içermeli, ID'ler 1–1.000.000 arası tam sayı olmalıdır. Altı modun tamamıyla kullanmak için yukarıdaki 20 kart ve etiket koşulu geçerlidir. Toplam **1.527 farklı yerel kart görseli** vardır. Vol. 1 seçkileri ve iki ayrı oyun havuzu mevcut kartları kullandığı için 24 JSON havuzundaki kayıt sayısı **1.712**'dir; 185 kayıt mevcut kartların havuz kopyalarıdır, yeni kart veya yeni görsel değildir. ID'ler havuz içinde benzersizdir; ardışık olma şartı yoktur. `etiket`, kategoriden bağımsızdır; futbol kartlarında FV/OF/DF/KL, yemeklerde tür, ekran yapımlarında tür/genre, sanatçılarda geniş müzik türü, ilçelerde Ankara veya İstanbul, illerde coğrafi bölge, ülkelerde geniş kıta grubu, nostalji ve genel oyun kartlarında geniş konu/tür grupları kullanılır. Valorant Ajanları dört resmi ajan rolünü, LoL Şampiyonları altı resmi sınıfın Türkçe karşılıklarını kullanır. İsteğe bağlı `takim` metni kartta ve kadroda gösterilir; `takimTuru` milli takım/kulüp ayrımını, sanatçı kartlarındaki `tip` ise `sanatci`/`grup` ayrımını saklar. Oyun havuzlarında `tip`, `karakter` veya `oyun`; coğrafya kartlarında `il` veya `ulke` değeridir. `plaka`, `iso2`, `evren` ve `marka` gibi ek bilgiler ilgili kartın kimliğini açıklar; temel oyun sözleşmesini değiştirmez. Kendi JPG/PNG dosyalarınızı `assets/images/` klasörüne koyup `gorsel` değerini değiştirin. Gelen görseller CSS `image-rendering: pixelated` ve hafif kontrastla gösterilir.

Efsaneler, başarı ve geniş bilinirlik gözetilerek hazırlanmış editoryal bir seçkidir; ölçülmüş taraftar sayısı sıralaması değildir. Aktif ve emekli isimler birlikte bulunur. İkonik milli takım renkleriyle gösterilir; ülke bilgisi güncel kulüp iddiası taşımaz. Süper Lig portrelerinde doğrulanmış kulübün renkleri kullanılır. Her futbolcu için farklı saç, ten, sakal ve forma ayrıntıları olan özgün 96×96 SVG vardır.

İlk 50 efsane korunarak 1990–2015 döneminde sahaya damga vurmuş 30 isim eklendi: Gerrard, Lampard, Scholes, Rooney, Totti, Del Piero, Shevchenko, Seedorf, Vieira, Ballack, Schweinsteiger, Nedvěd, Owen, Torres, Van Nistelrooy, Van Persie, Klose, Schmeichel, Čech, Dida, Ramos, Ferdinand, Vidić, Suárez, Neymar, Hagi, Alex, Robben, Sneijder ve Makélélé. Yeni kartların `donem` alanı `1990–2015` değeridir; oyuncuların tüm kariyerlerinin bu aralıkla sınırlı olduğu anlamına gelmez.

Süper Lig seçkisinde ilk 50 kart korunarak 30 yeni oyuncu eklendi. On kulüp temsil ediliyor; Beşiktaş'ta Vlahović, Fenerbahçe'de Greenwood, Trabzonspor'da Salah, Amed FK'de Dia Saba dahil sekiz oyuncu var. Başakşehir ve Kocaelispor yıldızları da havuza dahil.

9 Ekim 2026 tarihli önceki genişlemede altı koleksiyonun her birine 20 kart ve 20 yerel piksel görseli eklendi: futbol havuzları 100'er, diğer havuzlar 50'şer karta ulaştı. Önceki 280 kartın kimlikleri, isimleri, etiketleri ve görselleri korundu; devam eden odaların eski kart referansları geçerlidir. Yeni efsaneler arasında Riquelme, Verón, Rui Costa, Deco, Laudrup kardeşler, Okocha, Abedi Pelé, David Villa, Inzaghi, Crespo ve Van der Sar bulunur; ID81–100 kartları da `1990–2015` dönem işaretini taşır. Yeni Süper Lig kartlarının ID81–100 kaynakları 9 Ekim 2026 erişim tarihiyle ayrıca kaydedildi; önceki 80 kartın kaynak tarihleri değiştirilmedi.

`tools/legends-cards.json`, `tools/superlig-cards.json`, `tools/extra-collections.json` ve görsel üreteçleri geliştirme kaynaklarıdır. `node tools/generate-legends.mjs`, `node tools/generate-superlig.mjs` ve `node tools/generate-collections.mjs` yerel SVG'leri tekrar oluşturur; runtime veri dosyasını otomatik değiştirmezler. Tarayıcı yalnızca tek `./veri.json` dosyasını okur; veri ve görseller yereldir. Transferler otomatik izlenmez; yeni kadro güncellemesinde veri dosyası ve ilgili portre birlikte yenilenmelidir.

`tools/additions-legends.json`, `tools/additions-superlig.json` ve `tools/additions-collections.json` önceki genişlemedeki 120 kartın ayrı üretim listeleridir; tarayıcı bunları okumaz. Ana yemeklerin eski ID'leri aralıklı olduğundan yeni kartlar 37–56 aralığında; tatlı, dizi ve film havuzlarının yeni kartları 31–50 aralığında saklanır.

12 Ekim 2026'daki **ilk genişlemede 325 kart ve 325 yerel piksel SVG** eklendi; o aşamada mevcut 400 kartın ID, isim, etiket, metadata ve görsel dosyaları korunarak 11 koleksiyonda toplam 725 karta ulaşıldı. İlk seçkide Türkiye Efsaneleri 50 eski Türk futbolcudan, Güncel Dünya Yıldızları 50 aktif futbolcudan oluşuyor ve iki set de temsili milli forma renklerini kullanıyordu. Yerli Müzik ilk aşamada 40 solo sanatçı ve 10 gruptan oluşuyordu. Bu sayımlar ilk genişlemenin tarihsel kaydıdır.

Aynı günkü **ikinci genişlemede 209 yeni kart ve 209 yeni SVG** eklendi: Türkiye Efsaneleri'ne 70, Güncel Dünya Yıldızları'na 50, Yerli Müzik'e 50 kart ve İstanbul'un 39 ilçesi. O aşamada katalog beş kategoride 12 koleksiyon ve 934 karta ulaştı. Türkiye Efsaneleri Türkiye'de oynamış **120 kulüp ikonunu** kapsar; Alex, Hagi, Drogba ve Yattara gibi yabancı oyuncular da dahildir. İlk 50 Türkiye kartının ID, isim, görsel yolu ve etiketi korunmuştur; kulüp metadata'sı ve aynı görsel yolundaki forma çizimi tarihî Türkiye kulüplerine göre bilerek güncellenmiştir. Gösterilen kulüp oyuncunun Türkiye kariyerine aittir ve güncel takım iddiası değildir. Güncel Dünya Yıldızları **100 aktif profesyonel oyuncudan** oluşur; ülke ve temsili milli forma renkleri kullanılır, güncel kulüp veya transfer tahmini saklanmaz. Sakatlıktan dönen profesyonellerin dahil olması, o gün oynayabilecekleri veya son milli kadroya seçildikleri anlamına gelmez.

Yerli Müzik **100 solo sanatçı ve grup** içerir; Pop, Rock, Türk Sanat Müziği, Arabesk, Halk ve Rap etiketleri aynı türden üçlüler üretmek için geniş oyun gruplarıdır. Şehirler ve Ülkeler kategorisinde Ankara'nın **25**, İstanbul'un **39** ilçesi, Türkiye'nin **81 ili** ve **80 ülke** yer alır. İl/ilçe çizimleri temsili mimari/doğa motifleridir; kesin harita veya coğrafi sınır göstermez. Ülkeler BM üyesi ülkelerden oluşturulmuş bir seçkidir; bütün dünya ülkelerinin eksiksiz listesi değildir. Tam menü havuzlarında **100 tatlı, 100 ana yemek ve 50 içecek** vardır; Vol. 1 seçkileri bu tatlıların 35'ini ve ana yemeklerin 50'sini ayrıca sunar. İçeceklerin **42'si alkolsüz, 8'i alkollüdür**.

**Üçüncü genişleme 366 yeni kart ve 366 yerel SVG dosyası** ekledi: 35 Çocukluk Çizgi Filmi, 35 90'lar Nostaljisi, 35 Kantin ve Bakkal, 81 Türkiye Şehri, 100 Oyun Karakteri/Oyun ve 80 Ülke. O aşamadaki katalog yedi kategoride 18 koleksiyon ve 1.300 kart içeriyordu. Çizgi filmlerde Heidi, Pepee, Rafadan Tayfa, Kaptan Tsubasa ve Pokémon; hatıralarda Tamagotchi, sakız kartları, kaset ve Tetris el oyunu; kantin havuzunda Tadelle, Metro ve Ülker Çokokrem bulunuyordu. Eski Oyun Dünyası havuzunun **60 kartı karakter, 40 kartı oyun** kimliğini taşır; Mario, Sonic, Kratos ve tanınan konsol/PC serileri ağırlıktadır. Seçki ölçülmüş popülerlik veya satış sıralaması değildir.

**Önceki volüm ve çizgi film revizesi** Çocukluk Çizgi Filmleri'ni **60 karta** çıkardı. Looney Tunes tek seri kartı olarak seçilmez; Bugs Bunny, Daffy Duck, Tweety ve diğerleri dahil **15 karakter ayrı karttır**. Eski Looney Tunes kartının `11011` kimliği açık revizyonla Bugs Bunny'ye dönüştürüldü; diğer mevcut kart ID'leri korunur. O aşamada Oyun Karakterleri **60**, Oyunlar **40** kartla iki ayrı ana kategori olarak sunulmuştu. Tatlılar ve Ana Yemekler, mevcut içerikleri tekrar çizmeden Vol. 1 seçkileri ve 100'er kartlık Vol. 2 havuzları sunar. Yattara'nın portresi kısa parlak sarı saç ve sakalsız yüzle, Nwakaeme'ninki kel baş ve sakalsız yüzle düzeltildi. Bu önceki aşamada sekiz ana kategori, 21 lobi koleksiyonu ve eski odalar için bir arşiv havuzu bulunuyordu.

**Oyun genişlemesi** Valorant'ın resmi dizinindeki **29 ajanı** ve League of Legends'ın **173 şampiyonunun tamamını** iki ayrı havuz olarak ekler. Oyunlar (40), Oyun Karakterleri (60), Valorant Ajanları (29) ve LoL Şampiyonları (173) tek **Oyun** ana kategorisinde ayrı seçimlerdir. Dört havuz aynı `veri.json` içinde bulunur; oyun sırasında birbirlerinin kartlarıyla karışmaz. Güncel toplam yedi ana kategori, 23 lobi seçimi ve eski odalar için bir arşiv dahil 24 JSON havuzudur. Bu genişleme 202 yeni kayıt ve 202 yerel SVG ekleyerek toplamı 1.712 kayda ve 1.527 farklı kart görseline çıkarır.

Valorant kartları **Kontrol Uzmanı, Öncü, Düellocu, Gözcü** etiketlerini kullanır; sırasıyla 7, 7, 8 ve 7 ajan vardır. Miks ve Veto dahil her ajanın adı, rolü ve görsel özellikleri resmi Riot Games profilinden kontrol edilmiştir. LoL kartlarının `etiket` alanı Data Dragon'un birincil sınıfını Türkçeleştirir: **Dövüşçü (50), Büyücü (35), Nişancı (29), Suikastçı (17), Tank (24), Destek (18)**. Çok sınıflı şampiyonların resmi sınıflarının tamamı `riotSiniflar` metadata'sında korunur; temel oyun üçlüleri tek `etiket` üzerinden üretilir. İki havuz da `tip: 'karakter'` taşır; `evren` sırasıyla `Valorant` ve `League of Legends` değeridir.

Cin Ali, resmî vakıf açıklamasında okuma kitaplarının çizgi karakteridir: **Cin Ali Kitapları** 90'lar Nostaljisi havuzundadır. Kantin/bakkal havuzunda üreticinin doğruladığı **ETİ Cin** bisküvisi kullanılır; Cin Ali adında bir gıda markası varsayılmaz. Nostalji ve kantin seçkileri farklı dönemlerin çocukluk çağrışımlarını kapsar; tüm kartların 1990–1999'da icat edildiği, ürünlerin bugün satışta olduğu veya çizimlerin tarihî ambalajları aynen gösterdiği ileri sürülmez.

İlk genişlemenin geliştirme kaynakları `tools/expansion-football.json`, `tools/expansion-menu.json` ve `tools/expansion-culture.json` içindedir. Üç `tools/generate-expansion-*.mjs` aracı o ilk ek kartları ve yerel SVG dosyalarını üretir. İkinci genişleme için `tools/generate-turkey-icons.mjs`, `tools/generate-world-stars-extra.mjs` ve `tools/generate-culture-extra.mjs` kullanılır; çıktıları sırasıyla Türkiye'nin tam 120 kartlık listesi `tools/turkey-icons.json`, 50 yeni dünya yıldızı `tools/world-stars-extra.json` ve 50 sanatçı ile 39 İstanbul ilçesi `tools/culture-extra.json` dosyalarıdır. Türkiye için ilk üreteçteki milli formaları yeniden üretmek yerine güncel kulüp ikonu üretecini kullanın.

Üçüncü genişlemenin araçları `tools/generate-nostalgia-sets.mjs` ve `tools/generate-games-geo.mjs` dosyalarıdır. Birincisi ilk halinde 105, son revizede **130 nostalji kartını** `tools/nostalgia-sets.json` içinde; ikincisi 261 şehir/oyun/ülke kartını `tools/games-geo.json` içinde üretir. `tools/collection-volumes.json` yalnızca Vol. 1 seçkilerinin kaynak havuzunu ve mevcut kart ID'lerini saklar; yeni görsel üretmez. Ülke bayrakları [flag-icons](https://github.com/lipis/flag-icons) **v7.3.2** sürümünden alınır ve yerel kart çerçevesine yerleştirilir; tam MIT lisans bildirimi ve kaynak URL'si her bayrak SVG'sinde ve `tools/games-geo-sources.json` içinde korunur. Tarayıcı bayrakları da yerel dosyalardan okur.

`node tools/generate-valorant-agents.mjs`, `tools/valorant-agents.json` ve `assets/images/valorant/` altındaki 29 özgün temsili portreyi yeniden üretir. `tools/valorant-agents-sources.json`, resmi ajan dizinini ve her profilin rol/görsel referansını kaydeder. `node tools/generate-lol-champions.mjs`, `tools/lol-champions-sources.json` içindeki sabit **Data Dragon 16.20.1** anlık görüntüsünden çevrimdışı olarak `tools/lol-champions.json` ve `assets/images/lol/` altındaki 173 SVG'yi yeniden üretir. LoL portreleri Riot'un resmi şampiyon ikonlarının 30×30 örneklenmiş, en fazla 32 renkli piksel uyarlamalarıdır; Valorant portreleri ise kodla ayrı ayrı çizilen özgün temsili çizimlerdir. Her ikisi 96×96 yerel SVG, `shape-rendering="crispEdges"` ve mevcut kart çerçevesini kullanır. LoL üretecinin `--refresh` seçeneği yalnız geliştirme sırasında resmi kaynak anlık görüntüsünü internetten yeniler ve Sharp gerektirir; normal yeniden üretim veya tarayıcı çalışması bunu gerektirmez.

`node tools/integrate-expansion.mjs`, eski ve yeni geliştirme beslemelerini tek `veri.json` dosyasına birleştirir. Türkiye kartlarının kulüp metadata'sı güncellemesinde var olan ID, isim, görsel yolu ve etiketin aynı kaldığını doğruladıktan sonra tam Türkiye listesini uygular. Çizgi film revizesi için yalnız `11011` Looney Tunes → Bugs Bunny dönüşümü ve Looney Tunes karakterlerinin `evren` arama metadata'sı açık istisnalardır. Diğer havuzlarda aynı ID'nin içeriğinin değiştirilmesini reddeder. Vol. 1 havuzlarını seçili mevcut kartlardan, iki ayrı oyun havuzunu eski birleşik havuzun `tip` alanından kopyalar. Havuz içindeki isim ve ID tekrarlarını engeller; tekrar çalıştırıldığında sayı artmaz. 24 havuzu ve RTDB'nin koleksiyon izin listesini birlikte günceller. Tarayıcı bu geliştirme listelerini okumaz.

İlk 12 Ekim futbol seçkisinin TFF, FIFA ve resmi kulüp/yarışma kaynakları `tools/expansion-football-sources.json`; Ankara ilçe listesi, motifler ve müzik kaynakları `tools/expansion-culture-sources.json` içinde erişim tarihleriyle saklanır. İkinci genişlemenin kayıtları `tools/turkey-icons-sources.json`, `tools/world-stars-extra-sources.json` ve `tools/culture-extra-sources.json` içindedir. Türkiye kaynakları tarihî Türkiye kulüp bağlantılarını, dünya kaynakları aktif profesyonellik ve ülke bağlantısını, kültür kaynakları müzik seçkisi ve resmî İstanbul ilçe listesini destekler. Üçüncü genişlemenin eser/üretici kaynakları ve Cin Ali ayrımı `tools/nostalgia-sets-sources.json`; [İçişleri Bakanlığının il listesi](https://www.icisleri.gov.tr/valilikler), [BM ülke listesi](https://www.un.org/about-us/member-states), [BM M49 gruplaması](https://unstats.un.org/unsd/methodology/m49/), oyun yayıncıları ve bayrak kaynak/lisans kayıtları `tools/games-geo-sources.json` içinde saklanır. Eski Süper Lig kaynak tarihleri bu genişlemede yeniden kontrol edilmiş gibi gösterilmez.

Oyun genişlemesinin resmi kaynakları [VALORANT ajan dizini](https://playvalorant.com/en-us/agents/), [League of Legends şampiyon dizini](https://www.leagueoflegends.com/en-us/champions/) ve [Data Dragon 16.20.1 şampiyon verisi](https://ddragon.leagueoflegends.com/cdn/16.20.1/data/en_US/champion.json) içindedir. 29 ajan için `tools/valorant-agents-sources.json`; 173 şampiyonun kimliği, sınıfları, resmi ikon URL'si, kaynak özeti ve yeniden üretim pikselleri için `tools/lol-champions-sources.json` kullanılır. LoL şampiyon adları ve kaynak portre çizimleri © Riot Games; yerel SVG'ler bu resmi ikonların piksel uyarlamalarıdır. Proje Riot Games tarafından onaylanmış bir ürün olarak sunulmaz. Tarayıcı Riot CDN'sinden kart veya görsel istemez; yalnız `./veri.json` ve yerel SVG dosyalarını okur.

Başlıca resmi kaynaklar: [TFF A Millî Takım kayıtları](https://www.tff.org/default.aspx?pageID=319), [FIFA 2026 turnuva kadroları](https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf), [ABB'nin 25 ilçe dizini](https://www.ankara.bel.tr/muhtarlar) ve ilçe çizimlerinin motifleri için [ABB Günümüz Ankarası / Kent Rehberi](https://s.ankara.bel.tr/files/2024/12/23/0dec3727ad6b1d4bf4b496e81605cc84.pdf). Seçkiler resmi başarı veya popülerlik sıralaması değildir.

Mevcut oyuncu, sanatçı, eser, ürün, şehir, genel oyun ve Valorant görselleri **temsili piksel çizimleridir**; gerçek fotoğraflar, albüm kapakları, resmî dizi kareleri, ambalaj kopyaları veya oyun kapakları değildir. LoL portreleri bu özgün çizim grubundan farklı olarak yukarıda açıklanan resmi Riot ikonlarının yerel piksel uyarlamalarıdır. Ülke kartları yukarıda belirtilen lisanslı bayrak SVG'lerini kullanır. JSON ve görseller Firebase'e yazılmaz; odada yalnızca kart ID'leri ve seçim durumu tutulur. Devam eden odalarda veri setini değiştirip aynı ID'yi başka karta atamayın.

## Oda ve bağlantı davranışı

```text
rooms/{kod}                     # Metadata + players + revision + game
presence/{kod}/{uid}/{sekmeId}   # Sekmeye özel bağlantı kayıtları
reactions/{kod}/{uid}           # Oyuncunun son reaksiyonu ve sıra numarası
```

Oda kurma, ikinci koltuğu alma, başlatma, teklif, pas, sıralama, turnuva seçimi, rol ataması, rövanş ve reaksiyon yazıları `runTransaction(..., { applyLocally: false })` kullanır. Rastgele deste, etiketli üçlüler ve oda kodu transaction callback'i dışında üretilir. Oyun yazıları oda sürümünü bir artırır. Açık artırma/sıralama/turnuva/rövanş hamleleri ekranda görülen `revision` değerini taşır; ilgili durum değişmişse eski hamle reddedilir. Kazananın bütçesi, kadrosu ve yeni kart tek atomik oda işlemiyle güncellenir. Kör Sıralama'da tek işlem boş sırayı kilitler ve kartı ilerletir. Turnuvada bir seçim eşleşmenin kazananını kaydeder ve sonraki eşleşmeyi açar. Takım kurmada bir rol ataması yalnız kendi oyuncusunun turunu değiştirir; üçüncü atama üç rolü beraber kaydeder.

Kör Sıralama ve O mu, Bu mu? ikinci oyuncu olmadan başlayabilir. Bu iki modda boş ikinci koltuğa bekleme, oynama veya bitmiş sonuç evresinde katılmak mümkündür. Yeni katılım `rooms/{kod}/players/p2` üzerinde ayrı bir transaction ile yalnızca ikinci koltuğu alır; oyun, oda metadata'sı ve `revision` değiştirilmez. Böylece aktif oyuncunun aynı anda yaptığı seçim katılma işlemi yüzünden kaybolmaz veya eski sürüme dönüşmez. Katılan izleyici mevcut seçimleri/sonucu alır ve seçim yapma yetkisi kazanmaz. İkinci koltuk doluysa başka kimlik katılamaz; mevcut üye aynı kimlikle kendi koltuğuna dönebilir. Açık Artırma ve Start, Bench, Cut için ikinci oyuncu katılımı bekleme evresindedir ve başlatma hâlâ iki oyuncu gerektirir.

Takım kurmada iki oyuncu bağımsız olduğu için her atama öncesi kendi oyuncusunun turu, kilitli rolleri, üçlüsü ve oda kimliğini içeren değişmez bir cursor yakalanır. Transaction tekrarında yalnız rakip ilerlediyse hamle güncel oda sürümüyle uygulanır. Kendi durumu değiştiyse, aynı ID başka turda tekrar geldiyse veya rövanş/oda değiştiyse eski hamle reddedilir. Cursor tekrar sırasında yeniden oluşturulmaz; iki ayrı oyuncunun eşzamanlı hamleleri korunurken aynı oyuncunun çift tıklaması iki kez yazılmaz. Demo botu da aynı kontrolü kullanır; insanın seçimi botun bağımsız turunu ertelemez.

Firebase Auth kimliği `browserLocalPersistence` ile kalıcıdır. LocalStorage yalnızca oda kodunu ve ilgili UID'yi saklar; bütçe ve kartlar veritabanından yeniden okunur. Yenilemede son odaya otomatik dönüş denenir; kod elle de girilebilir. Bağlantı kesilirse yeni hamleler kapatılır. Diğer oyuncunun koltuğu ve oyun durumu korunur. Odadan çıkmak yerel bağlantıyı kapatır, ayrılan oyuncunun yerini başkasına vermez; aynı kimlik aynı kodla geri dönebilir. Tarayıcı verileri silinirse/gizli oturum kapanırsa anonim kimlik kaybolur ve eski koltuk otomatik kurtarılamaz.

**Odadan çık** oyuncu kimliğini korur. **Oturumu kapat** düğmesinin açıklamasında anonim kimliğe bağlı eski koltuğun yeni bir oturumla kurtarılamayacağı belirtilir; onaydan sonra dinleyiciler/presence durdurulur, Firebase Auth'tan çıkılır ve yerel oda/ad kaydı temizlenir. Yenileme kendiliğinden tekrar anonim giriş yapmaz; **Oyuncu oturumu aç** ile yeni UID oluşturulur. Firebase ayarları boşken **Kaydı temizle** yalnız yerel ad/demo turunu temizler. Firebase anonim hesabı ve veritabanındaki odalar silinmez.

Aynı tarayıcı profilinin başka sekmesinde kimlik değişirse eski servis de kapanır; eski UID ile hamle veya presence yayımlanamaz. Oda/oturum değişirken bekleyen işlemler, dinleyici hataları, reaksiyonlar ve odak güncellemeleri yeni ekrana taşınmaz. Oturum açılışı tek istek olarak tutulur; bağlantı kurtarma sırasında demo başlatılması eski odayı sonradan açmaz.

Presence her sekme için ayrı tutulur, böylece bir sekmeyi kapatmak diğer açık sekmeyi çevrimdışı göstermez. Firebase'in `onDisconnect` API'sinde transaction karşılığı bulunmadığı için yalnızca o sekmenin bağımsız presence kaydını silmek üzere `onDisconnect(...).remove()` kullanılır. Bu işlem oyun, bütçe veya oyuncu koltuklarına dokunmaz. Normal presence yazıları ve temizliği transaction'dır. Çıkış ekranı ağ temizliğini beklemez.

Reaksiyonlar göndericiye bağlıdır, 1.5 saniye arayla gönderilebilir, sekme açılırken eski reaksiyon tekrar oynatılmaz. Ses karşı tarafta ancak o cihazdaki ses düğmesi etkinleştirilmişse çalar. Rövanş mevcut koltukları ve kodu korur, tur sayısını artırır. İki oyuncu varsa başlangıç/aktif oyuncu değişir; tek oyuncuyla oynanan Kör Sıralama veya turnuvada ikinci koltuk hâlâ boşsa P1 aktif kalır ve yeni tur hemen oynanabilir. Açık Artırma'da bütçeler/kadrolar, Kör Sıralama'da kilitli sıralar, turnuvada eleme geçmişi, takım kurmada iki oyuncunun tüm rol/seçim kayıtları sıfırlanır. Yenileme veya aynı kodla dönüşte aktif rol, kart/eşleşme indeksleri ve bekleyen/tamamlanan seçimler odadan geri gelir.

## Kuralların sınırı

Kurallar kökten listeleme ve genel yazma iznini kapatır. Oda kodunu bilen anonim kullanıcı boş ikinci koltuğa katılmak için bekleme odasını okuyabilir. Kör Sıralama ve O mu, Bu mu? için ikinci koltuk boş olduğu sürece oynanan veya bitmiş oda da bu katılma akışına açıktır; yazma yetkisi yalnızca kendi UID'siyle boş P2 koltuğunu almaktır. Dolu odalar, presence ve reaksiyonlar yalnızca o odanın üyelerine açıktır; üçüncü oyuncu eklenemez. Üyelik, oyuncu kimlikleri, oda ayarları, sıra, sürüm ve oyun veri sınırları sunucuda denetlenir. İzleyicinin P1 adına sıralama/turnuva seçimi yapması veya mevcut oyunu katılım sırasında değiştirmesi kabul edilmez.

Bu sürüm güvenilir arkadaşlar arasında oyun için hazırlanmıştır. İstemci seçtiği statik desteyi gönderir; sunucu yerel `veri.json` içeriğinin gerçekliğini veya karıştırmanın adilliğini doğrulayamaz. Tarayıcı odayı açmadan önce ID'lerin seçili koleksiyonda bulunduğunu ve takım üçlülerinin gerçek etiketlerini kontrol eder. Kör Sıralama kuralları 10 kartın benzersizliğini ve her hamlede yalnızca bir boş sıranın doldurulmasını doğrular; izleyici hamlesini ve önceki seçimlerin değiştirilmesini reddeder. Turnuvada kurallar mevcut iki adaydan bir kazananı, eleme sırasını ve geçmişin korunmasını denetler. Takım kurmada aynı turdaki rol/kart tekrarları, rakibin seçimlerine müdahale, tur atlama ve bitmiş oyuncunun ek ataması reddedilir. Gelecek kartlar arayüzde gösterilmez, ancak oda üyelerinin okuyabildiği desteyi geliştirici araçlarıyla incelemek mümkündür. Tam kötü niyetli istemci/ödüllü turnuva koruması iddiası yoktur. Odalar aşağıdaki 7 günlük yaşam döngüsü ile otomatik temizlenir.

## 7 günlük otomatik oda temizliği

Oyuncuların bulunmadığı ve son kullanımının üzerinden 7 gün geçen odalar otomatik temizlenir. Her bağlı oyuncu dakikada bir sunucu zamanıyla kullanım tarihini yeniler; presence bulunan odalar silinmez. Kullanım tarihi yeni `cleanupIndex/{kod}` dalında saklanır. Bu dalda aktif odaların genel listesi okunamaz; yalnız saat sınırına göre süresi geçmiş en fazla 100 kayıt sorgulanabilir. Oda üyeleri kendi kayıtlarını okuyabilir.

Yeni oda kodu önce transaction ile rezerve edilir. Sabit oda örneği, sunucu saatine göre tahmini oluşturma zamanıdır; 60 saniyelik pay içerir ve kurallar 2 dakikadan eski veya gelecekteki rezervasyon tarihlerini reddeder. Son kullanım tarihi gerçek sunucu zamanıdır. Bu ayrım SDK'nın transaction dönüşündeki zaman tahmininin oda oluşturmayı bozmasını önler. Yarım kalan rezervasyonlar da süre sonunda temizlenir.

Temizleyici önce transaction / ETag ile değişmez bir silme kilidi alır. Presence, yeni hamle, katılım, reaksiyon ve gizli seçim yazıları bu kilide karşı sunucuda denetlenir. Kilit alındıktan sonra `rooms`, `privateGames`, `presence`, `reactions` ve `cleanupIndex` tek atomik işlemle kaldırılır. Firebase farklı kök dalları tek transaction ile silemediğinden bu son işlem atomik çoklu yol güncellemesidir; kurallar kısmi silmeyi reddeder. Gizli seçimler temizleyiciye açılmaz. İş yarıda kalırsa sonraki çalıştırma aynı kilidi tamamlar; aynı odanın eşzamanlı iki temizleyici tarafından işlenmesi zararsızdır.

`.github/workflows/cleanup-rooms.yml` saatlik çalışır. Ayrıca site çevrimiçi olduğunda ve 5 dakikada bir aynı kurallarla kontrol yapar. Saat sınırı ve iş sırası nedeniyle silme tam yedinci günün milisaniyesinde gerçekleşmez. Spark planı korunur; yönetici anahtarı veya ücretli Cloud Functions gerekmez. İş akışı geçici anonim kimlik kullanır, işi sonunda yalnız kendi oluşturduğu kimliği kapatır. Kimlik belirteçleri kaydedilmez.

13 Ekim 2026'da önceki 38 odanın yalnız kod/oluşturma tarihi ekrandan okunarak yeni indekse alındı. Eski son kullanım tarihleri bulunmadığından bu odalara geçiş tarihinden itibaren 7 günlük süre tanındı. Oda listesi ve oyuncu bilgileri Git'e eklenmedi.

GitHub, herkese açık depolarda 60 gün işlem yapılmazsa zamanlanmış iş akışlarını durdurabilir; bu durumda Actions üzerinden yeniden etkinleştirilebilir. Site açıldığındaki kontrol çalışmaya devam eder. [GitHub zamanlanmış iş akışları](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow).

## Doğrulama

13 Ekim 2026 oyun düzeltmeleri ve oda temizliği: **185/185 birim testi**, **76 oyun + 24 ortak oyun + 11 temizlik = 111 Firebase emülatör kontrolü**, sıfır atlama. Hazırlık kontrolünde 24 havuz, 1712 kart ve altı mod tamamlandı. Tek kaleci üçlüsü dört futbol havuzunda 100'er farklı karıştırmayla doğrulandı; 32 kartlı turnuva ve bütçe bitişinde ücretsiz kadro tamamlama da tüm uygun havuzlarda kontrol edildi.

Gerçek Adoapp bulutunda iki bağımsız site kökeni ve anonim kimlikle yeni oda kurulması/katılımı doğrulandı. Açık artırmada 20 TL harcayıp 1/5 kalan oyuncu, rakibinin beş ücretli kartından sonra 4 ücretsiz kartla 5/5'e ulaştı. 32 kartlı turnuva yalnız oyuncuyla başladı; izleyici ilk seçimden sonra katıldı ve seçemedi. 31 seçim sonunda iki ekran aynı şampiyonu ve 5 turu gösterdi. Yenileme sonucu korudu; aynı kodla rövanş 32 kartı koruyarak aktif rolü ikinci oyuncuya geçirdi. Bu kontrol iki fiziksel cihaz testi değildir.



13 Ekim 2026 Frekans ve Çifte Sıralama eklemesinde **166/166 birim testi** ve **69 mevcut + 24 yeni Firebase emülatör kontrolü** geçti; atlama yoktur. Hazırlık kontrolü 24 veri havuzunu altı modda tamamladı. 350 ve 390 piksel mobil ile masaüstü tarayıcı denemelerinde iki demo bitirildi; Frekans'ın seri bonusu ve farklı seçimde seri sıfırlaması, Çifte Sıralama'da ilk bitirenin beklemesi ve iki modun temiz rövanşı doğrulandı. Yeni 71 metin alanı düzenleyiciye eklendi; önceki 28 kişisel metin değişikliği korundu.

Adoapp bulutunda iki ayrı site kökeni (`127.0.0.1` ve `localhost`) ve bağımsız anonim kimliklerle `669525` Frekans odası 10 ortak seçim sonunda iki ekranda 1.500 puanla bitti. Bir seçim kilitlendikten sonra diğer oyuncu sadece hazır bilgisini gördü; sayfa yenileme ve aynı kodla dönüş kendi kilitli seçimini geri getirdi. `269137` Çifte Sıralama odasında ilk oyuncu 8/8 listesiyle bekledi; ikinci oyuncu 3/8'de yenileyip dördüncü karttan devam etti. İki bitmiş listede yalnız bitişik iki kart yer değiştirdi; iki istemci %94 uyum, 6/8 aynı sıra gösterdi. Rövanşlar aynı kodla ikinci tura, sıfır ilerleme ve yeni kartlarla geçti. Tarayıcı uyarı/hata kayıtları boştu. Bunlar aynı bilgisayardaki iki bağımsız istemci kontrolüdür; fiziksel iki cihaz testi değildir. Yeni gizli seçim kuralları Firebase Console'da yayımlandı.

12 Ekim 2026 Oyun kategorisi genişlemesinde **129/129 birim testi** ve **69/69 Firebase emülatör kontrolü** geçti; atlanan kontrol yoktur. Oyunlar, genel oyun karakterleri, Valorant ve LoL havuzları dört modda tamamlanıp aynı kodla rövanşa geçti. RTDB kontrolü yeni havuzlarla oda kurma/başlatma, ilk hamle, sonradan izleyici katılması ve koleksiyonun oyun sırasında değiştirilememesini doğruladı. Hazırlık kontrolü 24 havuzda 1.712 kart kaydı ve 1.527 farklı yerel görseli denetledi; statik paket 1.587 dosya içerir. Adoapp bulutunda `244987` kodlu LoL ve `488959` kodlu Valorant Kör Sıralama odaları tek oyuncuyla başladı; ilk seçimden sonra ikinci karta ilerledi. İstemci hata/uyarı kayıtları boştu. Bu iki oda kontrolü aynı bilgisayardaki tek anonim istemciyle yapıldı; fiziksel iki cihaz testi değildir. Yeni koleksiyon izinleri Firebase Console'da ayrıca yayımlandı.

```sh
npm test
```

12 Ekim 2026'daki **önceki koleksiyon revizesinin tarihsel doğrulamasında 120/120 test geçti**. Hazırlık kontrolü 21 lobi seçimi ile bir arşiv havuzunu, toplam **1.510 JSON kaydını ve 1.325 farklı yerel kart görselini**, dört motorun tamamını, 67 göreli başvuruyu ve çevrimiçi ayarları doğruladı. Vol. 1 kopyalarının kaynak kartlarla aynı olması, oyunların ve karakterlerin ayrı havuzlarda kalması ve çizgi film revizesi veri testleriyle denetlenir. O aşamadaki RTDB kuralları resmi Database Emulator 4.11.2'de **68/68 kontrolü sıfır atlamayla geçti**; koleksiyon izinleri ve oda ayarlarının değişmezliği 22 havuzla kontrol edildi. Bu yerel kontroller yeni GitHub Pages dağıtımının veya Firebase Console kural yayınının tamamlandığına dair bir kayıt değildir.

12 Ekim 2026'daki **üçüncü genişlemenin tarihsel doğrulamasında 114/114 test geçti**. O aşamadaki hazırlık kontrolü 18 koleksiyonun **1.300 kartını ve 1.300 yerel görselini**, dört motorun tamamını, 67 göreli başvuruyu ve çevrimiçi ayarları doğruladı. Statik paket 1.358 çalışma dosyası içeriyordu. Yayımlanmış önceki 725 kartın kimlikleri korunmuştu; Türkiye kartlarının tarihî kulüp metadata/forma güncellemesi açık istisnaydı. Nostalji, şehir, ülke, oyun ve yeni kültür havuzlarının 455 SVG'si raster olarak açıldı; her havuzdaki çizimler birbirinden farklıydı.

Üçüncü genişlemedeki kurallar resmi Database Emulator 4.11.2'de **68 kontrolü, sıfır atlamayla geçti**. Solo başlatma, izleyici olmadan ilerleme/rövanş, bekleyen/oynanan/bitmiş odaya yalnız boş izleyici koltuğundan katılma, yarışan hamlede oyun durumunun korunması ve üçüncü kişi müdahalesinin reddi kapsanır. O aşamadaki 18 koleksiyondaki geçerli odaların altı yeni koleksiyona izinsiz geçirilmesi ayrıca reddedildi; tüm koleksiyonların değişmezlik koşulu aynı doğrulama kapsamındaydı. Bu tarihsel kural içeriği Adoapp Realtime Database'e de uygulanmıştı.

Gerçek Firebase bulutunda iki ayrı yerel tarayıcı kökeni ve iki anonim kimlikle kontrol yapıldı. `452807` kodlu Çocukluk Çizgi Filmleri / Kör Sıralama odası tek oyuncuyla başladı; üç seçimden sonra katılan izleyici aynı seçimleri gördü, seçim düğmeleri gizlendi ve on seçim sonunda iki ekranın sonuçları aynıydı. Aynı kodla rövanşta izleyici aktif oyuncuya döndü. `972712` kodlu Ülkeler / O mu, Bu mu? odası tek başına 15 seçimle tamamlandı; bitmiş odaya katılan izleyici aynı Nijerya şampiyonunu gördü. Rövanşta izleyici seçmeye başladı, diğer oyuncunun adayları kapandı ve izleyici ayrılınca aktif oyuncu devam etti. İki istemcinin hata/uyarı kayıtları boştu. Bu kontrol fiziksel iki ayrı cihaz testi değildir; GitHub Pages yayını ayrı doğrulanır.

12 Ekim 2026'daki **ilk genişlemenin tarihsel doğrulaması**: **97/97 test geçti**. O aşamadaki `npm run check:online`, 11 koleksiyonun **725 kartını ve 725 yerel kart görselini**, dört oyun modunu ve 67 göreli dosya başvurusunu doğruladı; `npm run build` 781 çalışma dosyasını paketledi. Önceki 400 kart kaydının değişmediği SHA-256 regresyonuyla kontrol edildi. O aşamadaki RTDB kuralları resmi Database Emulator 4.11.2'de yeniden derlendi ve **55 entegrasyon kontrolü, sıfır atlamayla geçti**; bu çalıştırma ilk 11 koleksiyonun tamamında oda kurma, katılma ve başlatmayı da kapsar. Açık artırma destesi sınırının testi, eski sabit 80 değerinden 100 kartlık `DECK.length` değerine uyarlanmıştı. Bu sonuçlar sonraki 934 veya 1.300 kartlık genişlemeler için yeni test veya yayın sonucu değildir.

İlk genişlemenin yerel tarayıcı kontrolünde yeni futbolcu, sanatçı ve ilçe görselleri açıldı; Mor ve ötesi araması 1/50, Höşmerim araması 1/100 sonuç verdi. Menüde 100 tatlı, 100 ana yemek ve 50 içecek sayaçları gösterildi. Bu tarihsel hazırlık ve emulator kontrolleri sonraki genişlemelerin canlı Firebase kural yayını veya GitHub Pages dağıtımının tamamlandığı anlamına gelmez; aşağıdaki 11 Ekim bulut testleri de ayrı tutulur.

11 Ekim 2026'daki Firebase entegrasyonu sonrasında **91 test geçti**: açık artırma/bot/oda geçişlerinde 24, veri/seçim yapısında 10, Kör Sıralama'da 12, turnuvada 8, takım kurmada 10, bağımsız takım atamalarında 9, üçlü/havuz hazırlığında 3, Firebase servis yaşam döngüsünde 9 ve metin özelleştirmede 6 test. Sıra/para/kontenjan sınırları, değişmez transaction tekrarları, yarışan hamleler, izleyici yetkisi, kilitli seçimler, RTDB boş alan normalizasyonu, bozuk durumlar, bitiş ve rövanşlar kapsanır. Bağımsız atama testleri rakip ilerlerken yeniden denemeyi ve aynı oyuncunun eski hamlesinin sonraki tur/rövanşa taşınmamasını doğrular. Firebase servis testleri kontrollü SDK ile kalıcı UID, dışarıdan oturum kapanması, tekrar işlemde UID değişimi, onDisconnect kayıt sırası, sekme izolasyonu ve oturum kapatmayı kontrol eder; gerçek ağ/Auth sunucusu testi değildir. Yeni katılma regresyonu, tek seferlik okumadan sonra boş kalan yerel transaction önbelleğini modeller; geçici oda dinleyicisinin işlem boyunca korunmasını, yarışan katılımları, aynı kimlikle dönüşü ve başarı/hata/oturum değişiminde dinleyici temizliğini doğrular. Metin testleri JSON biçimi ve alan doğrulamasını, şablondaki otomatik alanların korunmasını, oyuncu adlarının düz metin olarak işlenmesini ve DOM metni güncellenirken ikonlarla boşlukların korunmasını doğrular; katalogdaki varsayılan metinler de aynı sözleşmeden geçer.

Önceki geliştirme doğrulamasında RTDB kuralları resmi Database Emulator 4.11.2'de başarıyla derlendi. Ayrı REST entegrasyon testi **55 kontrolü geçti, atlanan kontrol yok**: önceki 32 açık artırma/oda/presence/reaksiyon/Kör Sıralama kontrolüne ek olarak turnuva için 10 ve takım kurma için 13 kontrol. Turnuvanın 15 seçimi, takım kurmanın 66 rol ataması, izleyici/rakip müdahalesi, toplu veya eski sürüm hamleleri, aynı kodla rövanş ve durumu geri okuma doğrulandı. İki farklı oyuncunun aynı görüntüden başlayan atamaları CAS çakışması ardından yeniden üretilip ikisi de kaydedildi; kendi eski cursor'ıyla tekrar atama oda değiştirmeden reddedildi. Bu tarihsel emulator testi SDK'nın tarayıcı Auth kalıcılığı veya gerçek cihaz bağlantısını taklit etmez; aşağıdaki bulut kontrollerinden ayrıdır.

Önceki yerel tarayıcı demo kontrollerinde Kör Sıralama'nın insan turu ve izleyici rövanşı, turnuvanın insan/bot 15 seçimli turları, takım kurmanın iki 11'li kadrosu ve temiz rövanşı tamamlandı. Açık artırmada gerçek Pas öncesi bütçe/kadro değişmediği ve sonraki kartta açılışın diğerine geçtiği kontrol edildi. Kayıt temizleme penceresinde vazgeçmek odayı korudu; onaylamak adı/demo turunu temizleyip lobiye döndü. Klavye odağı, kilitli düğmeler, yerel görseller ve küçük mobil görünüm kontrol edildi. O tarihteki hazırlık kontrolü altı havuzun tamamını dört modda sonuna kadar oynattı. Bu demo kontrolleri Firebase bulut bağlantısı kullanmadı.

11 Ekim 2026'da gerçek Adoapp Firebase bulutuna bağlanan iki ayrı tarayıcı kökeninde (`127.0.0.1` ve `localhost`) iki bağımsız anonim kimlikle açık artırma doğrulandı. `957722` kodlu oda oluşturuldu ve ikinci oyuncu katıldı. P2'nin 2 TL teklifi ve P1'in Pas hamlesiyle P2'nin bütçesi 18 TL, kadrosu 1/5 oldu; her iki sayfanın yenilenmesi aynı oda, koltuk ve oyun durumunu geri getirdi. Sırası olmayan oyuncunun eylemleri kilitlendi ve reaksiyon karşı oyuncuya ulaştı. On kart tamamlandıktan sonra rövanş aynı oda kodunu korudu; bütçeler 20 TL'ye döndü ve başlangıç P2'ye geçti.

Aynı bulut bağlantısıyla `808808` kodlu Kör Sıralama odasında 10 seçim tamamlandı. İzleyicinin seçim düğmeleri gizlendi; rövanşta aktif oyuncu P2, izleyici P1 oldu.

Turnuva için `451466` kodlu odada P1 seçim yaparken P2'nin iki aday düğmesi devre dışı kaldı. On beş seçim tamamlandı ve iki oyuncunun ekranında Sergio Ramos şampiyon olarak gösterildi.

Takım kurma için `221667` kodlu odada iki oyuncu aynı ilk üçlüden farklı Start seçimleri yaptı: P1 Del Piero'yu, P2 Pelé'yi seçti. P1 kendi 33 atamasıyla 11 turu bitirip bekleme ekranına geçtiğinde P2'nin birinci turdaki tek rolü korundu. P2 kalan 32 atamasını tamamlayınca her iki oyuncu aynı sonuç ekranında iki 11'i sahada gördü; bulutta toplam 66 atama kaydedildi. İki istemcinin uyarı ve hata günlükleri boştu. Ekran görüntüsü yerel `artifacts/firebase-iki-oyuncu-duello.png` dosyasında saklandı.

11 Ekim tarihli bu dört mod kontrolü gerçek Firebase bulutuna bağlanan, aynı bilgisayardaki iki farklı site kökeni ve iki bağımsız anonim kimlikle yapıldı; fiziksel iki cihaz testini kapsamaz. GitHub Pages üzerindeki bağlantı yayın sonrası ayrıca kontrol edilir.

Firebase CLI kurulmuşsa yerel emülatörü `firebase emulators:start --only database --project demo-iki-kisilik` ile başlatın, ikinci terminalde `npm run test:firebase` çalıştırın. Bu komut oyun, ortak oyun ve oda temizliği emülatör kontrollerini sırayla çalıştırır. Test yalnızca `127.0.0.1:9000` üzerindeki `demo-iki-kisilik` namespace'ini kullanır, kuralları yükler ve `918001`–`918005` test odalarını/presence/reaksiyonlarını test öncesi/sonrası temizler. Canlı Firebase yapılandırması veya hesabı gerekmez. Tarayıcı uygulamasını Auth+Database emülatörleriyle denemek için `firebase emulators:start --project demo-iki-kisilik`, yerel demo proje yapılandırması ve `emulatorConfig.enabled: true` kullanılabilir; GitHub Pages için emulator ayarını kapalı bırakın.

Kaynaklar: [Firebase transaction ve okuma/yazma](https://firebase.google.com/docs/database/web/read-and-write), [kalıcı Auth oturumu](https://firebase.google.com/docs/auth/web/auth-state-persistence), [oturum kapatma](https://firebase.google.com/docs/auth/web/password-auth#next_steps), [bağlantı/presence](https://firebase.google.com/docs/database/web/offline-capabilities), [RTDB kuralları](https://firebase.google.com/docs/reference/security/database), [GitHub Pages yayın ayarları](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Pages özel iş akışı](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Futbol kadrolarının kaynakları

Süper Lig kulüp eşleşmeleri 8 Ekim 2026 tarihinde resmî kadrolardan kontrol edildi; lig üyeliği [TFF 2026–2027 fikstürü](https://www.tff.org/default.aspx?pageID=198) ile desteklendi. Bu tarih erişim tarihidir; tarihsiz kadro sayfalarının güncelleme tarihi olarak sunulmaz.

Son eklenen 20 oyuncu için Galatasaray, Beşiktaş, Trabzonspor, Göztepe ve Çaykur Rizespor'un aşağıdaki kulüp sayfaları ile Fenerbahçe'nin UEFA kadrosu 9 Ekim 2026'da tekrar okundu. Yeni kartların ayrı kaynak kayıtları `tools/football-sources.json` içindedir. Bu genişletme önceki 80 oyuncunun kadrolarını yeniden güncelleme işlemi değildir.

- [Galatasaray futbol takım kadrosu](https://www.galatasaray.org/pl/futbol-takim-kadrosu/9) — Canlı resmî A takım sayfası.
- [Beşiktaş futbol A takım kadrosu](https://bjk.com.tr/tr/takim/1/takim.html) — Canlı resmî A takım sayfası.
- [Fenerbahçe SK Squad UEFA Champions League 2026/27](https://www.uefa.com/uefachampionsleague/clubs/52692--fenerbahce/squad/) — Canlı resmî UEFA kadro sayfası.
- [Trabzonspor A takımı maç merkezi ve kadro](https://www.trabzonspor.org.tr/tr/mac-merkezi?branch=Football&season=2026%2F2027&team=a-takimi-5) — Canlı resmî 2026/2027 A takım sayfası.
- [Samsunspor A team](https://www.samsunspor.com.tr/a-team) — Resmî kulüp sayfasının arama motorunda bugün taranmış kadro metni.
- [Ailemize hoş geldin Strahinja Eraković](https://samsunspor.com.tr/ailemize-hos-geldin-strahinja-erakovic) — Resmî transfer haberinin arama indeksindeki metni.
- [Ailemize hoş geldin Mohamed Bayo](https://samsunspor.com.tr/ailemize-hos-geldin-mohamed-bayo) — Resmî transfer haberinin arama indeksindeki metni.
- [Emre Kılınç contract extension](https://samsunspor.com.tr/emre-kilinc-en) — Resmî oyuncu haberinin arama indeksindeki metni.
- [TFF Okan Kocuk futbolcu bilgileri](https://www.tff.org/Default.aspx?kisiId=977639&pageId=526) — Resmî TFF futbolcu sayfasının arama indeksindeki metni.
- [Göztepe erkek A takım sporcuları](https://www.goztepe.org.tr/Futbol/erkek-a-takim/sporcular) — Canlı resmî A takım sayfası.
- [Çaykur Rizespor A takımımız](https://www.caykurrizespor.org.tr/a-takimimiz) — Canlı resmî A takım sayfası.
- [Amedspor Futbol A Takımı](https://www.amedspor.com.tr/teams/football-men) — Dia Saba resmî listede Diaa Sabi’a adıyla yer alıyor.
- [Başakşehir A takım kadrosu](https://ibfk.com.tr/a-takim) — Canlı resmî A takım sayfası.
- [Kocaelispor takım kadrosu](https://kocaelispor.com.tr/takim) — Canlı resmî A takım sayfası.

Samsunspor canlı sayfası 502 verdiği için resmî sayfanın arama motorundaki güncel metni, resmî transfer duyuruları ve TFF oyuncu kaydı kullanıldı. Her kartın kaynak eşleştirmesi ve bu erişim sınırları `tools/football-sources.json` içinde belgelenmiştir.
