// OJEK! King of the Streets — pedestrians: walkers with destinations, warung
// crowds, waiting passengers who wave, and knockdowns when a bike clips one.
// Walkers move along the sidewalks in Manhattan steps so they stay out of
// buildings and mostly out of the road.

import * as THREE from 'three';
import { CITY, LANDMARKS } from './config.js';
import { buildCharacter, poseWalk, poseIdle } from './vehicles.js';
import { worldRandom as rng } from './random.js';

const SIDE = 8.6; // sidewalk offset from a road centre line

function sidewalkPoint() {
  const vertical = rng.chance(0.5);
  const line = CITY.roadLine(rng.int(0, CITY.blocksX));
  const along = rng.range(-CITY.size / 2 + 20, CITY.size / 2 - 20);
  const off = rng.chance(0.5) ? SIDE : -SIDE;
  return vertical ? { x: line + off, z: along } : { x: along, z: line + off };
}

export function createPedestrians(scene) {
  const walkers = [];
  const waiting = [];

  function addWalker(at, opts = {}) {
    const char = buildCharacter(opts);
    char.group.position.set(at.x, 0, at.z);
    scene.add(char.group);
    const w = {
      char,
      pos: new THREE.Vector3(at.x, 0, at.z),
      dest: sidewalkPoint(),
      speed: rng.range(1.1, 1.9),
      phase: rng.range(0, Math.PI * 2),
      idle: opts.idle ? rng.range(2, 8) : 0,
      knocked: 0,
      wave: false,
      axis: rng.chance(0.5) ? 'x' : 'z',
    };
    walkers.push(w);
    return w;
  }

  for (let i = 0; i < 42; i += 1) addWalker(sidewalkPoint());
  // Warung crowds: small groups standing near the market stalls.
  for (let i = 0; i < 8; i += 1) {
    const w = addWalker({
      x: LANDMARKS.market.x + rng.range(-26, 26),
      z: LANDMARKS.market.z + rng.range(-26, 26),
    }, { idle: true });
    w.idle = rng.range(6, 20);
  }

  function update(dt) {
    for (const w of walkers) {
      if (w.knocked > 0) {
        w.knocked -= dt;
        w.char.group.rotation.x = -Math.PI / 2 * Math.min(1, w.knocked);
        if (w.knocked <= 0) {
          w.char.group.rotation.x = 0;
          w.dest = sidewalkPoint();
        }
        continue;
      }
      if (w.wave) {
        w.char.armR.rotation.x = -2.4 + Math.sin(w.phase * 6) * 0.4;
        w.phase += dt;
        continue;
      }
      if (w.idle > 0) {
        w.idle -= dt;
        poseIdle(w.char);
        if (w.idle <= 0) w.dest = sidewalkPoint();
        continue;
      }
      const dx = w.dest.x - w.pos.x;
      const dz = w.dest.z - w.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.2) {
        if (rng.chance(0.3)) w.idle = rng.range(2, 9);
        w.dest = sidewalkPoint();
        w.axis = rng.chance(0.5) ? 'x' : 'z';
        continue;
      }
      // Manhattan walk: one axis at a time, so walkers stay on sidewalks.
      let mx = 0;
      let mz = 0;
      if (w.axis === 'x' && Math.abs(dx) > 0.6) mx = Math.sign(dx);
      else if (Math.abs(dz) > 0.6) mz = Math.sign(dz);
      else mx = Math.sign(dx);
      w.pos.x += mx * w.speed * dt;
      w.pos.z += mz * w.speed * dt;
      const heading = Math.atan2(mx, mz);
      let dh = heading - w.char.group.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      w.char.group.rotation.y += dh * Math.min(1, dt * 8);
      w.phase += dt * w.speed * 4.2;
      poseWalk(w.char, w.phase, 1);
      w.char.group.position.copy(w.pos);
    }
  }

  // A waiting passenger at a pickup point, waving until collected.
  function spawnWaiting(at) {
    const w = addWalker(at);
    w.wave = true;
    w.dest = { x: at.x, z: at.z };
    waiting.push(w);
    return w;
  }

  function removeWaiting(w) {
    const i = walkers.indexOf(w);
    if (i >= 0) { scene.remove(w.char.group); walkers.splice(i, 1); }
    const j = waiting.indexOf(w);
    if (j >= 0) waiting.splice(j, 1);
  }

  function nearest(x, z, radius) {
    let best = null;
    let bestD = radius;
    for (const w of walkers) {
      if (w.knocked > 0) continue;
      const d = Math.hypot(w.pos.x - x, w.pos.z - z);
      if (d < bestD) { bestD = d; best = w; }
    }
    return best;
  }

  function knockdown(w) {
    if (w.knocked > 0) return false;
    w.knocked = 3.5;
    w.wave = false;
    return true;
  }

  return { update, spawnWaiting, removeWaiting, nearest, knockdown, walkers };
}
