// OJEK! King of the Streets — the player: on foot and on a bike, with fuel,
// condition, punches, dodges and a passenger seat. One controller drives the
// player's own bike and any borrowed vehicle; the numbers come from the
// bike's spec, its upgrades and its condition.

import * as THREE from 'three';
import { bikeById, ECONOMY, COMBAT } from './config.js';
import { buildBike, buildCar, buildCharacter, poseWalk, poseRiding, poseIdle } from './vehicles.js';

const BORROWED_SPECS = {
  sedan: { topSpeed: 140, accel: 0.8, handling: 0.8, brake: 0.85 },
  angkot: { topSpeed: 100, accel: 0.6, handling: 0.7, brake: 0.7 },
  bajaj: { topSpeed: 82, accel: 0.65, handling: 0.9, brake: 0.7 },
  truck: { topSpeed: 92, accel: 0.5, handling: 0.6, brake: 0.6 },
  bike: { topSpeed: 95, accel: 0.7, handling: 0.85, brake: 0.7 },
};

export function createPlayer(scene, world) {
  const { city, traffic, pedestrians, effects, audio } = world;
  const char = buildCharacter({ shirt: 0x1f9e4d, pants: 0x2a2a35, helmet: 0x1f9e4d });
  scene.add(char.group);
  let bikeMesh = null;
  let passenger = null;
  let passengerChar = null;
  let maxHp = COMBAT.playerHp;
  let skillMods = { topSpeed: 1, handling: 1 };
  let nitroTimer = 0;

  const state = {
    pos: new THREE.Vector3(0, 0, 0),
    heading: 0,
    speed: 0,
    riding: false,
    hp: COMBAT.playerHp,
    walkPhase: 0,
    punchTimer: 0,
    punchCooldown: 0,
    dodgeTimer: 0,
    dodgeCooldown: 0,
    hitStop: 0,
    lean: 0,
    skidTimer: 0,
    crashCooldown: 0,
    downTimer: 0,
    entry: null, // profile bike entry when riding the player's own bike
    borrowed: null, // { kind, spec, fuel, condition, parkedRef } when riding a borrowed vehicle
    ownParked: null, // { x, z, heading } where the own bike waits
  };

  function effectiveSpec() {
    if (state.borrowed) return state.borrowed.spec;
    const spec = bikeById(state.entry ? state.entry.id : 'bebek-tua');
    const up = state.entry ? state.entry.upgrades : { engine: 0, tires: 0, brakes: 0 };
    const cond = state.entry ? state.entry.condition : 100;
    const condFactor = 0.6 + (cond / 100) * 0.4;
    const nitro = nitroTimer > 0 ? 1.6 : 1;
    return {
      topSpeed: spec.topSpeed * (1 + up.engine * 0.12) * condFactor * skillMods.topSpeed * nitro,
      accel: spec.accel * (1 + up.engine * 0.1) * (nitroTimer > 0 ? 1.5 : 1),
      handling: spec.handling * (1 + up.tires * 0.06) * skillMods.handling,
      brake: spec.brake * (1 + up.brakes * 0.1),
      gripBonus: up.tires * 0.06,
    };
  }

  function buildOwnBike() {
    if (bikeMesh) scene.remove(bikeMesh.group);
    const spec = bikeById(state.entry ? state.entry.id : 'bebek-tua');
    const color = state.entry && state.entry.paint != null ? state.entry.paint : spec.color;
    bikeMesh = buildBike(color, spec.wheel);
    scene.add(bikeMesh.group);
  }

  function setPassenger(on) {
    if (on && !passengerChar) {
      passengerChar = buildCharacter({});
      scene.add(passengerChar.group);
      passenger = true;
    } else if (!on && passengerChar) {
      scene.remove(passengerChar.group);
      passengerChar = null;
      passenger = false;
    }
  }

  function syncMeshes() {
    if (state.riding && bikeMesh) {
      bikeMesh.group.position.copy(state.pos);
      bikeMesh.group.rotation.y = state.heading;
      bikeMesh.group.rotation.z = state.lean;
      for (const w of bikeMesh.wheels) w.rotation.x += (state.speed / 0.35) * 0.016;
      char.group.position.set(
        state.pos.x - Math.sin(state.heading) * 0.25,
        0.62,
        state.pos.z - Math.cos(state.heading) * 0.25,
      );
      char.group.rotation.y = state.heading;
      poseRiding(char);
      if (passengerChar) {
        passengerChar.group.position.set(
          state.pos.x - Math.sin(state.heading) * 0.75,
          0.62,
          state.pos.z - Math.cos(state.heading) * 0.75,
        );
        passengerChar.group.rotation.y = state.heading;
        poseRiding(passengerChar);
      }
    } else {
      char.group.position.copy(state.pos);
      char.group.rotation.y = state.heading;
      if (passengerChar) {
        passengerChar.group.position.set(
          state.pos.x + Math.sin(state.heading + Math.PI / 2) * 0.7,
          0,
          state.pos.z + Math.cos(state.heading + Math.PI / 2) * 0.7,
        );
        passengerChar.group.rotation.y = state.heading;
        poseIdle(passengerChar);
      }
    }
    if (!state.riding && bikeMesh && state.ownParked) {
      bikeMesh.group.position.set(state.ownParked.x, 0, state.ownParked.z);
      bikeMesh.group.rotation.y = state.ownParked.heading;
      bikeMesh.group.rotation.z = 0;
    }
  }

  function crash(impact) {
    if (state.crashCooldown > 0) return;
    state.crashCooldown = 0.8;
    const dmg = Math.min(30, 4 + impact * 0.5);
    if (state.borrowed) state.borrowed.condition = Math.max(0, state.borrowed.condition - dmg);
    else if (state.entry) state.entry.condition = Math.max(0, state.entry.condition - dmg);
    state.speed *= -0.25;
    state.hitStop = 0.09;
    audio.crash();
    world.camera.addTrauma(0.45);
    effects.spawn(state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), { color: 0xffd24a, count: 14, speed: 5, life: 0.5 });
    world.onCrash?.(impact);
  }

  function update(dt, input, env) {
    const grip = (env.grip ?? 1) * (1 + (effectiveSpec().gripBonus || 0));
    nitroTimer = Math.max(0, nitroTimer - dt);
    state.punchCooldown = Math.max(0, state.punchCooldown - dt);
    state.dodgeCooldown = Math.max(0, state.dodgeCooldown - dt);
    state.crashCooldown = Math.max(0, state.crashCooldown - dt);
    if (state.hitStop > 0) { state.hitStop -= dt; return; }
    if (state.downTimer > 0) {
      state.downTimer -= dt;
      if (state.downTimer <= 0) world.onRevive?.();
      return;
    }
    const axes = input.moveAxes();
    const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');

    if (!state.riding) {
      // On foot: W/S move along the heading, A/D turn, Shift runs, Space dodges.
      const moveSpeed = run ? 7 : 4.2;
      const turnRate = 3.4;
      state.heading += axes.strafe * turnRate * dt;
      const forward = axes.forward;
      let vx = 0;
      let vz = 0;
      if (state.dodgeTimer > 0) {
        state.dodgeTimer -= dt;
        vx = Math.sin(state.heading) * 11;
        vz = Math.cos(state.heading) * 11;
      } else if (forward !== 0) {
        vx = Math.sin(state.heading) * moveSpeed * forward;
        vz = Math.cos(state.heading) * moveSpeed * forward;
      }
      state.pos.x += vx * dt;
      state.pos.z += vz * dt;
      state.pos.x = THREE.MathUtils.clamp(state.pos.x, -250, 250);
      state.pos.z = THREE.MathUtils.clamp(state.pos.z, -250, 250);
      city.resolveCircle(state.pos, 0.5);
      const moving = Math.abs(vx) + Math.abs(vz) > 0.1;
      if (moving) {
        state.walkPhase += dt * (run ? 11 : 7.5);
        poseWalk(char, state.walkPhase, 1);
      } else if (state.punchTimer > 0) {
        state.punchTimer -= dt;
        char.armR.rotation.x = -1.6 * Math.max(0, state.punchTimer / 0.25);
      } else {
        poseIdle(char);
      }
      state.speed = 0;
      syncMeshes();
      return;
    }

    // Riding: W throttle, S brake/reverse, A/D steer, Space handbrake.
    const spec = effectiveSpec();
    const topMs = (spec.topSpeed / 3.6);
    const throttle = axes.forward > 0 ? 1 : 0;
    const braking = axes.forward < 0;
    const handbrake = input.isDown('Space');
    const fuelEmpty = fuel() <= 0;
    const maxSpeed = fuelEmpty ? 4 : topMs;
    if (throttle && !fuelEmpty) {
      state.speed += spec.accel * 14 * grip * dt;
    } else if (braking) {
      state.speed -= (handbrake ? 26 : 16) * spec.brake * dt;
    } else {
      state.speed -= state.speed * 0.35 * dt;
    }
    if (state.speed > maxSpeed) state.speed = Math.max(maxSpeed, state.speed - 20 * dt);
    if (state.speed < -6) state.speed = -6;
    const speedFactor = Math.min(1, Math.abs(state.speed) / topMs);
    const steer = axes.strafe;
    const turnRate = spec.handling * (1.9 - speedFactor * 0.9) * grip;
    state.heading += steer * turnRate * dt * Math.sign(state.speed || 1) * Math.min(1, Math.abs(state.speed) / 3 + 0.25);
    state.lean += ((steer * -0.32 * speedFactor) - state.lean) * Math.min(1, dt * 8);

    const nx = state.pos.x + Math.sin(state.heading) * state.speed * dt;
    const nz = state.pos.z + Math.cos(state.heading) * state.speed * dt;
    const before = { x: state.pos.x, z: state.pos.z };
    state.pos.x = nx;
    state.pos.z = nz;
    state.pos.x = THREE.MathUtils.clamp(state.pos.x, -252, 252);
    state.pos.z = THREE.MathUtils.clamp(state.pos.z, -252, 252);
    const hitWall = city.resolveCircle(state.pos, 0.7);
    if (hitWall && Math.abs(state.speed) > 3) crash(Math.abs(state.speed) * 3.6);
    // Traffic collision.
    const near = traffic.nearestTraffic(state.pos.x, state.pos.z, 3.2);
    if (near && near.dist < 2.6 && Math.abs(state.speed) > 2) {
      crash(Math.abs(state.speed) * 3.6);
      world.onHitTraffic?.(near.v);
    }
    // Pedestrian collision.
    const ped = pedestrians.nearest(state.pos.x, state.pos.z, 1.5);
    if (ped && Math.abs(state.speed) > 4) {
      if (pedestrians.knockdown(ped)) {
        audio.hurt();
        world.camera.addTrauma(0.3);
        world.onHitPedestrian?.(ped);
      }
    }
    // Skid marks while braking hard or drifting at speed.
    if ((handbrake || braking) && Math.abs(state.speed) > 10) {
      state.skidTimer -= dt;
      if (state.skidTimer <= 0) {
        state.skidTimer = 0.09;
        effects.addSkid(state.pos.clone().add(new THREE.Vector3(0, 0, 0)), state.heading);
      }
    }
    // Fuel burn with distance.
    const distM = Math.hypot(state.pos.x - before.x, state.pos.z - before.z);
    if (distM > 0) {
      const burn = (distM / 1000) * ECONOMY.fuelPerKm;
      if (state.borrowed) state.borrowed.fuel = Math.max(0, state.borrowed.fuel - burn);
      else if (state.entry) state.entry.fuel = Math.max(0, state.entry.fuel - burn);
      world.onDistance?.(distM / 1000);
    }
    syncMeshes();
  }

  function fuel() {
    if (state.borrowed) return state.borrowed.fuel;
    return state.entry ? state.entry.fuel : ECONOMY.startFuel;
  }

  function condition() {
    if (state.borrowed) return state.borrowed.condition;
    return state.entry ? state.entry.condition : 100;
  }

  function mountOwn() {
    if (!state.ownParked && !state.entry) return false;
    if (state.ownParked) {
      state.pos.set(state.ownParked.x, 0, state.ownParked.z);
      state.heading = state.ownParked.heading;
    }
    state.ownParked = null;
    state.borrowed = null;
    state.riding = true;
    state.speed = 0;
    buildOwnBike();
    syncMeshes();
    return true;
  }

  function mountBorrowed(parkedRef) {
    const kind = parkedRef.isBike ? 'bike' : 'sedan';
    const spec = BORROWED_SPECS[kind];
    if (bikeMesh) scene.remove(bikeMesh.group);
    if (parkedRef.isBike) {
      bikeMesh = buildBike(0x888888, 0.35);
    } else {
      bikeMesh = buildCar(0x888888, 'sedan');
    }
    scene.add(bikeMesh.group);
    state.borrowed = { kind, spec, fuel: 60, condition: 80, parkedRef };
    state.pos.set(parkedRef.x, 0, parkedRef.z);
    state.heading = parkedRef.heading;
    state.riding = true;
    state.speed = 0;
    syncMeshes();
    return true;
  }

  function dismount() {
    if (!state.riding) return;
    state.riding = false;
    state.speed = 0;
    if (state.borrowed) {
      // Leave the borrowed vehicle where it stands; it becomes parked again.
      const ref = state.borrowed.parkedRef;
      traffic.returnParked(ref, state.pos.x, state.pos.z, state.heading);
      scene.remove(bikeMesh.group);
      bikeMesh = null;
      state.borrowed = null;
      // The own bike waits wherever it was left.
      if (state.entry && state.ownParked) buildOwnBike();
    } else {
      state.ownParked = { x: state.pos.x, z: state.pos.z, heading: state.heading };
    }
    state.pos.x += Math.sin(state.heading + Math.PI / 2) * 1.2;
    state.pos.z += Math.cos(state.heading + Math.PI / 2) * 1.2;
    poseIdle(char);
    syncMeshes();
  }

  function punch() {
    if (state.riding || state.punchCooldown > 0 || state.dodgeTimer > 0) return false;
    state.punchCooldown = COMBAT.punchCooldown;
    state.punchTimer = 0.25;
    audio.punch();
    return true;
  }

  function dodge() {
    if (state.riding || state.dodgeCooldown > 0) return false;
    state.dodgeTimer = COMBAT.dodgeSeconds;
    state.dodgeCooldown = COMBAT.dodgeCooldown;
    return true;
  }

  function takeDamage(n) {
    if (state.dodgeTimer > 0 || state.downTimer > 0) return false;
    state.hp = Math.max(0, state.hp - n);
    audio.hurt();
    world.camera.addTrauma(0.35);
    if (state.hp <= 0) {
      state.downTimer = 2.5;
      world.onKnockedOut?.();
    }
    return true;
  }

  function revive(at) {
    state.hp = maxHp;
    state.downTimer = 0;
    state.pos.set(at.x, 0, at.z);
    state.heading = 0;
    if (state.riding) dismount();
    syncMeshes();
  }

  function setMaxHp(n) {
    const diff = n - maxHp;
    maxHp = n;
    state.hp = Math.min(maxHp, Math.max(1, state.hp + Math.max(0, diff)));
  }

  function setEntry(entry) {
    state.entry = entry;
    if (!state.borrowed) buildOwnBike();
    syncMeshes();
  }

  function teleport(x, z, heading) {
    state.pos.set(x, 0, z);
    state.heading = heading ?? 0;
    state.speed = 0;
    if (!state.riding && state.ownParked) {
      state.ownParked = { x, z, heading: state.heading };
    }
    syncMeshes();
  }

  return {
    state,
    get pos() { return state.pos; },
    get heading() { return state.heading; },
    get speedKmh() { return Math.abs(state.speed) * 3.6; },
    get riding() { return state.riding; },
    get hp() { return state.hp; },
    get maxHp() { return maxHp; },
    get nitroActive() { return nitroTimer > 0; },
    get punching() { return state.punchTimer > 0; },
    get dodging() { return state.dodgeTimer > 0; },
    get down() { return state.downTimer > 0; },
    get borrowed() { return state.borrowed; },
    get ownParked() { return state.ownParked; },
    get char() { return char; },
    update,
    setSkillMods(mods) { skillMods = { ...skillMods, ...mods }; },
    setMaxHp,
    activateNitro(seconds) { nitroTimer = seconds; },
    mountOwn,
    mountBorrowed,
    dismount,
    punch,
    dodge,
    takeDamage,
    revive,
    setEntry,
    setPassenger,
    teleport,
    fuel,
    condition,
    effectiveSpec,
    refuel() {
      if (state.borrowed) state.borrowed.fuel = 100;
      else if (state.entry) state.entry.fuel = 100;
    },
    repair() {
      if (state.borrowed) state.borrowed.condition = 100;
      else if (state.entry) state.entry.condition = 100;
    },
  };
}
