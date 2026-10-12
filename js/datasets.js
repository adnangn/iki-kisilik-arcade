import { t } from './texts.js';

const collection = (id, titleKey, symbol, descriptionKey, noteKey, searchKey) => ({
  id, symbol, searchKey,
  get title() { return t(titleKey); },
  get description() { return t(descriptionKey); },
  get note() { return t(noteKey); }
});

export const DATASET_GROUPS = {
  futbol: { get label() { return t('runtime.category.futbol.label'); }, get heading() { return t('runtime.copy.futbol_koleksiyonu'); }, icon: 'ball', sets: [
    collection('futbol', 'runtime.copy.efsaneler', '★', 'runtime.copy.1990_2015_yildizlari_da_sahada', 'runtime.copy.tum_zamanlardan_efsaneler_ikonik_milli_takim_renkler', 'runtime.copy.isim_veya_takim_ara'),
    collection('superlig', 'runtime.copy.turkiye_super_lig', '⚑', 'runtime.copy.amed_fk_dahil_guncel_yildizlar', 'runtime.copy.2026_27_kadrolari_kulup_kontrolu_8_9_ekim_2026', 'runtime.copy.isim_veya_takim_ara'),
    collection('turkiye-efsaneleri', 'runtime.expansion.turkish.title', '◆', 'runtime.expansion.turkish.description', 'runtime.expansion.turkish.note', 'runtime.copy.isim_veya_takim_ara'),
    collection('dunya-yildizlari', 'runtime.expansion.world.title', '✦', 'runtime.expansion.world.description', 'runtime.expansion.world.note', 'runtime.copy.isim_veya_takim_ara')
  ] },
  yemek: { get label() { return t('runtime.category.yemek.label'); }, get heading() { return t('runtime.copy.menunu_sec'); }, icon: 'cake', sets: [
    collection('tatli', 'runtime.copy.tatlilar', '♥', 'runtime.copy.serbetli_sutlu_cikolatali', 'runtime.copy.50_tatli_tatli_bir_kapisma', 'runtime.copy.tatli_adi_ara'),
    collection('yemek', 'runtime.copy.ana_yemekler', '♨', 'runtime.copy.sofranin_yildizlarini_sec', 'runtime.copy.50_ana_yemek_turk_ve_dunya_mutfagindan', 'runtime.copy.yemek_adi_ara'),
    collection('icecek', 'runtime.expansion.drinks.title', '☕', 'runtime.expansion.drinks.description', 'runtime.expansion.drinks.note', 'runtime.expansion.search.drinks')
  ] },
  dizi: { get label() { return t('runtime.category.dizi.label'); }, get heading() { return t('runtime.copy.ne_izliyoruz'); }, icon: 'tv', sets: [
    collection('dizi', 'runtime.copy.diziler', '▣', 'runtime.copy.bir_bolum_daha_bir_tur_daha', 'runtime.copy.50_dizi_yerli_ve_yabanci_unutulmaz_yapimlar', 'runtime.copy.dizi_adi_ara'),
    collection('film', 'runtime.copy.filmler', '▶', 'runtime.copy.kult_filmler_buyuk_hikayeler', 'runtime.copy.50_film_sinemanin_sevilen_klasikleri', 'runtime.copy.film_adi_ara')
  ] },
  muzik: { get label() { return t('runtime.category.muzik.label'); }, get heading() { return t('runtime.expansion.music.heading'); }, icon: 'music', sets: [
    collection('yerli-sanatcilar', 'runtime.expansion.artists.title', '♫', 'runtime.expansion.artists.description', 'runtime.expansion.artists.note', 'runtime.expansion.search.artists')
  ] },
  ankara: { get label() { return t('runtime.category.ankara.label'); }, get heading() { return t('runtime.expansion.ankara.heading'); }, icon: 'map', sets: [
    collection('ankara-ilceleri', 'runtime.expansion.districts.title', '⌖', 'runtime.expansion.districts.description', 'runtime.expansion.districts.note', 'runtime.expansion.search.districts'),
    collection('istanbul-ilceleri', 'runtime.expansion.istanbul.title', '≋', 'runtime.expansion.istanbul.description', 'runtime.expansion.istanbul.note', 'runtime.expansion.search.districts'),
    collection('turkiye-sehirleri', 'runtime.expansion.cities.title', '⌂', 'runtime.expansion.cities.description', 'runtime.expansion.cities.note', 'runtime.expansion.search.places'),
    collection('ulkeler', 'runtime.expansion.countries.title', '⚑', 'runtime.expansion.countries.description', 'runtime.expansion.countries.note', 'runtime.expansion.search.places')
  ] },
  nostalji: { get label() { return t('runtime.category.nostalji.label'); }, get heading() { return t('runtime.expansion.nostalgia.heading'); }, icon: 'cassette', sets: [
    collection('cocukluk-cizgifilmleri', 'runtime.expansion.cartoons.title', '▣', 'runtime.expansion.cartoons.description', 'runtime.expansion.cartoons.note', 'runtime.expansion.search.nostalgia'),
    collection('doksanlar-nostalji', 'runtime.expansion.nineties.title', '▦', 'runtime.expansion.nineties.description', 'runtime.expansion.nineties.note', 'runtime.expansion.search.nostalgia'),
    collection('kantin-bakkal', 'runtime.expansion.snacks.title', '♥', 'runtime.expansion.snacks.description', 'runtime.expansion.snacks.note', 'runtime.expansion.search.nostalgia')
  ] },
  oyun: { get label() { return t('runtime.category.oyun.label'); }, get heading() { return t('runtime.expansion.games.heading'); }, icon: 'controller', sets: [
    collection('oyun-evreni', 'runtime.expansion.games.title', '✚', 'runtime.expansion.games.description', 'runtime.expansion.games.note', 'runtime.expansion.search.games')
  ] }
};

export const DATASET_NAMES = {};
for (const group of Object.values(DATASET_GROUPS)) {
  for (const set of group.sets) Object.defineProperty(DATASET_NAMES, set.id, { enumerable: true, get: () => set.title });
}

export function resolveDatasetId(category, preferredId) {
  const group = DATASET_GROUPS[category];
  if (!group) throw new Error(t('runtime.error.unknown_category'));
  return group.sets.some(set => set.id === preferredId) ? preferredId : group.sets[0].id;
}
