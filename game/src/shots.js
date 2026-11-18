// OJEK! King of the Streets — screenshot staging: deterministic scenes for the
// four screenshots, driven by ?shot=<scene>&seed=<n>. Each scene sets the
// time, weather, wanted level, order and camera, waits for the frame to
// settle, then sets window.__shotReady so the capture script can shoot.

import { CITY, LANDMARKS, fmtRp } from './config.js';

export function createShots(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot') || params.get('stage');
  if (!shot) return { shot: null, update() {} };

  let staged = false;
  let stagedAt = 0;
  window.__shotReady = false;

  function placeOnRoad(x, z, heading) {
    game.player.teleport(x, z, heading);
    if (!game.player.riding) game.player.mountOwn();
  }

  function stageCover() {
    // Rider-first cover: the ojek character large and centered, police kept
    // far down the road — visible, but never near or overlapping the rider.
    game.daycycle.setHour(16.4);
    game.daycycle.setWeather('clear');
    // No passenger: from the chase cam a passenger sits between the camera
    // and the rider and hides him. The order below is a parcel anyway.
    game.player.setPassenger(false);
    // Unlock the active skills so the HUD skill bar shows them live:
    // Nitro and Lay Low ready, Quick Fix mid-cooldown.
    game.profile.skills = { speed: 1, business: 1, street: 2 };
    game.profile.skillPoints = 1;
    game.applySkillEffects();
    game.skillCd.fix = 30;
    const road = CITY.roadLine(5);
    placeOnRoad(road, CITY.roadLine(4) - 40, 0);
    // Green paint so the bike reads as one distinct shape under the rider.
    if (game.player.state.entry) {
      game.player.setEntry({ ...game.player.state.entry, paint: 0x2e9e5b });
    }
    game.player.state.speed = 9;
    // Closer chase camera so the rider fills the frame (default is 7),
    // locked at a 3/4 rear angle so the bike's side reads instead of being
    // hidden behind the rider's body.
    game.camera.setDistance(4.8);
    game.camera.setShotYaw(0.38);
    // A parcel/food/rush order (no passenger expected on the bike).
    const board = game.orders.board;
    const picked = board.find((o) => o.type === 'paket' || o.type === 'makanan' || o.type === 'kilat') || board[0];
    const order = game.orders.accept(picked.id, game.player.pos);
    if (order) {
      // Skip to the delivery leg so the beacon and HUD show the destination.
      order.stage = 'deliver';
      game.orders.setBeacon(order.dest, 0xffd24a);
    }
    game.police.setWanted(2);
    // Police FAR down the road only, HELD in place: two cars head-on at 48
    // and 64 ahead, one behind the camera. Held cars never chase, so the
    // gap is deterministic — the rider closes ~10-18 during the settle and
    // the cars still read as distant, small, and clearly separated from
    // him. Their light bars keep flashing.
    const pz = game.player.pos.z;
    const cars = game.police.cars;
    if (cars[0]) { cars[0].pos.set(road + 3, 0, pz + 48); cars[0].heading = Math.PI; cars[0].speed = 0; cars[0].held = true; }
    if (cars[1]) { cars[1].pos.set(road - 3, 0, pz + 64); cars[1].heading = Math.PI; cars[1].speed = 0; cars[1].held = true; }
    if (cars[2]) { cars[2].pos.set(road, 0, pz - 60); cars[2].heading = 0; cars[2].speed = 0; cars[2].held = true; }
    // Civilian life well ahead, never near the rider: one same-direction
    // car pulling away, one oncoming car far enough out to stay clear.
    game.traffic.spawnVehicle({ vertical: true, line: road, dir: 1, along: pz + 45 });
    game.traffic.spawnVehicle({ vertical: true, line: road, dir: -1, along: pz + 90 });
    game.ui.banner('VIP Order', 'Deliver before time runs out', 4000);
  }

  function stageTitle() {
    game.daycycle.setHour(9.0);
    game.daycycle.setWeather('clear');
    game.setMode('title');
    game.menus.show('title');
  }

  function stageDealer() {
    game.daycycle.setHour(10.5);
    game.daycycle.setWeather('clear');
    game.player.teleport(LANDMARKS.dealer.x, LANDMARKS.dealer.z + 12, Math.PI);
    if (!game.player.riding) game.player.mountOwn();
    game.setMode('menu');
    game.menus.show('dealer');
  }

  function stageResults() {
    game.daycycle.setHour(17.8);
    game.daycycle.setWeather('clear');
    game.setMode('menu');
    game.menus.show('results', {
      title: 'Mission Complete: New Depot',
      sub: 'Geng Macan fell back. The depot is safe for today.',
      stats: [
        ['Orders done', '12'],
        ['Earnings today', fmtRp(486000)],
        ['Distance ridden', '38.4 km'],
        ['Rating', '4.8 out of 5'],
        ['Best streak', '7 orders'],
        ['Rank', 'Pro Driver'],
      ],
    });
  }

  function stageSkills() {
    // The skill tree: mixed states so the shot reads at a glance — two
    // branches with tier 1 owned and tier 2 buyable, one branch untouched.
    game.daycycle.setHour(10.5);
    game.daycycle.setWeather('clear');
    game.profile.skills = { speed: 1, business: 1, street: 0 };
    game.profile.skillPoints = 2;
    game.applySkillEffects();
    game.setMode('menu');
    game.menus.show('phone', { tab: 'skills' });
  }

  function stageSkillsGame() {
    // Gameplay with the skill bar live: Nitro firing, Lay Low ready,
    // Quick Fix mid-cooldown, wanted heat on.
    game.daycycle.setHour(13.2);
    game.daycycle.setWeather('clear');
    game.profile.skills = { speed: 1, business: 0, street: 2 };
    game.profile.skillPoints = 1;
    game.applySkillEffects();
    game.skillCd.fix = 30;
    const road = CITY.roadLine(5);
    placeOnRoad(road, CITY.roadLine(4) - 40, 0);
    game.player.state.speed = 16;
    game.player.activateNitro(3);
    game.police.setWanted(2);
    const order = game.orders.accept(game.orders.board[0].id, game.player.pos);
    if (order) {
      order.stage = 'deliver';
      game.orders.setBeacon(order.dest, 0xffd24a);
    }
  }

  function stageFoot() {
    game.daycycle.setHour(11.0);
    game.daycycle.setWeather('clear');
    const m = LANDMARKS.market;
    game.player.teleport(m.x + 6, m.z + 6, 0.6);
    if (game.player.riding) game.player.dismount();
  }

  function stageChase() {
    game.daycycle.setHour(19.2);
    game.daycycle.setWeather('cloudy');
    game.player.setPassenger(false);
    const road = CITY.roadLine(6);
    placeOnRoad(road, CITY.roadLine(7) - 30, 0);
    game.player.state.speed = 24;
    game.police.setWanted(5);
  }

  function stage() {
    if (shot === 'cover') stageCover();
    else if (shot === 'title') stageTitle();
    else if (shot === 'dealer') stageDealer();
    else if (shot === 'results') stageResults();
    else if (shot === 'skills') stageSkills();
    else if (shot === 'skills-game') stageSkillsGame();
    else if (shot === 'foot') stageFoot();
    else if (shot === 'chase') stageChase();
    staged = true;
    stagedAt = performance.now();
  }

  function update() {
    if (!staged) stage();
    // Wall-clock settle: on a slow software renderer the simulated clock
    // crawls, so readiness is measured in real time, not game time.
    if (staged && !window.__shotReady && performance.now() - stagedAt > 4000) {
      window.__shotReady = true;
    }
  }

  return { shot, update };
}
