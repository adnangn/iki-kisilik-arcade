import test from 'node:test';
import assert from 'node:assert/strict';
import { publishTexts } from '../tools/publish-texts.mjs';
import { TEXT_CATALOG } from '../js/text-catalog.js';

const empty = { version: 1, texts: {} };
const page = body => `<!doctype html><html><head><title data-text="site.name">Eski başlık</title></head><body>${body}</body></html>`;

test('the first HTML paint already contains published copy and its exact runtime seed', () => {
  const texts = { version: 1, texts: { 'site.name': 'Oyun Salonu' } };
  const html = publishTexts(page('<h1 data-text="site.name">Eski marka</h1>'), texts);
  assert.match(html, /<h1 data-text="site.name">Oyun Salonu<\/h1>/);
  assert.match(html, /<title data-text="site.name">Oyun Salonu<\/title>/);
  const seed = html.match(/<script id="published-texts" type="application\/json">(.*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(seed), texts);
  assert.equal(publishTexts(html, texts), html);
});

test('icons, comments and exact DOM text-slot positions survive publication', () => {
  const html = publishTexts(page('<button data-text-slots="2:action.pass"><svg><use href="#arrow"></use></svg><!-- icon -->  Eski pas </button>'), empty);
  assert.ok(html.includes(`<svg><use href="#arrow"></use></svg><!-- icon -->  ${TEXT_CATALOG['action.pass'].value} </button>`));
  assert.throws(() => publishTexts(page('<button data-text-slots="0:action.pass"><svg></svg></button>'), empty), /yuvası/);
});

test('published copy is escaped in markup and JSON cannot terminate the seed script', () => {
  const name = '</script><img src=x onerror="bad"> & $&';
  const html = publishTexts(page('<p data-text="site.name"></p><meta data-text-content="site.name">'), { version: 1, texts: { 'site.name': name } });
  assert.ok(html.includes('&lt;/script&gt;&lt;img src=x onerror=&quot;bad&quot;&gt; &amp; $&'));
  assert.equal((html.match(/<script /g) || []).length, 1);
  assert.ok(!html.includes('<img src=x'));
  assert.equal(JSON.parse(html.match(/type="application\/json">(.*?)<\/script>/)[1]).texts['site.name'], name);
});

test('quoted tag characters and literal script bodies do not corrupt the HTML projection', () => {
  const html = publishTexts(page('<script>const sample="<div>";</script><input title="A > B" data-text-title="site.name">'), empty);
  assert.ok(html.includes('<script>const sample="<div>";</script>'));
  assert.ok(html.includes(`title="${TEXT_CATALOG['site.name'].value}"`));
});

test('publication fails on invalid copy or unknown bindings instead of releasing mixed versions', () => {
  assert.throws(() => publishTexts(page('<h1 data-text="missing"></h1>'), empty), /Bilinmeyen/);
  assert.throws(() => publishTexts(page(''), { version: 1, texts: { 'site.name': '' } }));
});
