// OJEK! King of the Streets — traffic: cars, angkot, bajaj and trucks driving the
// road grid, stopping at red lights, bunching into jams, plus parked bikes
// and cars the player can borrow. Every vehicle follows a road line and
// turns at intersections; nothing pathfinds off-road.

import * as THREE from 'three';
import { CITY } from './config.js';
import { buildBike, buildCar } from './vehicles.js';
import { worldRandom as rng } from './random.js';

const CAR_COLORS = [0xc23b3b, 0x2e6db0, 0xe8e8e8, 0x2a2a2a, 0xd4a017, 0x8e44ad, 0x4a90a4, 0xe67e22];
const TRAFFIC_TYPES = ['sedan', 'sedan', 'sedan', 'angkot', 'bajaj', 'truck'];

function randomRoad(r) {
  const vertical = r.chance(0.5);
  const i = r.int(0, CITY.blocksX);
  return { vertical, line: CITY.roadLine(i), dir: r.chance(0.5) ? 1 : -1 };
}

export function createTraffic(scene, city) {
  const vehicles = [];
  const parked = [];
  const half = CITY.size / 2;

  function spawnVehicle(at) {
    const type = rng.pick(TRAFFIC_TYPES);
    const built = buildCar(rng.pick(CAR_COLORS), type);
    scene.add(built.group);
    const road = at || randomRoad(rng);
    const v = {
      built,
      type,
      vertical: road.vertical,
      line: road.line,
      dir: road.dir,
      along: road.along ?? rng.range(-half + 30, half - 30),
      speed: 0,
      cruise: type === 'truck' ? rng.range(7, 9) : type === 'bajaj' ? rng.range(8, 11) : rng.range(10, 14),
      length: type === 'truck' ? 6.4 : type === 'angkot' ? 3.6 : 4.2,
      width: type === 'truck' ? 2.1 : 1.8,
      wait: 0,
    };
    vehicles.push(v);
    return v;
  }

  function vehiclePos(v) {
    return v.vertical
      ? { x: v.line + v.dir * 3.2, z: v.along }
      : { x: v.along, z: v.line + v.dir * 3.2 };
  }

  function headingOf(v) {
    if (v.vertical) return v.dir > 0 ? 0 : Math.PI;
    return v.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  function placeParked() {
    const spots = [];
    for (let i = 0; i < 14; i += 1) {
      const vertical = rng.chance(0.5);
      const line = CITY.roadLine(rng.int(1, CITY.blocksX - 1));
      const along = rng.range(-half + 40, half - 40);
      const isBike = rng.chance(0.6);
      const built = isBike
        ? buildBike(rng.pick(CAR_COLORS), 0.35)
        : buildCar(rng.pick(CAR_COLORS), 'sedan');
      const x = vertical ? line + 5.6 : along;
      const z = vertical ? along : line + 5.6;
      const heading = vertical ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
      built.group.position.set(x, 0, z);
      built.group.rotation.y = heading;
      scene.add(built.group);
      spots.push({ built, isBike, x, z, heading, taken: false });
    }
    parked.push(...spots);
  }

  placeParked();
  for (let i = 0; i < 26; i += 1) spawnVehicle();

  function nextIntersection(v) {
    // Index of the intersection ahead on this vehicle's road.
    const ahead = v.along + v.dir * 10;
    const idx = Math.round((ahead + half - CITY.road / 2) / CITY.pitch);
    return THREE.MathUtils.clamp(idx, 0, CITY.blocksX);
  }

  function update(dt, time, density) {
    const targetCount = Math.round(26 * density);
    while (vehicles.length < targetCount) spawnVehicle();
    for (let i = vehicles.length - 1; i >= 0; i -= 1) {
      const v = vehicles[i];
      const pos = vehiclePos(v);
      // Traffic light: stop if the next intersection shows red for our axis.
      let wantSpeed = v.cruise;
      const ni = nextIntersection(v);
      const distToLight = Math.abs(CITY.roadLine(ni) - v.along);
      if (distToLight < 16 && distToLight > 0) {
        const ix = v.vertical ? Math.round((v.line + half - CITY.road / 2) / CITY.pitch) : ni;
        const iz = v.vertical ? ni : Math.round((v.line + half - CITY.road / 2) / CITY.pitch);
        const state = city.lightState(ix, iz, time);
        if (state) {
          const greenForUs = v.vertical ? state.startsWith('ns') : state.startsWith('ew');
          if (!greenForUs) wantSpeed = 0;
        }
      }
      // Car ahead on the same lane: slow down, never overlap.
      for (const o of vehicles) {
        if (o === v || o.vertical !== v.vertical || o.line !== v.line || o.dir !== v.dir) continue;
        const gap = (o.along - v.along) * v.dir;
        if (gap > 0 && gap < 11) wantSpeed = Math.min(wantSpeed, Math.max(0, (gap - 6) * 1.2));
      }
      v.speed += (wantSpeed - v.speed) * Math.min(1, dt * 1.8);
      v.along += v.speed * v.dir * dt;
      // At the city edge, or sometimes at an intersection, re-route.
      const edge = half - 12;
      if (Math.abs(v.along) > edge) {
        const road = randomRoad(rng);
        v.vertical = road.vertical;
        v.line = road.line;
        v.dir = road.dir;
        v.along = -road.dir * (half - 20);
      } else if (v.speed > 1) {
        const idx = Math.round((v.along + half - CITY.road / 2) / CITY.pitch);
        const linePos = CITY.roadLine(idx);
        if (Math.abs(v.along - linePos) < v.speed * dt + 0.4 && rng.chance(0.12)) {
          // Turn onto the crossing road.
          const oldLine = v.line;
          v.vertical = !v.vertical;
          v.line = linePos;
          v.along = oldLine;
          v.dir = rng.chance(0.5) ? 1 : -1;
        }
      }
      const p = vehiclePos(v);
      v.built.group.position.set(p.x, 0, p.z);
      const targetHeading = headingOf(v);
      let dh = targetHeading - v.built.group.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      v.built.group.rotation.y += dh * Math.min(1, dt * 4);
      for (const w of v.built.wheels) w.rotation.x += (v.speed / 0.38) * dt;
    }
    for (const p of parked) {
      if (p.taken) continue;
      // Parked bikes idle upright; nothing moves them.
    }
  }

  function nearestParked(x, z, radius) {
    let best = null;
    let bestD = radius;
    for (const p of parked) {
      if (p.taken) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  function takeParked(p) {
    p.taken = true;
    scene.remove(p.built.group);
    return p;
  }

  function returnParked(p, x, z, heading) {
    p.taken = false;
    p.x = x;
    p.z = z;
    p.heading = heading;
    p.built.group.position.set(x, 0, z);
    p.built.group.rotation.y = heading;
    scene.add(p.built.group);
  }

  function nearestTraffic(x, z, radius) {
    let best = null;
    let bestD = radius;
    for (const v of vehicles) {
      const p = vehiclePos(v);
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) { bestD = d; best = { v, pos: p, dist: d }; }
    }
    return best;
  }

  return {
    update,
    vehicles,
    parked,
    vehiclePos,
    nearestParked,
    takeParked,
    returnParked,
    nearestTraffic,
    spawnVehicle,
  };
}
