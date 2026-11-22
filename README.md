# MIDNIGHT VAULT

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Auttzy/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Auttzy/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**MIDNIGHT VAULT** is a top-down stealth heist game that plays offline in a desktop browser. Over one night you pull three jobs — the Museum Gallery, the Bank Vault and the Penthouse — sneaking past patrolling guards and sweeping security cameras, cracking safes, pocketing bonus loot and slipping out the green exit before the alarm hits lockdown. Guards read your movement through warm yellow vision cones, cameras sweep in red, shadows hide you, and every tool — coins, EMP charges, smoke bombs, lockpicks — is limited, so each one is a real decision: spend it now or save it for the vault.

## How to play

- **WASD / arrow keys** — move. **SHIFT** — sneak (slow, quiet, much harder to spot).
- **E** — grab loot; hold **E** to crack a safe or vault (needs a lockpick, takes time, makes noise).
- **Q, SPACE or mouse click** — throw a distraction coin; guards investigate the noise.
- **1** — EMP charge: cameras go dark for 6 seconds. **2** — smoke bomb: breaks line of sight.
- **P / ESC** — pause. **R** — restart the heist. **M** — mute. **ENTER** — start / continue.
- Grab the main loot target, then reach the green **EXIT**. Bonus loot, a time bonus and a $500 ghost bonus (never be seen) add to your score. If a guard touches you, you're caught. At 100% alarm the room locks down and extra security converges on you.

## What's in the box

- `game/` — the playable game as static files: `index.html` plus ES modules under `game/src/` (config, seeded RNG, world rules and levels, input, rendering, synthesized WebAudio sound, screenshot scenes, main loop). No libraries, no network requests, everything drawn in code.
- `screenshots/` — four real renders of the game, cover first: mid-play heist, title, alarm/lockdown, getaway victory.
- `shots.json` — the four shots mapped to `?shot=` queries.
- `main.ts` — the Node 22 entrypoint that hands the game in via `vendor/makefun-game.ts`.
- `serve.ts` — a tiny static server for local play-testing (`node serve.ts`, then http://localhost:8080).

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or hand it in locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
