import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyTap, setPhase, deal, canAct, FREEZE_MS, POTATO_ROUNDS } from '../js/engine.js';
import { botMove } from '../js/ai.js';
import { DECK } from '../js/deck.js';

const players = (bot = 'hard') => [0, 1, 2, 3].map((i) => ({ name: `P${i}`, avatar: '🙂', color: '#000', bot }));
const steady = () => 0.5; // no bot mistakes, deterministic picks

function playOut(mode, seed = 7) {
  const s = createGame({ mode, players: players(), seed });
  setPhase(s, 'play');
  let now = 0;
  for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
    if (s.phase === 'roundEnd') { deal(s); setPhase(s, 'play'); continue; }
    const seat = i % 4;
    now += 10;
    if (!canAct(s, seat, now)) continue;
    const m = botMove(s, seat, steady);
    if (!m) continue;
    assert.equal(applyTap(s, seat, { ...m, turn: s.turn }, now)?.type, 'match');
  }
  assert.equal(s.phase, 'over', `${mode} should finish`);
  return s;
}

const total = (s) => s.players.reduce((n, p) => n + p.pile.length, 0) + s.center.length;

test('tower: all cards end in player piles', () => {
  const s = playOut('tower');
  assert.equal(s.center.length, 0);
  assert.equal(total(s), 57);
});

test('well: the winner empties their pile', () => {
  const s = playOut('well');
  assert.ok(s.players.some((p) => p.pile.length === 0));
  assert.equal(total(s), 57);
});

test('poison: all gifts handed out', () => {
  const s = playOut('poison');
  assert.equal(s.center.length, 0);
  assert.equal(total(s), 57);
});

test('hot potato: 5 rounds, 4 penalty cards per round', () => {
  const s = playOut('potato');
  assert.equal(s.round, POTATO_ROUNDS);
  assert.equal(s.players.reduce((n, p) => n + p.penalty, 0), 4 * POTATO_ROUNDS);
});

test('wrong tap freezes the player', () => {
  const s = createGame({ mode: 'tower', players: players(), seed: 3 });
  setPhase(s, 'play');
  const center = s.center[s.center.length - 1];
  const wrong = [...Array(57).keys()].find((x) => !DECK[center].includes(x));
  const ev = applyTap(s, 0, { symbol: wrong, turn: s.turn }, 1000);
  assert.equal(ev.type, 'miss');
  assert.equal(s.players[0].frozenUntil, 1000 + FREEZE_MS);
  assert.equal(canAct(s, 0, 1100), false);
  assert.equal(canAct(s, 0, 1000 + FREEZE_MS + 1), true);
});

test('stale wrong tap is ignored instead of freezing', () => {
  const s = createGame({ mode: 'tower', players: players(), seed: 3 });
  setPhase(s, 'play');
  const ev = applyTap(s, 0, { symbol: -1, turn: s.turn - 1 }, 1000);
  assert.equal(ev, null);
  assert.equal(s.players[0].frozenUntil, 0);
});

test('bots always produce valid moves when not erring', () => {
  for (const mode of ['tower', 'well', 'potato', 'poison']) {
    const s = createGame({ mode, players: players(), seed: 11 });
    setPhase(s, 'play');
    const m = botMove(s, 1, steady);
    assert.equal(applyTap(s, 1, { ...m, turn: s.turn }, 0).type, 'match', mode);
  }
});