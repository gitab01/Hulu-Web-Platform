'use strict';

/**
 * Tiny in-process TTL cache for read-heavy, repeatable browse rows. Browse traffic
 * tolerates a short staleness window, and this keeps a hot row off every request
 * from re-hitting Mongo. A Redis/CDN layer would slot in identically.
 */
const store = new Map();

function get(key) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

function wrap(key, ttlMs, producer) {
  return async () => {
    const cached = get(key);
    if (cached !== undefined) return cached;
    const value = await producer();
    store.set(key, { value, expires: Date.now() + ttlMs });
    return value;
  };
}

/** Production corrects a stale row by letting the TTL lapse; a test that rewrites
    the catalogue and re-reads the same row cannot wait for that. */
function clear(key) {
  if (key === undefined) store.clear();
  else store.delete(key);
}

module.exports = { get, wrap, clear };
