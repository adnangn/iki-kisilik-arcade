import { firebaseConfig, emulatorConfig } from '../firebase-config.js';
import { seatFor, hasOptionalSpectator, RoomError } from './room-state.js';

const SDK = 'https://www.gstatic.com/firebasejs/13.0.0';

export async function connectFirebase(onConnection, onSessionEnded = () => {}, loadSDK = () => Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-database.js`)
  ])) {
  const [appSDK, authSDK, dbSDK] = await loadSDK();
  const isNewApp = !appSDK.getApps().length;
  const app = isNewApp ? appSDK.initializeApp(firebaseConfig) : appSDK.getApp();
  const auth = authSDK.getAuth(app);
  const db = dbSDK.getDatabase(app);
  if (emulatorConfig.enabled && isNewApp) {
    authSDK.connectAuthEmulator(auth, `http://${emulatorConfig.host}:${emulatorConfig.authPort}`, { disableWarnings: true });
    dbSDK.connectDatabaseEmulator(db, emulatorConfig.host, emulatorConfig.databasePort);
  }
  await authSDK.setPersistence(auth, authSDK.browserLocalPersistence);
  await auth.authStateReady();
  const user = auth.currentUser || (await authSDK.signInAnonymously(auth)).user;
  const { ref, get, onValue, runTransaction, serverTimestamp, onDisconnect } = dbSDK;
  let connected = false;
  let disposed = false;
  const presenceStops = new Set();
  const joinStops = new Set();
  const connectionListeners = new Set();
  const cancelJoins = () => {
    for (const stop of joinStops) stop(new RoomError('Oyuncu oturumu kapandı. Yeni bir oturum açın.'));
    joinStops.clear();
  };
  dbSDK.goOnline(db);
  const unwatchConnection = onValue(ref(db, '.info/connected'), snapshot => {
    if (disposed) return;
    connected = snapshot.val() === true;
    onConnection(connected);
    for (const listener of connectionListeners) listener(connected);
  });
  const unwatchAuth = authSDK.onAuthStateChanged(auth, current => {
    if (disposed || current?.uid === user.uid) return;
    disposed = true; connected = false;
    unwatchConnection(); unwatchAuth(); connectionListeners.clear(); presenceStops.clear(); cancelJoins();
    dbSDK.goOffline(db);
    onSessionEnded();
  });
  const assertOnline = () => {
    if (disposed || auth.currentUser?.uid !== user.uid) throw new RoomError('Oyuncu oturumu kapandı. Yeni bir oturum açın.');
    if (!connected) throw new RoomError('Bağlantı bekleniyor. İnternet geri geldiğinde tekrar deneyin.');
  };
  const transact = async (path, reducer) => {
    assertOnline();
    let rejection;
    const result = await runTransaction(ref(db, path), current => {
      try {
        rejection = null;
        if (disposed || auth.currentUser?.uid !== user.uid) throw new RoomError('Oyuncu oturumu kapandı.');
        return reducer(current);
      }
      catch (error) { rejection = error; return undefined; }
    }, { applyLocally: false });
    if (!result.committed) throw rejection || new RoomError('İşlem uygulanamadı. Tekrar deneyin.');
    return result.snapshot.val();
  };

  return {
    uid: user.uid,
    get connected() { return connected; },
    async createRoom(name, datasetId, mode = 'auction') {
      if (!['auction', 'blind-ranking', 'bracket', 'team-draft'].includes(mode)) throw new RoomError('Bu oyun modu henüz oynanabilir değil.');
      let lastError;
      for (let attempt = 0; attempt < 8; attempt++) {
        const random = crypto.getRandomValues(new Uint32Array(1))[0];
        const code = String(100000 + random % 900000);
        const initial = { version: 1, code, ownerUid: user.uid, createdAt: serverTimestamp(), datasetId,
          mode, status: 'waiting', round: 1, starterSeat: 'p1', revision: 0,
          players: { p1: { uid: user.uid, name } } };
        try {
          return await transact(`rooms/${code}`, current => {
            if (current) throw new RoomError('CODE_COLLISION');
            return initial;
          });
        } catch (error) {
          // Occupied rooms may be unreadable to this user. Regenerate the code;
          // after bounded retries retain a real rules/configuration error.
          if (error.message !== 'CODE_COLLISION' && !/permission/i.test(String(error.code || ''))) throw error;
          lastError = error;
        }
      }
      if (lastError && lastError.message !== 'CODE_COLLISION') throw lastError;
      throw new RoomError('Boş oda kodu bulunamadı. Tekrar deneyin.');
    },
    async joinRoom(code, name) {
      assertOnline();
      const roomRef = ref(db, `rooms/${code}`);
      let unsubscribe = () => {};
      let rejectRead = () => {};
      const stop = error => {
        unsubscribe(); unsubscribe = () => {};
        if (error) rejectRead(error);
      };
      joinStops.add(stop);
      try {
        // get() releases its temporary cache before returning. Keep a real
        // listener through the transaction so an existing room cannot look
        // absent in its first callback. The first value is fully synchronized.
        const snapshot = await new Promise((resolve, reject) => {
          rejectRead = reject;
          unsubscribe = onValue(roomRef, resolve, reject);
        });
        assertOnline();
        const current = snapshot.val();
        if (!current) throw new RoomError('Bu kodla bir oda bulunamadı.');
        if (seatFor(current, user.uid)) return current;
        if (hasOptionalSpectator(current)) {
          if (current.players.p2) throw new RoomError('Bu oda dolu veya oyun başladı.');
          // Claim only the empty spectator seat. A host may start, make a
          // choice, or finish concurrently; none of that state is rewritten.
          try {
            await transact(`rooms/${code}/players/p2`, value => {
              // Another tab with our saved identity may win the seat race.
              // Abort rather than rewriting the now immutable member record.
              if (value?.uid === user.uid) throw new RoomError('ALREADY_MEMBER');
              if (value) throw new RoomError('Bu oda dolu veya oyun başladı.');
              return { uid: user.uid, name };
            });
          } catch (error) {
            if (error.message !== 'ALREADY_MEMBER') throw error;
          }
          const latest = await get(roomRef);
          assertOnline();
          return latest.val();
        }
        try { return await transact(`rooms/${code}`, value => {
          if (!value) throw new RoomError('Bu kodla bir oda bulunamadı.');
          if (seatFor(value, user.uid)) throw new RoomError('ALREADY_MEMBER');
          if (value.status !== 'waiting' || value.players.p2) throw new RoomError('Bu oda dolu veya oyun başladı.');
          return { ...value, revision: value.revision + 1,
            players: { ...value.players, p2: { uid: user.uid, name } } };
        }); } catch (error) {
          // A second tab may have claimed this same anonymous identity meanwhile.
          if (error.message === 'ALREADY_MEMBER') {
            const latest = await get(roomRef);
            assertOnline();
            return latest.val();
          }
          throw error;
        }
      } finally {
        joinStops.delete(stop);
        stop();
      }
    },
    mutateRoom(code, reducer) { return transact(`rooms/${code}`, reducer); },
    watchRoom(code, onRoom, onError) {
      return onValue(ref(db, `rooms/${code}`), snapshot => onRoom(snapshot.val()), onError);
    },
    watchPresence(code, onPresence, onError) {
      return onValue(ref(db, `presence/${code}`), snapshot => onPresence(snapshot.val() || {}), onError);
    },
    async enterPresence(code, onError) {
      const connectionId = crypto.randomUUID();
      const path = `presence/${code}/${user.uid}/${connectionId}`;
      const presenceRef = ref(db, path);
      let active = true;
      let generation = 0;
      let queue = Promise.resolve();
      const register = isOnline => {
        if (!active || !isOnline) return;
        const currentGeneration = ++generation;
        queue = queue.then(async () => {
          if (!active || currentGeneration !== generation) return;
          // onDisconnect has no transaction API. It only removes this tab's
          // isolated presence record; it never touches budgets, seats or game.
          await onDisconnect(presenceRef).remove();
          if (!active || currentGeneration !== generation) return;
          await transact(path, () => ({ connectedAt: serverTimestamp() }));
        }).catch(onError);
      };
      connectionListeners.add(register);
      register(connected);
      const stop = async () => {
        active = false; generation++;
        presenceStops.delete(stop);
        connectionListeners.delete(register);
        await queue;
        if (connected) {
          await runTransaction(presenceRef, () => null, { applyLocally: false });
          await onDisconnect(presenceRef).cancel();
        }
      };
      presenceStops.add(stop);
      return stop;
    },
    async react(code, type) {
      return transact(`reactions/${code}/${user.uid}`, current => ({ seq: (current?.seq || 0) + 1, type, sentAt: serverTimestamp() }));
    },
    watchReaction(code, uid, onReaction, onError) {
      return onValue(ref(db, `reactions/${code}/${uid}`), snapshot => onReaction(snapshot.val()), onError);
    },
    async signOut() {
      // Remove only this tab's presence; disconnect still runs its registered
      // fallback when a cleanup cannot reach the server.
      await Promise.race([Promise.allSettled([...presenceStops].map(stop => stop())), new Promise(resolve => setTimeout(resolve, 1500))]);
      await authSDK.signOut(auth);
      this.dispose();
    },
    dispose() {
      disposed = true; connected = false;
      unwatchConnection(); unwatchAuth(); connectionListeners.clear(); presenceStops.clear(); cancelJoins();
      dbSDK.goOffline(db);
    }
  };
}
