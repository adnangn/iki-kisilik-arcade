// Packaged modules share a content-based release query; local previews have
// none. Keep card JSON paths unchanged while refreshing images on each release.
const release = new URL(import.meta.url).searchParams.get('v');

export function assetUrl(filename) {
  const [path, fragment] = filename.split('#', 2);
  const url = './' + path;
  return url + (release ? `${path.includes('?') ? '&' : '?'}v=${release}` : '') + (fragment ? '#' + fragment : '');
}
