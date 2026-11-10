// Pure game rules for all four mini games. Shared by solo play, the online host and tests.
import { DECK, hasSymbol } from './deck.js';
import { rng, shuffle } from './util.js';

export const FREEZE_MS = 1500;
export const POTATO_ROUNDS = 5;
export const MODE_IDS = ['tower', 'well', 'potato', 'poison'];
const top = (pile) => (pile.length ? pile[pile.length - 1] : -1);

export function createGame({ mode, players, seed = Date.now() }) {
  if (!MODE_IDS.includes(mode)) throw new Error(`Unknown mode: ${mode}`);
  const state = {
    mode, seed: seed >>> 0, phase: 'ready', round: 0,
    rounds: mode === 'potato' ? POTATO_ROUNDS : 1,
    turn: 0, version: 0, startAt: 0, event: null, center: [],
    players: players.map((p) => ({
      name: p.name, avatar: p.avatar, color: p.color, bot: p.bot || null, uid: p.uid || null,
      pile: [], penalty: 0, frozenUntil: 0, out: false,
    })),
  };
  deal(state);
  return state;
}

export function deal(state) {
  state.round++;
  const cards = shuffle(DECK.map((_, i) => i), rng(state.seed + state.round * 7919));
  const n = state.players.length;
  state.center = [];
  state.players.forEach((p) => { p.pile = []; p.out = false; p.frozenUntil = 0; });
  if (state.mode === 'well') {
    state.center = [cards.pop()];
    const each = Math.floor(cards.length / n);
    state.players.forEach((p) => { p.pile = cards.splice(0, each); });
  } else {
    state.players.forEach((p) => p.pile.push(cards.pop()));
    if (state.mode !== 'potato') state.center = cards;
  }
  state.turn++;
  state.version++;
}

export function setPhase(state, phase, startAt = 0) {
  state.phase = phase;
  state.startAt = startAt;
  state.version++;
}

export function canAct(state, seat, now) {
  const p = state.players[seat];
  if (state.phase !== 'play' || !p || p.frozenUntil > now) return false;
  if ((state.mode === 'potato' || state.mode === 'well') && p.pile.length === 0) return false;
  return true;
}

export function isValid(state, seat, move) {
  const me = state.players[seat];
  const { symbol, target } = move;
  const c = top(state.center);
  const t = target != null ? state.players[target] : null;
  switch (state.mode) {
    case 'tower':
    case 'well':
      return c >= 0 && me.pile.length > 0 && hasSymbol(c, symbol) && hasSymbol(top(me.pile), symbol);
    case 'potato':
      return !!t && target !== seat && me.pile.length > 0 && t.pile.length > 0
        && hasSymbol(top(me.pile), symbol) && hasSymbol(top(t.pile), symbol);
    case 'poison':
      return !!t && target !== seat && c >= 0 && t.pile.length > 0
        && hasSymbol(c, symbol) && hasSymbol(top(t.pile), symbol);
    default:
      return false;
  }
}

/** Apply a tap. Returns the event, or null if ignored. Mutates state. */
export function applyTap(state, seat, move, now) {
  if (!canAct(state, seat, now)) return null;
  if (!isValid(state, seat, move)) {
    // A wrong tap on a card that has already changed isn't the player's fault.
    if (move.turn != null && move.turn !== state.turn) return null;
    state.players[seat].frozenUntil = now + FREEZE_MS;
    return bump(state, { type: 'miss', seat });
  }
  const me = state.players[seat];
  const ev = { type: 'match', seat, symbol: move.symbol, target: move.target ?? null };
  switch (state.mode) {
    case 'tower': me.pile.push(state.center.pop()); break;
    case 'well': state.center.push(me.pile.pop()); break;
    case 'potato': {
      const t = state.players[move.target];
      t.pile.push(...me.pile);
      me.pile = [];
      me.out = true;
      break;
    }
    case 'poison': state.players[move.target].pile.push(state.center.pop()); break;
  }
  state.turn++;
  checkEnd(state, ev);
  return bump(state, ev);
}

function bump(state, ev) {
  state.version++;
  ev.v = state.version;
  state.event = ev;
  return ev;
}

function checkEnd(state, ev) {
  const P = state.players;
  if (state.mode === 'tower' || state.mode === 'poison') {
    if (!state.center.length) state.phase = 'over';
  } else if (state.mode === 'well') {
    if (P[ev.seat].pile.length === 0) state.phase = 'over';
  } else if (state.mode === 'potato') {
    const holders = P.filter((p) => p.pile.length > 0);
    if (holders.length === 1) {
      const loser = holders[0];
      loser.penalty += loser.pile.length;
      ev.loser = P.indexOf(loser);
      ev.cards = loser.pile.length;
      state.phase = state.round >= state.rounds ? 'over' : 'roundEnd';
    }
  }
}

export function rankings(state) {
  const key = {
    tower: (p) => -p.cards, well: (p) => p.cards, poison: (p) => p.cards, potato: (p) => p.penalty,
  }[state.mode];
  const list = state.players.map((p, seat) => ({
    seat, name: p.name, avatar: p.avatar, color: p.color, bot: p.bot,
    cards: p.pile.length, penalty: p.penalty,
  }));
  list.sort((a, b) => key(a) - key(b) || a.seat - b.seat);
  let place = 0;
  list.forEach((p, i) => {
    if (i === 0 || key(p) !== key(list[i - 1])) place = i + 1;
    p.place = place;
  });
  return list;
}

/** Public snapshot sent to screens and over the network (top cards only). */
export function toView(s) {
  const t = (pile) => (pile.length ? pile[pile.length - 1] : null);
  return {
    mode: s.mode, phase: s.phase, round: s.round, rounds: s.rounds, turn: s.turn,
    version: s.version, startAt: s.startAt, event: s.event,
    center: s.mode === 'potato' ? null : { top: t(s.center), count: s.center.length },
    players: s.players.map((p) => ({
      name: p.name, avatar: p.avatar, color: p.color, bot: p.bot, top: t(p.pile),
      count: p.pile.length, penalty: p.penalty, frozenUntil: p.frozenUntil, out: p.out,
    })),
    results: s.phase === 'over' ? rankings(s) : null,
  };
}