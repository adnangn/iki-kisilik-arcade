/** Shared by every collection: no prompt assumes a person, food or a place. */
export const TELEPATHY_QUESTIONS = Object.freeze([
  // Keep these ten indices stable for rooms created before the larger pool.
  'Hangisi daha ikonik?',
  'Hangisi daha abartılıyor?',
  'Hangisi daha çok mutlu eder?',
  'Hangisi daha unutulmaz?',
  'Hangisini arkadaşına önerirsin?',
  'Hangisi daha nostaljik?',
  'Hangisi beklenenden daha iyi?',
  'Hangisi birinci olmayı hak eder?',
  'Hangisi daha eğlenceli?',
  'Hangisini yeniden keşfetmek istersin?',
  'Hangisi sana çocukluğunu hatırlatıyor?',
  'Hangisi ilk bakışta dikkatini çeker?',
  'Hangisini daha çok merak ediyorsun?',
  'Hangisi hakkında daha çok şey biliyorsun?',
  'Hangisi hakkında sohbet etmek daha keyifli?',
  'Hangisi için fikrini değiştirebilirsin?',
  'Hangisi arkadaşlar arasında tartışma başlatır?',
  'Hangisi seni daha çok şaşırtır?',
  'Hangisinin daha çok hayranı vardır?',
  'Hangisi hak ettiği ilgiyi görmüyor?',
  'Hangisini herkesin tanıması gerekir?',
  'Hangisinin adı daha akılda kalıcı?',
  'Hangisi görsel olarak daha dikkat çekici?',
  'Hangisi sana daha tanıdık geliyor?',
  'Hangisi arkadaş grubunda daha çok konuşulur?',
  'Hangisi sana daha sıra dışı geliyor?',
  'Hangisi daha çok fikir ayrılığı yaratır?',
  'Hangisi gelecekte daha popüler olur?',
  'Hangisi ilk bakışta favorin olur?',
  'Hangisi hakkında fikrin daha güçlü?',
  'Hangisiyle ilgili güzel bir anın var?',
  'Hangisi seni daha çok gülümsetir?',
  'Hangisi sürpriz bir seçim olur?',
  'Hangisi listende daha üstte yer alır?',
  'Hangisi daha az konuşuluyor?',
  'Hangisi sıradan bir günü güzelleştirir?',
  'Hangisiyle ilgili daha çok anın var?',
  'Hangisi hakkında daha çok şey öğrenmek istersin?',
  'Hangisi şu anki ruh haline daha uygun?',
  'Hangisi için diğerlerini elersin?'
]);
export const TELEPATHY_QUESTION_COUNT = TELEPATHY_QUESTIONS.length;
export const TELEPATHY_ROUNDS = 10;

/** Partial Fisher–Yates: every draw removes its question from this game's pool. */
export function shuffledTelepathyCriteria(randomIndex = length => Math.floor(Math.random() * length)) {
  if (typeof randomIndex !== 'function') throw new TypeError('Soru seçimi için rastgele sayı işlevi gerekli.');
  const pool = Array.from({ length: TELEPATHY_QUESTION_COUNT }, (_, index) => index);
  for (let index = 0; index < TELEPATHY_ROUNDS; index++) {
    const remaining = pool.length - index, offset = randomIndex(remaining);
    if (!Number.isInteger(offset) || offset < 0 || offset >= remaining) throw new RangeError('Rastgele soru seçimi geçerli aralığın dışında.');
    const other = index + offset;
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, TELEPATHY_ROUNDS);
}

export function validTelepathyCriteria(criteria, { allowLegacyRepeated = false } = {}) {
  if (!Array.isArray(criteria) || criteria.length !== TELEPATHY_ROUNDS ||
      Array.from(criteria).some(value => !Number.isInteger(value) || value < 0 || value >= TELEPATHY_QUESTION_COUNT)) return false;
  return new Set(criteria).size === TELEPATHY_ROUNDS || allowLegacyRepeated && criteria.every(value => value < 10);
}
