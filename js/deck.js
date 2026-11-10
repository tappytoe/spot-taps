// Finite projective plane of order 7: 57 cards × 8 symbols, any two cards share exactly one symbol.
export const ORDER = 7;

export function buildDeck(n = ORDER) {
  const inf = (k) => n * n + k;           // "points at infinity", one per slope (+ vertical)
  const cards = [];
  for (let m = 0; m < n; m++) {
    for (let c = 0; c < n; c++) {
      const card = [];
      for (let x = 0; x < n; x++) card.push(x * n + ((m * x + c) % n));
      card.push(inf(m));
      cards.push(card);
    }
  }
  for (let c = 0; c < n; c++) {
    const card = [];
    for (let y = 0; y < n; y++) card.push(c * n + y);
    card.push(inf(n));
    cards.push(card);
  }
  const last = [];
  for (let k = 0; k <= n; k++) last.push(inf(k));
  cards.push(last);
  return cards;
}

export const DECK = buildDeck();

export const hasSymbol = (cardId, sym) => cardId >= 0 && DECK[cardId].includes(sym);

export function common(a, b) {
  const other = DECK[b];
  return DECK[a].find((s) => other.includes(s)) ?? -1;
}