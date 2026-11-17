// Light combat: rival gang members and night muggers (begal). The timing
// contract comes from config COMBAT (action-feel/short-special,
// hitstun-recover/light-stun):
//
// - A punch has startup, active, and recovery ticks on the 60 Hz logical clock.
// - A hit freezes only the attacker and the victim (hit-stop), each for their
//   own authored tick count. The world and other actors keep running.
// - The victim then takes hitstun (light-stun): a timed action lock, then legal
//   actions again. Light hits flinch; heavy hits knock down further.
// - Attack magnetism: on punch startup the attacker snaps toward the nearest
//   enemy in range and slides to just within reach, never overshooting.
// - Only one enemy attacks at a time; the rest circle outside. Enemies are few
//   and tough (three hits), so a fight is a scuffle, not a mow-down.
// - Inputs pressed during hit-stop are buffered, so a key press is never eaten.

import { COMBAT, PLAYER } from './config.js';
import { randomPick } from './random.js';

export function createCombat(random) {
  const enemies = [];
  let nextId = 1;
  let bufferedPunch = 0;

  function spawn(kind, x, y) {
    const enemy = {
      id: nextId++,
      kind,
      x, y,
      angle: 0,
      health: kind === 'begal' ? COMBAT.begalHealth : COMBAT.rivalHealth,
      maxHealth: kind === 'begal' ? COMBAT.begalHealth : COMBAT.rivalHealth,
      state: 'approach',
      stateTicks: 0,
      hitstopTicks: 0,
      stunTicks: 0,
      attackCooldown: 1 + random() * 1.5,
      windupTicks: 0,
      speed: kind === 'begal' ? 190 : 165,
      toughness: kind === 'begal' ? 1 : 2,
      hitsTaken: 0,
    };
    enemies.push(enemy);
    return enemy;
  }

  return {
    enemies,
    get count() { return enemies.length; },

    spawnRival(x, y) { return spawn('rival', x, y); },
    spawnBegal(x, y) { return spawn('begal', x, y); },

    /** Queues a punch press so it survives hit-stop. */
    queuePunch() { bufferedPunch = COMBAT.bufferTicks; },

    /**
     * Steps combat one tick. The player object is the combatant: it must expose
     * x, y, angle, onBike, takeDamage, and the punch state below. Returns a list
     * of authoritative events for the juice layer and the game.
     */
    update(player, city, punch) {
      const events = [];
      if (bufferedPunch > 0) bufferedPunch -= 1;

      // The player's punch state machine, in ticks.
      if (punch.phase === 'idle' && bufferedPunch > 0 && !player.onBike) {
        bufferedPunch = 0;
        // Magnetism: snap toward the nearest enemy in range, slide to reach.
        let target = null;
        let bestScore = Infinity;
        for (const enemy of enemies) {
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > COMBAT.magnetRange) continue;
          const angleTo = Math.atan2(dy, dx);
          let diff = angleTo - player.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const score = dist + Math.abs(diff) * 60;
          if (score < bestScore) { bestScore = score; target = enemy; }
        }
        if (target) {
          player.setAngle(Math.atan2(target.y - player.y, target.x - player.x));
          const dx = target.x - player.x;
          const dy = target.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const slide = Math.min(COMBAT.magnetSlide, Math.max(0, dist - PLAYER.punchRange + 8));
          player.nudge((dx / dist) * slide, (dy / dist) * slide);
        }
        punch.phase = 'startup';
        punch.ticks = 0;
        punch.hitDone = false;
      }
      if (punch.phase !== 'idle') {
        if (punch.hitstopTicks > 0) {
          punch.hitstopTicks -= 1;
        } else {
          punch.ticks += 1;
          if (punch.phase === 'startup' && punch.ticks >= COMBAT.punchStartupTicks) {
            punch.phase = 'active';
            punch.ticks = 0;
          } else if (punch.phase === 'active') {
            if (!punch.hitDone) {
              punch.hitDone = true;
              for (const enemy of enemies) {
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > PLAYER.punchRange + 14) continue;
                const angleTo = Math.atan2(dy, dx);
                let diff = angleTo - player.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                if (Math.abs(diff) > 1.1) continue;
                const heavy = enemy.hitsTaken >= enemy.toughness;
                enemy.health -= PLAYER.punchDamage;
                enemy.hitsTaken += 1;
                enemy.hitstopTicks = heavy ? COMBAT.hitstopVictimHeavyTicks : COMBAT.hitstopVictimLightTicks;
                enemy.stunTicks = heavy ? COMBAT.hitstunHeavyTicks : COMBAT.hitstunLightTicks;
                const knock = heavy ? COMBAT.knockbackHeavy : COMBAT.knockbackLight;
                enemy.x += Math.cos(angleTo) * knock * 0.12;
                enemy.y += Math.sin(angleTo) * knock * 0.12;
                punch.hitstopTicks = COMBAT.hitstopAttackerTicks;
                events.push({
                  type: 'hit', x: enemy.x, y: enemy.y,
                  angle: angleTo, heavy, enemyId: enemy.id,
                  killed: enemy.health <= 0,
                });
                if (enemy.health <= 0) {
                  events.push({ type: 'enemy-down', kind: enemy.kind, x: enemy.x, y: enemy.y });
                }
              }
            }
            if (punch.ticks >= COMBAT.punchActiveTicks) {
              punch.phase = 'recovery';
              punch.ticks = 0;
            }
          } else if (punch.phase === 'recovery' && punch.ticks >= COMBAT.punchRecoveryTicks) {
            punch.phase = 'idle';
            punch.ticks = 0;
          }
        }
      }

      // Enemies: only one attacks at a time; the rest hold a ring outside.
      const attackers = enemies.filter((e) => e.state === 'attack');
      const designated = attackers.length > 0 ? attackers[0] : null;
      for (let i = enemies.length - 1; i >= 0; i -= 1) {
        const enemy = enemies[i];
        if (enemy.health <= 0) { enemies.splice(i, 1); continue; }
        if (enemy.hitstopTicks > 0) { enemy.hitstopTicks -= 1; continue; }
        if (enemy.stunTicks > 0) {
          enemy.stunTicks -= 1;
          enemy.state = 'stun';
          continue;
        }
        enemy.attackCooldown -= 1 / 60;
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemy.angle = Math.atan2(dy, dx);

        if (enemy.state === 'attack') {
          enemy.windupTicks -= 1;
          if (enemy.windupTicks <= 0) {
            enemy.state = 'recover';
            enemy.stateTicks = 30;
            if (dist < 52 && !player.onBike) {
              if (player.takeDamage(COMBAT.rivalDamage)) {
                events.push({ type: 'player-hit', x: player.x, y: player.y, angle: enemy.angle });
              }
            }
            enemy.attackCooldown = COMBAT.rivalAttackCooldown + random() * 0.8;
          }
          continue;
        }
        if (enemy.state === 'recover') {
          enemy.stateTicks -= 1;
          if (enemy.stateTicks <= 0) enemy.state = 'approach';
          continue;
        }
        if (enemy.state === 'stun') { enemy.state = 'approach'; continue; }

        // Approach: close in, but keep the ring — only the designated attacker
        // steps inside striking range while others wait at 120 units.
        const isAttacker = designated === enemy || (designated === null && enemy.attackCooldown <= 0);
        const holdDistance = isAttacker ? 44 : 120;
        if (dist > holdDistance) {
          const step = enemy.speed / 60;
          enemy.x += (dx / dist) * step;
          enemy.y += (dy / dist) * step;
          const fixed = city.collideCircle(enemy.x, enemy.y, 12, false);
          enemy.x = fixed.x;
          enemy.y = fixed.y;
        } else if (isAttacker && enemy.attackCooldown <= 0 && dist < 56) {
          enemy.state = 'attack';
          enemy.windupTicks = 24;
          events.push({ type: 'enemy-windup', enemyId: enemy.id });
        }
      }
      return events;
    },
  };
}
