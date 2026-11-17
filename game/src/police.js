// Wanted level and the police. Wanted stars rise when the player steals a
// vehicle, runs a red light in front of police, or hits someone. Police cars
// spawn at the city edge and chase; if one holds the player still for a couple
// of seconds, the player is busted: a fine comes out of the money and the rating
// drops. Staying unseen for a while drops a star. The fine can also be paid at
// the police post.

import { WANTED, WORLD, ECONOMY } from './config.js';
import { randomPick } from './random.js';

export function createPolice(city, random) {
  let wanted = 0;
  let unseenTimer = 0;
  let bustTimer = 0;
  const cars = [];

  function spawnCar(playerX, playerY) {
    const edge = randomPick(random, ['n', 's', 'e', 'w']);
    let x;
    let y;
    if (edge === 'n') { x = playerX + (random() - 0.5) * 600; y = 120; }
    else if (edge === 's') { x = playerX + (random() - 0.5) * 600; y = WORLD.height - 120; }
    else if (edge === 'e') { x = WORLD.width - 120; y = playerY + (random() - 0.5) * 600; }
    else { x = 120; y = playerY + (random() - 0.5) * 600; }
    cars.push({ x, y, angle: 0, speed: 0, siren: random() * Math.PI * 2 });
  }

  return {
    get wanted() { return wanted; },
    get cars() { return cars; },
    get bustProgress() { return bustTimer / WANTED.bustHoldSeconds; },

    addWanted(amount) {
      wanted = Math.min(WANTED.max, wanted + amount);
      unseenTimer = 0;
    },

    clearWanted() {
      wanted = 0;
      cars.length = 0;
      bustTimer = 0;
    },

    /** Steps the chase one tick. Returns 'busted' when the player is caught. */
    update(dt, player, cityRef) {
      const target = Math.min(wanted, 4);
      while (cars.length < target) spawnCar(player.x, player.y);
      while (cars.length > target) cars.pop();

      let anyNear = false;
      for (const car of cars) {
        const dx = player.x - car.x;
        const dy = player.y - car.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 600) anyNear = true;
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - car.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
        car.speed = Math.min(WANTED.policeTopSpeed, car.speed + 420 * dt);
        car.x += Math.cos(car.angle) * car.speed * dt;
        car.y += Math.sin(car.angle) * car.speed * dt;
        const fixed = cityRef.collideCircle(car.x, car.y, 18, true);
        if (Math.abs(fixed.x - car.x) > 0.5 || Math.abs(fixed.y - car.y) > 0.5) {
          car.speed *= 0.4;
          car.angle += 0.6;
        }
        car.x = fixed.x;
        car.y = fixed.y;
        car.siren += dt * 8;
        // A police car rams the player at speed, then falls back instead of
        // sitting on top of him.
        if (dist < 30 && car.speed > 200) {
          car.speed *= 0.3;
        }
        if (dist < 26 && dist > 0.1) {
          car.x -= (dx / dist) * 30 * dt * 10;
          car.y -= (dy / dist) * 30 * dt * 10;
          car.speed = Math.min(car.speed, 120);
        }
      }

      if (wanted === 0) return null;
      if (!anyNear) {
        unseenTimer += dt;
        if (unseenTimer >= WANTED.decaySeconds) {
          unseenTimer = 0;
          wanted -= 1;
          if (wanted === 0) cars.length = 0;
        }
      } else {
        unseenTimer = 0;
      }

      const nearest = cars.reduce((best, car) => {
        const d = Math.hypot(car.x - player.x, car.y - player.y);
        return best === null || d < best ? d : best;
      }, null);
      if (nearest !== null && nearest < WANTED.bustRange && Math.abs(player.speed) < 40 && !player.onBike) {
        bustTimer += dt;
        if (bustTimer >= WANTED.bustHoldSeconds) {
          bustTimer = 0;
          return 'busted';
        }
      } else if (nearest !== null && nearest < WANTED.bustRange && Math.abs(player.speed) < 40 && player.onBike) {
        bustTimer += dt * 0.5;
        if (bustTimer >= WANTED.bustHoldSeconds) {
          bustTimer = 0;
          return 'busted';
        }
      } else {
        bustTimer = Math.max(0, bustTimer - dt * 2);
      }
      return null;
    },

    /** The fine for paying at the police post, in rupiah. */
    fineAmount() {
      return wanted * ECONOMY.finePerStar;
    },
  };
}
