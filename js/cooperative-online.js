import { RoomError, seatFor } from './room-state.js';

const MODES = new Set(['frequency', 'double-ranking']);

// Secrets live outside rooms: a parent-level room read must never reveal them.
// The room snapshot and private cursor are captured before an async write.
export function createCooperativeOnline({ uid, db, ref, onValue, transact, assertOnline, stops }) {
  function context(room) {
    const seat = seatFor(room, uid);
    if (!room || !seat || !MODES.has(room.mode) || !Number.isInteger(room.round)) {
      throw new RoomError('Bu oyunun oyuncusu değilsiniz.');
    }
    const root = `privateGames/${room.code}/r${room.round}`;
    return { seat, opponent: seat === 'p1' ? 'p2' : 'p1', path: room.mode === 'frequency'
      ? `${root}/frequency/q${room.game.roundIndex}` : `${root}/ranking` };
  }

  async function transactPrivate(path, reducer) {
    let unsubscribe = () => {};
    let cancelRead = () => {};
    let pending = true;
    const stop = () => {
      unsubscribe(); stops.delete(stop);
      if (pending) cancelRead(new RoomError('Oyuncu oturumu kapandı.'));
    };
    stops.add(stop);
    try {
      await new Promise((resolve, reject) => {
        cancelRead = reject;
        unsubscribe = onValue(ref(db, path), resolve, reject);
      });
      pending = false;
      return await transact(path, reducer);
    } finally { pending = false; stop(); }
  }

  return {
    watchCooperative(room, onState, onError = () => {}) {
      assertOnline();
      const { seat, opponent, path } = context(room);
      let active = true;
      let mine = null;
      let mineLoaded = false;
      let opponentProgress = 0;
      let opponentRecord = null;
      let stopOpponent = null;
      const progressKey = room.mode === 'frequency' ? 'locked' : 'count';
      const ready = () => room.mode === 'frequency'
        ? mine?.locked === true && opponentProgress === 1
        : mine?.count === 8 && opponentProgress === 8;
      const emit = () => {
        if (!active) return;
        const revealed = ready() && opponentRecord ? { [seat]: mine, [opponent]: opponentRecord } : null;
        onState({ mine, opponentProgress, revealed, loaded: mineLoaded });
      };
      const maybeReveal = () => {
        if (!ready() || stopOpponent) return;
        stopOpponent = onValue(ref(db, `${path}/${opponent}`), snapshot => {
          if (!active) return;
          opponentRecord = snapshot.val();
          emit();
        }, error => {
          // The SDK cancels denied listeners. Release the handle so a later
          // synchronized progress update can subscribe again after reconnect.
          stopOpponent = null; opponentRecord = null;
          if (active) onError(error);
        });
      };
      const handleError = error => { if (active) onError(error); };
      const stopMine = onValue(ref(db, `${path}/${seat}`), snapshot => {
        if (!active) return;
        mine = snapshot.val();
        mineLoaded = true;
        maybeReveal(); emit();
      }, handleError);
      const stopProgress = onValue(ref(db, `${path}/${opponent}/${progressKey}`), snapshot => {
        if (!active) return;
        const value = snapshot.val();
        opponentProgress = room.mode === 'frequency' ? (value === true ? 1 : 0) : (value || 0);
        maybeReveal(); emit();
      }, handleError);
      const stop = () => {
        if (!active) return;
        active = false; stopMine(); stopProgress(); stopOpponent?.(); stops.delete(stop);
      };
      stops.add(stop);
      return stop;
    },
    async chooseFrequency(room, cardId) {
      assertOnline();
      if (room.mode !== 'frequency' || room.status !== 'playing' || room.game.stage !== 'choosing') {
        throw new RoomError('Bu eşleşmenin seçim süresi tamamlandı.');
      }
      const { seat, path } = context(room);
      const pair = room.game.deck.slice(room.game.roundIndex * 2, room.game.roundIndex * 2 + 2);
      if (!pair.includes(cardId)) throw new RoomError('Ekrandaki kartlardan birini seçin.');
      // Retain the exact protected path through its transaction. Do not re-read a
      // newer public cursor: a click always belongs to the displayed pair.
      return transactPrivate(`${path}/${seat}`, current => {
        if (current) throw new RoomError('Seçiminiz zaten kilitlendi.');
        return { cardId, locked: true };
      });
    },
    async rankCooperative(room, slot, expectedCount) {
      assertOnline();
      if (room.mode !== 'double-ranking' || room.status !== 'playing' || !Number.isInteger(expectedCount)
        || expectedCount < 0 || expectedCount >= 8 || !Number.isInteger(slot) || slot < 1 || slot > 8) {
        throw new RoomError('Bu kart için boş bir sıra seçin.');
      }
      const { seat, path } = context(room);
      const cardId = room.game.deck[expectedCount];
      return transactPrivate(`${path}/${seat}`, current => {
        const count = current?.count || 0;
        if (count !== expectedCount) throw new RoomError('Bu kart zaten yerleştirildi. Güncel kartı bekleyin.');
        if (current?.slots?.[`s${slot}`]) throw new RoomError('Bu sıra zaten dolu.');
        return { count: count + 1, slots: { ...(current?.slots || {}), [`s${slot}`]: cardId } };
      });
    }
  };
}
