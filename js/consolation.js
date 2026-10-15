/** Stable ranges are also used by Firebase's auction-only pool validators. */
export const CONSOLATION_DATASET_IDS = Object.freeze([
  'futbol', 'superlig', 'turkiye-efsaneleri', 'dunya-yildizlari',
  'tatli-vol1', 'tatli', 'yemek-vol1', 'yemek', 'icecek',
  'dizi', 'film', 'yerli-sanatcilar',
  'ankara-ilceleri', 'istanbul-ilceleri', 'turkiye-sehirleri', 'ulkeler',
  'cocukluk-cizgifilmleri', 'doksanlar-nostalji', 'kantin-bakkal',
  'oyunlar', 'oyun-karakterleri', 'valorant-ajanlari', 'lol-sampiyonlari', 'oyun-evreni'
]);
export const CONSOLATION_POOL_SIZE = 10;
export function consolationRange(datasetId) {
  const ordinal = CONSOLATION_DATASET_IDS.indexOf(datasetId);
  if (ordinal < 0) throw new Error('Bu koleksiyon için teselli kartı havuzu bulunamadı.');
  return { min: 900001 + ordinal * CONSOLATION_POOL_SIZE, max: 900010 + ordinal * CONSOLATION_POOL_SIZE };
}
export function splitCollections(raw) {
  const datasets = {}, consolationDatasets = {};
  for (const [id, cards] of Object.entries(raw)) {
    if (!Array.isArray(cards)) throw new Error('Kart koleksiyonu geçersiz.');
    datasets[id] = cards.filter(card => card.teselli !== true);
    consolationDatasets[id] = cards.filter(card => card.teselli === true);
  }
  return { datasets, consolationDatasets };
}
export const playableCollections = raw => splitCollections(raw).datasets;
