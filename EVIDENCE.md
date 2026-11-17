# OJEK! Raja Jalanan — evidence log

How this build was verified, per the open-game-skills evidence rules and the
offline-game-revival "implemented vs verified" split. A feature is listed as
**implemented** when the code exists, and **verified** only when a runtime
check observed the state actually change. Conclusions come from numbers
(window.G.state() and the scripted smoke test); screenshots are backup.

Dispatcher routing: Phase A used action-feel/short-special, juice-vfx/punchy,
hitstun-recover/light-stun. ENGINE: custom (vanilla JS + canvas 2D).
DEFER: racing-feel, enemy-ai, quest-graph, world-map, save-checkpoint.

## Checks

| ID | Pass | Check | Result | Evidence |
|----|------|-------|--------|----------|
| S1 | smoke | Boot to title, no console errors | pass | verify-stage1.js: screen=title, tick=179, errors=[] |
| S2 | smoke | Enter game, drive with real keys | pass | verify-stage1.js: speed 424 after 3s W, moved 945 |
| S3 | functional | Order board opens with Q, 6 offers (5 + story) | pass | verify-stage1.js: screen=orders, boardOrders=6 |
| S4 | functional | Full order: accept, pickup, deliver, commission paid | pass | ?autotest=1: order=pass, fare 57000, tip 17100 |
| S5 | functional | Dealer purchase: buy Matic 110, owned after | pass | ?autotest=1: dealer=pass, owns matic-110 true |
| S6 | functional | Combat: rival spawned, punched down, reward paid | pass | verify-stage2.js: enemies 1→0, money 50000→55000 |
| S7 | functional | Save survives restart (money identical after reload) | pass | verify-stage2.js: moneyBefore=moneyAfter=125100 |
| S8 | functional | Cover scene: moving, wanted 2, police 2, active order | pass | take-shots.js: speed 740, wanted 2, policeCars 2 |
| S9 | functional | Chase scene: top speed, wanted 4, police 4 | pass | take-shots.js: speed 860, wanted 4, policeCars 4 |
| S10 | functional | Dealer scene opens with money staged | pass | take-shots.js: screen=dealer, money 3050000 |
| S11 | functional | On-foot scene at the market | pass | take-shots.js: screen=playing, speed 0, wanted 0 |
| S12 | static | All 21 game modules pass node module syntax check | pass | node --input-type=module --check, 21/21 OK |
| S13 | static | 4 screenshots 1280x720, each ≤256 KiB | pass | 1-cover 104243 B, 2-onfoot 93077 B, 3-dealer 114500 B, 4-chase 98286 B |
| S14 | regression | Traffic crash loop (per-frame damage + rating drain) | pass | Fixed with 1s cooldown + bounce; re-ran S2/S4/S8 green |
| S15 | regression | Order board 6th card overlapped the close button | pass | Fixed with 64px cards; re-ran S3 green |
| S16 | regression | `light is not defined` froze the loop | pass | Fixed; loop now catches a bad step and keeps running |
| S19 | functional | Random event closes a road (closure observed) | pass | verify-stage3.js: maxClosures=1 over 160s fast-forward |
| S20 | functional | Upgrade + repair through the dealer UI | pass | verify-stage3.js: Ban Lv1 bought, condition 71→100 |
| S21 | functional | Police bust: fine + rating loss + wanted cleared | pass | verify-stage3.js: money 50000→42500, rating 4.2→3.9 |
| S17 | playtest | A human plays a full shift start to finish | not-run | Needs a real player; scripted scenes cover the systems |
| S18 | soak | 30-minute stability run | not-run | Not run in this build |

## Implemented vs verified

- Implemented and verified at runtime: driving (foot + bike), order board and
  full order flow, dealer purchase, upgrades and repairs (bought through the
  real dealer UI), combat, wanted + police chase + bust (fine and rating loss
  observed), save/load, day/shift/weather cycle (shifts Pagi→Siang→Sore
  observed over fast-forwarded time), traffic lights (light state cycles
  observed in the render), rating and streaks (observed in state), random
  events (a road closure observed over fast-forwarded time).
- Implemented, not yet verified on a live run: the full 5-mission story arc
  end to end, the race rival arriving first, the begal night spawn, VIP and
  rush-parcel event orders, and rush-hour traffic jams (trafficStopped read 0
  in every short run). These run through the same update loop as the verified
  systems, but no dedicated runtime check has observed them yet.

## Known deviations

- The scripted smoke test (?autotest=1) teleports the player between pickup
  and destination. Its evidence is scripted-scene, not a natural clear.
- Screenshots are staged scenes (?shot=cover|foot|dealer|chase) of the real
  game running: real HUD, real traffic, real police. Staging only sets the
  starting state; everything on screen is simulated live.
