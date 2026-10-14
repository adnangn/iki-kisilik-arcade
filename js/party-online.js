import { RoomError } from './room-state.js';
import { partyCards, partyClue, partyGameSpec } from './party-games.js';

const SEATS = ['p1', 'p2', 'p3', 'p4'];
const findSeat = (room, uid) => SEATS.find(seat => room?.players?.[seat]?.uid === uid);
export function partyPrivateContext(room, uid) {
  const game = room?.game || room?.partyGame, seat = findSeat(room, uid);
  if (room?.version !== 2 || !game || !seat || !game.seats?.includes(seat) || !partyGameSpec(room.mode).private) {
    throw new RoomError('Bu özel oyun masasının oyuncusu değilsiniz.');
  }
  const root = `privateGames/${room.code}/r${room.round}/party`;
  const question = `q${game.roundIndex}`;
  const needed = game.mode === 'detective' ? [game.stage === 'clue' ? game.clueGiverSeat : game.guesserSeat]
    : game.mode === 'chameleon' && game.stage === 'clues' ? [game.turnSeat]
    : game.mode === 'chameleon' && game.stage === 'last-guess' ? [game.caughtSeat] : [...game.seats];
  return { game, seat, root, question, path: `${root}/submissions/${question}/${game.stage}`, deal: `${root}/deals/${question}`, needed };
}

export function partySubmission(room, uid, value, previousSlots = {}) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new RoomError('Geçerli bir seçim gönderin.');
  const context = partyPrivateContext(room, uid), { game, seat } = context;
  if (room.status !== 'playing' || game.phase !== 'playing' || !context.needed.includes(seat) || ['reveal', 'finished'].includes(game.stage)) {
    throw new RoomError('Bu oyun evresinde seçim sırası sizde değil.');
  }
  const result = { instance: room.createdAt, roundIndex: game.roundIndex, stage: game.stage, locked: true };
  if (game.mode === 'sealed-auction') {
    if(!Object.hasOwn(value,'amount')||!['number','string'].includes(typeof value.amount)||String(value.amount).trim()==='')throw new RoomError('Geçerli bir teklif yazın.');
    const amount = Number(value.amount);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > game.budgets[seat] || ((game.rosters?.[seat]?.length || 0) >= 5 && amount !== 0)) throw new RoomError('Teklif kalan bütçenizden fazla olamaz.');
    result.amount = amount;
  } else if (game.mode === 'simultaneous-ranking') {
    if(!Object.hasOwn(value,'slot')||!previousSlots||typeof previousSlots!=='object'||Array.isArray(previousSlots)||Object.keys(previousSlots).length!==game.roundIndex)throw new RoomError('Sıralamanız yüklenemedi. Güncel kartı bekleyin.');
    const slot = Number(value.slot);
    if (!Number.isInteger(slot) || slot < 1 || slot > 10 || previousSlots[`s${slot}`] != null) throw new RoomError('1 ile 10 arasında boş bir sıra seçin.');
    result.slot = slot; result.count = game.roundIndex + 1;
    result.slots = { ...previousSlots, [`s${slot}`]: game.deck[game.roundIndex] };
  } else if (game.stage === 'clue' || game.stage === 'clues') {
    if(!Object.hasOwn(value,'word'))throw new RoomError('Tek kelimelik bir ipucu yazın.');
    result.word = partyClue(value.word);
  }
  else if (game.stage === 'voting') {
    if (!Object.hasOwn(value,'seat')||!game.seats.includes(value.seat) || value.seat === seat) throw new RoomError('Kendiniz dışında masadaki bir oyuncuyu seçin.');
    result.seat = value.seat;
  } else {
    if (!Object.hasOwn(value,'cardId')||!partyCards(game).includes(value.cardId)) throw new RoomError('Bu turdaki kartlardan birini seçin.');
    result.cardId = value.cardId;
  }
  return result;
}

