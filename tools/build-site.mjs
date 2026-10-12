import assert from 'node:assert/strict';
import { copyFile, lstat, mkdir, realpath, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PROJECT_ROOT, preflight, listFiles } from './preflight.mjs';
import { versionLocalReferences } from './version-assets.mjs';

try {
  assert.equal(process.argv.length, 2, 'Kullanım: node tools/build-site.mjs');
  const checked = await preflight({ quiet: true });
  const root = await realpath(PROJECT_ROOT);
  const digest = createHash('sha256');
  for (const file of checked.files) {
    digest.update(file + '\0');
    digest.update(await readFile(path.join(root, file)));
    digest.update('\0');
  }
  const release = digest.digest('hex').slice(0, 12);
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
    if (/\.(?:html|css|js)$/.test(file)) {
      await writeFile(target, versionLocalReferences(await readFile(path.join(root, file), 'utf8'), release), 'utf8');
    } else await copyFile(path.join(root, file), target);
  }
  assert.deepEqual(await listFiles(output), checked.files, 'Paket yalnız denetlenmiş çalışma dosyalarını içermeli.');
  console.log(`Statik paket hazır: artifacts/site (${checked.files.length} dosya, ${checked.cardCount} kart, ${checked.imageCount} kart görseli, sürüm ${release}).`);
} catch (error) {
  console.error(`Paketleme başarısız: ${error.message}`);
  process.exitCode = 1;
}
