// The player: an ojek driver on foot or on a bike. On foot he walks and runs;
// on a bike he accelerates, steers, and brakes, with grip that drops in the rain
// and a top speed that drops when the bike is damaged. He also carries the
// progression state: money, XP, level, rank, rating, and streak.

import { PLAYER, ECONOMY, LEVELS, RANKS, FUEL } from './config.js';

export function createPlayer(x, y) {
  const state = {
    x, y,
    angle: -Math.PI / 2,
    speed: 0,
    onBike: true,
    bikeId: 'bebek-tua',
    borrowed: null,
    health: PLAYER.maxHealth,
    fuel: FUEL.max,
    money: ECONOMY.startMoney,
    xp: 0,
    level: 1,
    rating: ECONOMY.startRating,
    stallTimer: 0,
    stallCooldown: 30,
    invulnTimer: 0,
    moving: false,
    wading: false,
  };

  return {
    get x() { return state.x; },
    get y() { return state.y; },
    get angle() { return state.angle; },
    get speed() { return state.speed; },
    get onBike() { return state.onBike; },
    get borrowed() { return state.borrowed; },
    get health() { return state.health; },
    get fuel() { return state.fuel; },
    get money() { return state.money; },
    get xp() { return state.xp; },
    get level() { return state.level; },
    get rating() { return state.rating; },
    get stalled() { return state.stallTimer > 0; },
    get invulnerable() { return state.invulnTimer > 0; },
    get moving() { return state.moving; },
    get wading() { return state.wading; },
    get xpNext() { return LEVELS.xpFor(state.level); },

    /** The highest rank the level and story progress qualify for. */
    rank(storyDone) {
      let rank = RANKS[0];
      for (const candidate of RANKS) {
        if (state.level >= candidate.level && storyDone >= candidate.story) rank = candidate;
      }
      return rank;
    },

    setPosition(x, y) { state.x = x; state.y = y; },

    setAngle(angle) { state.angle = angle; },

    /** Reverses and cuts the speed after a collision. */
    bounce(factor) { state.speed *= factor; },

    /** Slides the player by a small offset (attack magnetism); collision-safe via the next update. */
    nudge(dx, dy) { state.x += dx; state.y += dy; },

    /** Steps the player one tick. Returns events: crashes, stalls, fuel warnings. */
    update(dt, input, city, bikeStats, gripMultiplier, isOldBike) {
      const events = [];
      const move = input.moveVector();
      state.invulnTimer = Math.max(0, state.invulnTimer - dt);
      state.moving = move.x !== 0 || move.y !== 0;

      if (!state.onBike) {
        const speed = (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) ? PLAYER.runSpeed : PLAYER.walkSpeed;
        const wade = state.wading ? 0.5 : 1;
        const nx = state.x + move.x * speed * wade * dt;
        const ny = state.y + move.y * speed * wade * dt;
        const fixed = city.collideCircle(nx, ny, PLAYER.radius, false);
        state.x = fixed.x;
        state.y = fixed.y;
        state.wading = fixed.wading;
        state.speed = state.moving ? speed * wade : 0;
        if (state.moving) state.angle = Math.atan2(move.y, move.x);
        return events;
      }

      // On a bike: forward/back is throttle, left/right steers.
      const throttle = -move.y;
      const steer = move.x;
      const grip = gripMultiplier * (state.borrowed ? 1 : 1);
      const topSpeed = bikeStats.topSpeed * (state.fuel <= 0 ? 0.15 : 1);
      const accel = bikeStats.accel * grip;

      if (state.stallTimer > 0) {
        state.stallTimer -= dt;
        state.speed = Math.max(0, state.speed - 300 * dt);
      } else if (throttle > 0) {
        state.speed = Math.min(topSpeed, state.speed + accel * dt);
      } else if (throttle < 0) {
        state.speed = Math.max(-topSpeed * 0.25, state.speed - bikeStats.braking * dt * 1.6);
      } else {
        state.speed -= state.speed * 0.8 * dt;
        if (Math.abs(state.speed) < 5) state.speed = 0;
      }

      // The old bike stalls at random and wobbles at speed.
      if (isOldBike && state.speed > 60) {
        state.stallCooldown -= dt;
        if (state.stallCooldown <= 0) {
          state.stallCooldown = 45 + Math.random() * 45;
          state.stallTimer = 2;
          events.push({ type: 'stall' });
        }
      }
      const wobble = isOldBike && state.speed > 200 ? Math.sin(performance.now() / 90) * 0.12 : 0;
      const turnRate = bikeStats.handling * grip * (state.speed >= 0 ? 1 : -1);
      state.angle += steer * turnRate * dt * Math.min(1, Math.abs(state.speed) / 120) + wobble * dt;

      const prevX = state.x;
      const prevY = state.y;
      const nx = state.x + Math.cos(state.angle) * state.speed * dt;
      const ny = state.y + Math.sin(state.angle) * state.speed * dt;
      const fixed = city.collideCircle(nx, ny, PLAYER.radius + 4, true);
      const hitWall = Math.abs(fixed.x - nx) > 0.5 || Math.abs(fixed.y - ny) > 0.5;
      if (hitWall && Math.abs(state.speed) > 180) {
        events.push({ type: 'crash', speed: Math.abs(state.speed) });
        state.speed *= -0.25;
      }
      state.x = fixed.x;
      state.y = fixed.y;

      if (state.fuel > 0 && Math.abs(state.speed) > 20) {
        state.fuel = Math.max(0, state.fuel - bikeStats.fuelDrain * dt * (Math.abs(state.speed) / bikeStats.topSpeed + 0.3));
        if (state.fuel <= 0) events.push({ type: 'fuel-empty' });
        else if (state.fuel < 20 && Math.random() < dt * 0.1) events.push({ type: 'fuel-low' });
      }
      return events;
    },

    boardBike(bikeId) {
      state.onBike = true;
      state.bikeId = bikeId;
      state.borrowed = null;
      state.speed = 0;
    },

    boardBorrowed(vehicle) {
      state.onBike = true;
      state.borrowed = vehicle;
      state.speed = 0;
    },

    dismount() {
      state.onBike = false;
      state.speed = 0;
    },

    takeDamage(amount) {
      if (state.invulnTimer > 0) return false;
      state.health = Math.max(0, state.health - amount);
      state.invulnTimer = 0.8;
      return true;
    },

    heal(amount) { state.health = Math.min(PLAYER.maxHealth, state.health + amount); },

    addMoney(amount) { state.money += amount; },
    spendMoney(amount) {
      if (state.money < amount) return false;
      state.money -= amount;
      return true;
    },

    addXp(amount) {
      state.xp += amount;
      let leveled = false;
      while (state.level < LEVELS.max && state.xp >= LEVELS.xpFor(state.level)) {
        state.xp -= LEVELS.xpFor(state.level);
        state.level += 1;
        leveled = true;
      }
      return leveled;
    },

    changeRating(delta) {
      state.rating = Math.max(ECONOMY.minRating, Math.min(ECONOMY.maxRating, state.rating + delta));
    },

    refuel() { state.fuel = FUEL.max; },

    respawn(x, y) {
      state.x = x;
      state.y = y;
      state.health = PLAYER.maxHealth;
      state.onBike = true;
      state.borrowed = null;
      state.speed = 0;
    },

    serialize() {
      return {
        x: state.x, y: state.y, angle: state.angle,
        onBike: state.onBike, bikeId: state.bikeId,
        health: state.health, fuel: state.fuel, money: state.money,
        xp: state.xp, level: state.level, rating: state.rating,
      };
    },

    restore(data) {
      if (!data) return;
      state.x = data.x ?? state.x;
      state.y = data.y ?? state.y;
      state.angle = data.angle ?? state.angle;
      state.onBike = data.onBike !== false;
      state.bikeId = data.bikeId || state.bikeId;
      state.health = data.health ?? state.health;
      state.fuel = data.fuel ?? state.fuel;
      state.money = data.money ?? state.money;
      state.xp = data.xp ?? 0;
      state.level = data.level ?? 1;
      state.rating = data.rating ?? ECONOMY.startRating;
    },
  };
}
