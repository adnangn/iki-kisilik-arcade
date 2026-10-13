import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { firebaseConfig } from '../firebase-config.js';
import { cleanupCutoff, expiredEntry, claimExpired, purgePaths } from '../js/room-lifecycle.js';

export async function cleanupRooms({ config = firebaseConfig, fetchImpl = fetch, now = Date.now(), bootstrap = null } = {}) {
  const identity = 'https://identitytoolkit.googleapis.com/v1';
  const signed = await fetchImpl(`${identity}/accounts:signUp?key=${encodeURIComponent(config.apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }), signal: AbortSignal.timeout(20000),
  });
  if (!signed.ok) throw new Error(`Temizlik oturumu açılamadı (HTTP ${signed.status}).`);
  const auth = await signed.json();
  if (!auth.idToken || !auth.localId) throw new Error('Temizlik kimliği eksik.');
  async function request(node, method = 'GET', value, headers = {}, params = {}) {
    const url = new URL(`${config.databaseURL.replace(/\/$/, '')}/${node}.json`);
    url.searchParams.set('auth', auth.idToken);
    for (const [key, item] of Object.entries(params)) url.searchParams.set(key, JSON.stringify(item));
    const response = await fetchImpl(url, { method, headers: { ...headers, ...(value !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(value !== undefined ? { body: JSON.stringify(value) } : {}), signal: AbortSignal.timeout(20000) });
    return { status: response.status, value: await response.json(), etag: response.headers.get('etag') };
  }
  try {
    if (bootstrap) {
      let indexed = 0;
      if (!Array.isArray(bootstrap) || bootstrap.some(item => !/^[0-9]{6}$/.test(item.code) || !Number.isSafeInteger(item.createdAt))) throw new Error('Geçersiz eski oda listesi.');
      for (const item of bootstrap) {
        const previous = await request(`cleanupIndex/${item.code}`, 'GET', undefined, { 'X-Firebase-ETag': 'true' });
        if (previous.status !== 200 || previous.value) continue;
        const record = { instance: item.createdAt, lastActivityAt: { '.sv': 'timestamp' }, state: 'active' };
        const result = await request(`cleanupIndex/${item.code}`, 'PUT', record, { 'if-match': previous.etag });
        if (result.status === 200) indexed++;
        else if (![401, 403, 412].includes(result.status)) throw new Error(`Eski oda dizini yazılamadı (HTTP ${result.status}).`);
      }
      return { indexed };
    }
    let removed = 0, skipped = 0;
    const cutoff = cleanupCutoff(now);
    const listing = await request('cleanupIndex', 'GET', undefined, {}, { orderBy: 'lastActivityAt', endAt: cutoff, limitToFirst: 100 });
    if (listing.status !== 200) throw new Error(`Eski oda dizini okunamadı (HTTP ${listing.status}).`);
    for (const [code, entry] of Object.entries(listing.value || {})) {
      if (!expiredEntry(entry, now - 60000) || !/^[0-9]{6}$/.test(code)) continue;
      let claimed = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const current = await request(`cleanupIndex/${code}`, 'GET', undefined, { 'X-Firebase-ETag': 'true' });
        if (current.status !== 200 || !expiredEntry(current.value, now - 60000) || current.value.instance !== entry.instance) break;
        const next = claimExpired(current.value, entry.instance, now - 60000);
        const lock = await request(`cleanupIndex/${code}`, 'PUT', next, { 'if-match': current.etag });
        if (lock.status === 200) { claimed = true; break; }
        if (lock.status !== 412) break;
      }
      if (!claimed) { skipped++; continue; }
      const result = await request('', 'PATCH', purgePaths(code));
      if (result.status !== 200) {
        if ([401, 403].includes(result.status)) {
          const latest = await request(`cleanupIndex/${code}`);
          if (latest.status === 200 && (!latest.value || latest.value.instance !== entry.instance)) { skipped++; continue; }
        }
        throw new Error(`Oda temizliği tamamlanamadı (HTTP ${result.status}). Sonraki çalıştırma kilidi yeniden işler.`);
      }
      removed++;
    }
    return { removed, skipped };
  } finally {
    // This token belongs to the fresh job identity only, never a human player.
    const ended = await fetchImpl(`${identity}/accounts:delete?key=${encodeURIComponent(config.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: auth.idToken }), signal: AbortSignal.timeout(20000),
    });
    if (!ended.ok) console.warn(`Geçici temizlik kimliği kapatılamadı (HTTP ${ended.status}).`);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const arg = process.argv[2];
    if (process.argv.length > 3 || (arg && !arg.startsWith('--bootstrap='))) throw new Error('Kullanım: node tools/cleanup-rooms.mjs [--bootstrap=<metadata.json>]');
    const bootstrap = arg ? JSON.parse(await readFile(arg.slice('--bootstrap='.length), 'utf8')) : null;
    console.log('Oda bakımı:', await cleanupRooms({ bootstrap }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
