// OJEK! King of the Streets — wanted levels and the police: patrol cars that chase
// and ram, roadblocks from tier 3, a helicopter at tier 5, and a bust when a
// car pins the player down. Wanted fades only when no police can see the
// player, so losing them means breaking line of sight.

import * as THREE from 'three';
import { CITY, WANTED } from './config.js';
import { buildCar, buildHelicopter } from './vehicles.js';
import { worldRandom as rng } from './random.js';

export function createPolice(scene, city, audio) {
  let wanted = 0;
  let unseenTimer = 0;
  let bustTimer = 0;
  let decayMult = 1;
  const cars = [];
  const roadblocks = [];
  let heli = null;
  let heliAngle = 0;

  function spawnCar(near) {
    const built = buildCar(0xf2f2f2, 'police');
    scene.add(built.group);
    const p = city.randomRoadPoint(rng);
    const car = {
      built,
      pos: new THREE.Vector3(p.x, 0, p.z),
      heading: rng.range(0, Math.PI * 2),
      speed: 0,
      stuck: 0,
      flash: rng.next(),
    };
    cars.push(car);
    return car;
  }

  function spawnRoadblock(playerPos, playerHeading) {
    // Two cars parked across the road ahead of the player.
    const ahead = 55;
    const cx = playerPos.x + Math.sin(playerHeading) * ahead;
    const cz = playerPos.z + Math.cos(playerHeading) * ahead;
    const snapped = city.nearestRoadPoint(cx, cz);
    for (const off of [-3.4, 3.4]) {
      const built = buildCar(0xf2f2f2, 'police');
      const px = snapped.x + Math.cos(playerHeading) * off;
      const pz = snapped.z - Math.sin(playerHeading) * off;
      built.group.position.set(px, 0, pz);
      built.group.rotation.y = playerHeading + Math.PI / 2;
      scene.add(built.group);
      roadblocks.push({ built, pos: new THREE.Vector3(px, 0, pz) });
    }
  }

  function clearRoadblocks() {
    for (const r of roadblocks) scene.remove(r.built.group);
    roadblocks.length = 0;
  }

  function ensureHelicopter() {
    if (heli) return;
    heli = buildHelicopter();
    scene.add(heli.group);
  }

  function removeHelicopter() {
    if (!heli) return;
    scene.remove(heli.group);
    heli = null;
  }

  function setWanted(n, silent = false) {
    const before = wanted;
    wanted = THREE.MathUtils.clamp(n, 0, 5);
    if (wanted === 0) {
      for (const c of cars) scene.remove(c.built.group);
      cars.length = 0;
      clearRoadblocks();
      removeHelicopter();
      audio.setSiren(false);
      bustTimer = 0;
    } else {
      audio.setSiren(true);
      const wantCars = Math.min(4, wanted + (wanted >= 2 ? 1 : 0));
      while (cars.length < wantCars) spawnCar();
      if (wanted >= 5) ensureHelicopter();
      else removeHelicopter();
      if (wanted >= 3 && before < 3) clearRoadblocks();
    }
    unseenTimer = 0;
    return wanted;
  }

  function addWanted(n) {
    if (n <= 0) return wanted;
    return setWanted(wanted + n);
  }

  function update(dt, player, time) {
    if (wanted === 0) return null;
    const playerPos = player.pos;
    const playerSpeed = player.speedKmh;
    let anyNear = false;
    let closest = Infinity;

    for (let i = cars.length - 1; i >= 0; i -= 1) {
      const c = cars[i];
      const dx = playerPos.x - c.pos.x;
      const dz = playerPos.z - c.pos.z;
      const dist = Math.hypot(dx, dz);
      closest = Math.min(closest, dist);
      if (dist < 90) anyNear = true;
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const maxSpeed = 16 + wanted * 2.2;
      c.heading += THREE.MathUtils.clamp(dh, -2.2 * dt, 2.2 * dt);
      const want = dist > 4 ? maxSpeed : 0;
      c.speed += (want - c.speed) * Math.min(1, dt * 1.5);
      const prevX = c.pos.x;
      const prevZ = c.pos.z;
      c.pos.x += Math.sin(c.heading) * c.speed * dt;
      c.pos.z += Math.cos(c.heading) * c.speed * dt;
      const hit = city.resolveCircle(c.pos, 1.4);
      const moved = Math.hypot(c.pos.x - prevX, c.pos.z - prevZ);
      if (c.speed > 3 && moved < c.speed * dt * 0.3) {
        c.stuck += dt;
        if (c.stuck > 4) {
          // Stuck on a building: respawn on a road near the player.
          const p = city.randomRoadPoint(rng);
          c.pos.set(p.x, 0, p.z);
          c.stuck = 0;
        }
      } else {
        c.stuck = 0;
      }
      c.built.group.position.copy(c.pos);
      c.built.group.rotation.y = c.heading;
      for (const w of c.built.wheels) w.rotation.x += (c.speed / 0.38) * dt;
      // Flashing light bar.
      c.flash += dt * 6;
      const on = Math.sin(c.flash) > 0;
      if (c.built.group.userData.lightBar) {
        c.built.group.userData.lightBar.red.material.emissiveIntensity = on ? 2.2 : 0.2;
        c.built.group.userData.lightBar.blue.material.emissiveIntensity = on ? 0.2 : 2.2;
      }
      // Ramming the player slows the player down.
      if (dist < 2.6 && player.riding && Math.abs(player.speedKmh) > 5) {
        player.state.speed *= 0.55;
      }
    }

    // Roadblocks: spawn one ahead when the player is moving fast at tier 3+.
    if (wanted >= 3 && roadblocks.length === 0 && playerSpeed > 30 && rng.chance(dt * 0.12)) {
      spawnRoadblock(playerPos, player.heading);
    }
    if (wanted >= 3) {
      for (const r of roadblocks) {
        const d = Math.hypot(playerPos.x - r.pos.x, playerPos.z - r.pos.z);
        if (d < 2.8 && player.riding) {
          player.state.speed *= 0.2;
        }
        if (d > 160) {
          scene.remove(r.built.group);
          roadblocks.splice(roadblocks.indexOf(r), 1);
          break;
        }
      }
    }

    // Helicopter circles above the player at tier 5.
    if (heli) {
      heliAngle += dt * 0.5;
      heli.group.position.set(
        playerPos.x + Math.cos(heliAngle) * 22,
        34,
        playerPos.z + Math.sin(heliAngle) * 22,
      );
      heli.group.lookAt(playerPos.x, 0, playerPos.z);
      heli.rotor.rotation.y += dt * 22;
    }

    // Seen or not: any police car within 60 m, or the helicopter, keeps the heat on.
    const seen = anyNear || !!heli;
    if (!seen) {
      unseenTimer += dt;
      if (unseenTimer > WANTED.decaySeconds * decayMult) {
        unseenTimer = 0;
        setWanted(wanted - 1);
      }
    } else {
      unseenTimer = 0;
    }

    // Busted: a car stays close while the player is slow or stopped.
    if (closest < 5 && playerSpeed < 12) {
      bustTimer += dt;
      if (bustTimer > WANTED.bustHoldSeconds) {
        bustTimer = 0;
        setWanted(0);
        return { kind: 'busted' };
      }
    } else {
      bustTimer = 0;
    }
    return null;
  }

  return {
    get wanted() { return wanted; },
    get cars() { return cars; },
    get roadblocks() { return roadblocks; },
    get helicopter() { return heli; },
    get bustProgress() { return bustTimer / WANTED.bustHoldSeconds; },
    setWanted,
    addWanted,
    update,
    setDecayMult(n) { decayMult = n; },
  };
}
