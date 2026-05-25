# Singapore 2026 — Encrypted Itinerary Site

Private family trip itinerary hosted on GitHub Pages with client-side AES-256-GCM encryption.

## Architecture

Zero build step, pure vanilla JS. No frameworks, no bundlers, no dependencies.

```
index.html          ← full site: HTML + inline CSS + inline render script
lock-screen.js      ← password overlay + Web Crypto decryption + boot
trip-data.js        ← PLAINTEXT source data (GITIGNORED — never committed)
trip-data.js.enc    ← encrypted blob (committed)
trip-app.js         ← state management (localStorage checkboxes, journals, packing)
encrypt.js          ← Node.js encryption script (uses crypto stdlib, zero deps)
.gitignore          ← keeps trip-data.js, screenshots/, uploads/ out of repo
.nojekyll           ← tells GitHub Pages to skip Jekyll processing
```

## Encryption

**Algorithm:** AES-256-GCM with PBKDF2 key derivation (SHA-256, 600K iterations)

**Blob format:** `base64(salt[16] || iv[12] || authTag[16] || ciphertext)`

**Encrypt (before every push):**
```bash
node encrypt.js <password>
```
Reads `trip-data.js` → writes `trip-data.js.enc`. The `.js` stays local, the `.enc` gets committed.

**Decrypt (in browser):**
`lock-screen.js` fetches `.enc`, derives key via Web Crypto API, decrypts, injects `<script>` into DOM, calls `window.bootTrip()` to render the site.

**Session caching:** Correct password is stored in `sessionStorage` so page refreshes don't re-prompt. Closing the tab clears it.

## How the site boots

1. Browser loads `index.html` — only `lock-screen.js` is in `<head>`, no data scripts
2. `<body class="locked">` hides `.page` and `.hud` via `visibility:hidden`
3. Lock overlay renders: SG seal + password field + unlock button
4. User enters password → PBKDF2 derives key → AES-GCM decrypts `.enc` file
5. Decrypted JS is injected as `<script>` → `window.TRIP` becomes available
6. `lock-screen.js` loads `trip-app.js` (already in DOM), removes lock overlay, removes `.locked` class
7. `window.bootTrip()` runs — renders all sections (days, food, budget, bookings, packing, practical info)
8. Wrong password → GCM auth tag fails → "Wrong password" error + shake animation

## Updating the itinerary

1. Edit `trip-data.js` directly — it's the single source of truth for all trip data
2. Structure: `window.TRIP = { meta, travellers, days[], food[], budget[], bookings[], avoid[], practical[], pack[] }`
3. Each day has: `n, date, weekday, mapQuery, theme, tagline, hero, blocks[], spend, note`
4. Each block (schedule item): `{ time, title, sub, tag, star? }`
5. After editing, re-encrypt: `node encrypt.js <password>`
6. Commit and push `trip-data.js.enc`

## Updating the site design

All CSS is inline in `index.html` `<style>` block. All rendering logic is in the `<script>` block at the bottom of `index.html` inside `window.bootTrip = function() { ... }`.

**CSS variables** (`:root`): `--paper`, `--ink`, `--coral`, `--teal`, `--mustard`, `--plum`, `--leaf` for the postcard color palette. Fonts: Yeseva One (display), Caprasimo (display-2), Caveat (hand), Outfit (sans), DM Mono (mono).

**Fixed width:** 1280px (`max-width` + `min-width`). Not responsive — scrolls horizontally on mobile. The viewport meta is set to `device-width` so mobile users can zoom.

## Interactive features (all localStorage)

- **Checkboxes** on every schedule item, booking, and packing item — tick to mark done
- **Food cards** — click to mark as "tried"
- **Journal textareas** — one per day, freeform notes
- **Progress bars** — sticky top bar + per-day + hero stats, all update live
- **Date simulator** — HUD in bottom-right lets you fake today's date to preview day status (today/past/upcoming)
- **Reset button** — clears all ticks, notes, and marks (with confirm dialog)

State key: `sg2026_trip_state_v1` in localStorage.

## Maps

Each day card has a Google Maps embed iframe (`loading="lazy"`). The `mapQuery` field in each day's data controls the map center. Uses the no-API-key embed format: `https://maps.google.com/maps?q=<query>&t=m&z=14&output=embed`.

## PWA / Offline Support

The site is an installable Progressive Web App. Users can "Add to Home Screen" on mobile or "Install" on desktop.

**Files:**
- `manifest.json` — app name, icons, theme color, standalone display mode
- `sw.js` — service worker with network-first caching strategy
- `icon-192.png`, `icon-512.png` — PWA icons (coral SG seal)

**Caching strategy:**
- **App assets** (HTML, JS, .enc): network-first — fetches fresh copy when online, falls back to cache when offline. This means updates are picked up automatically on next online visit.
- **Google Fonts**: cache-first — fonts are immutable, cached permanently after first load.
- **Google Maps iframes**: never cached — maps require network, they just won't load offline (rest of the site still works).

**Cache version:** `sg2026-v1` in `sw.js`. Bump the version string to force a full cache refresh (old caches are auto-deleted on activate).

**Update flow:** Push new code → user opens site while online → SW fetches fresh assets → next page load uses updated versions. No manual intervention needed.

## What's encrypted vs public

| Encrypted (in .enc) | Public (in repo) |
|---|---|
| Names, passport numbers | Site structure, CSS, fonts |
| PNR, booking refs, hotel IDs | Lock screen UI |
| Flight times, meal preferences | trip-app.js (state logic) |
| Full itinerary schedule | encrypt.js (encryption tool) |
| Food spots, budget breakdown | .nojekyll, .gitignore |
| Traveller personality notes | |

## Deploying to GitHub Pages

```bash
cd site/
git init
git remote add origin git@github.com:AJV009/<repo-name>.git
git add .
git commit -m "initial: encrypted singapore itinerary"
git push -u origin main
```

Then in GitHub repo Settings → Pages → Source: Deploy from branch `main`, root `/`. Site goes live at `ajv009.com/<repo-name>`.

## Sensitive data warning

- `trip-data.js` contains passport numbers, PNR, booking refs — NEVER commit it
- The `.gitignore` protects against accidental commits
- If you ever accidentally push plaintext, rotate passwords and treat passport data as compromised
- Client-side encryption protects against casual browsing and GitHub scrapers, not a determined attacker who has the password