export function createPartyOnline({ uid, db, ref, get, onValue, transact, assertOnline, stops }) {
  async function retainedTransaction(path, reducer) {
    assertOnline();
    let unsubscribe = () => {}, rejectRead = () => {}, pending = true;
    const stop = () => { unsubscribe(); stops.delete(stop); if (pending) rejectRead(new RoomError('Oyuncu oturumu kapandı.')); };
    stops.add(stop);
    try {
      await new Promise((resolve, reject) => { rejectRead = reject; unsubscribe = onValue(ref(db, path), resolve, reject); });
      pending = false; assertOnline();
      return await transact(path, reducer);
    } finally { pending = false; stop(); }
  }
  return {
    async preparePartySecrets(room, { targetId, moleSeat = null }) {
      assertOnline();
      const { game, deal } = partyPrivateContext(room, uid);
      if (!['detective', 'chameleon'].includes(game.mode) || room.ownerUid !== uid || room.status !== 'playing') throw new RoomError('Gizli kartları yalnızca oda sahibi dağıtabilir.');
      // An existing own view lets a reconnect detect an already committed deal
      // without granting a read of the canonical secret or other players' roles.
      const own = await get(ref(db, `${deal}/views/p1`));
      assertOnline();
      if (own.exists()) return;
      if (!partyCards(game).includes(targetId) || (game.mode === 'chameleon' && !game.seats.includes(moleSeat))) throw new RoomError('Gizli hedef bu turun kartları arasında olmalıdır.');
      const views = Object.fromEntries(game.seats.map(seat => [seat, game.mode === 'chameleon'
        ? { isMole: seat === moleSeat, ...(seat !== moleSeat ? { targetId } : {}) }
        : { isMole: false, ...(seat === game.clueGiverSeat ? { targetId } : {}) }]));
      try {
        return await retainedTransaction(deal, current => {
          if (current) throw new RoomError('Bu turun gizli kartı zaten dağıtıldı.');
          return { instance: room.createdAt, targetId, ...(game.mode === 'chameleon' ? { moleSeat } : {}), views };
        });
      } catch (error) {
        // Two tabs of the same persisted host can race to initialize a deal.
        // Keep the winning assignment; never redraw a role after reconnect.
        assertOnline();
        const committed = await get(ref(db, `${deal}/views/p1`));
        if (!committed.exists()) throw error;
      }
    },
    async submitParty(room, value) {
      assertOnline();
      const { game, seat, root, path } = partyPrivateContext(room, uid);
      let previousSlots = {};
      if (game.mode === 'simultaneous-ranking' && game.roundIndex > 0) {
        const previous = await get(ref(db, `${root}/submissions/q${game.roundIndex - 1}/choosing/${seat}`));
        assertOnline();
        if (!previous.exists()) throw new RoomError('Önceki sıralamanız yüklenemedi. Tekrar bağlanın.');
        previousSlots = previous.val().slots || {};
      }
      const payload = partySubmission(room, uid, value, previousSlots);
      // The captured room, question, phase and instance stay bound to this
      // click throughout retries; a subsequent card cannot consume the click.
      return retainedTransaction(`${path}/${seat}`, current => {
        if (current) throw new RoomError('Bu seçim zaten kilitlendi.');
        return payload;
      });
    },
    watchParty(room, onState, onError = () => {}) {
      assertOnline();
      const { game, seat, root, path, deal, needed } = partyPrivateContext(room, uid);
      let active = true, mine = null, mineLoaded = false, role = null, roleLoaded = !['detective', 'chameleon'].includes(game.mode);
      let previousSlots = {}, records = {}, moleSeat = null, unlockedTarget = null;
      let previousSlotsLoaded = game.mode !== 'simultaneous-ranking' || game.roundIndex===0;
      const progress = Object.fromEntries(game.seats.map(key => [key, false]));
      const listeners = [], revealListeners = new Map();
      const allLocked = () => needed.every(key => progress[key]);
      const revealAllowed = () => allLocked() && (game.mode !== 'simultaneous-ranking' || game.roundIndex === 9);
      const emit = () => {
        if (!active) return;
        const complete = revealAllowed() && needed.every(key => records[key]);
        const secrets = { ...(role?.targetId != null || unlockedTarget != null ? { targetId: role?.targetId ?? unlockedTarget } : {}), ...(moleSeat ? { moleSeat } : {}) };
        onState({ mine, role, progress: { ...progress }, previousSlots, loaded: mineLoaded && roleLoaded && previousSlotsLoaded, allLocked: allLocked(),
          recordsForResolution: complete ? { ...records } : game.mode === 'simultaneous-ranking' && game.roundIndex < 9 && allLocked()
            ? Object.fromEntries(game.seats.map(actor => [actor, { locked: true, count: game.roundIndex + 1, roundIndex: game.roundIndex, stage: game.stage }])) : null,
          secretsForResolution: secrets });
      };
      const listen = (key, handler, list = listeners) => {
        const stop = onValue(ref(db, key), snapshot => { if (active) { handler(snapshot.val()); maybeReveal(); emit(); } }, error => { if (active) onError(error); });
        list.push(stop); return stop;
      };
      const maybeReveal = () => {
        if (!active || !revealAllowed()) return;
        for (const actor of needed) if (!revealListeners.has(actor)) {
          // Mark before subscribing: a mocked synchronous listener must not
          // recurse into duplicate subscriptions.
          revealListeners.set(actor, null);
          revealListeners.set(actor, listen(`${path}/${actor}`, value => { records[actor] = value; }));
        }
        if (game.mode === 'chameleon' && ['voting', 'last-guess'].includes(game.stage) && !revealListeners.has('mole')) {
          revealListeners.set('mole', null);
          revealListeners.set('mole', listen(`${deal}/moleSeat`, value => { moleSeat = value; }));
        }
        if ((game.mode === 'detective' && game.stage === 'guess') || (game.mode === 'chameleon' && game.stage === 'last-guess')) {
          if (!revealListeners.has('target')) {
            revealListeners.set('target', null);
            revealListeners.set('target', listen(`${deal}/targetId`, value => { unlockedTarget = value; }));
          }
        }
        if (game.mode==='chameleon' && game.stage==='voting' && moleSeat && needed.every(actor=>records[actor]) && !revealListeners.has('target')) {
          const counts=Object.fromEntries(game.seats.map(actor=>[actor,0]));
          for(const entry of Object.values(records)) if(Object.hasOwn(counts,entry.seat))counts[entry.seat]++;
          const highest=Math.max(...Object.values(counts)), leaders=game.seats.filter(actor=>counts[actor]===highest);
          if(leaders.length!==1||leaders[0]!==moleSeat){
            revealListeners.set('target',null);
            revealListeners.set('target',listen(`${deal}/targetId`,value=>{unlockedTarget=value;}));
          }
        }
      };
      listen(`${path}/${seat}`, value => { mine = value; mineLoaded = true; });
      for (const actor of needed) listen(`${path}/${actor}/locked`, value => { progress[actor] = value === true; });
      if (['detective', 'chameleon'].includes(game.mode)) listen(`${deal}/views/${seat}`, value => { role = value; roleLoaded = !!value; });
      if (game.mode === 'simultaneous-ranking' && game.roundIndex > 0) listen(`${root}/submissions/q${game.roundIndex - 1}/choosing/${seat}/slots`, value => { previousSlots = value || {}; previousSlotsLoaded = !!value; });
      const stop = () => { if (!active) return; active = false; for (const end of listeners) end(); stops.delete(stop); };
      stops.add(stop); return stop;
    },
  };
}
