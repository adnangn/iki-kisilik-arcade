# İKİ KİŞİLİK

HTML, CSS ve Vanilla JavaScript ile geliştirilen, GitHub Pages üzerinde klasör altından çalışabilen nostaljik mini oyun SPA'sı. Çevrimiçi odalar Firebase Authentication ve Realtime Database kullanır. Uygulama sunucusu, build adımı veya bir framework gerekmez.

## Klasör mimarisi

```text
oyun/
├── index.html             # Lobi, bekleme odası, dört oyun modu, sonuç ekranları
├── styles.css             # Retro tema, Grid/Flex, 100dvh, mobil düzen
├── app.js                 # SPA akışı, DOM, veri fetch, demo, reaksiyonlar
├── firebase-config.js     # Adoapp Firebase Web yapılandırması; emulator kapalı
├── veri.json              # Tek, salt okunur veri dosyası
├── metinler.json          # Metin Atölyesi ile hazırlanmış site metni değişiklikleri
├── metin-duzenleyici.html # Kod açmadan başlık/düğme/cümle düzenleme aracı
├── editor.css            # Metin Atölyesi'nin mobil retro görünümü
├── js/
│   ├── auction.js         # Saf ve deterministik açık artırma motoru
│   ├── blind-ranking.js   # 10 kart, kilitli sıralar ve aktif/izleyici yetkisi
│   ├── bracket.js         # 16 kart / 15 maç / 4 tur eleme ağacı
│   ├── team-draft.js      # İki bağımsız oyuncu, 11 tur, kilitli roller
│   ├── team-command.js    # Rakipten bağımsız, kendi eski atamasını reddeden işlem
│   ├── game-setup.js      # Transaction dışında karıştırma ve aynı etiketli üçlüler
│   ├── game-view.js       # Turnuva geçmişi, aday kartlar ve takım/saha görünümü
│   ├── ranking-view.js    # Canlı ve sonuç ekranlarının ortak sıralama görünümü
│   ├── demo-bot.js        # Yalnız kendi sırasında teklif/pas yapan demo botu
│   ├── datasets.js        # Üç ana kategori, altı koleksiyon ve seçim eşleştirmesi
│   ├── texts.js           # Metin yükleme, güvenli şablonlar ve yerel önizleme
│   ├── text-catalog.js    # Düzenleyici alanları ve varsayılan metin kataloğu
│   ├── text-editor.js     # Taslak, arama, önizleme ve JSON aktarımı
│   ├── room-state.js      # Üyelik, sürüm kontrolü, tur ve rövanş geçişleri
│   └── firebase-room.js   # Kalıcı kimlik, transaction, dinleyiciler, presence
├── assets/
│   ├── images/            # Yerel piksel kartları, veri seti ve reaksiyon ikonları
│   │   ├── legends/       # 100 efsanenin özgün piksel portresi
│   │   ├── superlig/      # 100 Süper Lig oyuncusunun kulüp renkli portresi
│   │   ├── desserts/      # Yeni tatlı kartları
│   │   ├── meals/         # Yeni ana yemek kartları
│   │   ├── series/        # Yeni dizi kartları
│   │   └── movies/        # 50 film için özgün piksel sahneleri
│   └── fonts/             # Yerel Press Start 2P / VT323 yazı tipleri ve OFL lisansları
├── firebase.rules.json    # RTDB erişim ve veri doğrulama kuralları
├── firebase.json          # İsteğe bağlı Firebase emulator ayarları
├── tests/
│   ├── auction.test.js
│   ├── blind-ranking.test.js
│   ├── bracket.test.js
│   ├── team-draft.test.js
│   ├── team-command.test.js
│   ├── game-setup.test.js
│   ├── firebase-session.test.js # Bağlantı/kimlik/presence yaşam döngüsü
│   ├── demo-bot.test.js
│   ├── room-state.test.js
│   ├── football-data.test.js # Kart sayıları, metadata ve görsel dosyaları
│   └── firebase-emulator.mjs # Yerel RTDB kuralları ve eşzamanlı yazma testi
├── tools/
│   ├── serve.mjs          # Sadece bilgisayarda geliştirme önizlemesi
│   ├── preflight.mjs      # Altı havuz, dört mod, yerel yollar ve çevrimiçi ayarlar
│   └── build-site.mjs     # Yalnız çalışma dosyalarını artifacts/site içine kopyalar
├── .github/workflows/pages.yml # Kontrol, test ve statik Pages yayını
├── package.json           # Önizleme ve test komutları; runtime bağımlılığı yok
├── .nojekyll              # GitHub Pages için
└── .gitignore
```

## Metin Atölyesi

Lobinin altındaki **Metin Atölyesi** bağlantısını açın. Başlık, slogan, düğme, koleksiyon açıklaması, oyun içi mesaj veya oyun kuralını arayıp ilgili kutuda değiştirin. Değişiklikler bu tarayıcıda otomatik taslak olarak saklanır. Oyuncu adı ve sayaç gibi otomatik doldurulan `{player}`, `{count}` alanları korunmalıdır; düzenleyici bunları kontrol eder.

