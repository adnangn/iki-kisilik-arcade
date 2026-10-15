/** Missing APIs on older Safari releases. Native implementations stay intact. */
export function installCompatibility(target = globalThis) {
  const define = (owner, name, value) => Object.defineProperty(owner, name, {
    value, configurable: true, writable: true, enumerable: false,
  });

  if (typeof target.Object.hasOwn !== 'function') {
    define(target.Object, 'hasOwn', function hasOwn(object, key) {
      if (object == null) throw new TypeError('Cannot inspect null or undefined.');
      return Object.prototype.hasOwnProperty.call(object, key);
    });
  }

  if (typeof target.Array.prototype.at !== 'function') {
    define(target.Array.prototype, 'at', function at(index) {
      if (this == null) throw new TypeError('Cannot read null or undefined.');
      const list = Object(this);
      // Unary + uses ToNumber, including the native API's BigInt rejection.
      const length = Math.min(Math.max(Math.floor(+list.length || 0), 0), 9007199254740991);
      const relative = Math.trunc(+index || 0);
      const position = relative < 0 ? length + relative : relative;
      return position < 0 || position >= length ? undefined : list[position];
    });
  }

  if (typeof target.structuredClone !== 'function') {
    const cannotClone = () => {
      if (typeof target.DOMException === 'function') return new target.DOMException('This value cannot be cloned.', 'DataCloneError');
      const error = new Error('This value cannot be cloned.'); error.name = 'DataCloneError'; return error;
    };
    define(target, 'structuredClone', function structuredCloneFallback(value, options) {
      // Game state never transfers ownership. Fail explicitly if that capability
      // is requested rather than pretending the source buffer was detached.
      if (options?.transfer != null && Array.from(options.transfer).length) throw cannotClone();
      const seen = new Map();
      const clone = source => {
        if (typeof source === 'symbol' || typeof source === 'function') throw cannotClone();
        if (source === null || typeof source !== 'object') return source;
        if (seen.has(source)) return seen.get(source);

        const tag = Object.prototype.toString.call(source);
        let result;
        if (Array.isArray(source)) result = new Array(source.length);
        else if (tag === '[object Object]') result = {};
        else if (tag === '[object Date]') {
          result = new Date(Date.prototype.getTime.call(source)); seen.set(source, result); return result;
        } else if (tag === '[object RegExp]') {
          result = new RegExp(source.source, source.flags); seen.set(source, result); return result;
        } else if (tag === '[object Map]') {
          result = new Map(); seen.set(source, result);
          Map.prototype.forEach.call(source, (entry, key) => result.set(clone(key), clone(entry))); return result;
        } else if (tag === '[object Set]') {
          result = new Set(); seen.set(source, result);
          Set.prototype.forEach.call(source, entry => result.add(clone(entry))); return result;
        } else if (tag === '[object ArrayBuffer]') {
          result = ArrayBuffer.prototype.slice.call(source, 0); seen.set(source, result); return result;
        } else if (ArrayBuffer.isView(source)) {
          const buffer = clone(source.buffer);
          if (tag === '[object DataView]') result = new DataView(buffer, source.byteOffset, source.byteLength);
          else {
            const Type = globalThis[tag.slice(8, -1)];
            if (typeof Type !== 'function') throw cannotClone();
            result = new Type(buffer, source.byteOffset, source.length);
          }
          seen.set(source, result); return result;
        } else throw cannotClone();

        seen.set(source, result);
        // Define own data properties so a card with a "__proto__" field cannot
        // change the clone's prototype. Sparse arrays and undefined stay intact.
        for (const key of Object.keys(source)) Object.defineProperty(result, key, {
          value: clone(source[key]), enumerable: true, writable: true, configurable: true,
        });
        return result;
      };
      return clone(value);
    });
  }
  return target;
}

installCompatibility();
