import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TEXT_CATALOG } from '../js/text-catalog.js';
import { normalizeTexts, formatText, applyTexts, t } from '../js/texts.js';

test('published edits accept partial known overrides and keep defaults for other fields', () => {
  const texts = normalizeTexts({ version: 1, texts: { 'site.name': 'OYUN EVİ' } });
  assert.equal(texts.texts['site.name'], 'OYUN EVİ');
  assert.equal(t('site.name'), TEXT_CATALOG['site.name'].value);
  assert.deepEqual(normalizeTexts({ version: 1, texts: {} }), { version: 1, texts: {} });
});

test('invalid imports reject unknown keys, prototype keys and unsupported formats', () => {
  for (const value of [null, [], {}, { version: 2, texts: {} }, { version: 1, texts: [] }, { version: 1, texts: {}, other: true }]) {
    assert.throws(() => normalizeTexts(value));
  }
  assert.throws(() => normalizeTexts({ version: 1, texts: { missing: 'No' } }));
  assert.throws(() => normalizeTexts(JSON.parse('{"version":1,"texts":{"__proto__":"No"}}')));
  for (const value of [5, null, '', '   ', 'x'.repeat(2001), 'hello\u0000']) {
    assert.throws(() => normalizeTexts({ version: 1, texts: { 'site.name': value } }));
  }
});

test('templates preserve all automatic fields, including repeated occurrences', () => {
  const [key, field] = Object.entries(TEXT_CATALOG).find(([, field]) => /\{[a-zA-Z]/.test(field.value));
  assert.ok(key);
  assert.doesNotThrow(() => normalizeTexts({ version: 1, texts: { [key]: `${field.value} Harika!` } }));
  assert.throws(() => normalizeTexts({ version: 1, texts: { [key]: field.value.replace(/\{[a-zA-Z][a-zA-Z0-9_]*\}/, '') } }));
  assert.throws(() => normalizeTexts({ version: 1, texts: { [key]: `${field.value} {unknown}` } }));
  const token = field.value.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/)[0];
  assert.throws(() => normalizeTexts({ version: 1, texts: { [key]: `${field.value} ${token}` } }));
});

test('player names stay literal and cannot replace another template variable', () => {
  assert.equal(formatText('{player}: {count}', { player: '{count}<script>', count: 3 }), '{count}<script>: 3');
  assert.equal(formatText('{player} / {player}', { player: 'Ada' }), 'Ada / Ada');
  assert.equal(formatText('{count} / {missing}', { count: 0 }), '0 / {missing}');
});

test('markup bindings use catalog keys and keep mixed-content icons and spacing intact', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const bindingKeys = [...html.matchAll(/data-text(?:-(?:placeholder|aria-label|title|content))?="([^"]+)"/g)].map(match => match[1]);
  for (const match of html.matchAll(/data-text-slots="([^"]+)"/g)) bindingKeys.push(...match[1].split(' ').map(slot => slot.slice(slot.indexOf(':') + 1)));
  for (const key of bindingKeys) assert.ok(Object.hasOwn(TEXT_CATALOG, key), key);
  const literal = { dataset: { text: 'site.name' }, textContent: '' };
  const textNode = { nodeType: 3, nodeValue: '  Original ' };
  const icon = { nodeType: 1, preserved: true };
  const mixed = { dataset: { textSlots: '0:action.pass' }, childNodes: [textNode, icon] };
  const target = { querySelectorAll: selector => selector === '[data-text]' ? [literal] : selector === '[data-text-slots]' ? [mixed] : [] };
  applyTexts(target);
  assert.equal(literal.textContent, t('site.name'));
  assert.equal(textNode.nodeValue, `  ${t('action.pass')} `);
  assert.equal(mixed.childNodes[1], icon);
  applyTexts(target);
  assert.equal(textNode.nodeValue, `  ${t('action.pass')} `);
});

test('every catalog default fits the same import contract', () => {
  for (const [key, field] of Object.entries(TEXT_CATALOG)) {
    assert.ok(field.label && field.group);
    assert.doesNotThrow(() => normalizeTexts({ version: 1, texts: { [key]: field.value } }), key);
  }
});
