const MODE_NAMES = Object.freeze({
  auction: 'Açık Artırma', 'sealed-auction': 'Kapalı Zarf',
  'blind-ranking': 'Kör Sıralama', bracket: 'O mu, Bu mu?',
  'team-draft': 'Start, Bench, Cut', frequency: 'Frekans',
  'double-ranking': 'Çifte Sıralama', 'simultaneous-ranking': 'Eşzamanlı Sıralama',
  telepathy: 'Telepati', detective: 'Tek İpucu', chameleon: 'Bukalemun',
  'mystery-box': 'Kutuda Ne Var?',
});
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const list = value => Array.isArray(value) ? value : record(value) ? Object.values(value) : [];
const number = value => Number.isFinite(value) && value >= 0 ? value : null;
const label = value => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100) : '';
const bySeat = (a, b) => a.localeCompare(b, 'en');
function hash(value) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}
function cardFor(cards, id) {
  if (Array.isArray(cards)) return cards.find(card => String(card?.id) === String(id));
  if (typeof cards?.get === 'function') return cards.get(id) || cards.get(Number(id)) || cards.get(String(id));
  return record(cards) ? cards[id] : null;
}
function rankingPairs(rankings, size) {
  const seats = Object.keys(rankings || {}).filter(seat => /^p[1-4]$/.test(seat)).sort(bySeat);
  const rows = seats.map(seat => {
    const source = rankings[seat]?.slots || rankings[seat];
    return { seat, ids: Array.from({ length: size }, (_, index) => source?.[`s${index + 1}`]) };
  }).filter(row => row.ids.every(id => id != null) && new Set(row.ids).size === size);
  const pairs = [];
  for (let first = 0; first < rows.length; first++) for (let second = first + 1; second < rows.length; second++) {
    const a = rows[first], b = rows[second];
    if (a.ids.some(id => !b.ids.includes(id))) continue;
    const distance = a.ids.reduce((sum, id, index) => sum + Math.abs(index - b.ids.indexOf(id)), 0);
    pairs.push({ left: a.seat, right: b.seat, percent: Math.round(100 * (1 - distance / Math.floor(size * size / 2))) });
  }
  return pairs.sort((a, b) => b.percent - a.percent || bySeat(a.left, b.left) || bySeat(a.right, b.right));
}

/** One deterministic, factual, playful sentence, with no writes or private state.
 * `cards` accepts a Map, an id-keyed object or an array; nameFor accepts a seat.
 * Jury updates, room revisions, client identity and the clock never change it.
 */
