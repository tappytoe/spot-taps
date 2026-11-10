// Tiny WebAudio sound effects, no audio files.
let ctx = null;
let muted = localStorage.getItem('spotclash.muted') === '1';

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.15, delay = 0) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sound = {
  click: () => tone(660, 0.05, 'triangle', 0.08),
  good: () => { tone(660, 0.1, 'triangle'); tone(990, 0.15, 'triangle', 0.15, 0.08); },
  tick: () => tone(440, 0.06, 'sine', 0.06),
  bad: () => tone(140, 0.25, 'sawtooth', 0.12),
  count: () => tone(520, 0.1, 'square', 0.06),
  go: () => tone(880, 0.22, 'square', 0.08),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.15, i * 0.12)),
  end: () => [392, 330, 262].forEach((f, i) => tone(f, 0.2, 'triangle', 0.12, i * 0.12)),
  get muted() { return muted; },
  toggle() {
    muted = !muted;
    localStorage.setItem('spotclash.muted', muted ? '1' : '0');
    return muted;
  },
};