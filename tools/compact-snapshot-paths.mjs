/** Adjacent literal snapshot children name the same node as their joined path. */
export function compactSnapshotPathExpression(source) {
  const literal = /^\.child\('([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)'\)/;
  let output = '', index = 0;
  while (index < source.length) {
    const character = source[index];
    // Comparisons may contain text resembling code. Regexes and quoted values
    // are opaque; only actual literal child calls outside them can be joined.
    if (character === "'" || character === '"' || (character === '/' && source.slice(0, index).endsWith('.matches('))) {
      const quote = character, start = index++;
      while (index < source.length) {
        if (source[index] === '\\') { index += 2; continue; }
        if (source[index++] === quote) break;
      }
      output += source.slice(start, index);
      continue;
    }
    const first = source.slice(index).match(literal);
    if (first) {
      let path = first[1], end = index + first[0].length, next;
      while ((next = source.slice(end).match(literal))) {
        path += '/' + next[1]; end += next[0].length;
      }
      output += `.child('${path}')`; index = end;
    } else output += source[index++];
  }
  return output;
}

export function compactSnapshotPaths(document) {
  for (const [key, value] of Object.entries(document)) {
    if (['.read', '.write', '.validate'].includes(key) && typeof value === 'string') document[key] = compactSnapshotPathExpression(value);
    else if (value && typeof value === 'object') compactSnapshotPaths(value);
  }
  return document;
}
