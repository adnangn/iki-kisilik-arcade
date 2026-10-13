import test from 'node:test';
import assert from 'node:assert/strict';
import { invitationUrl, parseInvite, invitationMatrix, renderInviteQR } from '../js/invites.js';

test('invites preserve the Pages subpath and remove preview, release and hash parameters', () => {
  assert.equal(invitationUrl('https://adnangn.github.io/iki-kisilik-arcade/?v=old&metin-onizleme=1#sonuc', '012345'), 'https://adnangn.github.io/iki-kisilik-arcade/?oda=012345');
  assert.equal(invitationUrl('https://example.com/nested/project/index.html?v=old', '123456'), 'https://example.com/nested/project/?oda=123456');
  assert.equal(invitationUrl('https://example.com/project', '123456'), 'https://example.com/project/?oda=123456');
  assert.equal(invitationUrl('http://127.0.0.1:4173/oyun/', '654321'), 'http://127.0.0.1:4173/oyun/?oda=654321');
  assert.equal(parseInvite(invitationUrl('https://example.com/', '000001')), '000001');
});

test('invites reject invalid codes, protocols, credentials and ambiguous duplicate parameters', () => {
  for (const code of ['12345', '1234567', ' 123456', '123456\n', '１２３４５６', 123456, null]) assert.throws(() => invitationUrl('https://example.com/', code));
  for (const base of ['javascript:alert(1)', 'file:///tmp/index.html', 'https://name:password@example.com/', '//example.com/']) assert.throws(() => invitationUrl(base, '123456'));
  for (const value of [
    'not a URL', 'https://example.com/', 'https://example.com/?oda=12345',
    'https://example.com/?oda=123456&oda=654321', 'https://example.com/?oda=123456&%6fda=123456',
    'https://example.com/?oda=123456%20', 'https://example.com/?oda=123456%0A', 'https://example.com/?oda=１２３４５６',
    'https://user:password@example.com/?oda=123456', 'javascript:?oda=123456', null, 123456
  ]) assert.equal(parseInvite(value), null, String(value));
  assert.equal(parseInvite('https://example.com/?oda=123456&__proto__=test'), '123456', 'Unrelated keys never become object properties.');
});

test('QR encodes canonical invitation URLs locally with deterministic finder patterns', () => {
  const url = invitationUrl('https://adnangn.github.io/iki-kisilik-arcade/', '123456');
  const matrix = invitationMatrix(url);
  assert.deepEqual(invitationMatrix(url), matrix);
  assert.equal((matrix.length - 17) % 4, 0);
  assert.ok(matrix.length >= 21 && matrix.length <= 57);
  assert.ok(matrix.every(row => row.length === matrix.length && row.every(value => typeof value === 'boolean')));
  for (const [row, col] of [[0, 0], [0, matrix.length - 7], [matrix.length - 7, 0]]) {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const dark = y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
      assert.equal(matrix[row + y][col + x], dark);
    }
  }
  assert.ok(Object.isFrozen(matrix) && Object.isFrozen(matrix[0]));
  assert.notDeepEqual(invitationMatrix(invitationUrl(url, '654321')), matrix);
  assert.throws(() => invitationMatrix('https://example.com/?oda=12345'));
  assert.throws(() => invitationMatrix('https://example.com/' + 'a'.repeat(1100) + '/?oda=123456'));
});

test('SVG QR keeps its quiet zone and uses accessible DOM text instead of HTML interpolation', () => {
  const doc = { createElementNS: (namespace, name) => ({
    namespace, name, attributes: {}, children: [], textContent: '',
    setAttribute(key, value) { this.attributes[key] = value; },
    append(...elements) { this.children.push(...elements); }
  }) };
  const container = { ownerDocument: doc, children: [], replaceChildren(...elements) { this.children = elements; } };
  const url = invitationUrl('https://adnangn.github.io/iki-kisilik-arcade/', '123456');
  const label = 'Odaya katıl <img src=x onerror=alert(1)>';
  const svg = renderInviteQR(container, url, { label });
  const size = invitationMatrix(url).length + 8;
  assert.deepEqual(container.children, [svg]);
  assert.equal(svg.attributes.viewBox, `0 0 ${size} ${size}`);
  assert.equal(svg.attributes.role, 'img');
  assert.equal(svg.attributes['aria-label'], label);
  assert.equal(svg.children[0].textContent, label);
  assert.equal(svg.children[1].attributes.fill, '#fff');
  assert.equal(svg.children[1].attributes.width, String(size));
  assert.equal(svg.children[2].attributes.fill, '#000');
  assert.ok(svg.children[2].attributes.d.startsWith('M4 4h7v1h-7z'));
  const unchanged = [...container.children];
  assert.throws(() => renderInviteQR(container, 'invalid'));
  assert.deepEqual(container.children, unchanged, 'Invalid links cannot clear a valid QR.');
});
