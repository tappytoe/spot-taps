import { SYMBOLS, AVATARS, SEAT_COLORS, BOTS, MODES } from './emoji.js';
import { DECK } from './deck.js';
import { HostSession } from './session.js';
import { cardHTML } from './cards-ui.js';
import { sound } from './sound.js';
import { onlineReady, hostRoom, joinRoom } from './net.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LEVELS = ['easy', 'medium', 'hard'];
const PROFILE_KEY = 'spotapit.profile';
const BOTS_KEY = 'spotapit.bots';

const profile = loadProfile();
let soloLevels = loadLevels();
let ctl = null;    // active game: { seat, now(), tap(move), quit(), again(), canAgain }
let view = null;
let online = null; // online room context
let lastEventV = 0, lastTops = {}, lastCount = 0, shakeMe = false;
let overlayTimer = null, refreshTimer = null, resultsTimer = null, feedTimer = null;

/* ---------- profile & settings ---------- */
function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (p && AVATARS.includes(p.avatar)) return { name: p.name || '', avatar: p.avatar };
  } catch { /* ignore */ }
  return { name: '', avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)] };
}
function loadLevels() {
  try {
    const l = JSON.parse(localStorage.getItem(BOTS_KEY));
    if (Array.isArray(l) && l.length === 3 && l.every((x) => LEVELS.includes(x))) return l;
  } catch { /* ignore */ }
  return ['easy', 'medium', 'hard'];
}
const saveProfile = () => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
const saveLevels = () => localStorage.setItem(BOTS_KEY, JSON.stringify(soloLevels));
const myName = () => profile.name.trim().slice(0, 12) || 'Player';
const me = () => ({ name: myName(), avatar: profile.avatar });

/** Give duplicate bots numbered names: "Hard Bot 1", "Hard Bot 2". */
function nameBots(seats) {
  const total = {}, seen = {};
  seats.forEach((s) => { if (s.bot) total[s.bot] = (total[s.bot] || 0) + 1; });
  return seats.map((s) => {
    if (!s.bot) return s;
    seen[s.bot] = (seen[s.bot] || 0) + 1;
    return { ...s, name: total[s.bot] > 1 ? `${BOTS[s.bot].name} ${seen[s.bot]}` : BOTS[s.bot].name };
  });
}

/* ---------- helpers ---------- */
function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}

function toast(msg, color = '#6c4cff', ms = 1800) {
  // During a game, messages go to the hint bar so they never cover a card.
  if ($('#game').classList.contains('active')) return feed(msg, color);
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.setProperty('--c', color);
  el.textContent = msg;
  box.append(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), ms);
}

function feed(msg, color = '#6c4cff', ms = 1400) {
  const h = $('#hint');
  h.textContent = msg;
  h.style.setProperty('--c', color);
  h.classList.add('feed');
  clearTimeout(feedTimer);
  feedTimer = setTimeout(() => {
    h.classList.remove('feed');
    h.textContent = view && ctl ? hintText(view, ctl.now()) : '';
  }, ms);
}

function burst(emoji) {
  const el = document.createElement('div');
  el.className = 'burst';
  el.textContent = emoji;
  $('#game').append(el);
  setTimeout(() => el.remove(), 800);
}

async function withBusy(fn) {
  const btns = $$('.btn');
  btns.forEach((b) => { b.disabled = true; });
  toast('Connecting… 🛰️', '#2f9bff', 1500);
  try { await fn(); } catch (e) { toast(`⚠️ ${e.message || e}`, '#ff5a5f', 3500); } finally {
    btns.forEach((b) => { b.disabled = false; });
  }
}

