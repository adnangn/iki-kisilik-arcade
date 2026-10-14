// Local QA only. Four ports isolate persisted anonymous browser identities.
// Production configuration is never imported or modified by this helper.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { lstat, mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';

const root = await realpath(resolve(import.meta.dirname, '..'));
const artifacts = resolve(root, 'artifacts');
assert.equal(relative(root, artifacts), 'artifacts');
await mkdir(artifacts, { recursive: true });
assert.ok(!(await lstat(artifacts)).isSymbolicLink(), 'Yerel önizleme klasörü sembolik bağlantı olamaz.');
assert.equal(await realpath(artifacts), artifacts, 'Yerel önizleme proje içinde kalmalıdır.');

const previewConfig = `// LOCAL EMULATORS ONLY: deliberately fake web configuration.
export const firebaseConfig = {
  apiKey: 'demo-iki-kisilik-not-a-production-key',
  authDomain: 'demo-iki-kisilik.firebaseapp.com',
  databaseURL: 'https://demo-iki-kisilik.firebaseio.com',
  projectId: 'demo-iki-kisilik',
  appId: '1:123456789:web:party-preview'
};
export const emulatorConfig = { enabled: true, host: '127.0.0.1', authPort: 9098, databasePort: 9010 };
export function isFirebaseConfigured() { return true; }
`;
const importMap = { imports: { './firebase-config.js': './artifacts/firebase-party-preview-config.js' } };
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert.ok(!/<base\b/i.test(html), 'Önizleme için kaynak sayfanın taban yolu ayrıca ayarlanmamış olmalıdır.');
assert.ok(/<head>/i.test(html), 'Kaynak sayfanın head alanı gerekli.');
const previewHtml = html.replace(/<head>/i, `<head>\n<base href="../">\n<script type="importmap">${JSON.stringify(importMap)}</script>`);
await writeFile(resolve(artifacts, 'firebase-party-preview-config.js'), previewConfig);
await writeFile(resolve(artifacts, 'party-preview.html'), previewHtml);
await writeFile(resolve(artifacts, 'party-auth-config.json'), JSON.stringify({ emulators: {
  auth: { host: '127.0.0.1', port: 9098 },
  hub: { host: '127.0.0.1', port: 4410 },
  logging: { host: '127.0.0.1', port: 4510 },
  ui: { enabled: false },
} }, null, 2) + '\n');

if (!process.argv.includes('--prepare-only')) {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
  const servers = [];
  for (const port of [4174, 4175, 4176, 4177]) {
    const server = createServer(async (request, response) => {
      try {
        if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
        const url = new URL(request.url, 'http://127.0.0.1');
        const pathname = decodeURIComponent(url.pathname).replace(/^\/oyun(?=\/|$)/, '');
        const target = resolve(root, '.' + (pathname || '/') + (pathname.endsWith('/') || !pathname ? 'index.html' : ''));
        const local = relative(root, target);
        if (local.startsWith('..' + sep) || local === '..' || local.split(sep).some(part => part.startsWith('.'))) {
          response.writeHead(403); response.end('Forbidden'); return;
        }
        const resolvedTarget = await realpath(target), resolvedLocal = relative(root, resolvedTarget);
        if (resolvedLocal.startsWith('..' + sep) || resolvedLocal === '..') { response.writeHead(403); response.end('Forbidden'); return; }
        if (!(await stat(target)).isFile()) throw new Error('Not a file');
        const content = request.method === 'HEAD' ? undefined : await readFile(target);
        response.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        response.end(content);
      } catch { response.writeHead(404); response.end('Not found'); }
    });
    server.on('error', error => { console.error(`Local QA port ${port}: ${error.message}`); for (const item of servers) item.close(); process.exitCode = 1; });
    servers.push(server);
    server.listen(port, '127.0.0.1', () => console.log(`Local party QA: http://127.0.0.1:${port}/oyun/artifacts/party-preview.html`));
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { for (const server of servers) server.close(); });
} else console.log('Non-production party preview and auth emulator configuration prepared.');
