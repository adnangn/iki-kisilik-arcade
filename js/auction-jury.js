import { RoomError } from './room-state.js';

const SEATS = ['p1', 'p2', 'p3', 'p4'];
const MODES = ['auction', 'sealed-auction'];
export function auctionJuryContext(room, uid) {
  const game = room?.game || room?.partyGame;
  const seats = game?.seats;
  if (room?.version !== 2 || room.status !== 'finished' || !MODES.includes(room.mode) ||
      game?.mode !== room.mode || game.phase !== 'finished' || !Array.isArray(seats) || seats.length < 2 || seats.length > 4 ||
      new Set(seats).size !== seats.length || seats.some(seat => !SEATS.includes(seat) || !room.players?.[seat]?.uid) ||
      !/^[0-9]{6}$/.test(room.code) || !Number.isSafeInteger(room.round) || room.round < 1 || !Number.isSafeInteger(room.createdAt)) {
    throw new RoomError('Bu masada sonuç oylaması açık değil.');
  }
  const seat = seats.find(actor => room.players[actor].uid === uid);
  if (!seat) throw new RoomError('Bu oyunun katılımcısı değilsin.');
  return { seat, seats: [...seats], instance: room.createdAt, path: `privateGames/${room.code}/r${room.round}/jury` };
}

export function auctionJuryBallot(room, uid, value) {
  const { seats, instance } = auctionJuryContext(room, uid);
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.hasOwn(value, 'targetSeat') || !seats.includes(value.targetSeat)) {
    throw new RoomError('Oy vermek için bu masadan bir kart grubu seç.');
  }
  return { instance, targetSeat: value.targetSeat, locked: true };
}

export function auctionJuryResult(seats, votes, instance) {
  if (!Array.isArray(seats) || seats.length < 2 || seats.length > 4 || new Set(seats).size !== seats.length || seats.some(seat => !SEATS.includes(seat))) return null;
  const counts = Object.fromEntries(seats.map(seat => [seat, 0]));
  for (const actor of seats) {
    const vote = votes?.[actor];
    if (!vote || vote.instance !== instance || vote.locked !== true || !seats.includes(vote.targetSeat) ||
        Object.keys(vote).length !== 3 || !['instance', 'targetSeat', 'locked'].every(key => Object.hasOwn(vote, key))) return null;
    counts[vote.targetSeat]++;
  }
  const highest = Math.max(...Object.values(counts));
  return { counts, leaders: seats.filter(seat => counts[seat] === highest), highest, total: seats.length };
}

/** Votes are never put in the public room or fetched before every lock exists. */
export function createAuctionJury({ uid, db, ref, onValue, transact, assertOnline, stops }) {
  return {
    async submitJury(room, value) {
      assertOnline();
      const { seat, path } = auctionJuryContext(room, uid), payload = auctionJuryBallot(room, uid, value);
      let unsubscribe = () => {}, rejectRead = () => {}, pending = true;
      const stop = () => { unsubscribe(); stops.delete(stop); if (pending) rejectRead(new RoomError('Oyuncu oturumu kapandı.')); };
      stops.add(stop);
      try {
        await new Promise((resolve, reject) => { rejectRead = reject; unsubscribe = onValue(ref(db, `${path}/${seat}`), resolve, reject); });
        pending = false; assertOnline();
        return await transact(`${path}/${seat}`, current => {
          if (current) throw new RoomError('Oyunu zaten kilitledin.');
          return payload;
        });
      } finally { pending = false; stop(); }
    },
    watchJury(room, onState, onError = () => {}) {
      assertOnline();
      const { seat, seats, path, instance } = auctionJuryContext(room, uid);
      let active = true, mine = null, mineLoaded = false;
      const listeners = [], reveals = new Set(), loadedLocks = new Set(), votes = {};
      const progress = Object.fromEntries(seats.map(actor => [actor, false]));
      const allLocked = () => seats.every(actor => progress[actor]);
      const emit = () => {
        if (!active) return;
        const result = allLocked() ? auctionJuryResult(seats, votes, instance) : null;
        onState({ loaded: mineLoaded && loadedLocks.size === seats.length, mine: mine ? { ...mine } : null,
          progress: { ...progress }, allLocked: allLocked(), votes: result ? Object.fromEntries(seats.map(actor => [actor, { ...votes[actor] }])) : null, result });
      };
      const stop = () => { if (!active) return; active = false; for (const end of listeners) end(); stops.delete(stop); };
      const listen = (key, handler) => {
        const end = onValue(ref(db, key), snapshot => { if (!active) return; handler(snapshot.val()); reveal(); emit(); }, error => {
          if (!active) return;
          stop(); onState({ loaded: false, mine: null, progress: {}, allLocked: false, votes: null, result: null }); onError(error);
        });
        listeners.push(end); if (!active) end();
      };
      const reveal = () => {
        if (!active || !allLocked()) return;
        for (const actor of seats) if (!reveals.has(actor)) {
          reveals.add(actor);
          listen(`${path}/${actor}`, value => { votes[actor] = value; });
        }
      };
      stops.add(stop);
      listen(`${path}/${seat}`, value => { mine = value; mineLoaded = true; });
      for (const actor of seats) if (active) listen(`${path}/${actor}/locked`, value => { progress[actor] = value === true; loadedLocks.add(actor); });
      return stop;
    },
  };
}
