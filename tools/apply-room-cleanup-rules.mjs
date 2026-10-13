import { readFile, writeFile } from 'node:fs/promises';
import { ROOM_RETENTION_MS } from '../js/room-lifecycle.js';
const file = new URL('../firebase.rules.json', import.meta.url);
const document = JSON.parse(await readFile(file, 'utf8'));
const rules = document.rules;
if (!rules.cleanupIndex) {
  const item = "root.child('cleanupIndex').child($code)";
  const unlocked = `${item}.child('state').val() !== 'deleting'`;
  const present = "root.child('presence').child($code).exists()";
  const room = "root.child('rooms').child($code)";
  const allRemoved = ['rooms', 'privateGames', 'presence', 'reactions', 'cleanupIndex']
    .map(branch => `!newData.parent().parent().child('${branch}').child($code).exists()`).join(' && ');
  const purge = `auth !== null && !newData.exists() && ${item}.child('state').val() === 'deleting' && !${present} && ${allRemoved}`;
  // Every lower write grant needs its own lock check: parent denials do not cascade.
  function lockWrites(node) {
    for (const [key, value] of Object.entries(node)) {
      if (key === '.write' && typeof value === 'string') node[key] = `(${unlocked}) && (${value})`;
      else if (value && typeof value === 'object') lockWrites(value);
    }
  }
  for (const branch of ['rooms', 'privateGames', 'presence', 'reactions']) {
    lockWrites(rules[branch].$code);
    const previous = rules[branch].$code['.write'];
    rules[branch].$code['.write'] = previous ? `(${previous}) || (${purge})` : purge;
  }
  const creation = `!data.exists() && ${item}.child('state').val() === 'reserved' && ${item}.child('reserverUid').val() === auth.uid && newData.child('createdAt').val() === ${item}.child('instance').val()`;
  const oldRoomWrite = rules.rooms.$code['.write'];
  rules.rooms.$code['.write'] = `((${oldRoomWrite}) && (data.exists() || (${creation}))) || (${purge})`;
  const sameInstance = `data.child('instance').val() === ${room}.child('createdAt').val()`;
  const member = `(${room}.child('players/p1/uid').val() === auth.uid || ${room}.child('players/p2/uid').val() === auth.uid)`;
  const expired = `data.child('lastActivityAt').isNumber() && data.child('lastActivityAt').val() <= now - ${ROOM_RETENTION_MS}`;
  const stable = "newData.child('instance').val() === data.child('instance').val()";
  const locked = "newData.child('state').val() === 'deleting' && newData.child('lastActivityAt').val() === data.child('lastActivityAt').val() && !newData.hasChild('reserverUid')";
  const reserve = `!data.exists() && !${room}.exists() && newData.child('state').val() === 'reserved' && newData.child('reserverUid').val() === auth.uid && newData.child('instance').val() >= now - 120000 && newData.child('instance').val() <= now && newData.child('lastActivityAt').val() === now`;
  const bootstrap = `!data.exists() && ${room}.exists() && newData.child('state').val() === 'active' && newData.child('instance').val() === ${room}.child('createdAt').val() && newData.child('lastActivityAt').val() === now && !newData.hasChild('reserverUid')`;
  const touch = `data.exists() && data.child('state').val() !== 'deleting' && ${sameInstance} && ${member} && ${stable} && newData.child('state').val() === 'active' && newData.child('lastActivityAt').val() === now && !newData.hasChild('reserverUid')`;
  const claim = `data.exists() && ${stable} && ${expired} && !${present} && (!${room}.exists() || ${sameInstance}) && ${locked}`;
  rules.cleanupIndex = {
    '.indexOn': ['lastActivityAt'],
    '.read': `auth !== null && query.orderByChild === 'lastActivityAt' && (query.endAt === now - now % 3600000 - ${ROOM_RETENTION_MS} - 3600000 || query.endAt === now - now % 3600000 - ${ROOM_RETENTION_MS} - 7200000) && query.limitToFirst !== null && query.limitToFirst > 0 && query.limitToFirst <= 100`,
    '$code': {
      '.read': `auth !== null && (!data.exists() || ${member} || data.child('reserverUid').val() === auth.uid || (${expired}))`,
      '.write': `auth !== null && $code.matches(/^[0-9]{6}$/) && ((newData.exists() && ((${reserve}) || (${bootstrap}) || (${touch}) || (${claim}))) || (${purge}))`,
      '.validate': "newData.hasChildren(['instance','lastActivityAt','state']) && newData.child('instance').isNumber() && newData.child('instance').val() % 1 === 0 && newData.child('lastActivityAt').isNumber() && newData.child('lastActivityAt').val() % 1 === 0 && (newData.child('state').val() === 'active' || newData.child('state').val() === 'reserved' || newData.child('state').val() === 'deleting')",
      instance: { '.validate': 'newData.isNumber() && newData.val() > 0 && newData.val() <= now' },
      lastActivityAt: { '.validate': 'newData.isNumber() && newData.val() > 0 && newData.val() <= now' },
      state: { '.validate': "newData.val() === 'active' || newData.val() === 'reserved' || newData.val() === 'deleting'" },
      reserverUid: { '.validate': "newData.parent().child('state').val() === 'reserved' && newData.isString() && newData.val().length <= 128" },
      '$other': { '.validate': false },
    },
  };
}
// Compact JSON preserves every expression and stays below Firebase's 256 KiB cap.
const source = JSON.stringify(document) + '\n';
if (Buffer.byteLength(source) > 256 * 1024) throw new Error('Firebase kuralları boyut sınırını aşıyor.');
await writeFile(file, source);
console.log(`Oda temizlik kuralları hazır (${Buffer.byteLength(source)} bayt).`);
