// OJEK! King of the Streets — the Geng Macan story arc: seven missions against the
// rival gang, from a first order to a race-and-fight finale. Missions unlock
// with rank; each pays cash and XP, and the finale pays big.

import * as THREE from 'three';
import { CITY, LANDMARKS } from './config.js';
import { buildBike, buildCharacter, poseRiding } from './vehicles.js';
import { worldRandom as rng } from './random.js';

export const STORY_MISSIONS = [
  { id: 'm1', title: 'New Depot', brief: 'Geng Macan has its eye on your depot. Prove you can ride: finish any 1 order.', kind: 'deliver-any', reward: 25000, xp: 60, minRank: 0 },
  { id: 'm2', title: 'Street Race', brief: 'Joko Macan challenges you to a race to the market crossroads. Get there first, or be laughed at all over town.', kind: 'race', reward: 50000, xp: 100, minRank: 1 },
  { id: 'm3', title: 'Hot Delivery', brief: 'A VIP food order must arrive hot. Take a food order and deliver it before it goes cold.', kind: 'deliver-food', reward: 40000, xp: 90, minRank: 1 },
  { id: 'm4', title: 'Catch the Thief', brief: 'A snatch thief is fleeing on a stolen bike. Chase him down and pin him.', kind: 'chase', reward: 60000, xp: 110, minRank: 2 },
  { id: 'm5', title: 'Guard the Food Stall', brief: 'Geng Macan is shaking down the market stalls. Get off your bike and chase all three of them off.', kind: 'fight', reward: 75000, xp: 130, minRank: 2 },
  { id: 'm6', title: 'Night of Dread', brief: 'A night order down a quiet road. Muggers are waiting. Get your order delivered safe.', kind: 'deliver-night', reward: 90000, xp: 150, minRank: 3 },
  { id: 'm7', title: 'Finale: King vs Tiger', brief: 'Boss Macan challenges you: race to the riverside park, then a one-on-one duel. Win, and this city is yours.', kind: 'finale', reward: 250000, xp: 400, minRank: 4 },
];

