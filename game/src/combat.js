// OJEK! King of the Streets — light combat: punch rival gang members and night
// muggers, dodge their swings. One enemy attacks at a time, hits freeze the
// pair for a beat, and every third hit lands heavier.

import * as THREE from 'three';
import { COMBAT } from './config.js';
import { buildCharacter, poseWalk, poseIdle } from './vehicles.js';
import { worldRandom as rng } from './random.js';

export function createCombat(scene, world) {
  const { city, effects, audio } = world;
  const enemies = [];
  let combo = 0;
  let comboTimer = 0;
  let punchMult = 1;
  let heavyUnlocked = false;

  function spawn(at, opts = {}) {
    const char = buildCharacter({
      shirt: opts.gang ? 0x8a1f1f : 0x3a3a3a,
      pants: 0x222222,
    });
    char.group.position.set(at.x, 0, at.z);
    scene.add(char.group);
    const e = {
      char,
      pos: new THREE.Vector3(at.x, 0, at.z),
      hp: opts.hp ?? 60,
      maxHp: opts.hp ?? 60,
      speed: opts.speed ?? rng.range(2.6, 3.4),
      damage: opts.damage ?? 10,
      state: 'approach',
      stateTimer: 0,
      hitStop: 0,
      knock: new THREE.Vector3(),
      phase: rng.range(0, Math.PI * 2),
      reward: opts.reward ?? 15000,
      gang: !!opts.gang,
      name: opts.name ?? (opts.gang ? 'Geng Macan' : 'Mugger'),
      down: false,
    };
    enemies.push(e);
    return e;
  }

  function remove(e) {
    scene.remove(e.char.group);
    const i = enemies.indexOf(e);
    if (i >= 0) enemies.splice(i, 1);
  }

  function playerPunch(player) {
    // Called when the player's punch lands: nearest enemy in front, in range.
    let best = null;
    let bestD = COMBAT.punchRange;
    for (const e of enemies) {
      if (e.down) continue;
      const dx = e.pos.x - player.pos.x;
      const dz = e.pos.z - player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > bestD) continue;
      const facing = Math.sin(player.heading) * dx + Math.cos(player.heading) * dz;
      if (facing < 0.3 * d) continue;
      bestD = d;
      best = e;
    }
    if (!best) return null;
    combo = comboTimer > 0 ? combo + 1 : 1;
    comboTimer = 1.1;
    const heavy = heavyUnlocked && combo % 3 === 0;
    const dmg = COMBAT.punchDamage * punchMult * (heavy ? 1.6 : 1);
    best.hp -= dmg;
    best.hitStop = heavy ? COMBAT.hitStopHeavy : COMBAT.hitStopLight;
    const kx = (best.pos.x - player.pos.x) / Math.max(0.1, bestD);
    const kz = (best.pos.z - player.pos.z) / Math.max(0.1, bestD);
    best.knock.set(kx * (heavy ? 5.5 : 2.5), 0, kz * (heavy ? 5.5 : 2.5));
    best.state = 'stagger';
    best.stateTimer = heavy ? 0.7 : 0.4;
    effects.spawn(best.pos.clone().add(new THREE.Vector3(0, 1.3, 0)), { color: 0xffd24a, count: heavy ? 14 : 8, speed: 4, life: 0.4 });
    audio.punch();
    world.camera.addTrauma(heavy ? 0.25 : 0.12);
    if (best.hp <= 0) {
      best.down = true;
      best.char.group.rotation.x = -Math.PI / 2;
      best.state = 'down';
      effects.spawn(best.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), { color: 0x2eff8a, count: 12, speed: 3, life: 0.7 });
      world.onEnemyDown?.(best);
      return { enemy: best, heavy, killed: true };
    }
    return { enemy: best, heavy, killed: false };
  }

  function update(dt, player) {
    comboTimer = Math.max(0, comboTimer - dt);
    if (comboTimer <= 0) combo = 0;
    // Only the nearest enemy in range may attack; the rest circle.
    let attacker = null;
    let attackerD = Infinity;
    for (const e of enemies) {
      if (e.down) continue;
      const d = Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
      if (d < 3.2 && d < attackerD) { attackerD = d; attacker = e; }
    }
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const e = enemies[i];
      if (e.down) {
        e.stateTimer += dt;
        if (e.stateTimer > 4) remove(e);
        continue;
      }
      if (e.hitStop > 0) { e.hitStop -= dt; continue; }
      if (e.knock.lengthSq() > 0.01) {
        e.pos.addScaledVector(e.knock, dt);
        e.knock.multiplyScalar(Math.max(0, 1 - dt * 6));
        city.resolveCircle(e.pos, 0.5);
      }
      const dx = player.pos.x - e.pos.x;
      const dz = player.pos.z - e.pos.z;
      const dist = Math.hypot(dx, dz);
      const heading = Math.atan2(dx, dz);
      let dh = heading - e.char.group.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      e.char.group.rotation.y += dh * Math.min(1, dt * 8);
      if (e.state === 'stagger') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) e.state = 'approach';
      } else if (e === attacker && dist < 2.2) {
        if (e.state !== 'windup' && e.state !== 'strike') {
          e.state = 'windup';
          e.stateTimer = 0.5;
        }
      } else if (dist > 2.0) {
        e.state = 'approach';
        e.pos.x += Math.sin(heading) * e.speed * dt;
        e.pos.z += Math.cos(heading) * e.speed * dt;
        city.resolveCircle(e.pos, 0.5);
        e.phase += dt * 7;
        poseWalk(e.char, e.phase, 1);
      }
      if (e.state === 'windup') {
        e.char.armR.rotation.x = -2.2;
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'strike';
          e.stateTimer = 0.25;
          e.char.armR.rotation.x = -0.4;
          if (dist < 2.6 && !player.dodging) {
            player.takeDamage(e.damage);
            effects.floatText(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), `-${e.damage}`, '#ff5a5a');
          }
        }
      } else if (e.state === 'strike') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.state = 'cooldown';
          e.stateTimer = 0.9;
          e.char.armR.rotation.x = 0;
        }
      } else if (e.state === 'cooldown') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) e.state = 'approach';
        poseIdle(e.char);
      }
      e.char.group.position.copy(e.pos);
      // Despawn far-away stragglers.
      if (dist > 220) remove(e);
    }
  }

  return {
    enemies,
    spawn,
    remove,
    playerPunch,
    update,
    setPunchMult(n) { punchMult = n; },
    setHeavyUnlocked(on) { heavyUnlocked = on; },
    clearAll() {
      for (let i = enemies.length - 1; i >= 0; i -= 1) remove(enemies[i]);
    },
  };
}
