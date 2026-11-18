# EVIDENCE — OJEK! King of the Streets (best-game-01)

Verification evidence for this build. "Implemented" means the code exists;
"Verified" means it was run and observed in headless Chromium.
Date: 2026-11-18 (WIB). Environment: Node v24.22.1, Playwright Chromium
(headless, SwiftShader software renderer).

## Local gate (run main.ts)

- `MAKEFUN_OUTPUT_DIR=out node main.ts` run twice, byte-identical: PASS
- game/ 2,386,404 bytes (<= 48 MiB), 37 entries (<= 993): PASS
- game/index.html 2,383 bytes (<= 1 MiB): PASS
- All references inside game/ (import map points at vendor three.js): PASS
- 4 screenshots, each <= 256 KiB, 1280x720: PASS
  (1-cover.jpg 104,033; 2-title.jpg 82,879; 3-skills.jpg 93,630;
  4-results.jpg 74,241 bytes)
- dossier.json from buildDossier, 642,209 bytes (<= 1.5 MiB),
  keys cover, images, schema, text: PASS
- Full `makefun check` needs a transcripts bundle (made by the parent at
  submit time): NOT RUN here.

## Render (headless Chromium, ?shot=, seed 7)

- cover: game running, HUD + minimap + active order + police + traffic
  visible, skill bar live (Nitro/Lay Low unlocked, Quick Fix on cooldown),
  0 console errors. PASS (screenshots/1-cover.jpg)
- title: title panel, 3 buttons, keys line, all inside the panel,
  0 console errors. PASS (screenshots/2-title.jpg)
- skills: phone on the Skills tab, 3 branches x 3 tiers, locked/unlocked
  states, connector lines, no text overflow, 0 console errors.
  PASS (screenshots/3-skills.jpg)
- results: mission-complete panel with 6 stat rows + 2 buttons,
  0 console errors. PASS (screenshots/4-results.jpg)
- All 28 src/ modules parse as ES modules (vm.SourceTextModule). PASS
- Layout pass on all 4 shots at 1280x720: spacing scale, bounds/overflow
  on every element, squint test. PASS (one defect found and fixed: the HUD
  skill bar peeked out from under the phone panel; it now hides while any
  menu is open).

## Smoke test gameplay (test-smoke.js) — 20/20 passed

- Title start button works: PASS
- Game state readable after start (mode playing, riding): PASS
- Order accepted: PASS (order 1)
- Order delivered, money increased: PASS (Rp 50,000 -> Rp 66,100)
- Dealer opens from pause menu: PASS
- Dealer purchase (City Matic 110) succeeds: PASS
- Money decreased after purchase: PASS (Rp 1,616,100)
- Skill tree opens with 9 nodes (3 branches x 3 tiers): PASS
- Buy skill (Nitro Boost) via tree UI: PASS
- Turbo Engine raises top speed (+15%): PASS (92 -> 106 km/h)
- Tough Skin raises max health (+25): PASS (100 -> 125)
- Buy skill (Ghost) via tree UI: PASS
- Phone tabs (Map/Stats/Radio) show real content: PASS
- Nitro Boost activates (burst + cooldown): PASS (cd 20s)
- Quick Fix restores 40% condition, costs Rp 5,000: PASS
  (condition 50 -> 90, money Rp 1,616,100 -> Rp 1,611,100)
- Lay Low drops wanted by 1 star: PASS (wanted 3 -> 2)
- Wanted set, police cars spawned: PASS (wanted 3, cars 4)
- Busted after being pinned: PASS (wanted 0, money Rp 1,611,100 -> Rp 1,369,435)
- Save persists across reload: PASS (Rp 1,369,435 -> Rp 1,369,435)
- Zero console/page errors during smoke test: PASS

## Systems (implemented vs verified)

| System | Implemented | Verified |
| --- | --- | --- |
| 3D city, 5 districts, river + bridges | Yes | Render cover/title |
| Traffic + traffic lights | Yes | Render cover |
| Pedestrians + waiting passengers | Yes | Render cover |
| Orders (5 types, surge fares, timers) | Yes | Smoke test |
| Dealer 7 bikes + garage + upgrades + paint | Yes | Smoke test |
| Fuel + service | Yes | Smoke test (Quick Fix) |
| Rating + streak + 6 ranks | Yes | Smoke test (partial) |
| Skill tree (3 branches x 3 tiers) | Yes | Smoke test |
| Active skills (Nitro, Quick Fix, Lay Low) | Yes | Smoke test |
| Phone tabs (Orders/Skills/Garage/Stats/Achievements/Map/Radio) | Yes | Smoke test |
| Daily challenges + earnings log | Yes | Smoke test (tabs render) |
| Wanted 5 tiers + police + helicopter | Yes | Smoke test |
| Geng Macan story missions (7) | Yes | Not run |
| Combat (punch, dodge, night muggers) | Yes | Not run |
| Random road events + order surge | Yes | Not run |
| Weather (clear/cloudy/rain) + day/night | Yes | Render (clear) |
| Procedural radio + engine/siren audio | Yes | Not run (muted in tests) |
| Achievements + tutorial + codex | Yes | Not run |
| Save/load localStorage | Yes | Smoke test |
| Minimap + HUD + mission results | Yes | Render cover/results |

## Notes

- SwiftShader (no GPU) runs ~3-4 fps; the game is built for desktop
  Chrome with a GPU. Draw calls are cut with InstancedMesh for trees and
  street lamps; shadow map 1024 on the software renderer.
- All user-visible UI text is English. Indonesian remains only as
  in-world flavor: place names (Pasar Sinar, Kampung Melati), the gang
  name (Geng Macan), radio station "Dangdut 88", and shop signs painted
  on buildings (TOKO KELONTONG, BENGKEL LAS). Internal ids
  (penumpang/paket/makanan, pagi/siang/sore/malam) are code only.
- Skill tiers are sequential: tier 2 requires tier 1 owned in the same
  branch, tier 3 requires tier 2. Each tier costs 1 point.
