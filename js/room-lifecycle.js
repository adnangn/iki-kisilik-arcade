export const ROOM_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const CLEANUP_HOUR_MS = 60 * 60 * 1000;
// Query bounds use an exact server-hour bucket. The preceding hour tolerates
// clock skew and a request crossing an hour boundary without exposing live rooms.
export function cleanupCutoff(now) { return now - now % CLEANUP_HOUR_MS - ROOM_RETENTION_MS - CLEANUP_HOUR_MS; }
export const CLEANUP_BRANCHES = ['rooms', 'privateGames', 'presence', 'reactions', 'cleanupIndex'];
export class LifecycleError extends Error {}

export function expiredEntry(entry, now) {
  return !!entry && Number.isSafeInteger(entry.instance) && Number.isSafeInteger(entry.lastActivityAt)
    && ['reserved', 'active', 'deleting'].includes(entry.state) && entry.lastActivityAt <= now - ROOM_RETENTION_MS;
}
export function claimExpired(entry, expectedInstance, now) {
  if (!expiredEntry(entry, now) || entry.instance !== expectedInstance) throw new LifecycleError('Oda henüz temizlenemez.');
  return { instance: entry.instance, lastActivityAt: entry.lastActivityAt, state: 'deleting' };
}
export function purgePaths(code) {
  if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) throw new LifecycleError('Oda kodu geçersiz.');
  return Object.fromEntries(CLEANUP_BRANCHES.map(branch => [`${branch}/${code}`, null]));
}

export function createRoomLifecycle({ uid, db, dbSDK, transact, assertOnline, stops, clock = Date.now }) {
  const { ref, get, onValue, serverTimestamp, query, orderByChild, endAt, limitToFirst, update } = dbSDK;
  let offset = 0, sweeping = null;
  const stopOffset = onValue(ref(db, '.info/serverTimeOffset'), snapshot => { offset = Number(snapshot.val()) || 0; });
  stops.add(stopOffset);
  async function retainedTransaction(path, reducer) {
    let unsubscribe = () => {}, rejectRead = () => {}, pending = true;
    const stop = () => { unsubscribe(); stops.delete(stop); if (pending) rejectRead(new LifecycleError('Oyuncu oturumu kapandı.')); };
    stops.add(stop);
    try {
      await new Promise((resolve, reject) => { rejectRead = reject; unsubscribe = onValue(ref(db, path), resolve, reject); });
      pending = false;
      return await transact(path, reducer);
    } finally { pending = false; stop(); }
  }
  return {
    reserveRoom(code) {
      // Keep the identity stable through retries. A serverTimestamp returned
      // by an SDK transaction may still contain a client estimate at commit.
      const instance = Math.floor(clock() + offset - 60000);
      return retainedTransaction(`cleanupIndex/${code}`, current => {
        if (current) throw new LifecycleError('CODE_COLLISION');
        return { instance, lastActivityAt: serverTimestamp(), state: 'reserved', reserverUid: uid };
      });
    },
    touchRoom(room) {
      assertOnline();
      if (!room || !Object.values(room.players || {}).some(player => player.uid === uid)) throw new LifecycleError('Bu odanın oyuncusu değilsiniz.');
      return retainedTransaction(`cleanupIndex/${room.code}`, current => {
        if (current && (current.instance !== room.createdAt || current.state === 'deleting')) throw new LifecycleError('Bu odanın süresi doldu. Yeni bir oda kurabilirsiniz.');
        return { instance: room.createdAt, lastActivityAt: serverTimestamp(), state: 'active' };
      });
    },
    async touchCode(code) {
      assertOnline();
      const room = (await get(ref(db, `rooms/${code}`))).val();
      if (room) return this.touchRoom(room);
    },
    sweepExpiredRooms() {
      if (sweeping) return sweeping;
      assertOnline();
      const now = clock() + offset - 60000;
      sweeping = (async () => {
        const snapshot = await get(query(ref(db, 'cleanupIndex'), orderByChild('lastActivityAt'), endAt(cleanupCutoff(now + 60000)), limitToFirst(100)));
        let removed = 0;
        for (const [code, entry] of Object.entries(snapshot.val() || {})) {
          if (!expiredEntry(entry, now) || !/^[0-9]{6}$/.test(code)) continue;
          try {
            await retainedTransaction(`cleanupIndex/${code}`, current => claimExpired(current, entry.instance, now));
            assertOnline();
            // A transaction lock stops every writer. One atomic delete then
            // removes all branches without ever reading private answers.
            await update(ref(db), purgePaths(code));
            removed++;
          } catch (error) {
            if (/permission|henüz|kapandı|süresi/i.test(String(error.code || '') + error.message)) continue;
            throw error;
          }
        }
        return removed;
      })().finally(() => { sweeping = null; });
      return sweeping;
    },
  };
}
