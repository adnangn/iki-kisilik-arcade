import assert from 'node:assert/strict';
import { copyFile, lstat, mkdir, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_ROOT, preflight, listFiles } from './preflight.mjs';

try {
  assert.equal(process.argv.length, 2, 'Kullanım: node tools/build-site.mjs');
  const checked = await preflight({ quiet: true });
  const root = await realpath(PROJECT_ROOT);
  const artifacts = path.join(root, 'artifacts');
  const output = path.join(artifacts, 'site');
  const samePath = (left, right) => process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
  const existing = async candidate => {
    try { return await lstat(candidate); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  };
  const artifactInfo = await existing(artifacts);
  if (artifactInfo) {
    assert.ok(artifactInfo.isDirectory() && !artifactInfo.isSymbolicLink(), 'artifacts normal bir proje klasörü olmalı.');
    assert.ok(samePath(await realpath(artifacts), artifacts), 'artifacts proje dışında çözümlenemez.');
  } else await mkdir(artifacts);
  // Verify the absolute deletion target immediately before recursive removal.
  assert.ok(samePath(path.resolve(output), path.join(root, 'artifacts', 'site')), 'Paketleme hedefi yalnız artifacts/site olabilir.');
  assert.equal(path.relative(root, output), path.join('artifacts', 'site'), 'Proje dışı hedef reddedildi.');
  const outputInfo = await existing(output);
  if (outputInfo) {
    assert.ok(outputInfo.isDirectory() && !outputInfo.isSymbolicLink(), 'Eski site paketi normal bir klasör olmalı.');
    assert.ok(samePath(await realpath(output), output), 'Eski site paketi proje dışında çözümlenemez.');
    await rm(output, { recursive: true, force: true });
  }
  await mkdir(output);
  for (const file of checked.files) {
    const target = path.join(output, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, file), target);
  }
  assert.deepEqual(await listFiles(output), checked.files, 'Paket yalnız denetlenmiş çalışma dosyalarını içermeli.');
  console.log(`Statik paket hazır: artifacts/site (${checked.files.length} dosya, ${checked.cardCount} kart, ${checked.imageCount} kart görseli).`);
} catch (error) {
  console.error(`Paketleme başarısız: ${error.message}`);
  process.exitCode = 1;
}
