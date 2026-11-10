import { SYMBOLS, SYMBOL_HUES } from './emoji.js';
import { cardLayout } from './layout.js';

export function cardHTML(id, { owner = '', size = 'big', color = '#cbd5e1', hidden = false } = {}) {
  if (hidden) return `<div class="card ${size} back" style="--seat:${color}"><span>🔍</span></div>`;
  const syms = cardLayout(id).map((s) =>
    `<div class="sym" data-sym="${s.sym}" style="--x:${s.x}%;--y:${s.y}%;--s:${s.s};--r:${s.rot}deg;--h:${SYMBOL_HUES[s.sym]}"><span>${SYMBOLS[s.sym]}</span></div>`,
  ).join('');
  return `<div class="card ${size}" data-owner="${owner}" data-id="${id}" style="--seat:${color}">${syms}</div>`;
}