import { t } from './texts.js';

const collection = (id, titleKey, symbol, descriptionKey, noteKey, searchKey) => ({
  id, symbol, searchKey,
  get title() { return t(titleKey); },
  get description() { return t(descriptionKey); },
  get note() { return t(noteKey); }
});
const family = (id, titleKey, sets) => ({ id, sets, get title() { return t(titleKey); } });

export const DATASET_GROUPS = {
  futbol: { get label() { return t('runtime.category.futbol.label'); }, get heading() { return t('runtime.copy.futbol_koleksiyonu'); }, icon: 'ball', sets: [
    collection('futbol', 'runtime.copy.efsaneler', '★', 'runtime.copy.1990_2015_yildizlari_da_sahada', 'runtime.copy.tum_zamanlardan_efsaneler_ikonik_milli_takim_renkler', 'runtime.copy.isim_veya_takim_ara'),
    collection('superlig', 'runtime.copy.turkiye_super_lig', '⚑', 'runtime.copy.amed_fk_dahil_guncel_yildizlar', 'runtime.copy.2026_27_kadrolari_kulup_kontrolu_8_9_ekim_2026', 'runtime.copy.isim_veya_takim_ara'),
    collection('turkiye-efsaneleri', 'runtime.expansion.turkish.title', '◆', 'runtime.expansion.turkish.description', 'runtime.expansion.turkish.note', 'runtime.copy.isim_veya_takim_ara'),
    collection('dunya-yildizlari', 'runtime.expansion.world.title', '✦', 'runtime.expansion.world.description', 'runtime.expansion.world.note', 'runtime.copy.isim_veya_takim_ara')
  ] },
  yemek: { get label() { return t('runtime.category.yemek.label'); }, get heading() { return t('runtime.copy.menunu_sec'); }, icon: 'cake', families: [
    family('tatli', 'runtime.copy.tatlilar', ['tatli-vol1', 'tatli']),
    family('yemek', 'runtime.copy.ana_yemekler', ['yemek-vol1', 'yemek']),
    family('icecek', 'runtime.expansion.drinks.title', ['icecek']),
    family('sokak', 'lifestyle.street.title', ['sokak-lezzetleri'])
  ], sets: [
    collection('tatli-vol1', 'runtime.volumes.desserts.first.title', '♥', 'runtime.volumes.desserts.first.description', 'runtime.volumes.desserts.first.note', 'runtime.copy.tatli_adi_ara'),
    collection('tatli', 'runtime.volumes.desserts.full.title', '♥', 'runtime.volumes.full.description', 'runtime.volumes.desserts.full.note', 'runtime.copy.tatli_adi_ara'),
    collection('yemek-vol1', 'runtime.volumes.meals.first.title', '♨', 'runtime.volumes.meals.first.description', 'runtime.volumes.meals.first.note', 'runtime.copy.yemek_adi_ara'),
    collection('yemek', 'runtime.volumes.meals.full.title', '♨', 'runtime.volumes.full.description', 'runtime.volumes.meals.full.note', 'runtime.copy.yemek_adi_ara'),
    collection('icecek', 'runtime.expansion.drinks.title', '☕', 'runtime.expansion.drinks.description', 'runtime.expansion.drinks.note', 'runtime.expansion.search.drinks'),
    collection('sokak-lezzetleri', 'lifestyle.street.title', '♨', 'lifestyle.street.description', 'lifestyle.street.note', 'lifestyle.street.search')
  ] },
  dizi: { get label() { return t('lifestyle.screens.category'); }, get heading() { return t('runtime.copy.ne_izliyoruz'); }, icon: 'tv', sets: [
    collection('dizi', 'runtime.copy.diziler', '▣', 'runtime.copy.bir_bolum_daha_bir_tur_daha', 'runtime.copy.50_dizi_yerli_ve_yabanci_unutulmaz_yapimlar', 'runtime.copy.dizi_adi_ara'),
    collection('film', 'runtime.copy.filmler', '▶', 'runtime.copy.kult_filmler_buyuk_hikayeler', 'runtime.copy.50_film_sinemanin_sevilen_klasikleri', 'runtime.copy.film_adi_ara'),
    collection('tv-yarismalari', 'lifestyle.tv.title', '▣', 'lifestyle.tv.description', 'lifestyle.tv.note', 'lifestyle.tv.search')
  ] },
  muzik: { get label() { return t('runtime.category.muzik.label'); }, get heading() { return t('runtime.expansion.music.heading'); }, icon: 'music', sets: [
    collection('yerli-sanatcilar', 'runtime.expansion.artists.title', '♫', 'runtime.expansion.artists.description', 'runtime.expansion.artists.note', 'runtime.expansion.search.artists')
  ] },
  ankara: { get label() { return t('lifestyle.places.category'); }, get heading() { return t('runtime.expansion.ankara.heading'); }, icon: 'map', sets: [
    collection('ankara-ilceleri', 'runtime.expansion.districts.title', '⌖', 'runtime.expansion.districts.description', 'runtime.expansion.districts.note', 'runtime.expansion.search.districts'),
    collection('istanbul-ilceleri', 'runtime.expansion.istanbul.title', '≋', 'runtime.expansion.istanbul.description', 'runtime.expansion.istanbul.note', 'runtime.expansion.search.districts'),
    collection('turkiye-sehirleri', 'runtime.expansion.cities.title', '⌂', 'runtime.expansion.cities.description', 'runtime.expansion.cities.note', 'runtime.expansion.search.places'),
    collection('ulkeler', 'runtime.expansion.countries.title', '⚑', 'runtime.expansion.countries.description', 'runtime.expansion.countries.note', 'runtime.expansion.search.places'),
    collection('tatil-rotalari', 'lifestyle.routes.title', '☀', 'lifestyle.routes.description', 'lifestyle.routes.note', 'lifestyle.routes.search'),
    collection('ikonik-mekanlar', 'lifestyle.landmarks.title', '⌂', 'lifestyle.landmarks.description', 'lifestyle.landmarks.note', 'lifestyle.landmarks.search')
  ] },
  nostalji: { get label() { return t('runtime.category.nostalji.label'); }, get heading() { return t('runtime.expansion.nostalgia.heading'); }, icon: 'cassette', sets: [
    collection('cocukluk-cizgifilmleri', 'runtime.expansion.cartoons.title', '▣', 'runtime.expansion.cartoons.description', 'runtime.expansion.cartoons.note', 'runtime.expansion.search.nostalgia'),
    collection('doksanlar-nostalji', 'runtime.expansion.nineties.title', '▦', 'runtime.expansion.nineties.description', 'runtime.expansion.nineties.note', 'runtime.expansion.search.nostalgia'),
    collection('kantin-bakkal', 'runtime.expansion.snacks.title', '♥', 'runtime.expansion.snacks.description', 'runtime.expansion.snacks.note', 'runtime.expansion.search.nostalgia')
  ] },
  oyun: { get label() { return t('runtime.category.oyun.label'); }, get heading() { return t('runtime.expansion.games.heading'); }, icon: 'controller', sets: [
    collection('oyunlar', 'runtime.video-games.title', '▣', 'runtime.video-games.description', 'runtime.video-games.note', 'runtime.video-games.search'),
    collection('oyun-karakterleri', 'runtime.characters.title', '✚', 'runtime.characters.description', 'runtime.characters.note', 'runtime.characters.search'),
    collection('valorant-ajanlari', 'runtime.valorant.title', '⌖', 'runtime.valorant.description', 'runtime.valorant.note', 'runtime.valorant.search'),
    collection('lol-sampiyonlari', 'runtime.lol.title', '♜', 'runtime.lol.description', 'runtime.lol.note', 'runtime.lol.search')
  ] },
  otomobil: { get label() { return t('lifestyle.cars.category'); }, get heading() { return t('lifestyle.cars.heading'); }, icon: 'car', sets: [
    collection('efsane-otomobiller', 'lifestyle.cars.title', '◆', 'lifestyle.cars.description', 'lifestyle.cars.note', 'lifestyle.cars.search')
  ] }
};

export const DATASET_NAMES = {};
for (const group of Object.values(DATASET_GROUPS)) {
  for (const set of group.sets) Object.defineProperty(DATASET_NAMES, set.id, { enumerable: true, get: () => set.title });
}
// Existing rooms can finish their original mixed deck. New rooms use the two
// separate collections above; this archived pool is never a lobby choice.
export const LEGACY_DATASET_IDS = ['oyun-evreni'];
Object.defineProperty(DATASET_NAMES, 'oyun-evreni', { enumerable: true, get: () => t('runtime.expansion.games.title') });

export function resolveDatasetId(category, preferredId) {
  const group = DATASET_GROUPS[category];
  if (!group) throw new Error(t('runtime.error.unknown_category'));
  return group.sets.some(set => set.id === preferredId) ? preferredId : group.sets[0].id;
}
