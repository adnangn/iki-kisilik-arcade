/** Recognize only exact string allowlists emitted by the local rules builder. */
export function ruleLiteralOptions(source) {
  const options = new Set();
  for (const match of source.matchAll(/\bnewData\.val\(\)\s*===\s*'([A-Za-z0-9-]+)'/g)) options.add(match[1]);
  for (const match of source.matchAll(/\bnewData\.val\(\)\.matches\(\/\^\(([A-Za-z0-9|-]+)\)\$\/\)/g)) {
    const values = match[1].split('|');
    if (values.every(value => /^[A-Za-z0-9-]+$/.test(value))) values.forEach(value => options.add(value));
  }
  return options;
}
