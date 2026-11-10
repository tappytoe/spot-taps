// Bot opponents: reaction time and mistake rate depend on level.
import { common } from './deck.js';
import { pick } from './util.js';
import { SYMBOLS } from './emoji.js';

export const BOT_SPEED = { easy: [3800, 6500], medium: [2400, 4300], hard: [1500, 2700] };
export const BOT_ERROR = { easy: 0.15, medium: 0.07, hard: 0.02 };

export function botDelay(level, r = Math.random) {
  const [a, b] = BOT_SPEED[level] || BOT_SPEED.medium;
  return a + r() * (b - a);
}

const top = (pile) => pile[pile.length - 1];

export function botMove(state, seat, r = Math.random) {
  const P = state.players;
  const me = P[seat];
  const level = me.bot || 'medium';
  const others = P.map((_, i) => i).filter((i) => i !== seat);
  let move = null;

  switch (state.mode) {
    case 'tower':
    case 'well':
      if (!state.center.length || !me.pile.length) return null;
      move = { symbol: common(top(state.center), top(me.pile)) };
      break;
    case 'potato': {
      const live = others.filter((i) => P[i].pile.length > 0);
      if (!me.pile.length || !live.length) return null;
      const target = pick(live, r);
      move = { symbol: common(top(me.pile), top(P[target].pile)), target };
      break;
    }
    case 'poison': {
      if (!state.center.length) return null;
      let targets = others;
      if (level === 'hard') {
        const min = Math.min(...others.map((i) => P[i].pile.length));
        targets = others.filter((i) => P[i].pile.length === min); // gift the leader
      }
      const target = pick(targets, r);
      move = { symbol: common(top(state.center), top(P[target].pile)), target };
      break;
    }
  }
  if (move && r() < (BOT_ERROR[level] ?? 0.07)) {
    move = { ...move, symbol: (move.symbol + 1 + Math.floor(r() * (SYMBOLS.length - 1))) % SYMBOLS.length };
  }
  return move;
}