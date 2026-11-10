# 🔍 Spot Taps

A fast emoji matching party game for **4 players**. Every two cards share **exactly one** emoji. Spot it first and tap it!
Play solo against 🐣 Easy, 🦉 Medium and 🐲 Hard bots, or online with friends. Empty seats are always filled with bots.

## Mini games
- 🗼 **The Tower**: tap the emoji your card shares with the middle card to win it. Most cards wins.
- 🪣 **The Well**: tap the emoji your card shares with the middle card to dump yours. First to empty wins.
- 🥔 **Hot Potato**: tap the match on a rival's card to pass your pile. The last one holding takes a penalty. 5 rounds.
- 🎁 **Poisoned Gift**: tap the match between the middle card and a rival's card to gift it to them. Fewest cards wins.

A wrong tap freezes you for 1.5 s ❄️.

## Run locally
```bash
npm start        # http://localhost:8080
npm test         # deck, rules and bot tests
npm run art      # export 57 card SVGs + back + printable gallery into assets/cards/
npm run preview  # build dist/ and serve it
```

## Online multiplayer (Firebase)
The host's browser runs the rules and publishes snapshots to Firebase Realtime Database. Guests push their taps.
If a guest drops out, a bot takes their seat. If the host leaves, the room closes.

1. Create a project at https://console.firebase.google.com.
2. **Build → Realtime Database → Create database**. On the **Rules** tab, paste `database.rules.json` and publish.
3. **Build → Authentication → Sign-in method → Anonymous → Enable**.
4. **Authentication → Settings → Authorized domains**: add `<you>.github.io`.
5. **Project settings → Your apps → Web app**: copy the config values.
6. In GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`.
   For local testing, paste the values into `js/firebase-config.js` instead.

Without a config, solo play still works and the online buttons explain what's missing.

## Deploy to GitHub Pages
```bash
git init && git add . && git commit -m "Spot Taps v1"
git branch -M main
git remote add origin https://github.com/<you>/spot-taps.git
git push -u origin main
```
In the repo, go to **Settings → Pages → Source: GitHub Actions**.
Every push to `main` runs the tests, exports the card art, builds `dist/` and deploys to `https://<you>.github.io/spot-taps`. Pull requests run tests only.

## Project structure
```
index.html            app shell (all screens)
css/style.css         mobile-first styles and animations
js/deck.js            57-card projective-plane deck
js/emoji.js           emoji symbols, avatars, seat colors, modes
js/layout.js          deterministic symbol placement per card
js/engine.js          pure rules for all 4 mini games
js/ai.js              bot speed, mistakes and target choice
js/session.js         game runner: phases, timers, bots (solo + online host)
js/net.js             Firebase rooms, presence, actions
js/cards-ui.js        card rendering
js/sound.js           WebAudio sound effects
js/main.js            screens, input, lobby, online flow
tools/                build, art export, local server
tests/                node:test suite (runs in CI)
.github/workflows/    test → build → deploy
```

## License
MIT. "Spot It!"/"Dobble" are trademarks of their owners; this is an independent game with original art.