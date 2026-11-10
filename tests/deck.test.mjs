import test from 'node:test';
import assert from 'node:assert/strict';
import { DECK, common } from '../js/deck.js';
import { SYMBOLS } from '../js/emoji.js';
import { cardLayout } from '../js/layout.js';

test('deck has 57 cards of 8 unique symbols', () => {
  assert.equal(DECK.length, 57);
  for (const card of DECK) {
    assert.equal(card.length, 8);
    assert.equal(new Set(card).size, 8);
    card.forEach((s) => assert.ok(s >= 0 && s < 57));
  }
});

test('every pair of cards shares exactly one symbol', () => {
  for (let a = 0; a < DECK.length; a++) {
    for (let b = a + 1; b < DECK.length; b++) {
      const shared = DECK[a].filter((s) => DECK[b].includes(s));
      assert.equal(shared.length, 1, `cards ${a} & ${b}`);
      assert.equal(common(a, b), shared[0]);
    }
  }
});

test('57 distinct emoji', () => {
  assert.equal(SYMBOLS.length, 57);
  assert.equal(new Set(SYMBOLS).size, 57);
});

test('card layouts stay inside the card and are deterministic', () => {
  for (let id = 0; id < DECK.length; id++) {
    const l = cardLayout(id);
    assert.deepEqual(l.map((s) => s.sym).sort((x, y) => x - y), [...DECK[id]].sort((x, y) => x - y));
    for (const s of l) {
      const dist = Math.hypot(s.x - 50, s.y - 50) + s.s / 2;
      assert.ok(dist <= 46, `card ${id} symbol overflows`);
    }
  }
});