**Önizlemeyi aç** yalnız `?metin-onizleme=1` adresindeki sayfaya bu cihazın taslağını uygular. Normal adres ve diğer oyuncular yayımlanmış metinleri görmeye devam eder. Önizlemeyi kapatıp oyun sayfasını yenileyerek normal metinlere dönebilirsiniz. Oyun verisi ve Firebase oturumu bu araçla değiştirilmez.

**Metinleri indir** bir `metinler.json` dosyası üretir. Herkesin değişiklikleri görmesi için depodaki aynı dosyayı bununla değiştirin ve GitHub Pages yayınının tamamlanmasını bekleyin. Daha sonra bu dosyayı **Dosyadan yükle** ile tekrar düzenleyebilirsiniz. GitHub Pages statik olduğu için düzenleyicideki taslak kaydı doğrudan GitHub'a dosya yazmaz.

Varsayılanlar `js/text-catalog-static.js` ve `js/text-catalog-runtime.js` içinde merkezi olarak tutulur; `metinler.json` yalnız değişiklikleri içerir. Hiç değişiklik yoksa `{"version":1,"texts":{}}` yeterlidir. Bilinmeyen alan, eksik otomatik alan veya geçersiz metin içeren dosya reddedilir; metinler HTML olarak çalıştırılmaz. Yayın hazırlık kontrolü bu dosyayı da doğrular.

## Oynanabilir modlar

Lobi, 6 rakamlı kodla iki kişilik oda kurma/katılma, bekleme ekranı, dört oyun modu ve aynı kodla rövanş hazırdır. Altı koleksiyonun tamamı dört modla kullanılabilir.

Her oyuncu 20 TL ve beş kartlık kontenjanla başlar. Açılış teklifini sistem 1 TL olarak yapar, hamle diğer oyuncuya geçer. Tam sayı teklif mevcut fiyattan büyük ve oyuncunun bütçesi içinde olmalıdır. Pas, son teklif sahibine kartı verir ve yalnızca kazananın bütçesini düşürür. Yeni kartta açılış sırası değişir. Açılış ve fiyat artırma kart satın almaz; bütçe yalnızca gerçek bir Pas hamlesiyle kapanan açık artırmada düşer. Her Pas en fazla bir kart verir. Bir oyuncunun bütçesi veya kontenjanı dolsa bile sonraki kartlar otomatik dağıtılmaz; o oyuncu sırası geldiğinde Pas diyerek kartı son teklif sahibine bırakır. Teklif veremeyen oyuncunun açılış sırası, açılış yapabilen rakibine geçer. İki oyuncu da kart alamayınca veya deste bitince sonuç ekranı açılır. Puanlama ölçütü tanımlanmadığı için sonuç ekranı kadroları ve kalan bütçeyi karşılaştırır.

Kör Sıralama, aynı altı koleksiyonun kartlarını ve yerel görsellerini kullanır. Karıştırılan havuzdan 10 kart seçilir; ekranda yalnızca mevcut kart gösterilir. Aktif oyuncu kartı 1–10 arasındaki boş bir sıraya yerleştirir (1 en iyi, 10 en alt); dolu sıra kilitlenir, sonraki kart açılır. İzleyicide seçim düğmeleri gizlenir, mevcut kart ve sıralama anlık güncellenir; reaksiyonlar kullanılabilir. Onuncu seçimde tam liste sonuç ekranında gösterilir. Rövanş oda kodunu korur, yeni 10 kart seçer ve sıralayan/izleyen rollerini değiştirir.

**O mu, Bu mu?** aynı havuzdan 16 benzersiz kartla başlar. Aktif oyuncu her eşleşmede iki karttan birini seçer; kazananlar son 16, çeyrek final, yarı final ve final sırasıyla üst tura çıkar. 15 seçim sonunda tek şampiyon ve dört turluk şampiyonluk yolu gösterilir. İzleyici kartları ve tur geçmişini görür, seçim yapamaz. Rövanşta aktif oyuncu değişir; demoda bot turnuvayı oynarken izlersin.

**Start, Bench, Cut** her oyuncu için 11 bağımsız turdan oluşur. İki oyuncu aynı etiketli üçlü dizisini kullanır; her oyuncunun tur indeksi ayrı tutulur. Önce bir kart seçilir, sonra boş Start/Bench/Cut rolüne atanır. Kart ve rol bu tur için kilitlenir; üçüncü atama kendi sonraki turunu açar. İlk bitiren diğerini bekler. İki taraf da 11 turu tamamlayınca yalnızca Start seçimleri üstlü/altlı piksel saha üzerinde sergilenir. Bir düello puanlama kuralı belirtilmediği için otomatik kazanan ilan edilmez.

