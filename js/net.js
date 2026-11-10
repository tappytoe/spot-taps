// Firebase Realtime Database rooms. Host-authoritative, like Mechana-Clash:
// the host's browser runs the rules and publishes snapshots; guests push taps.
//
// rooms/{CODE}/ host, status ('lobby'|'playing'), lobby (JSON), state (JSON view),
//               players/{uid} {name, avatar, joinedAt}, actions/{pushId} {uid, symbol, target, turn}
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
let fbPromise = null;

export const onlineReady = () =>
  Boolean(firebaseConfig?.apiKey && firebaseConfig?.databaseURL && !firebaseConfig.apiKey.startsWith('YOUR_'));

function friendly(e) {
  const msg = String(e?.code || e?.message || e);
  if (msg.includes('operation-not-allowed')) return 'Enable Anonymous sign-in in Firebase Authentication';
  if (msg.toLowerCase().includes('permission')) return 'Permission denied: check the database rules';
  if (msg.includes('network')) return 'Network error: check your connection';
  return e?.message || msg;
}

function boot() {
  fbPromise ??= (async () => {
    const appMod = await import(`${SDK}/firebase-app.js`);
    const [db, auth] = await Promise.all([
      import(`${SDK}/firebase-database.js`),
      import(`${SDK}/firebase-auth.js`),
    ]);
    const app = appMod.initializeApp(firebaseConfig);
    const cred = await auth.signInAnonymously(auth.getAuth(app));
    const database = db.getDatabase(app);
    let offset = 0;
    db.onValue(db.ref(database, '.info/serverTimeOffset'), (s) => { offset = s.val() || 0; });
    return { db, database, uid: cred.user.uid, now: () => Date.now() + offset };
  })().catch((e) => { fbPromise = null; throw new Error(friendly(e)); });
  return fbPromise;
}

class Room {
  constructor(fb, code, isHost) {
    this.fb = fb;
    this.code = code;
    this.isHost = isHost;
    this.uid = fb.uid;
    this.base = `rooms/${code}`;
    this.unsubs = [];
  }
  ref(path = '') { return this.fb.db.ref(this.fb.database, path ? `${this.base}/${path}` : this.base); }
  now() { return this.fb.now(); }
  on(path, cb) { this.unsubs.push(this.fb.db.onValue(this.ref(path), (s) => cb(s.val()))); }
  onChild(path, cb) { this.unsubs.push(this.fb.db.onChildAdded(this.ref(path), (s) => cb(s.key, s.val()))); }
  set(path, v) { return this.fb.db.set(this.ref(path), v); }
  update(v) { return this.fb.db.update(this.ref(), v); }
  remove(path) { return this.fb.db.remove(this.ref(path)); }
  push(path, v) { return this.fb.db.push(this.ref(path), v); }
  async leave() {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    if (this.isHost) await this.remove();
    else await this.remove(`players/${this.uid}`);
  }
}

const randomCode = () =>
  Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export async function hostRoom({ name, avatar }) {
  const fb = await boot();
  const { db, database, uid } = fb;
  try {
    let code = null;
    for (let i = 0; i < 12 && !code; i++) {
      const c = randomCode();
      if (!(await db.get(db.ref(database, `rooms/${c}`))).exists()) code = c;
    }
    if (!code) throw new Error('Could not create a room, try again');
    const roomRef = db.ref(database, `rooms/${code}`);
    await db.set(roomRef, {
      host: uid, status: 'lobby', createdAt: db.serverTimestamp(),
      players: { [uid]: { name, avatar, joinedAt: db.serverTimestamp() } },
    });
    await db.onDisconnect(roomRef).remove(); // host gone = room gone
    return new Room(fb, code, true);
  } catch (e) { throw new Error(friendly(e)); }
}

export async function joinRoom(code, { name, avatar }) {
  const fb = await boot();
  const { db, database, uid } = fb;
  try {
    const snap = await db.get(db.ref(database, `rooms/${code}`));
    if (!snap.exists()) throw new Error(`Room ${code} not found`);
    const r = snap.val();
    if (r.status !== 'lobby') throw new Error('That game already started');
    if (Object.keys(r.players || {}).length >= 4 && !r.players?.[uid]) throw new Error('Room is full');
    const me = db.ref(database, `rooms/${code}/players/${uid}`);
    await db.set(me, { name, avatar, joinedAt: db.serverTimestamp() });
    await db.onDisconnect(me).remove();
    return new Room(fb, code, false);
  } catch (e) { throw new Error(friendly(e)); }
}