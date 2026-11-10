// Exports all 57 cards + card back as SVG, plus a printable gallery, into assets/cards/.
import { mkdir, writeFile } from 'node:fs/promises';
import { DECK } from '../js/deck.js';
import { cardLayout } from '../js/layout.js';
import { SYMBOLS, SYMBOL_HUES } from '../js/emoji.js';

const DIR = 'assets/cards';
const S = 600;
const FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const pad = (i) => String(i).padStart(2, '0');

function cardSVG(id) {
  const items = cardLayout(id).map((s) => {
    const cx = (s.x / 100) * S, cy = (s.y / 100) * S, r = (s.s / 200) * S;
    return `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${s.rot})">`
      + `<circle r="${r.toFixed(1)}" fill="hsl(${SYMBOL_HUES[s.sym]},85%,90%)"/>`
      + `<text font-size="${(r * 1.44).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family='${FONT}'>${SYMBOLS[s.sym]}</text></g>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 8}" fill="#fff" stroke="#6c4cff" stroke-width="12"/>${items}</svg>\n`;
}

const back = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4f8b"/><stop offset="1" stop-color="#6c4cff"/></linearGradient></defs>
<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 8}" fill="url(#g)" stroke="#fff" stroke-width="12"/>
<text x="${S / 2}" y="${S / 2 - 30}" font-size="200" text-anchor="middle" dominant-baseline="central" font-family='${FONT}'>🔍</text>
<text x="${S / 2}" y="${S / 2 + 140}" font-size="64" font-weight="900" fill="#fff" text-anchor="middle" font-family="system-ui,sans-serif">Spot Taps</text>
</svg>\n`;

const gallery = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Spot Taps — printable deck</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;margin:16px}h1{text-align:center}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(6.5cm,1fr));gap:4mm}
img{width:100%;max-width:7cm;aspect-ratio:1;break-inside:avoid}
@media print{h1,p{display:none}.grid{grid-template-columns:repeat(3,6.5cm)}}</style></head>
<body><h1>🔍 Spot Taps — printable deck</h1><p style="text-align:center">57 cards by tappytoe games. Print, cut out, and play the same four mini games at the table.</p>
<div class="grid">${DECK.map((_, i) => `<img src="card-${pad(i)}.svg" alt="Card ${i + 1}">`).join('')}</div></body></html>\n`;

await mkdir(DIR, { recursive: true });
await Promise.all(DECK.map((_, id) => writeFile(`${DIR}/card-${pad(id)}.svg`, cardSVG(id))));
await writeFile(`${DIR}/back.svg`, back);
await writeFile(`${DIR}/index.html`, gallery);
console.log(`Wrote ${DECK.length} cards + back + gallery to ${DIR}/`);