function modeTiles(el, onPick, selected) {
  el.innerHTML = Object.entries(MODES).map(([k, m]) =>
    `<button class="mode ${k === selected ? 'sel' : ''}" data-mode="${k}" style="--c:${m.color}" ${onPick ? '' : 'disabled'}>
      <span class="mi">${m.icon}</span><b>${m.name}</b><small>${m.goal}</small></button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('[data-mode]');
    if (b && onPick) { sound.click(); onPick(b.dataset.mode); }
  };
}

/* ---------- solo ---------- */
function renderSoloBots() {
  $('#soloBots').innerHTML = soloLevels.map((lv, i) =>
    `<div class="bot-row" style="--seat:${SEAT_COLORS[i + 1]}">
      <span class="av">${BOTS[lv].avatar}</span>
      <div class="seg">${LEVELS.map((l) =>
        `<button data-bot="${i}" data-lv="${l}" class="${l === lv ? 'sel' : ''}">${BOTS[l].label}</button>`).join('')}</div>
    </div>`).join('');
}

function startSolo(mode) {
  stopGame();
  const seats = nameBots([
    { name: myName(), avatar: profile.avatar, color: SEAT_COLORS[0] },
    ...soloLevels.map((lv, i) => ({ avatar: BOTS[lv].avatar, color: SEAT_COLORS[i + 1], bot: lv })),
  ]);
  const host = new HostSession({ mode, players: seats, onView });
  ctl = { seat: 0, now: () => Date.now(), tap: (m) => host.tap(0, m), quit: () => host.destroy(), again: () => startSolo(mode), canAgain: true };
  enterGame(mode);
  host.start();
}

/* ---------- game lifecycle ---------- */
function enterGame(mode) {
  lastEventV = 0; lastTops = {}; lastCount = 0; shakeMe = false;
  clearTimeout(resultsTimer);
  clearTimeout(feedTimer);
  $('#hint').classList.remove('feed');
  $('#game').className = `screen mode-${mode}`;
  show('game');
}

function stopTimers() {
  clearInterval(overlayTimer); overlayTimer = null;
  clearTimeout(refreshTimer); clearTimeout(resultsTimer); clearTimeout(feedTimer);
}

function stopGame() {
  stopTimers();
  const c = ctl;
  ctl = null; view = null;
  c?.quit?.();
}

function leaveGame() {
  stopGame();
  leaveOnline();
  show('home');
}

function onView(v) {
  if (!ctl) return;
  const prev = view;
  view = v;
  if (prev?.phase === 'countdown' && v.phase === 'play') sound.go();
  if (v.phase === 'countdown' && prev?.phase !== 'countdown') lastCount = 0;
  handleEvent(v);
  renderGame(v);
  clearInterval(overlayTimer); overlayTimer = null;
  if (v.phase === 'countdown') overlayTimer = setInterval(renderOverlay, 150);
  clearTimeout(resultsTimer);
  if (v.phase === 'over') resultsTimer = setTimeout(() => showResults(v), 1500);
}

const seatName = (v, s) => (s === ctl.seat ? 'You' : v.players[s].name);

function handleEvent(v) {
  const ev = v.event;
  if (!ev || ev.v <= lastEventV) return;
  lastEventV = ev.v;
  const who = v.players[ev.seat];
  if (ev.type === 'match') {
    if (ev.seat === ctl.seat) sound.good(); else sound.tick();
    let msg = `${who.avatar} ${seatName(v, ev.seat)} spotted ${SYMBOLS[ev.symbol]}`;
    if (ev.target != null && ev.target >= 0) msg += ` → ${ev.target === ctl.seat ? 'you!' : v.players[ev.target].name}`;
    feed(msg, who.color);
    burst(SYMBOLS[ev.symbol]);
  } else if (ev.type === 'miss' && ev.seat === ctl.seat) {
    sound.bad();
    navigator.vibrate?.(180);
    shakeMe = true;
  }
}

/* ---------- rendering ---------- */
function scoreText(v, p) {
  return { tower: `🃏 ${p.count}`, well: `🃏 ${p.count} left`, poison: `☠️ ${p.count}`, potato: `🥔 ${p.penalty}` }[v.mode];
}

function seatCell(v, s, now, hidden, size = 'cell') {
  const p = v.players[s];
  const mine = s === ctl.seat;
  const frozen = p.frozenUntil > now ? 'frozen' : '';
  const card = p.top == null
    ? `<div class="card ${size} empty" style="--seat:${p.color}">${v.mode === 'potato' ? '✅' : '🎉'}</div>`
    : cardHTML(p.top, { owner: mine ? 'me' : s, size, color: p.color, hidden });
  return `<div class="slot ${frozen} ${mine ? 'is-me' : ''}" style="--seat:${p.color}">${card}
    <div class="tag-line">${p.avatar} ${mine ? 'You' : esc(p.name)} · ${scoreText(v, p)}</div></div>`;
}

function centerCell(v, hidden) {
  const c = v.center;
  const card = c.top == null
    ? '<div class="card cell empty">🏁</div>'
    : cardHTML(c.top, { owner: 'center', size: 'cell', color: '#2b2350', hidden });
  return `<div class="slot center-slot">${card}<div class="tag-line">🎁 Gift · ${c.count} left</div></div>`;
}

function centerPile(v, hidden) {
  const c = v.center;
  const card = c.top == null
    ? '<div class="card empty">🏁</div>'
    : cardHTML(c.top, { owner: 'center', color: '#2b2350', hidden });
  return `<div class="pile">${card}<span class="badge">🃏 ${c.count}</span></div>`;
}

function chip(v, s, now, extra = '') {
  const p = v.players[s];
  const frozen = p.frozenUntil > now ? 'frozen' : '';
  const name = s === ctl.seat ? 'You' : esc(p.name);
  return `<div class="chip ${extra} ${frozen}" style="--seat:${p.color}"><span class="av">${p.avatar}</span><b>${name}</b><span>${scoreText(v, p)}</span></div>`;
}

function hintText(v, now) {
  const p = v.players[ctl.seat];
  if (v.phase !== 'play') return '';
  if (p.frozenUntil > now) return '❄️ Frozen! Wrong tap…';
  if (v.mode === 'potato' && p.count === 0) return '✅ Safe! Watch the others…';
  return {
    tower: 'Tap the emoji your card shares with the middle card',
    well: 'Tap the emoji your card shares with the middle card',
    potato: 'Tap the match on a rival’s card to pass your pile',
    poison: 'Tap the match on a rival’s card to give them the gift',
  }[v.mode];
}

function renderGame(v) {
  if (!ctl) return;
  const now = ctl.now();
  const n = v.players.length;
  const hidden = v.phase === 'countdown';
  const opps = [1, 2, 3].map((k) => (ctl.seat + k) % n);
  const m = MODES[v.mode];
  $('#gameTitle').textContent = `${m.icon} ${m.name}`;
  $('#gameInfo').textContent = v.mode === 'potato' ? `${v.round}/${v.rounds}` : '';

  if (v.mode === 'potato' || v.mode === 'poison') {
    // 2×2 table: three rivals + (your card | the gift pile)
    const cells = opps.map((s) => seatCell(v, s, now, hidden));
    cells.push(v.mode === 'potato' ? seatCell(v, ctl.seat, now, hidden) : centerCell(v, hidden));
    $('#table').innerHTML = cells.join('');
    $('#opponents').innerHTML = '';
    $('#centerZone').innerHTML = '';
    $('#myZone').innerHTML = v.mode === 'poison' ? chip(v, ctl.seat, now, 'mine-chip') : '';
  } else {
    $('#table').innerHTML = '';
    $('#opponents').innerHTML = opps.map((s) => chip(v, s, now)).join('');
    $('#centerZone').innerHTML = centerPile(v, hidden);
    $('#myZone').innerHTML = seatCell(v, ctl.seat, now, hidden, 'big');
  }

  const h = $('#hint');
  if (!h.classList.contains('feed')) h.textContent = hintText(v, now);

  $$('#game .card[data-owner]').forEach((el) => {
    const k = el.dataset.owner;
    if (lastTops[k] != null && lastTops[k] !== el.dataset.id) el.classList.add('pop');
    lastTops[k] = el.dataset.id;
  });
  if (shakeMe) { shakeMe = false; $('#game .slot.is-me, #game .mine-chip')?.classList.add('shake'); }
  renderOverlay();
  scheduleRefresh(v, now);
}

function scheduleRefresh(v, now) {
  clearTimeout(refreshTimer);
  const next = Math.min(...v.players.map((p) => p.frozenUntil).filter((t) => t > now));
  if (Number.isFinite(next)) refreshTimer = setTimeout(() => view && renderGame(view), next - now + 30);
}

function renderOverlay() {
  const ov = $('#overlay');
  const v = view;
  if (!v || !ctl) return;
  let html = '';
  if (v.phase === 'countdown') {
    const left = Math.max(1, Math.min(3, Math.ceil((v.startAt - ctl.now()) / 1000)));
    if (left !== lastCount) { lastCount = left; sound.count(); }
    const round = v.mode === 'potato' ? `Round ${v.round}/${v.rounds} · ` : '';
    html = `<div class="ov-num">${left}</div><div class="ov-sub">${round}${MODES[v.mode].goal}</div>`;
  } else if (v.phase === 'roundEnd' && v.event?.loser != null) {
    const p = v.players[v.event.loser];
    html = `<div class="ov-big">🥔🔥</div><div class="ov-sub">${p.avatar} ${esc(seatName(v, v.event.loser))} got stuck with ${v.event.cards} cards!</div>`;
  } else if (v.phase === 'over') {
    html = '<div class="ov-big">🏁</div><div class="ov-sub">Finished!</div>';
  }
  if (ov.innerHTML !== html) ov.innerHTML = html;
  ov.classList.toggle('hidden', !html);
}

/* ---------- input ---------- */
function resolveMove(v, owner, sym) {
  const P = v.players;
  const has = (s, x) => P[s].top != null && DECK[P[s].top].includes(x);
  const others = P.map((_, i) => i).filter((i) => i !== ctl.seat);
  switch (v.mode) {
    case 'tower':
    case 'well':
      return owner === 'center' || owner === 'me' ? { symbol: sym } : null;
    case 'potato': {
      if (owner === 'center') return null;
      if (owner === 'me') {
        const live = others.filter((i) => P[i].count > 0);
        if (!live.length) return null;
        return { symbol: sym, target: live.find((i) => has(i, sym)) ?? live[0] };
      }
      return { symbol: sym, target: Number(owner) };
    }
    case 'poison': {
      if (owner === 'me') return null;
      if (owner === 'center') return { symbol: sym, target: others.find((i) => has(i, sym)) ?? others[0] };
      return { symbol: sym, target: Number(owner) };
    }
    default:
      return null;
  }
}

function onGameTap(e) {
  const symEl = e.target.closest('.sym');
  if (!symEl || !view || !ctl) return;
  e.preventDefault();
  if (view.phase !== 'play') return;
  if (view.players[ctl.seat].frozenUntil > ctl.now()) { sound.bad(); return; }
  const move = resolveMove(view, symEl.closest('.card').dataset.owner, Number(symEl.dataset.sym));
  if (!move) return;
  symEl.classList.add('tapped');
  ctl.tap({ ...move, turn: view.turn });
}

/* ---------- results ---------- */
function showResults(v) {
  if (!ctl || !v.results) return;
  const medals = ['🥇', '🥈', '🥉', '🏅'];
  const label = (r) => ({
    tower: `🃏 ${r.cards}`, well: r.cards === 0 ? 'Empty! 🎉' : `${r.cards} left`,
    poison: `☠️ ${r.cards}`, potato: `🥔 ${r.penalty}`,
  })[v.mode];
  const mine = v.results.find((r) => r.seat === ctl.seat);
  $('#resultTitle').textContent = mine.place === 1 ? '🏆 You win!' : `You placed #${mine.place}`;
  $('#resultList').innerHTML = v.results.map((r, i) =>
    `<li class="${r.seat === ctl.seat ? 'me' : ''}" style="--seat:${r.color};animation-delay:${i * 90}ms">
      <span class="medal">${medals[r.place - 1]}</span><span class="av">${r.avatar}</span>
      <b>${esc(r.seat === ctl.seat ? 'You' : r.name)}</b><span class="score">${label(r)}</span></li>`).join('');
  const again = $('#againBtn');
  again.disabled = !ctl.canAgain;
  again.textContent = ctl.canAgain ? '🔁 Play again' : '⏳ Waiting for host…';
  if (mine.place === 1) sound.win(); else sound.end();
  show('results');
}

/* ---------- online: host ---------- */
async function hostOnline() {
  if (!onlineReady()) return toast('Online play needs Firebase setup (see README)', '#f59e0b', 3500);
  await withBusy(async () => {
    const room = await hostRoom(me());
    const o = online = {
      room, isHost: true, status: 'lobby', mode: 'tower', levels: [null, ...soloLevels],
      players: {}, humans: [room.uid], seats: [], seatOf: {}, session: null,
    };
    room.on('players', (p) => {
      if (online !== o) return;
      o.players = p || {};
      hostSyncPlayers();
    });
    room.onChild('actions', (key, a) => {
      room.remove(`actions/${key}`).catch(() => {});
      if (online !== o || !o.session || !a) return;
      const seat = o.seatOf[a.uid];
      if (seat != null) o.session.tap(seat, { symbol: a.symbol, target: a.target >= 0 ? a.target : null, turn: a.turn });
    });
    publishLobby();
    show('lobby');
  });
}

function hostSyncPlayers() {
  const o = online;
  if (!o?.isHost) return;
  if (o.status === 'playing') {
    Object.entries(o.seatOf).forEach(([uid, seat]) => {
      if (uid !== o.room.uid && !o.players[uid]) {
        delete o.seatOf[uid];
        o.session?.convertToBot(seat, 'medium');
        toast('A player left, a bot took their seat 🤖', '#f59e0b');
      }
    });
    Object.keys(o.players).forEach((uid) => { if (o.seatOf[uid] == null) o.room.remove(`players/${uid}`).catch(() => {}); });
    return;
  }
  const guests = Object.keys(o.players)
    .filter((u) => u !== o.room.uid)
    .sort((a, b) => (o.players[a].joinedAt || 0) - (o.players[b].joinedAt || 0));
  guests.slice(3).forEach((u) => o.room.remove(`players/${u}`).catch(() => {}));
  o.humans = [o.room.uid, ...guests.slice(0, 3)];
  publishLobby();
}

function lobbySeats() {
  const o = online;
  return nameBots([0, 1, 2, 3].map((i) => {
    const uid = o.humans[i];
    if (uid) {
      const p = o.players[uid] || (uid === o.room.uid ? me() : {});
      return { uid, name: String(p.name || 'Player').slice(0, 12), avatar: p.avatar || '🙂', color: SEAT_COLORS[i] };
    }
    const lv = o.levels[i] || 'medium';
    return { bot: lv, avatar: BOTS[lv].avatar, color: SEAT_COLORS[i] };
  }));
}

function publishLobby() {
  const o = online;
  o.seats = lobbySeats();
  o.room.set('lobby', JSON.stringify({ mode: o.mode, seats: o.seats })).catch(() => {});
  renderLobby();
}

function hostStart() {
  const o = online;
  if (!o?.isHost) return;
  sound.click();
  o.seats = lobbySeats();
  o.seatOf = {};
  o.seats.forEach((s, i) => { if (s.uid) o.seatOf[s.uid] = i; });
  o.status = 'playing';
  const players = o.seats.map((s) => ({ name: s.name, avatar: s.avatar, color: s.color, bot: s.bot || null, uid: s.uid || null }));
  const session = new HostSession({
    mode: o.mode, players, clock: () => o.room.now(),
    onView: (v) => { o.room.set('state', JSON.stringify(v)).catch(() => {}); onView(v); },
  });
  o.session = session;
  o.room.update({ status: 'playing', state: null, actions: null, lobby: JSON.stringify({ mode: o.mode, seats: o.seats, seatOf: o.seatOf }) });
  ctl = { seat: 0, now: () => o.room.now(), tap: (m) => session.tap(0, m), quit: leaveOnline, again: hostBackToLobby, canAgain: true };
  enterGame(o.mode);
  session.start();
}

function hostBackToLobby() {
  const o = online;
  if (!o) return;
  stopTimers();
  o.session?.destroy();
  o.session = null;
  ctl = null; view = null;
  o.status = 'lobby';
  o.seatOf = {};
  o.room.update({ status: 'lobby', state: null, actions: null }).catch(() => {});
  hostSyncPlayers();
  show('lobby');
}

/* ---------- online: guest ---------- */
async function joinOnline(raw) {
  const code = String(raw || '').toUpperCase().trim();
  if (!/^[A-Z]{4}$/.test(code)) return toast('Enter the 4-letter room code', '#f59e0b');
  if (!onlineReady()) return toast('Online play needs Firebase setup (see README)', '#f59e0b', 3500);
  await withBusy(async () => {
    const room = await joinRoom(code, me());
    const o = online = { room, isHost: false, status: 'lobby', mode: 'tower', seats: [], seatOf: null, lastState: null };
    const live = () => online === o;
    room.on('status', (st) => {
      if (!live()) return;
      if (st == null) return onlineGone('The host closed the room 👋');
      o.status = st;
      if (st === 'lobby') {
        if (ctl) { stopTimers(); ctl = null; view = null; }
        o.lastState = null;
        renderLobby();
        show('lobby');
      }
    });
    room.on('lobby', (s) => {
      if (!live() || !s) return;
      const l = JSON.parse(s);
      o.mode = l.mode; o.seats = l.seats || []; o.seatOf = l.seatOf || null;
      renderLobby();
      clientState(o);
    });
    room.on('state', (s) => { if (!live()) return; o.lastState = s; clientState(o); });
    room.on(`players/${room.uid}`, (p) => { if (live() && p == null) onlineGone('Room is full, or you were removed'); });
    renderLobby();
    show('lobby');
  });
}

function clientState(o) {
  if (o.status !== 'playing' || !o.lastState || !o.seatOf) return;
  const seat = o.seatOf[o.room.uid];
  if (seat == null) return onlineGone('That game already started');
  const v = JSON.parse(o.lastState);
  if (!ctl) {
    ctl = {
      seat, now: () => o.room.now(),
      tap: (m) => o.room.push('actions', { uid: o.room.uid, symbol: m.symbol, target: m.target ?? -1, turn: m.turn }).catch(() => {}),
      quit: leaveOnline, again: null, canAgain: false,
    };
    enterGame(v.mode);
  }
  onView(v);
}

/* ---------- online: shared ---------- */
function renderLobby() {
  const o = online;
  if (!o) return;
  $('#roomCode').textContent = o.room.code;
  $('#seats').innerHTML = o.seats.map((s, i) => {
    const tag = s.uid === o.room.uid ? 'You' : s.bot ? (o.isHost ? 'Bot · tap to change' : 'Bot') : i === 0 ? 'Host' : 'Player';
    return `<button class="seat ${s.bot ? 'bot' : ''}" data-seat="${i}" style="--seat:${s.color}" ${o.isHost && s.bot ? '' : 'disabled'}>
      <span class="av">${s.avatar}</span><b>${esc(s.name)}</b><span class="tag">${tag}</span></button>`;
  }).join('');
  modeTiles($('#lobbyModes'), o.isHost ? (m) => { o.mode = m; publishLobby(); } : null, o.mode);
  $('#startBtn').hidden = !o.isHost;
  $('#lobbyNote').textContent = o.isHost ? 'Empty seats are filled with bots 🤖' : 'Waiting for the host to start… ⏳';
}

async function shareInvite() {
  if (!online) return;
  const url = `${location.origin}${location.pathname}?room=${online.room.code}`;
  const text = `Join my SpoTap It! game! Room ${online.room.code}`;
  try {
    if (navigator.share) await navigator.share({ title: 'SpoTap It!', text, url });
    else { await navigator.clipboard.writeText(url); toast('Invite link copied 📋'); }
  } catch { /* share cancelled */ }
}

async function leaveOnline() {
  const o = online;
  online = null;
  if (!o) return;
  o.session?.destroy();
  try { await o.room.leave(); } catch { /* offline */ }
}

function onlineGone(msg) {
  stopGame();
  leaveOnline();
  show('home');
  toast(msg, '#ff5a5f', 3200);
}

/* ---------- init ---------- */
function renderAvatars() {
  $('#avatarRow').innerHTML = AVATARS.map((a) =>
    `<button class="${a === profile.avatar ? 'sel' : ''}" data-av="${a}" aria-label="Avatar ${a}">${a}</button>`).join('');
}

function renderHelp() {
  $('#helpBody').innerHTML = `
    <div class="help-card"><b>🔍 The big idea</b><p>Any two cards share <b>exactly one</b> emoji. Spot it before everyone else and tap it!</p></div>
    <div class="help-card" style="--c:#2f9bff"><b>❄️ Careful</b><p>A wrong tap freezes you for 1.5 seconds.</p></div>
    ${Object.values(MODES).map((m) => `<div class="help-card" style="--c:${m.color}"><b>${m.icon} ${m.name}</b><p>${m.how}</p></div>`).join('')}
    <div class="help-card" style="--c:#f59e0b"><b>🤖 Always 4 players</b><p>Bots fill every empty seat. Pick Easy, Medium or Hard for each one before you start.</p></div>
    <a class="btn ghost" href="assets/cards/index.html" target="_blank" rel="noopener">🖨️ Printable deck</a>`;
}

function init() {
  $('#nameInput').value = profile.name;
  $('#nameInput').addEventListener('input', (e) => { profile.name = e.target.value.slice(0, 12); saveProfile(); });
  renderAvatars();
  $('#avatarRow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-av]');
    if (!b) return;
    profile.avatar = b.dataset.av;
    saveProfile();
    renderAvatars();
    sound.click();
  });
  $('#homeCard').innerHTML = cardHTML(Math.floor(Math.random() * DECK.length), { owner: 'demo', size: 'demo', color: '#6c4cff' });
  renderSoloBots();
  $('#soloBots').addEventListener('click', (e) => {
    const b = e.target.closest('[data-bot]');
    if (!b) return;
    soloLevels[Number(b.dataset.bot)] = b.dataset.lv;
    saveLevels();
    renderSoloBots();
    sound.click();
  });
  modeTiles($('#soloModes'), startSolo);
  renderHelp();

  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { sound.click(); show(g.dataset.go); }
  });
  $('#hostBtn').onclick = hostOnline;
  $('#joinBtn').onclick = () => joinOnline($('#codeInput').value);
  $('#codeInput').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  $('#codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinOnline(e.target.value); });
  $('#shareBtn').onclick = shareInvite;
  $('#startBtn').onclick = hostStart;
  $('#seats').onclick = (e) => {
    const b = e.target.closest('[data-seat]');
    const o = online;
    if (!b || !o?.isHost) return;
    const i = Number(b.dataset.seat);
    if (o.humans[i]) return;
    o.levels[i] = LEVELS[(LEVELS.indexOf(o.levels[i]) + 1) % LEVELS.length];
    sound.click();
    publishLobby();
  };
  $('#lobbyBack').onclick = async () => {
    if (!confirm('Leave this room?')) return;
    await leaveOnline();
    show('home');
  };
  $('#quitBtn').onclick = () => { if (confirm('Leave this game?')) leaveGame(); };
  $('#muteBtn').textContent = sound.muted ? '🔇' : '🔊';
  $('#muteBtn').onclick = () => { $('#muteBtn').textContent = sound.toggle() ? '🔇' : '🔊'; };
  $('#againBtn').onclick = () => { sound.click(); ctl?.again?.(); };
  $('#homeBtn').onclick = leaveGame;
  $('#game').addEventListener('pointerdown', onGameTap);

  const code = new URLSearchParams(location.search).get('room');
  if (code) {
    $('#codeInput').value = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    history.replaceState(null, '', location.pathname);
    show('join');
  }
}

init();