Üçlü üretiminde aynı etiketten en az üç kart içeren gruplar kullanılır. Her üçlüde üç farklı kart bulunur. Mevcut uygun havuzdan artık üçlü çıkmıyorsa havuz yeniden karıştırılır; bu nedenle küçük koleksiyonlarda bir kart farklı turlarda tekrar aday olabilir ve farklı Start seçimlerinde yeniden bulunabilir. Bu kural `reusePolicy: 'pool-reset'` olarak odada saklanır; rövanş yeni 11 üçlüyle başlar.

Yeni bir veri setinin dört modda da kullanılabilmesi için 16–200 benzersiz kart ve aynı etiketten en az üç kart içeren bir grup gerekir. Sadece Kör Sıralama motorunun alt sınırı 10'dur. Mevcut altı koleksiyon bu dört modlu hazırlık kontrolünden geçer.

## Yerel önizleme

Node.js 20.11 veya üzeriyle proje klasöründe:

```sh
npm start
```

[Yerel önizlemeyi aç](http://127.0.0.1:4173/oyun/). `/oyun/` yolu GitHub Pages depo alt klasörünü taklit eder. Dosyaları `file://` ile açmayın: ES modülleri ve `fetch('./veri.json')` bir HTTP sunucusu gerektirir.

**Botla hemen oyna** ile Firebase bağlantısından bağımsız olarak Atari Bot'a karşı oynanabilir. Bot, mümkün olduğunda 1 TL açılışa fiyat artırarak cevap verir. Botun kendi 1 TL açılışında hamle oyuncudadır; oyuncu Pas demeden bot o kartı alamaz. Bu demo yalnızca o sekmede çalışır; farklı cihazları bağlamaz ve yenileyince sıfırlanır. Ses varsayılan olarak kapalıdır. Ses düğmesine basınca tarayıcının izin verdiği Web Audio üzerinden 8-bit efektler üretilir; ses dosyası indirilmez.

Kör Sıralama modunu seçince aynı düğme **Kör Sıralamayı Dene** olur. İlk turu sen sıralarsın; rövanşta Atari Bot her kart için boş bir sıra seçerken izlersin. Bir sonraki rövanşta tekrar sen sıralarsın. Yerel demo turu yenilenince sıfırlanır; çevrimiçi odanın sıraları veritabanından geri yüklenir.

Turnuvada **Turnuvayı Dene**, takım kurmada **Botla Takım Kur** düğmeleri kullanılır. Takım kurmada bot kendi 33 rol atamasını yapar; insanın atamalarını değiştirmez. Her iki modun bitişinde rövanş ve lobiye dönüş bulunur.

## 8-bit arayüz

Piksel başlıklar, terminal yazısı, kare konsol panelleri ve yerel SVG ikonları kullanılır. Yazı tipleri [Press Start 2P](https://github.com/google/fonts/tree/main/ofl/pressstart2p) ve [VT323](https://github.com/google/fonts/tree/main/ofl/vt323), `assets/fonts/` içinde OFL lisanslarıyla saklanır; harici font isteği yapılmaz.

Veri seti önizlemesi kartları gösterir; oyuncu adı bu cihazda hatırlanır. Mobilde veri seti ve oyuncu adı aynı giriş panelindedir. Firebase yapılandırılmadığında botla oynama düğmesi öncelikli görünür. Açık artırmadaki +1 / +2 / +5 TL kısayolları mevcut teklifi artırarak doğrudan hamle yapar. Sıra, bütçe ve bağlantı koşulları hem kısayollara hem normal teklif alanına uygulanır. Beş karelik kadro göstergesi ilerlemeyi gösterir. Dar ekranda input odağı ve `VisualViewport` değişimleri, giriş alanı ile ilgili eylem düğmelerini görünür tutar; sayfanın tamamı kaydırılabilir.

Ekran geçişi, kart açılışı, teklif artışı, kart kazanımı ve sonuç konfeti efektleri kısa, adımlı animasyonlarla çalışır. `prefers-reduced-motion` etkinse hareketler kapatılır. Bağlantı ve işlem tekrarlarında oyun animasyonları yeniden başlamaz; yeniden bağlanılan eski sonuç ekranında konfeti oynatılmaz.

Kör Sıralama'da seçim düğmeleri 5×2 düzenindedir; mobilde yatay kart ve eylemler listenin üstündedir. İlerleme sayacı dar ekranda da görünür; 320×740 görünümünde kart ve 10 seçim düğmesi kaydırmadan kullanılabilir. Her seçimde kilit simgesi, kısa piksel animasyonu ve açık sesle 8-bit efekt kullanılır. Klavyeyle seçim yaptıktan sonra odak bir sonraki boş sıraya geçer; işlem sürerken seçimler kapanır. Uzun kart isimleri sıralama tablosunda satıra yayılır.

Turnuvanın iki kartı mobilde yan yana kalır; tur geçmişi alt bölümde görünür. Takım kurmada üç aday ve üç rol düğmesi birlikte gösterilir. 320×740 testinde rol alanı ekranın ilk 688 pikselinde tamamlandı; düğmeler en az 48 piksel yüksekliğinde. Klavye odağı karttan boş role, atamadan sonra sonraki boş karta, kendi 11'i tamamlanınca bekleme başlığına geçer. Oda/kolleksiyon değişiminde önceki kartların önbelleği temizlenir. Demo kodu paylaşılabilir bir çevrimiçi oda olmadığından kopyalama kapalıdır.

## Firebase kurulumu

11 Ekim 2026'da **Adoapp** Firebase projesi (`adoapp-858f7`) Spark planında oluşturuldu. Anonymous giriş etkinleştirildi, `adnangn.github.io` yetkili alan adlarına eklendi ve Realtime Database `europe-west1` bölgesinde oluşturuldu. Projenin Web uygulama bilgileri ve tam veritabanı adresi `firebase-config.js` dosyasına eklendi; emulator kapalıdır. Güncel `firebase.rules.json` içeriği Firebase Console'da yayımlandı. Gerçek bulut bağlantısıyla yapılan kontrollerin kapsamı aşağıdaki Doğrulama bölümündedir.

Başka bir Firebase projesiyle kullanmak için genel kurulum adımları:

1. Firebase Console'da bir proje ve Web uygulaması oluşturun.
2. **Authentication → Sign-in method → Anonymous** giriş yöntemini açın.
3. **Realtime Database** oluşturun. Bölgenize ait tam `databaseURL` değerini alın.
4. Web uygulamasının yapılandırma bilgilerini `firebase-config.js` içine ekleyin. `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId` alanları gerekir. Bunlar istemci yapılandırmasıdır; servis hesabı veya özel anahtar koymayın.
5. **Realtime Database → Rules** bölümüne `firebase.rules.json` içeriğini uygulayın. Firestore kuralları bu uygulamada kullanılmaz.
6. Authentication → Settings → Authorized domains listesine `KULLANICI.github.io` alan adınızı, gerekirse yerel deneme için `localhost` ve `127.0.0.1` ekleyin.
7. Birinci cihazda isim, veri seti ve oyun modunu seçip oda kurun. İkinci cihazda isim ve kodla katılın. Oda sahibi iki cihaz da bağlanınca oyunu başlatır.

Dört modlu güncellemeyi mevcut Firebase projesinde kullanırken güncel `firebase.rules.json` içeriğini **Realtime Database → Rules** bölümünde ayrıca yayımlayın; eski kurallar yeni modları ve hamlelerini kabul etmez. Bu gereklilik Adoapp projesi için de geçerlidir: Web yapılandırmasını değiştirmek veya GitHub Pages'e yüklemek veritabanı kurallarını güncellemez. Node veya yerel önizleme sunucusu GitHub Pages'te çalışmaz; Firebase istemcisi dışında bir backend gerekmez.

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

`check`, altı havuzda dört motoru sonuna kadar oynatır; kart/görsel dosyalarını, göreli yolları ve dosya adlarının harf büyüklüğünü doğrular. `check:online` ayrıca beş Firebase alanının doluluğunu, HTTPS databaseURL ve kapalı emulator ayarını kontrol eder; Firebase'e bağlanıp hesabın veya yayımlanmış kuralların çalıştığını kanıtlamaz. Adoapp yapılandırması bu alanları içerir; eksik alan, HTTPS olmayan veya yerel bir veritabanı adresi ya da açık emulator ayarı kontrolü durdurur. `build` yalnız yerel `artifacts/site/` paketini yeniler, GitHub'a dosya göndermez.

İç yollar `./styles.css`, `./app.js`, `./veri.json` ve `./assets/images/...` biçimindedir. URL yönlendirme/history routing yoktur; ekran değişimleri DOM ile yapılır, böylece yenileme 404'e yol açmaz. Firebase SDK'sı resmi CDN'den sabit 13.0.0 sürümüyle gerektiğinde yüklenir; internet bağlantısı gerekir. Yerel `tools/serve.mjs` canlı ortamda çalıştırılmaz.

## Veri formatı

`veri.json` içinde altı kart havuzu aynı kart sözleşmesini kullanır. Üç ana kategori içinde ikişer koleksiyon seçilir. Seçilen havuz oda kurarken kaydedilir; bot, katılan oyuncu ve rövanş aynı havuzu kullanır. Ana kategoriye geri dönünce o kategorinin son alt seçimi hatırlanır. Kart galerisi isim veya takım adıyla aranabilir.

| Ana kategori | Koleksiyon | JSON anahtarı | Kart |
| --- | --- | --- | ---: |
| Futbolcular | Efsaneler | `futbol` | 100 |
| Futbolcular | Türkiye Süper Lig | `superlig` | 100 |
| Yemekler | Tatlılar | `tatli` | 50 |
| Yemekler | Ana Yemekler | `yemek` | 50 |
| Diziler ve Filmler | Diziler | `dizi` | 50 |
| Diziler ve Filmler | Filmler | `film` | 50 |

```json
{
  "futbol": [
    { "id": 1, "isim": "Lionel Messi", "gorsel": "assets/images/legends/messi.svg", "etiket": "FV", "takim": "Arjantin", "takimTuru": "milli" }
  ],
  "superlig": [],
  "tatli": [],
  "yemek": [],
  "dizi": [],
  "film": []
}
```

Örnek, kart sözleşmesini gösterir; uygulamada her veri seti 10–200 benzersiz kart içermeli, ID'ler 1–1.000.000 arası tam sayı olmalıdır. Toplam **400 kart** vardır. ID'ler havuz içinde benzersizdir; ardışık olma şartı yoktur. `etiket`, kategoriden bağımsızdır; futbol kartlarında FV/OF/DF/KL, yemeklerde tür, ekran yapımlarında tür/genre kullanılır. İsteğe bağlı `takim` metni kartta ve kadroda gösterilir; `takimTuru` milli takım/kulüp ayrımını saklar. Kendi JPG/PNG dosyalarınızı `assets/images/` klasörüne koyup `gorsel` değerini değiştirin. Gelen görseller CSS `image-rendering: pixelated` ve hafif kontrastla gösterilir.

Efsaneler, başarı ve geniş bilinirlik gözetilerek hazırlanmış editoryal bir seçkidir; ölçülmüş taraftar sayısı sıralaması değildir. Aktif ve emekli isimler birlikte bulunur. İkonik milli takım renkleriyle gösterilir; ülke bilgisi güncel kulüp iddiası taşımaz. Süper Lig portrelerinde doğrulanmış kulübün renkleri kullanılır. Her futbolcu için farklı saç, ten, sakal ve forma ayrıntıları olan özgün 96×96 SVG vardır.

İlk 50 efsane korunarak 1990–2015 döneminde sahaya damga vurmuş 30 isim eklendi: Gerrard, Lampard, Scholes, Rooney, Totti, Del Piero, Shevchenko, Seedorf, Vieira, Ballack, Schweinsteiger, Nedvěd, Owen, Torres, Van Nistelrooy, Van Persie, Klose, Schmeichel, Čech, Dida, Ramos, Ferdinand, Vidić, Suárez, Neymar, Hagi, Alex, Robben, Sneijder ve Makélélé. Yeni kartların `donem` alanı `1990–2015` değeridir; oyuncuların tüm kariyerlerinin bu aralıkla sınırlı olduğu anlamına gelmez.

Süper Lig seçkisinde ilk 50 kart korunarak 30 yeni oyuncu eklendi. On kulüp temsil ediliyor; Beşiktaş'ta Vlahović, Fenerbahçe'de Greenwood, Trabzonspor'da Salah, Amed FK'de Dia Saba dahil sekiz oyuncu var. Başakşehir ve Kocaelispor yıldızları da havuza dahil.

Son genişlemede altı koleksiyonun her birine 20 kart ve 20 yerel piksel görseli eklendi: futbol havuzları 100'er, diğer havuzlar 50'şer karta ulaştı. Önceki 280 kartın kimlikleri, isimleri, etiketleri ve görselleri korundu; devam eden odaların eski kart referansları geçerlidir. Yeni efsaneler arasında Riquelme, Verón, Rui Costa, Deco, Laudrup kardeşler, Okocha, Abedi Pelé, David Villa, Inzaghi, Crespo ve Van der Sar bulunur; ID81–100 kartları da `1990–2015` dönem işaretini taşır. Yeni Süper Lig kartlarının ID81–100 kaynakları 9 Ekim 2026 erişim tarihiyle ayrıca kaydedildi; önceki 80 kartın kaynak tarihleri değiştirilmedi.

`tools/legends-cards.json`, `tools/superlig-cards.json`, `tools/extra-collections.json` ve görsel üreteçleri geliştirme kaynaklarıdır. `node tools/generate-legends.mjs`, `node tools/generate-superlig.mjs` ve `node tools/generate-collections.mjs` yerel SVG'leri tekrar oluşturur; runtime veri dosyasını otomatik değiştirmezler. Tarayıcı yalnızca tek `./veri.json` dosyasını okur; veri ve görseller yereldir. Transferler otomatik izlenmez; yeni kadro güncellemesinde veri dosyası ve ilgili portre birlikte yenilenmelidir.

`tools/additions-legends.json`, `tools/additions-superlig.json` ve `tools/additions-collections.json` son eklenen 120 kartın ayrı üretim listeleridir; tarayıcı bunları okumaz. Ana yemeklerin eski ID'leri aralıklı olduğundan yeni kartlar 37–56 aralığında; tatlı, dizi ve film havuzlarının yeni kartları 31–50 aralığında saklanır.

Mevcut görseller **temsili demo piksel çizimleridir**; gerçek oyuncu fotoğrafları veya dizi afişleri değildir. JSON ve görseller Firebase'e yazılmaz; odada yalnızca kart ID'leri ve seçim durumu tutulur. Devam eden odalarda veri setini değiştirip aynı ID'yi başka karta atamayın.

## Oda ve bağlantı davranışı

```text
rooms/{kod}                     # Metadata + players + revision + game
presence/{kod}/{uid}/{sekmeId}   # Sekmeye özel bağlantı kayıtları
reactions/{kod}/{uid}           # Oyuncunun son reaksiyonu ve sıra numarası
```

Oda kurma, ikinci koltuğu alma, başlatma, teklif, pas, sıralama, turnuva seçimi, rol ataması, rövanş ve reaksiyon yazıları `runTransaction(..., { applyLocally: false })` kullanır. Rastgele deste, etiketli üçlüler ve oda kodu transaction callback'i dışında üretilir. Oyun yazıları oda sürümünü bir artırır. Açık artırma/sıralama/turnuva/rövanş hamleleri ekranda görülen `revision` değerini taşır; ilgili durum değişmişse eski hamle reddedilir. Kazananın bütçesi, kadrosu ve yeni kart tek atomik oda işlemiyle güncellenir. Kör Sıralama'da tek işlem boş sırayı kilitler ve kartı ilerletir. Turnuvada bir seçim eşleşmenin kazananını kaydeder ve sonraki eşleşmeyi açar. Takım kurmada bir rol ataması yalnız kendi oyuncusunun turunu değiştirir; üçüncü atama üç rolü beraber kaydeder.

Takım kurmada iki oyuncu bağımsız olduğu için her atama öncesi kendi oyuncusunun turu, kilitli rolleri, üçlüsü ve oda kimliğini içeren değişmez bir cursor yakalanır. Transaction tekrarında yalnız rakip ilerlediyse hamle güncel oda sürümüyle uygulanır. Kendi durumu değiştiyse, aynı ID başka turda tekrar geldiyse veya rövanş/oda değiştiyse eski hamle reddedilir. Cursor tekrar sırasında yeniden oluşturulmaz; iki ayrı oyuncunun eşzamanlı hamleleri korunurken aynı oyuncunun çift tıklaması iki kez yazılmaz. Demo botu da aynı kontrolü kullanır; insanın seçimi botun bağımsız turunu ertelemez.

Firebase Auth kimliği `browserLocalPersistence` ile kalıcıdır. LocalStorage yalnızca oda kodunu ve ilgili UID'yi saklar; bütçe ve kartlar veritabanından yeniden okunur. Yenilemede son odaya otomatik dönüş denenir; kod elle de girilebilir. Bağlantı kesilirse yeni hamleler kapatılır. Diğer oyuncunun koltuğu ve oyun durumu korunur. Odadan çıkmak yerel bağlantıyı kapatır, ayrılan oyuncunun yerini başkasına vermez; aynı kimlik aynı kodla geri dönebilir. Tarayıcı verileri silinirse/gizli oturum kapanırsa anonim kimlik kaybolur ve eski koltuk otomatik kurtarılamaz.

**Odadan çık** oyuncu kimliğini korur. **Oturumu kapat** düğmesinin açıklamasında anonim kimliğe bağlı eski koltuğun yeni bir oturumla kurtarılamayacağı belirtilir; onaydan sonra dinleyiciler/presence durdurulur, Firebase Auth'tan çıkılır ve yerel oda/ad kaydı temizlenir. Yenileme kendiliğinden tekrar anonim giriş yapmaz; **Oyuncu oturumu aç** ile yeni UID oluşturulur. Firebase ayarları boşken **Kaydı temizle** yalnız yerel ad/demo turunu temizler. Firebase anonim hesabı ve veritabanındaki odalar silinmez.

Aynı tarayıcı profilinin başka sekmesinde kimlik değişirse eski servis de kapanır; eski UID ile hamle veya presence yayımlanamaz. Oda/oturum değişirken bekleyen işlemler, dinleyici hataları, reaksiyonlar ve odak güncellemeleri yeni ekrana taşınmaz. Oturum açılışı tek istek olarak tutulur; bağlantı kurtarma sırasında demo başlatılması eski odayı sonradan açmaz.

Presence her sekme için ayrı tutulur, böylece bir sekmeyi kapatmak diğer açık sekmeyi çevrimdışı göstermez. Firebase'in `onDisconnect` API'sinde transaction karşılığı bulunmadığı için yalnızca o sekmenin bağımsız presence kaydını silmek üzere `onDisconnect(...).remove()` kullanılır. Bu işlem oyun, bütçe veya oyuncu koltuklarına dokunmaz. Normal presence yazıları ve temizliği transaction'dır. Çıkış ekranı ağ temizliğini beklemez.

Reaksiyonlar göndericiye bağlıdır, 1.5 saniye arayla gönderilebilir, sekme açılırken eski reaksiyon tekrar oynatılmaz. Ses karşı tarafta ancak o cihazdaki ses düğmesi etkinleştirilmişse çalar. Rövanş mevcut iki koltuğu ve kodu korur, tur sayısını artırır ve başlangıç oyuncusunu değiştirir. Açık Artırma'da bütçeler/kadrolar, Kör Sıralama'da kilitli sıralar, turnuvada eleme geçmişi, takım kurmada iki oyuncunun tüm rol/seçim kayıtları sıfırlanır. Yenileme veya aynı kodla dönüşte aktif rol, kart/eşleşme indeksleri ve bekleyen/tamamlanan seçimler odadan geri gelir.

## Kuralların sınırı

Kurallar kökten listeleme ve genel yazma iznini kapatır; oda kodunu bilen anonim kullanıcı yalnızca boş/bekleyen odayı okuyup ikinci koltuğa katılabilir. Dolu/başlamış oda, presence ve reaksiyonlar yalnızca o odanın oyuncularına açıktır. Üyelik, oyuncu kimlikleri, oda ayarları, sıra, sürüm ve oyun veri sınırları sunucuda denetlenir.

Bu sürüm güvenilir arkadaşlar arasında oyun için hazırlanmıştır. İstemci seçtiği statik desteyi gönderir; sunucu yerel `veri.json` içeriğinin gerçekliğini veya karıştırmanın adilliğini doğrulayamaz. Tarayıcı odayı açmadan önce ID'lerin seçili koleksiyonda bulunduğunu ve takım üçlülerinin gerçek etiketlerini kontrol eder. Kör Sıralama kuralları 10 kartın benzersizliğini ve her hamlede yalnızca bir boş sıranın doldurulmasını doğrular; izleyici hamlesini ve önceki seçimlerin değiştirilmesini reddeder. Turnuvada kurallar mevcut iki adaydan bir kazananı, eleme sırasını ve geçmişin korunmasını denetler. Takım kurmada aynı turdaki rol/kart tekrarları, rakibin seçimlerine müdahale, tur atlama ve bitmiş oyuncunun ek ataması reddedilir. Gelecek kartlar arayüzde gösterilmez, ancak oda üyelerinin okuyabildiği desteyi geliştirici araçlarıyla incelemek mümkündür. Tam kötü niyetli istemci/ödüllü turnuva koruması iddiası yoktur. Odalar otomatik silinmez; artık kullanılmayan odaları Firebase Console'dan temizleyin.

## Doğrulama

```sh
npm test
```

Toplam **91 test geçti**: açık artırma/bot/oda geçişlerinde 24, veri/seçim yapısında 10, Kör Sıralama'da 12, turnuvada 8, takım kurmada 10, bağımsız takım atamalarında 9, üçlü/havuz hazırlığında 3, Firebase servis yaşam döngüsünde 9 ve metin özelleştirmede 6 test. Sıra/para/kontenjan sınırları, değişmez transaction tekrarları, yarışan hamleler, izleyici yetkisi, kilitli seçimler, RTDB boş alan normalizasyonu, bozuk durumlar, bitiş ve rövanşlar kapsanır. Bağımsız atama testleri rakip ilerlerken yeniden denemeyi ve aynı oyuncunun eski hamlesinin sonraki tur/rövanşa taşınmamasını doğrular. Firebase servis testleri kontrollü SDK ile kalıcı UID, dışarıdan oturum kapanması, tekrar işlemde UID değişimi, onDisconnect kayıt sırası, sekme izolasyonu ve oturum kapatmayı kontrol eder; gerçek ağ/Auth sunucusu testi değildir. Yeni katılma regresyonu, tek seferlik okumadan sonra boş kalan yerel transaction önbelleğini modeller; geçici oda dinleyicisinin işlem boyunca korunmasını, yarışan katılımları, aynı kimlikle dönüşü ve başarı/hata/oturum değişiminde dinleyici temizliğini doğrular. Metin testleri JSON biçimi ve alan doğrulamasını, şablondaki otomatik alanların korunmasını, oyuncu adlarının düz metin olarak işlenmesini ve DOM metni güncellenirken ikonlarla boşlukların korunmasını doğrular; katalogdaki varsayılan metinler de aynı sözleşmeden geçer.

Önceki geliştirme doğrulamasında RTDB kuralları resmi Database Emulator 4.11.2'de başarıyla derlendi. Ayrı REST entegrasyon testi **55 kontrolü geçti, atlanan kontrol yok**: önceki 32 açık artırma/oda/presence/reaksiyon/Kör Sıralama kontrolüne ek olarak turnuva için 10 ve takım kurma için 13 kontrol. Turnuvanın 15 seçimi, takım kurmanın 66 rol ataması, izleyici/rakip müdahalesi, toplu veya eski sürüm hamleleri, aynı kodla rövanş ve durumu geri okuma doğrulandı. İki farklı oyuncunun aynı görüntüden başlayan atamaları CAS çakışması ardından yeniden üretilip ikisi de kaydedildi; kendi eski cursor'ıyla tekrar atama oda değiştirmeden reddedildi. Bu tarihsel emulator testi SDK'nın tarayıcı Auth kalıcılığı veya gerçek cihaz bağlantısını taklit etmez; aşağıdaki bulut kontrollerinden ayrıdır.

Önceki yerel tarayıcı demo kontrollerinde Kör Sıralama'nın insan turu ve izleyici rövanşı, turnuvanın insan/bot 15 seçimli turları, takım kurmanın iki 11'li kadrosu ve temiz rövanşı tamamlandı. Açık artırmada gerçek Pas öncesi bütçe/kadro değişmediği ve sonraki kartta açılışın diğerine geçtiği kontrol edildi. Kayıt temizleme penceresinde vazgeçmek odayı korudu; onaylamak adı/demo turunu temizleyip lobiye döndü. Klavye odağı, kilitli düğmeler, yerel görseller ve küçük mobil görünüm kontrol edildi. Hazırlık kontrolü altı havuzun tamamını dört modda sonuna kadar oynatır. Bu demo kontrolleri Firebase bulut bağlantısı kullanmadı.

11 Ekim 2026'da gerçek Adoapp Firebase bulutuna bağlanan iki ayrı tarayıcı kökeninde (`127.0.0.1` ve `localhost`) iki bağımsız anonim kimlikle açık artırma doğrulandı. `957722` kodlu oda oluşturuldu ve ikinci oyuncu katıldı. P2'nin 2 TL teklifi ve P1'in Pas hamlesiyle P2'nin bütçesi 18 TL, kadrosu 1/5 oldu; her iki sayfanın yenilenmesi aynı oda, koltuk ve oyun durumunu geri getirdi. Sırası olmayan oyuncunun eylemleri kilitlendi ve reaksiyon karşı oyuncuya ulaştı. On kart tamamlandıktan sonra rövanş aynı oda kodunu korudu; bütçeler 20 TL'ye döndü ve başlangıç P2'ye geçti.

Aynı bulut bağlantısıyla `808808` kodlu Kör Sıralama odasında 10 seçim tamamlandı. İzleyicinin seçim düğmeleri gizlendi; rövanşta aktif oyuncu P2, izleyici P1 oldu.

Turnuva için `451466` kodlu odada P1 seçim yaparken P2'nin iki aday düğmesi devre dışı kaldı. On beş seçim tamamlandı ve iki oyuncunun ekranında Sergio Ramos şampiyon olarak gösterildi.

Takım kurma için `221667` kodlu odada iki oyuncu aynı ilk üçlüden farklı Start seçimleri yaptı: P1 Del Piero'yu, P2 Pelé'yi seçti. P1 kendi 33 atamasıyla 11 turu bitirip bekleme ekranına geçtiğinde P2'nin birinci turdaki tek rolü korundu. P2 kalan 32 atamasını tamamlayınca her iki oyuncu aynı sonuç ekranında iki 11'i sahada gördü; bulutta toplam 66 atama kaydedildi. İki istemcinin uyarı ve hata günlükleri boştu. Ekran görüntüsü yerel `artifacts/firebase-iki-oyuncu-duello.png` dosyasında saklandı.

11 Ekim tarihli bu dört mod kontrolü gerçek Firebase bulutuna bağlanan, aynı bilgisayardaki iki farklı site kökeni ve iki bağımsız anonim kimlikle yapıldı; fiziksel iki cihaz testini kapsamaz. GitHub Pages üzerindeki bağlantı yayın sonrası ayrıca kontrol edilir.

Firebase CLI kurulmuşsa yerel emülatörü `firebase emulators:start --only database --project demo-iki-kisilik` ile başlatın, ikinci terminalde `npm run test:firebase` çalıştırın. Bu komut `tests/firebase-emulator.mjs` dosyasını çalıştırır. Test yalnızca `127.0.0.1:9000` üzerindeki `demo-iki-kisilik` namespace'ini kullanır, kuralları yükler ve `918001`–`918005` test odalarını/presence/reaksiyonlarını test öncesi/sonrası temizler. Canlı Firebase yapılandırması veya hesabı gerekmez. Tarayıcı uygulamasını Auth+Database emülatörleriyle denemek için `firebase emulators:start --project demo-iki-kisilik`, yerel demo proje yapılandırması ve `emulatorConfig.enabled: true` kullanılabilir; GitHub Pages için emulator ayarını kapalı bırakın.

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