export function createStory(scene, world) {
  const { city, combat, orders } = world;
  let active = null;
  let rider = null; // race rival / thief mesh
  let riderChar = null;
  let waypoints = [];
  let wpIndex = 0;
  let riderSpeed = 13;
  let fightTarget = 0;
  let fightDown = 0;
  let missionTimer = 0;

  function clearRider() {
    if (rider) { scene.remove(rider.group); rider = null; }
    if (riderChar) { scene.remove(riderChar.group); riderChar = null; }
    waypoints = [];
    wpIndex = 0;
  }

  function makeRider(color, shirt) {
    clearRider();
    rider = buildBike(color, 0.36);
    riderChar = buildCharacter({ shirt, pants: 0x222222, helmet: 0x8a1f1f });
    scene.add(rider.group);
    scene.add(riderChar.group);
  }

  function intersectionPoint() {
    const i = rng.int(1, CITY.blocksX - 1);
    const j = rng.int(1, CITY.blocksZ - 1);
    return { x: CITY.roadLine(i), z: CITY.roadLine(j) };
  }

  function raceWaypoints(from, to) {
    // Two legs along roads: first along the start road, then along the dest road.
    return [{ x: from.x, z: to.z }, { x: to.x, z: to.z }];
  }

  function start(mission, ctx) {
    const { player } = ctx;
    active = { mission, phase: 'go', data: {} };
    fightDown = 0;
    missionTimer = 0;
    if (mission.kind === 'race' || mission.kind === 'finale') {
      const dest = mission.kind === 'finale'
        ? { x: LANDMARKS.park.x, z: LANDMARKS.park.z }
        : intersectionPoint();
      active.data.dest = dest;
      active.data.rivalDone = false;
      makeRider(0x8a1f1f, 0x8a1f1f);
      const startPos = { x: player.pos.x + 4, z: player.pos.z + 4 };
      rider.group.position.set(startPos.x, 0, startPos.z);
      waypoints = raceWaypoints(startPos, dest);
      riderSpeed = mission.kind === 'finale' ? 16 : 13;
      orders.setBeacon(dest, 0xff5a5a);
      return { text: `${mission.title}: ${mission.brief}`, dest };
    }
    if (mission.kind === 'chase') {
      active.data.timeLeft = 150;
      makeRider(0x222222, 0x3a3a3a);
      const ahead = {
        x: player.pos.x + Math.sin(player.heading) * 30,
        z: player.pos.z + Math.cos(player.heading) * 30,
      };
      rider.group.position.set(ahead.x, 0, ahead.z);
      waypoints = [city.randomRoadPoint(rng)];
      riderSpeed = 12.5;
      return { text: `${mission.title}: ${mission.brief}` };
    }
    if (mission.kind === 'fight') {
      fightTarget = 3;
      for (let i = 0; i < 3; i += 1) {
        combat.spawn({
          x: LANDMARKS.market.x + rng.range(-10, 10),
          z: LANDMARKS.market.z + rng.range(-10, 10),
        }, { gang: true, hp: 60, reward: 10000 });
      }
      orders.setBeacon({ x: LANDMARKS.market.x, z: LANDMARKS.market.z }, 0xff5a5a);
      return { text: `${mission.title}: ${mission.brief}` };
    }
    if (mission.kind === 'deliver-food') {
      return { text: `${mission.title}: ${mission.brief} Open the phone (Q) and take a food order.` };
    }
    if (mission.kind === 'deliver-night') {
      // Muggers lie in wait on the route.
      for (let i = 0; i < 2; i += 1) {
        const p = city.randomRoadPoint(rng);
        combat.spawn(p, { gang: false, hp: 50, reward: 20000, name: 'Mugger' });
      }
      return { text: `${mission.title}: ${mission.brief} Careful, the night streets are not safe.` };
    }
    return { text: `${mission.title}: ${mission.brief}` };
  }

  function finish(success, reason) {
    const mission = active ? active.mission : null;
    clearRider();
    orders.hideBeacon();
    active = null;
    return { kind: success ? 'complete' : 'failed', mission, reason };
  }

  function moveRider(dt) {
    if (!rider || wpIndex >= waypoints.length) return true;
    const wp = waypoints[wpIndex];
    const pos = rider.group.position;
    const dx = wp.x - pos.x;
    const dz = wp.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 3) {
      wpIndex += 1;
      return wpIndex >= waypoints.length;
    }
    const heading = Math.atan2(dx, dz);
    let dh = heading - rider.group.rotation.y;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    rider.group.rotation.y += dh * Math.min(1, dt * 5);
    pos.x += Math.sin(rider.group.rotation.y) * riderSpeed * dt;
    pos.z += Math.cos(rider.group.rotation.y) * riderSpeed * dt;
    for (const w of rider.wheels) w.rotation.x += (riderSpeed / 0.36) * dt;
    riderChar.group.position.set(pos.x - Math.sin(rider.group.rotation.y) * 0.25, 0.62, pos.z - Math.cos(rider.group.rotation.y) * 0.25);
    riderChar.group.rotation.y = rider.group.rotation.y;
    poseRiding(riderChar);
    return false;
  }

  function update(dt, ctx) {
    if (!active) return null;
    const { player } = ctx;
    missionTimer += dt;
    const kind = active.mission.kind;

    if (kind === 'race' || (kind === 'finale' && active.phase === 'go')) {
      const rivalArrived = moveRider(dt);
      const dest = active.data.dest;
      const playerDist = Math.hypot(player.pos.x - dest.x, player.pos.z - dest.z);
      if (playerDist < 8) {
        if (kind === 'race') return finish(true);
        // Finale phase 2: the leader waits on foot.
        active.phase = 'fight';
        clearRider();
        combat.spawn({ x: dest.x + 3, z: dest.z + 3 }, { gang: true, hp: 150, damage: 14, speed: 3.6, reward: 50000, name: 'Boss Macan' });
        combat.spawn({ x: dest.x - 4, z: dest.z + 2 }, { gang: true, hp: 60, reward: 10000 });
        fightTarget = 1;
        fightDown = 0;
        return { kind: 'phase', text: 'Boss Macan gets off his bike. Duel him now!' };
      }
      if (rivalArrived) return finish(false, 'Rival got there first');
      if (missionTimer > 240) return finish(false, 'Time ran out');
      return null;
    }
    if (kind === 'chase') {
      active.data.timeLeft -= dt;
      // The thief re-picks a waypoint away from the player.
      if (wpIndex >= waypoints.length) {
        let p = city.randomRoadPoint(rng);
        let tries = 0;
        while (Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 40 && tries < 10) {
          p = city.randomRoadPoint(rng);
          tries += 1;
        }
        waypoints = [p];
        wpIndex = 0;
      }
      moveRider(dt);
      const d = Math.hypot(rider.group.position.x - player.pos.x, rider.group.position.z - player.pos.z);
      if (d < 6) return finish(true);
      if (active.data.timeLeft <= 0) return finish(false, 'The thief got away');
      return null;
    }
    if (kind === 'finale' && active.phase === 'fight') {
      if (fightDown >= fightTarget) return finish(true);
      return null;
    }
    if (kind === 'fight') {
      if (fightDown >= fightTarget) return finish(true);
      return null;
    }
    return null;
  }

  function onOrderDelivered(order, isNight) {
    if (!active) return null;
    const kind = active.mission.kind;
    if (kind === 'deliver-any') return finish(true);
    if (kind === 'deliver-food' && order.type === 'makanan') return finish(true);
    if (kind === 'deliver-night' && isNight) return finish(true);
    return null;
  }

  function onEnemyDown(enemy) {
    if (!active) return null;
    const kind = active.mission.kind;
    if (kind === 'fight' || (kind === 'finale' && active.phase === 'fight')) {
      if (kind === 'finale' && enemy.name !== 'Boss Macan') return null;
      fightDown += 1;
      if (fightDown >= fightTarget) return finish(true);
    }
    return null;
  }

  function onKnockedOut() {
    if (!active) return null;
    const kind = active.mission.kind;
    if (kind === 'fight' || kind === 'finale' || kind === 'deliver-night') {
      return finish(false, 'You lost the fight');
    }
    return null;
  }

  function cancel() {
    if (!active) return;
    clearRider();
    orders.hideBeacon();
    active = null;
  }

  return {
    missions: STORY_MISSIONS,
    get active() { return active; },
    start,
    update,
    cancel,
    onOrderDelivered,
    onEnemyDown,
    onKnockedOut,
    get riderPos() { return rider ? rider.group.position : null; },
    get dest() { return active && active.data ? active.data.dest : null; },
  };
}
