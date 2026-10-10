// Development preview only. The deployed app has no backend.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const port = Number(process.env.PORT || 4173);
createServer(async (request, response) => {
  try {
    // /oyun/ also previews a GitHub Pages repository subdirectory.
    const url = new URL(request.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname).replace(/^\/oyun(?=\/|$)/, '');
    const path = resolve(root, '.' + (pathname || '/') + (pathname.endsWith('/') || !pathname ? 'index.html' : ''));
    const local = relative(root, path);
    if (local.startsWith('..' + sep) || local === '..' || local.split(sep).some(part => part.startsWith('.'))) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    if (!(await stat(path)).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(await readFile(path));
  } catch {
    response.writeHead(404); response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/oyun/`));
