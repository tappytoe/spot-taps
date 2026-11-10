# 🔍 Spot Taps
*A tappytoe games release* · **[▶️ Play now](https://tappytoe.github.io/spot-taps/)**



![Spot Taps thumbnail](https://tappytoe.github.io/spot-taps/thumbnail.png)



**Spot Taps** is a fast, colorful emoji matching party game made for phones.
Every two cards share **exactly one** emoji. Spot it, tap it, and beat everyone to it!

- 👥 **Always 4 players.** Play solo against bots you pick yourself (🐣 Easy, 🦉 Medium, 🐲 Hard), or online with friends. Empty seats are filled by bots.
- 📱 **Phone-first.** Big tappable cards, no install, works in any modern browser and can be added to your home screen.
- 🌐 **Online rooms.** Share a 4-letter code or invite link. If someone drops out, a bot takes over their seat.

## Mini games
| | Game | Goal |
|---|---|---|
| 🗼 | **The Tower** | Tap the emoji your card shares with the middle card to win it. Most cards wins. |
| 🪣 | **The Well** | Tap the emoji your card shares with the middle card to dump yours. First to empty wins. |
| 🥔 | **Hot Potato** | Tap the match on a rival's card to pass your pile. Last one holding takes a penalty. 5 rounds. |
| 🎁 | **Poisoned Gift** | Tap the match between the middle card and a rival's card to gift it to them. Fewest cards wins. |

A wrong tap freezes you for 1.5 s ❄️.

## Run locally
```bash
npm install          # only needed for the thumbnail tool
npm start            # http://localhost:8080
npm test             # deck, rules and bot tests
npm run art          # 57 card SVGs + back + printable gallery → assets/cards/
npm run thumbnail    # 1200×630 preview → assets/thumbnail.png
```

## Online multiplayer (Firebase)
The host's browser runs the rules and publishes snapshots to Firebase Realtime Database. Guests send their taps.

1. Create a project at https://console.firebase.google.com.
2. **Realtime Database → Create database**. On the **Rules** tab, paste `database.rules.json` and publish.
3. **Authentication → Sign-in method → Anonymous → Enable**. Then add `tappytoe.github.io` under **Authorized domains**.
4. **Project settings → Your apps → Web app**: copy the config.
5. In GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`.

## Deploy
Every push to `main` runs the tests, exports the card art, builds the site, renders `thumbnail.png` and deploys to GitHub Pages. Pull requests run tests only.

## Project structure
```
index.html            app shell (all screens)
css/style.css         mobile-first styles and animations
js/deck.js            57-card deck (every pair shares one symbol)
js/emoji.js           emoji, avatars, seat colors, bots, modes
js/layout.js          symbol placement per card
js/engine.js          pure rules for all 4 mini games
js/ai.js              bot speed, mistakes and targeting
js/session.js         game runner: phases, pauses, bots
js/net.js             Firebase rooms and presence
js/cards-ui.js        card rendering
js/sound.js           WebAudio sound effects
js/main.js            screens, input, animations, online flow
tools/                build, art, thumbnail, local server
tests/                node:test suite (runs in CI)
```

## License
MIT © tappytoe games. "Spot It!"/"Dobble" are trademarks of their owners; this is an independent game with original art.