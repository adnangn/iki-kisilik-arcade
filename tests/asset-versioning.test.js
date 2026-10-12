import test from 'node:test';
import assert from 'node:assert/strict';
import { versionLocalReferences } from '../tools/version-assets.mjs';
import { assetUrl } from '../js/assets.js';

const release = '0123456789ab';

test('one release refreshes nested modules, styles, JSON, fonts and static SVGs', () => {
  for (const source of [
    "import { t } from './texts.js';",
    'import("../firebase-config.js")',
    '<script type="module" src="./app.js"></script>',
    '<link href="./styles.css">',
    "fetch('./veri.json')",
    'url("./assets/fonts/VT323-Regular.ttf")',
    '<img src="./assets/images/ball-icon.svg">'
  ]) {
    const versioned = versionLocalReferences(source, release);
    assert.ok(versioned.includes('?v=' + release), source);
    assert.equal(versionLocalReferences(versioned, release), versioned, 'Repeated packaging cannot duplicate the version.');
  }
});

test('SVG fragments and existing queries keep their meaning when a release changes', () => {
  assert.equal(versionLocalReferences('"./assets/images/reactions.svg#laugh"', release), '"./assets/images/reactions.svg?v=0123456789ab#laugh"');
  assert.equal(versionLocalReferences("'./texts.js?lang=tr&v=old'", release), "'./texts.js?lang=tr&v=0123456789ab'");
});

test('external pinned URLs and raw card records are not changed by packaging', () => {
  const source = [
    '"https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js"',
    '"https://example.com/a/./module.js"',
    '"assets/images/turkish-legends/ibrahima-yattara.svg"',
    '"./records.jsonl"',
    '"./index.html?metin-onizleme=1"'
  ].join('\n');
  assert.equal(versionLocalReferences(source, release), source);
});

test('image URLs use the module release without changing original JSON paths', async () => {
  const filename = 'assets/images/turkish-legends/ibrahima-yattara.svg';
  assert.equal(assetUrl(filename), './' + filename);
  const versioned = await import('../js/assets.js?v=0123456789ab');
  assert.equal(versioned.assetUrl(filename), './' + filename + '?v=' + release);
  assert.equal(versioned.assetUrl('assets/images/reactions.svg#laugh'), './assets/images/reactions.svg?v=' + release + '#laugh');
  assert.equal(versioned.assetUrl('assets/images/card.svg?size=small'), './assets/images/card.svg?size=small&v=' + release);
  assert.equal(filename, 'assets/images/turkish-legends/ibrahima-yattara.svg');
});

test('release identifiers must be twelve hexadecimal characters', () => {
  for (const value of ['', 'old', '0123456789ab&x=1']) assert.throws(() => versionLocalReferences('"./app.js"', value));
});
