import { qrcode } from './vendor/qrcode-generator.js';

const ROOM_CODE = /^[0-9]{6}$/;
const SVG_NS = 'http://www.w3.org/2000/svg';
const QUIET_ZONE = 4;
const validCode = code => typeof code === 'string' && code.length === 6 && ROOM_CODE.test(code);

function webUrl(value) {
  if (!(typeof value === 'string' || value instanceof URL)) throw new TypeError('Geçerli bir web adresi gerekli.');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new TypeError('Geçerli bir web adresi gerekli.');
  return url;
}

/** Keep the Pages project directory and publish only the six-digit room code. */
export function invitationUrl(baseUrl, code) {
  if (!validCode(code)) throw new TypeError('Oda kodu 6 rakam olmalı.');
  const url = webUrl(baseUrl);
  url.pathname = url.pathname.replace(/\/index\.html$/i, '/');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  url.search = '';
  url.hash = '';
  url.searchParams.set('oda', code);
  return url.href;
}

/** A link fills the join form; the caller still asks for a name and explicit join. */
export function parseInvite(value) {
  try {
    const url = webUrl(value);
    if (url.href.length > 4096) return null;
    const values = url.searchParams.getAll('oda');
    return values.length === 1 && validCode(values[0]) ? values[0] : null;
  } catch {
    return null;
  }
}

/** Browser-local QR encoding, with medium error correction and automatic size. */
export function invitationMatrix(value) {
  const code = parseInvite(value);
  if (!code) throw new TypeError('QR için geçerli bir davet bağlantısı gerekli.');
  const url = invitationUrl(value, code);
  // Canonical URL serialization percent-encodes non-ASCII path characters.
  // Bound the work for accidental oversized pasted URLs.
  if (url.length > 1024) throw new RangeError('Davet bağlantısı QR için çok uzun.');
  const qr = qrcode(0, 'M');
  qr.addData(url, 'Byte');
  qr.make();
  const size = qr.getModuleCount();
  return Object.freeze(Array.from({ length: size }, (_, row) => Object.freeze(
    Array.from({ length: size }, (_, col) => qr.isDark(row, col))
  )));
}

/** Accessible SVG with a four-module quiet zone; no HTML or external image API. */
export function renderInviteQR(container, url, { label = 'Odaya katılmak için QR kodunu tara' } = {}) {
  const matrix = invitationMatrix(url);
  const doc = container?.ownerDocument;
  if (!doc?.createElementNS || typeof container.replaceChildren !== 'function') throw new TypeError('QR için bir ekran alanı gerekli.');
  const size = matrix.length + QUIET_ZONE * 2;
  const svg = doc.createElementNS(SVG_NS, 'svg');
  for (const [key, value] of Object.entries({
    xmlns: SVG_NS,
    viewBox: `0 0 ${size} ${size}`,
    width: size * 4,
    height: size * 4,
    role: 'img',
    'aria-label': label,
    'shape-rendering': 'crispEdges',
    focusable: 'false',
    class: 'invite-qr'
  })) svg.setAttribute(key, String(value));
  const title = doc.createElementNS(SVG_NS, 'title');
  title.textContent = label;
  const background = doc.createElementNS(SVG_NS, 'rect');
  for (const [key, value] of Object.entries({ width: size, height: size, fill: '#fff' })) background.setAttribute(key, String(value));
  const path = doc.createElementNS(SVG_NS, 'path');
  const runs = [];
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix.length;) {
      if (!matrix[row][col]) { col++; continue; }
      const start = col;
      while (col < matrix.length && matrix[row][col]) col++;
      const length = col - start;
      runs.push(`M${start + QUIET_ZONE} ${row + QUIET_ZONE}h${length}v1h-${length}z`);
    }
  }
  path.setAttribute('fill', '#000');
  path.setAttribute('d', runs.join(''));
  svg.append(title, background, path);
  container.replaceChildren(svg);
  return svg;
}
