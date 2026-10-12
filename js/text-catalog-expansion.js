// Collection copy also appears in Metin Atölyesi.
const field = (label, value = label) => ({ group: 'Koleksiyonlar', label, value });
export const EXPANSION_TEXT_CATALOG = {
  'runtime.category.muzik.label': field('Müzik kategorisi adı', 'Yerli Müzik'),
  'runtime.category.ankara.label': field('Ankara kategorisi adı', 'Ankara'),
  'runtime.expansion.music.heading': field('Müzik koleksiyonu başlığı', 'SAHNENİ SEÇ'),
  'runtime.expansion.ankara.heading': field('Ankara koleksiyonu başlığı', 'ANKARA TURU'),
  'runtime.expansion.turkish.title': field('Türkiye efsaneleri adı', 'Türkiye Efsaneleri'),
  'runtime.expansion.turkish.description': field('Türkiye efsaneleri kısa açıklaması', 'Eski futbolcular, unutulmaz isimler.'),
  'runtime.expansion.turkish.note': field('Türkiye efsaneleri koleksiyon notu', '50 eski Türk futbolcu · Milli forma renkleri.'),
  'runtime.expansion.world.title': field('Dünya yıldızları adı', 'Güncel Dünya Yıldızları'),
  'runtime.expansion.world.description': field('Dünya yıldızları kısa açıklaması', 'Bugünün sahalarından 50 yıldız.'),
  'runtime.expansion.world.note': field('Dünya yıldızları koleksiyon notu', '50 aktif futbolcu · Ülke ve milli forma renkleri.'),
  'runtime.expansion.artists.title': field('Yerli müzik koleksiyonu adı', 'Şarkıcılar ve Gruplar'),
  'runtime.expansion.artists.description': field('Yerli müzik kısa açıklaması', 'Pop, rock, rap ve unutulmaz sesler.'),
  'runtime.expansion.artists.note': field('Yerli müzik koleksiyon notu', '50 yerli şarkıcı ve grup · Sahne senin.'),
  'runtime.expansion.districts.title': field('Ankara ilçeleri koleksiyon adı', 'Ankara İlçeleri'),
  'runtime.expansion.districts.description': field('Ankara ilçeleri kısa açıklaması', 'Başkentten 25 ilçe, bir kapışma.'),
  'runtime.expansion.districts.note': field('Ankara ilçeleri koleksiyon notu', 'Ankara’nın 25 ilçesi · Temsili piksel manzaraları.'),
  'runtime.expansion.drinks.title': field('İçecek koleksiyonu adı', 'İçecekler'),
  'runtime.expansion.drinks.description': field('İçecek kısa açıklaması', 'Sıcak, soğuk ve birkaç alkollü seçenek.'),
  'runtime.expansion.drinks.note': field('İçecek koleksiyon notu', '50 içecek · Alkolsüz seçenekler çoğunlukta.'),
  'runtime.expansion.search.artists': field('Şarkıcı arama alanı', 'Şarkıcı, grup veya tür ara'),
  'runtime.expansion.search.districts': field('İlçe arama alanı', 'İlçe adı ara'),
  'runtime.expansion.search.drinks': field('İçecek arama alanı', 'İçecek adı veya tür ara')
};
