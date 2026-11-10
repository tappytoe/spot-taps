// Builds dist/ for GitHub Pages. Injects Firebase config from env vars when present.
import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = 'dist';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT);
for (const p of ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets']) {
  if (existsSync(p)) await cp(p, `${OUT}/${p}`, { recursive: true });
}

const env = process.env;
if (env.FIREBASE_API_KEY) {
  const cfg = {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN || '',
    databaseURL: env.FIREBASE_DATABASE_URL || '',
    projectId: env.FIREBASE_PROJECT_ID || '',
    appId: env.FIREBASE_APP_ID || '',
  };
  await writeFile(`${OUT}/js/firebase-config.js`, `export const firebaseConfig = ${JSON.stringify(cfg, null, 2)};\n`);
  console.log('Firebase config injected from environment');
} else {
  console.log('No FIREBASE_API_KEY set: using js/firebase-config.js as committed');
}

const stamp = Date.now().toString(36);
const html = await readFile(`${OUT}/index.html`, 'utf8');
await writeFile(`${OUT}/index.html`, html.replaceAll('__BUILD__', stamp));
await writeFile(`${OUT}/.nojekyll`, '');
console.log(`Built ${OUT}/ (build ${stamp})`);