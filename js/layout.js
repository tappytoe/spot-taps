// Deterministic symbol placement per card, so every device draws the same card.
import { DECK } from './deck.js';
import { rng, shuffle } from './util.js';

const cache = new Map();
const r2 = (n) => Math.round(n * 100) / 100;

export function cardLayout(id) {
  if (cache.has(id)) return cache.get(id);
  const r = rng(id * 9973 + 17);
  const syms = shuffle([...DECK[id]], r);
  const ring = syms.length - 1;
  const start = r() * Math.PI * 2;
  const out = syms.map((sym, i) => {
    if (i === 0) return { sym, x: 50, y: 50, s: r2(25 + r() * 4), rot: r2(r() * 360 - 180) };
    const a = start + (i - 1) * ((2 * Math.PI) / ring);
    return {
      sym,
      x: r2(50 + 31 * Math.cos(a)),
      y: r2(50 + 31 * Math.sin(a)),
      s: r2(20 + r() * 6),
      rot: r2(r() * 360 - 180),
    };
  });
  cache.set(id, out);
  return out;
}