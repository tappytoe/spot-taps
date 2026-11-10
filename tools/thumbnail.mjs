// Renders a 1200×630 thumbnail / social preview with real game cards.
// Usage: node tools/thumbnail.mjs [out.png]   (default: assets/thumbnail.png)
import { readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from 'playwright';
import { cardHTML } from '../js/cards-ui.js';
import { MODES } from '../js/emoji.js';

const out = process.argv[2] || 'assets/thumbnail.png';
const css = await readFile('css/style.css', 'utf8');

// [card id, rotation, size px, left, top, ring color]
const CARDS = [
  [3, -12, 300, 690, 50, '#ff5a5f'],
  [40, 16, 210, 985, 30, '#22c55e'],
  [21, 9, 270, 895, 320, '#2f9bff'],
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: none; }
.thumb { position: relative; width: 1200px; height: 630px;
  background: radial-gradient(circle at 15% 10%, #fff 0, transparent 45%), linear-gradient(135deg, #fff6e9, #ffe3f1 55%, #e8e4ff); }
.title { position: absolute; left: 70px; top: 120px; width: 600px; }
.title h1 { font-size: 112px; margin: 0; letter-spacing: -3px; line-height: 1; }
.title h1 span { color: var(--pink); }
.title p { font-size: 32px; font-weight: 800; color: var(--muted); margin: 18px 0 0; }
.icons { display: flex; gap: 14px; margin-top: 30px; }
.icons span { width: 76px; height: 76px; border-radius: 50%; background: #fff; display: grid; place-items: center;
  font-size: 40px; box-shadow: 0 6px 0 var(--c); }
.brand { position: absolute; left: 70px; bottom: 50px; font-size: 24px; font-weight: 900; color: var(--violet);
  letter-spacing: .14em; text-transform: uppercase; }
.tc { position: absolute; }
</style></head><body><div class="thumb">
  <div class="title">
    <h1>Spot<span>Taps</span></h1>
    <p>Find the match. Tap it first! ⚡</p>
    <div class="icons">${Object.values(MODES).map((m) => `<span style="--c:${m.color}">${m.icon}</span>`).join('')}</div>
  </div>
  <div class="brand">by tappytoe games</div>
  ${CARDS.map(([id, rot, size, x, y, color]) =>
    `<div class="tc" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg);--big:${size}px">${cardHTML(id, { color })}</div>`).join('')}
</div></body></html>`;

await mkdir(dirname(out), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
console.log(`Thumbnail written to ${out}`);