import assert from 'node:assert/strict';

// Only relative runtime references are versioned. Card JSON identities and
// Firebase's pinned CDN addresses are retained verbatim.
export function versionLocalReferences(source, release) {
  assert.match(release, /^[a-f0-9]{12}$/);
  return source.replace(/(^|[\s"'`(=])((?:\.{1,2}\/)[^\s"'`<>?#]*?\.(?:js|css|json|svg|ttf|woff2))(?=[?\s"'`<>#);])(?:\?([^\s"'`<>#]*))?/g,
    (match, prefix, filename, query) => {
      const params = new URLSearchParams(query || '');
      params.set('v', release);
      return prefix + filename + '?' + params.toString();
    });
}