export function createRetroHeadline(room, { cards, nameFor } = {}) {
  if (!record(room)) return null;
  const game = record(room.game) ? room.game : record(room.partyGame) ? room.partyGame : {};
  if (room.status !== 'finished' && (room.status != null || game.phase !== 'finished')) return null;
  const mode = label(room.mode || game.mode), seed = `${room.code || ''}|${room.createdAt || ''}|${room.round || 1}|${room.datasetId || ''}|${mode}`;
  const name = seat => {
    let supplied = '';
    try { supplied = typeof nameFor === 'function' ? label(nameFor(seat)) : ''; } catch { /* A missing old seat uses its saved label. */ }
    return supplied || label(room.players?.[seat]?.name) || (/^p[1-4]$/.test(seat || '') ? `Oyuncu ${seat.slice(1)}` : 'Oyuncu');
  };
  const cardName = id => label(cardFor(cards, id)?.isim);
  const result = (key, headlines) => {
    const variant = hash(`${seed}|${key}`) % headlines.length;
    return { headline: headlines[variant], kicker: 'RETRO GAZETE',
      meta: `${Number.isSafeInteger(room.round) && room.round > 0 ? `${room.round}. tur · ` : ''}${MODE_NAMES[mode] || 'Oyun sonu'}`,
      key: `${key}-${variant}` };
  };

  if (mode === 'auction' || mode === 'sealed-auction') {
    const seats = Object.keys(game.rosters || {}).filter(seat => /^p[1-4]$/.test(seat)).sort(bySeat);
    const entries = seats.flatMap(seat => list(game.rosters[seat]).filter(record).map(entry => ({ ...entry, seat })));
    const gifts = entries.filter(entry => entry.source === 'completion' && cardFor(cards, entry.id ?? entry.cardId)?.teselli === true);
    const splurge = entries.filter(entry => number(entry.price ?? entry.amount) !== null && (entry.price ?? entry.amount) >= 12
      && gifts.some(gift => gift.seat === entry.seat)).sort((a, b) => (b.price ?? b.amount) - (a.price ?? a.amount) || bySeat(a.seat, b.seat))[0];
    if (splurge && cardName(splurge.id ?? splurge.cardId)) return result('auction-splurge', [
      `${name(splurge.seat)}, ${cardName(splurge.id ?? splurge.cardId)} için ${splurge.price ?? splurge.amount} TL ayırdı; koleksiyona ${gifts.filter(gift => gift.seat === splurge.seat).length} teselli kartı da sürpriz paket oldu!`,
    ]);
    if (gifts.length) return result('auction-consolation', [
      `Bütçe defteri kapandı, teselli gişesi açıldı; masaya ${gifts.length} sürpriz kart geldi!`,
      `Masada ${gifts.length} teselli kartı var; hesabı sıfırlayanlara sürpriz paket çıktı!`,
    ]);
    const paid = entries.filter(entry => number(entry.price ?? entry.amount) !== null && (entry.price ?? entry.amount) >= 12)
      .sort((a, b) => (b.price ?? b.amount) - (a.price ?? a.amount) || bySeat(a.seat, b.seat) || (a.id ?? 0) - (b.id ?? 0));
    const expensive = paid[0], title = expensive && cardName(expensive.id ?? expensive.cardId);
    if (title) return result('auction-big-purchase', [
      `${name(expensive.seat)}, ${title} için ${expensive.price ?? expensive.amount} TL ödedi; kasanın kapağı sonuna kadar açıldı!`,
      `${title} için ${expensive.price ?? expensive.amount} TL çıktı; ${name(expensive.seat)} kasayla duygusal vedalaştı!`,
    ]);
    const savers = Object.entries(game.budgets || {}).filter(([seat, amount]) => /^p[1-4]$/.test(seat) && number(amount) !== null && amount >= 8)
      .sort(([a, x], [b, y]) => y - x || bySeat(a, b));
    if (savers.length) return result('auction-saver', [
      `${name(savers[0][0])}, ${savers[0][1]} TL ile oyunu bitirdi; muhasebe departmanı ayakta alkışladı!`,
      `${name(savers[0][0])} kasada ${savers[0][1]} TL bıraktı; indirim günleri için hazırlık tamam!`,
    ]);
    return result('auction-fallback', mode === 'sealed-auction' ? [
      'Zarflar açıldı, poker suratları tatilde; şimdi masanın seçimleri konuşuyor!',
      'Gizli teklifler gün yüzüne çıktı; masanın muhasebesi artık manşetlerde!',
    ] : [
      'Çekiç sustu, masanın favorileri için kulis hareketlendi!',
      'Teklifler bitti, koleksiyonlar vitrine çıktı; şimdi söz masada!',
    ]);
  }

  if (mode === 'simultaneous-ranking' || mode === 'double-ranking') {
    const best = rankingPairs(game.rankings, mode === 'double-ranking' ? 8 : 10)[0];
    if (best) return result(best.percent === 100 ? 'ranking-perfect' : 'ranking-compatibility', best.percent === 100 ? [
      `${name(best.left)} ile ${name(best.right)} yüzde 100 aynı sıraladı; masanın fotokopi makinesi bulundu!`,
      `${name(best.left)} ile ${name(best.right)} arasında yüzde 100 uyum; iki liste tek kalemden çıkmış gibi!`,
    ] : [
      `${name(best.left)} ile ${name(best.right)} arasında yüzde ${best.percent} uyum; aynı masa, ayrı editör masaları!`,
      `Uyum masasında ${name(best.left)} ile ${name(best.right)} için yüzde ${best.percent} yazıyor; zevkler toplantısı tamamlandı!`,
    ]);
    return result('ranking-fallback', ['Gizli listeler açıldı; zevkler masasında herkes kendi köşesini yazdı!']);
  }

  if (mode === 'blind-ranking') {
    const first = cardName(game.slots?.s1);
    if (first) return result('blind-top', [
      `${name(game.activeSeat)}, ${first} için zirve koltuğunu ayırdı; ilk sıra tapusu teslim edildi!`,
      `${first} listenin tepesine yerleşti; ${name(game.activeSeat)} zirvenin anahtarını teslim etti!`,
    ]);
    return result('blind-fallback', ['Liste kilitlendi; sonradan fikir değiştirme servisi rövanşa kadar kapalı!']);
  }

  if (mode === 'bracket') {
    const winner = cardName(game.winnerId);
    if (winner) return result('bracket-winner', [
      `${winner} turnuvayı kazandı; masanın kupası için vitrin açıldı!`,
      `Turnuvanın son sözü ${winner} oldu; final ışıkları tek karta çevrildi!`,
    ]);
    return result('bracket-fallback', ['Elemeler bitti, kupa yerini buldu; rövanş için kulis başladı!']);
  }

  if (mode === 'team-draft') {
    const first = game.players?.p1?.selections || {}, second = game.players?.p2?.selections || {};
    const same = Object.entries(first).filter(([round, picks]) => picks?.start != null && picks.start === second[round]?.start).length;
    if (same) return result('draft-matching-starts', [
      `${same} turda aynı Start seçimi; iki liste birbirinden habersiz aynı kapıya çıktı!`,
      `Start listelerinde ${same} ortak seçim var; kulisler aynı ismi iki kez duyurdu!`,
    ]);
    return result('draft-fallback', ['Start koltukları seçildi; yedek kulübesinde rövanş planları konuşuluyor!']);
  }

  if (mode === 'frequency' || mode === 'telepathy') {
    const streak = number(game.bestStreak);
    if (Number.isSafeInteger(streak) && streak >= 3) return result('cooperative-streak', [
      `${streak} tur üst üste aynı seçim; masanın ortak zihni toplu yayına geçti!`,
      `Aynı düşünce ${streak} tur boyunca bozulmadı; masada kumandalar ortak çalıştı!`,
    ]);
    if (mode === 'frequency' && Number.isSafeInteger(game.matches) && game.matches > 0) return result('frequency-matches', [
      `${game.matches} turda aynı seçim; iki kumanda bugün aynı frekansı yakaladı!`,
      `Masadan ${game.matches} ortak seçim çıktı; frekans ayarı rövanşa hazır!`,
    ]);
    if (mode === 'frequency' && game.matches === 0) return result('frequency-no-match', ['Frekanslar bu kez ayrı kanallarda kaldı; rövanş anten ayarı bekliyor!']);
    return result('telepathy-fallback', ['Ortak zihin mesaisi bitti; masanın düşünce balonları rövanşa saklandı!']);
  }

  if (mode === 'detective') {
    const solved = list(game.results).filter(value => value?.correct === true).length;
    if (solved) return result('detective-solved', [
      `${solved} ipucu tam isabet getirdi; masanın dedektif bürosu dosyaları rafa kaldırdı!`,
      `Masada ${solved} doğru tahmin var; tek kelimelik deliller işini yaptı!`,
    ]);
    return result('detective-fallback', ['İpucu defteri kapandı; masanın dedektifleri yeni dosya için kahve molasında!']);
  }

  if (mode === 'chameleon') {
    const rounds = Object.entries(game.results || {}).filter(([key]) => /^r\d+$/.test(key)).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)));
    const last = rounds.at(-1)?.[1] || game.result;
    if (last?.caught === true && last.guessed === true) return result('chameleon-last-chance', ['Bukalemun yakalandı ama son tahminde hedefi buldu; finalde ikinci perde açıldı!']);
    if (last?.caught === true && last.guessed === false) return result('chameleon-caught', ['Son turda Bukalemun yakalandı; kamuflaj servisi rövanşa kadar bakıma alındı!']);
    if (last?.caught === false) return result('chameleon-escaped', ['Son turda Bukalemun izini kaybettirdi; masanın kamuflaj alarmı çalmayı unuttu!']);
    return result('chameleon-fallback', ['Maskeler masaya indi; kelime kulisleri rövanş için çalışmaya başladı!']);
  }

  if (mode === 'mystery-box') {
    const revealed = list(game.results).filter(row => ['take', 'reject'].includes(row?.decision));
    const returned = revealed.filter(row => row.decision === 'reject').length;
    if (returned) return result('mystery-returns', [
      `Masada ${returned} kutu geri gönderildi; iade gişesi blöf mesaisini kapattı!`,
      `${returned} kutu sahibine döndü; masanın ikna bürosu rövanşa dilekçe verdi!`,
    ]);
    if (revealed.length) return result('mystery-taken', [`${revealed.length} kutu sorgusuz kabul edildi; masanın güven kredisi sonuna kadar kullanıldı!`]);
    return result('mystery-fallback', ['Kutu mesaisi bitti; masanın merakı bir sonraki tura taşındı!']);
  }
  return result('generic-fallback', ['Masa kapandı, muhabbet açık kaldı; rövanş sayfası baskıya hazır!']);
}

/** Semantic, static newspaper panel; every dynamic value is a literal text node. */
export function renderRetroHeadline(room, context = {}) {
  const data = createRetroHeadline(room, context), doc = context.document || globalThis.document;
  if (!data || typeof doc?.createElement !== 'function') return null;
  const panel = doc.createElement('aside'); panel.className = 'retro-headline';
  panel.setAttribute('aria-label', 'Maç sonu manşeti'); panel.dataset.headlineKey = data.key;
  const kicker = doc.createElement('p'); kicker.className = 'retro-headline-kicker'; kicker.textContent = data.kicker;
  const headline = doc.createElement('h3'); headline.className = 'retro-headline-title'; headline.textContent = data.headline;
  const meta = doc.createElement('p'); meta.className = 'retro-headline-meta'; meta.textContent = data.meta;
  panel.append(kicker, headline, meta); return panel;
}
