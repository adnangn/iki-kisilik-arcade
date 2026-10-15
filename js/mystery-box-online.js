import { RoomError } from './room-state.js';
import { mysteryChoices, normalizeMysteryBox } from './mystery-box.js';

export function mysteryPrivateContext(room, uid) {
  const game = room?.game || room?.boxGame, seat = ['p1', 'p2'].find(key => room?.players?.[key]?.uid === uid);
  if (room?.version !== 2 || room.mode !== 'mystery-box' || !seat || !game) throw new RoomError('Bu kutu masasının oyuncusu değilsiniz.');
  normalizeMysteryBox(game);
  const root = `privateGames/${room.code}/r${room.round}/box`, question = `q${game.roundIndex}`;
  return { game, seat, deal: `${root}/deals/${question}`, decision: `${root}/decisions/${question}` };
}
export function mysteryDecision(room, uid, { decision } = {}) {
  const { game, seat } = mysteryPrivateContext(room, uid);
  if (room.status !== 'playing' || game.stage !== 'decision' || seat !== game.responderSeat || !mysteryChoices(game).includes(decision)) throw new RoomError('Bu kutu için seçiminiz geçersiz veya kart sınırını aşıyor.');
  return { instance: room.createdAt, roundIndex: game.roundIndex, decision, locked: true };
}

export function createMysteryBoxOnline({ uid, db, ref, get, onValue, transact, assertOnline, stops }) {
  async function retainedTransaction(path, reduce) {
    assertOnline(); let unsubscribe = () => {}, pending = true, rejectRead = () => {};
    const stop = () => { unsubscribe(); stops.delete(stop); if (pending) rejectRead(new RoomError('Oyuncu oturumu kapandı.')); };
    stops.add(stop);
    try {
      await new Promise((resolve, reject) => { rejectRead = reject; unsubscribe = onValue(ref(db, path), resolve, reject); });
      pending = false; assertOnline(); return await transact(path, reduce);
    } finally { pending = false; stop(); }
  }
  return {
    async prepareMysteryDeal(room, { cardId } = {}) {
      assertOnline(); const { game, seat, deal } = mysteryPrivateContext(room, uid);
      if (room.status !== 'playing' || game.stage !== 'stamp' || game.giverSeat !== seat || !Number.isSafeInteger(cardId) || cardId < 1 || cardId > 1000000 || Object.values(game.results || {}).some(result => result.cardId === cardId)) throw new RoomError('Bu kutunun kartını yalnız sıradaki sunucu hazırlayabilir.');
      const existing = await get(ref(db, deal)); assertOnline();
      if (existing.exists()) return existing.val();
      try {
        return await retainedTransaction(deal, current => {
          if (current) throw new RoomError('Bu kutunun kartı zaten hazırlandı.');
          return { instance: room.createdAt, roundIndex: game.roundIndex, cardId };
        });
      } catch (error) {
        assertOnline(); const winner = await get(ref(db, deal));
        if (winner.exists()) return winner.val();
        throw error;
      }
    },
    async submitMysteryDecision(room, value) {
      assertOnline(); const { decision } = mysteryPrivateContext(room, uid), payload = mysteryDecision(room, uid, value);
      return retainedTransaction(decision, current => { if (current) throw new RoomError('Kutuyla ilgili seçiminiz zaten kilitlendi.'); return payload; });
    },
    watchMysteryBox(room, onState, onError = () => {}) {
      assertOnline(); const { game, seat, deal, decision } = mysteryPrivateContext(room, uid);
      let active = true, dealLoaded = seat !== game.giverSeat, decisionLoaded = seat !== game.responderSeat, lockedLoaded = false;
      let card = null, choice = null, locked = false, revealSubscribed = false;
      const listeners = [];
      const emit = () => { if (active) onState({ loaded: dealLoaded && decisionLoaded && lockedLoaded, deal: card, decision: choice, locked,
        recordsForResolution: locked && card && choice ? { cardId: card.cardId, decision: choice.decision } : null }); };
      const listen = (path, receive) => {
        const end = onValue(ref(db, path), snapshot => { if (active) { receive(snapshot.val()); reveal(); emit(); } }, error => { if (active) onError(error); });
        listeners.push(end);
      };
      const reveal = () => {
        if (!locked || revealSubscribed) return;
        revealSubscribed = true;
        if (seat !== game.giverSeat) listen(deal, value => { card = value; dealLoaded = true; });
        if (seat !== game.responderSeat) listen(decision, value => { choice = value; decisionLoaded = true; });
      };
      if (seat === game.giverSeat) listen(deal, value => { card = value; dealLoaded = true; });
      if (seat === game.responderSeat) listen(decision, value => { choice = value; decisionLoaded = true; });
      listen(`${decision}/locked`, value => { locked = value === true; lockedLoaded = true; });
      const stop = () => { if (!active) return; active = false; for (const end of listeners) end(); stops.delete(stop); };
      stops.add(stop); return stop;
    },
  };
}
