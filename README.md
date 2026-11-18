[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/JefaCVC/ojek-rajajalanan/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/JefaCVC/ojek-rajajalanan/reward.svg)](https://make.fun/c/best-game-01)

# OJEK! King of the Streets

A 3D open-world game: ride as an ojek (motorbike taxi) driver in a living
Indonesian city. Pick up passengers, deliver parcels and hot food, fight the
Geng Macan gang, dodge the police, and climb from Rookie Rider to King of
the Streets. Built with Three.js, no build step, no network. An entry for
[make.fun best-game-01](https://make.fun/c/best-game-01).

## Play

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## Controls

| Key | Action |
| --- | --- |
| WASD | Walk, throttle, brake, steer |
| E | Mount/dismount bike, interact (dealer, garage, gas station) |
| Q | Phone (orders, skills, garage, stats, map, radio) |
| 1 / Shift | Nitro Boost (skill) |
| 2 | Quick Fix (skill) |
| 3 | Lay Low (skill) |
| F | Punch (on foot) |
| Space | Dodge (on foot) |
| H | Horn |
| R | Switch radio station |
| M | Mute sound |
| Esc | Pause |
| Drag mouse | Orbit camera |
| F3 | Debug panel |

## What is in the game

- A 3D city with five districts (downtown, market, kampung, port,
  riverside) with a river and bridges, a mosque, a school, gas stations,
  a dealer, a garage, a park, traffic, pedestrians, and a day/night cycle.
- Free-choice orders: passengers, parcels, timed food delivery, VIP rides,
  rush parcels. The price shows before you take the job; fares rise at
  rush hour and in the rain.
- Economy: money, fuel, service, 7 bikes at the dealer, engine/tire/brake
  upgrades, bike paint, a garage.
- Star rating and a streak multiplier up to x2.0; 6 ranks unlock districts,
  order tiers, and new bikes.
- A skill tree with 3 branches (Rider, Hustler, Survivor), 3 tiers each.
  Points come from rank-ups and story missions. Active skills with
  cooldowns: Nitro Boost, Quick Fix, Lay Low.
- Daily challenges with money and XP rewards, an earnings log, and a
  full-city map on the phone.
- 5 wanted tiers: police cars chase, roadblocks at tier 3, a helicopter
  at tier 5.
- A 7-mission Geng Macan story arc: races, thief chases, guarding a food
  stall, a final duel.
- Light combat: punch, dodge, night muggers.
- Weather (clear, cloudy, rain), random road events (flood, protest,
  crash), procedural radio, achievements, a tutorial, a codex, autosave.

## Screenshots

Four screenshots in `screenshots/`, taken from the running game in headless
Chromium (see `shots.json` for each scene).

## License

MIT. Three.js (MIT) is used as `*.min.js` builds in `game/vendor/three/`.
