// MIDNIGHT VAULT — a tiny seeded random number generator.
// One clear job: deterministic randomness. Every heist layout, patrol jitter and
// screenshot scene is reproducible from a seed, so the game and its screenshots
// never depend on Math.random.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

export function shuffle(rng, items) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Deterministic jitter for patrol waypoints: same seed, same wobble every run.
export function jitterPoint(rng, x, y, amount) {
  return { x: x + range(rng, -amount, amount), y: y + range(rng, -amount, amount) };
}
