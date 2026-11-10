// Runs a game: the rules, phase timers and bots. Used for solo play and by the online host.
import { createGame, applyTap, toView, setPhase, deal, canAct } from './engine.js';
import { botMove, botDelay } from './ai.js';

export const COUNTDOWN_MS = 3000;
export const ROUND_PAUSE_MS = 2600;

export class HostSession {
  constructor({ mode, players, clock = () => Date.now(), onView }) {
    this.clock = clock;
    this.onView = onView;
    this.timers = new Map();
    this.phaseTimer = null;
    this.dead = false;
    this.state = createGame({ mode, players, seed: Math.floor(Math.random() * 2 ** 31) });
  }

  start() { this.countdown(); }

  countdown() {
    setPhase(this.state, 'countdown', this.clock() + COUNTDOWN_MS);
    this.emit();
    this.phaseTimer = setTimeout(() => {
      if (this.dead) return;
      setPhase(this.state, 'play');
      this.emit();
      this.scheduleAllBots();
    }, COUNTDOWN_MS);
  }

  tap(seat, move) {
    if (this.dead) return;
    const now = this.clock();
    const ev = applyTap(this.state, seat, move, now);
    if (!ev) return;
    this.emit();
    if (ev.type === 'match') {
      if (this.state.phase === 'play') this.scheduleAllBots();
      else {
        this.clearBots();
        if (this.state.phase === 'roundEnd') {
          this.phaseTimer = setTimeout(() => {
            if (this.dead) return;
            deal(this.state);
            this.countdown();
          }, ROUND_PAUSE_MS);
        }
      }
    } else if (this.state.players[seat].bot) {
      this.scheduleBot(seat, this.state.players[seat].frozenUntil - now);
    }
  }

  scheduleAllBots() {
    this.clearBots();
    this.state.players.forEach((p, s) => { if (p.bot) this.scheduleBot(s); });
  }

  scheduleBot(seat, extra = 0) {
    clearTimeout(this.timers.get(seat));
    const p = this.state.players[seat];
    const t = setTimeout(() => {
      const st = this.state;
      if (this.dead || st.phase !== 'play' || !p.bot) return;
      const now = this.clock();
      if (!canAct(st, seat, now)) {
        if (p.frozenUntil > now) this.scheduleBot(seat, p.frozenUntil - now);
        return;
      }
      const m = botMove(st, seat);
      if (m) this.tap(seat, { ...m, turn: st.turn });
    }, Math.max(0, extra) + botDelay(p.bot, this.state.mode));
    this.timers.set(seat, t);
  }

  clearBots() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  /** A remote player left mid-game: a bot takes over the seat. */
  convertToBot(seat, level = 'medium') {
    const p = this.state.players[seat];
    if (!p || p.bot) return;
    p.bot = level;
    p.uid = null;
    p.name = `${p.name} 🤖`;
    this.state.version++;
    this.emit();
    if (this.state.phase === 'play') this.scheduleBot(seat);
  }

  emit() { if (!this.dead) this.onView?.(toView(this.state)); }

  destroy() {
    this.dead = true;
    this.clearBots();
    clearTimeout(this.phaseTimer);
  }
}