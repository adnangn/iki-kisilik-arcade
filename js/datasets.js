import { t } from './texts.js';
export const DATASET_GROUPS = {
  futbol: { get label() { return t('runtime.category.futbol.label'); }, get heading() { return t('runtime.copy.futbol_koleksiyonu'); }, icon: 'ball', sets: [
    { id: 'futbol', get title() { return t('runtime.copy.efsaneler'); }, symbol: '★', get description() { return t('runtime.copy.1990_2015_yildizlari_da_sahada'); }, get note() { return t('runtime.copy.tum_zamanlardan_efsaneler_ikonik_milli_takim_renkler'); } },
    { id: 'superlig', get title() { return t('runtime.copy.turkiye_super_lig'); }, symbol: '⚑', get description() { return t('runtime.copy.amed_fk_dahil_guncel_yildizlar'); }, get note() { return t('runtime.copy.2026_27_kadrolari_kulup_kontrolu_8_9_ekim_2026'); } }
  ] },
  yemek: { get label() { return t('runtime.category.yemek.label'); }, get heading() { return t('runtime.copy.menunu_sec'); }, icon: 'cake', sets: [
    { id: 'tatli', get title() { return t('runtime.copy.tatlilar'); }, symbol: '♥', get description() { return t('runtime.copy.serbetli_sutlu_cikolatali'); }, get note() { return t('runtime.copy.50_tatli_tatli_bir_kapisma'); } },
    { id: 'yemek', get title() { return t('runtime.copy.ana_yemekler'); }, symbol: '♨', get description() { return t('runtime.copy.sofranin_yildizlarini_sec'); }, get note() { return t('runtime.copy.50_ana_yemek_turk_ve_dunya_mutfagindan'); } }
  ] },
  dizi: { get label() { return t('runtime.category.dizi.label'); }, get heading() { return t('runtime.copy.ne_izliyoruz'); }, icon: 'tv', sets: [
    { id: 'dizi', get title() { return t('runtime.copy.diziler'); }, symbol: '▣', get description() { return t('runtime.copy.bir_bolum_daha_bir_tur_daha'); }, get note() { return t('runtime.copy.50_dizi_yerli_ve_yabanci_unutulmaz_yapimlar'); } },
    { id: 'film', get title() { return t('runtime.copy.filmler'); }, symbol: '▶', get description() { return t('runtime.copy.kult_filmler_buyuk_hikayeler'); }, get note() { return t('runtime.copy.50_film_sinemanin_sevilen_klasikleri'); } }
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
