// The city's other road users. Traffic drives along the roads, stops at red
// lights, queues behind the vehicle ahead (rush hour makes real jams), and turns
// at intersections. Pedestrians walk the sidewalks toward destinations, wait at
// crossings, gather around warung carts, and wave when they are waiting for a ride.

import { WORLD, TRAFFIC } from './config.js';
import { ROAD_HALF } from './city.js';
import { randomInt, randomPick } from './random.js';

const CAR_COLORS = ['#c9c2b4', '#8a9ab0', '#b04a4a', '#4a8a6b', '#d9c94a', '#6b6b7a', '#a08a6b'];
const PED_COLORS = ['#d94f3d', '#3a7bd5', '#2e9e6b', '#d9a441', '#8a5ab0', '#e87ab0', '#4a9a9a', '#c97a3a'];

export function createTraffic(city, random) {
  const cars = [];
  const pedestrians = [];

  function spawnCar() {
    const vertical = random() < 0.5;
    const road = vertical ? randomPick(random, city.roadsX) : randomPick(random, city.roadsY);
    const dir = random() < 0.5 ? 1 : -1;
    const kind = randomPick(random, ['car', 'car', 'car', 'angkot', 'bajaj', 'bike']);
    const speed = kind === 'bajaj' ? 120 : kind === 'angkot' ? 150 : kind === 'bike' ? 220 : 170 + random() * 60;
    return {
      kind,
      x: vertical ? road + dir * 18 : (dir > 0 ? -60 : WORLD.width + 60),
      y: vertical ? (dir > 0 ? -60 : WORLD.height + 60) : road + dir * 18,
      vertical,
      dir,
      speed,
      maxSpeed: speed,
      color: kind === 'angkot' ? '#2e9e6b' : kind === 'bajaj' ? '#e87a2e' : randomPick(random, CAR_COLORS),
      stopped: false,
      waitTimer: 0,
    };
  }

  /** A point on the sidewalk of one road, at a position along it. */
  function sidewalkPoint(road, along) {
    if (road.vertical) return { x: road.at + road.side * (ROAD_HALF + 12), y: along };
    return { x: along, y: road.at + road.side * (ROAD_HALF + 12) };
  }

  function randomRoad() {
    const vertical = random() < 0.5;
    return {
      vertical,
      at: vertical ? randomPick(random, city.roadsX) : randomPick(random, city.roadsY),
      side: random() < 0.5 ? -1 : 1,
    };
  }

  function spawnPedestrian() {
    // Pedestrians stroll along one road's sidewalk, like real people: they
    // never cut across blocks or wander through traffic.
    const road = randomRoad();
    const span = road.vertical ? WORLD.height : WORLD.width;
    const start = sidewalkPoint(road, 120 + random() * (span - 240));
    const target = sidewalkPoint(road, 120 + random() * (span - 240));
    return {
      x: start.x, y: start.y,
      targetX: target.x, targetY: target.y,
      road,
      speed: 45 + random() * 35,
      color: randomPick(random, PED_COLORS),
      waving: false,
      waitTimer: 0,
      phase: random() * Math.PI * 2,
    };
  }

  for (let i = 0; i < TRAFFIC.carCount; i += 1) {
    const car = spawnCar();
    // Scatter the starting cars across the city instead of at the edges.
    if (car.vertical) car.y = random() * WORLD.height;
    else car.x = random() * WORLD.width;
    cars.push(car);
  }
  for (let i = 0; i < TRAFFIC.pedestrianCount; i += 1) pedestrians.push(spawnPedestrian());

  // A few pedestrians gather around warung carts and the market.
  for (let i = 0; i < 8; i += 1) {
    const cart = randomPick(random, city.carts);
    const ped = spawnPedestrian();
    ped.x = cart.x + (random() - 0.5) * 50;
    ped.y = cart.y + (random() - 0.5) * 50;
    ped.targetX = ped.x;
    ped.targetY = ped.y;
    ped.waitTimer = 20 + random() * 40;
    pedestrians.push(ped);
  }

  function lightBlocks(car) {
    const light = city.lightAt(car.x + (car.vertical ? 0 : car.dir * 60), car.y + (car.vertical ? car.dir * 60 : 0));
    if (!light) return false;
    // A green light lets the matching direction through; red stops it.
    const greenForMe = light.verticalGreen === car.vertical;
    return !greenForMe && light.state !== 'yellow';
  }

  function vehicleAhead(car) {
    for (const other of cars) {
      if (other === car || other.vertical !== car.vertical || other.dir !== car.dir) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const along = car.vertical ? dy * car.dir : dx * car.dir;
      const across = car.vertical ? Math.abs(dx) : Math.abs(dy);
      if (along > 0 && along < 70 && across < 24) return true;
    }
    return false;
  }

  return {
    cars,
    pedestrians,
    /** The count of cars currently stopped, a quick read on how jammed the city is. */
    get stoppedCount() { return cars.filter((c) => c.stopped).length; },

    update(dt, trafficMultiplier, closures) {
      // Traffic lights cycle: green, then yellow, then the other direction.
      for (const light of city.lights) {
        light.timer -= dt;
        if (light.timer <= 0) {
          if (light.state === 'green') { light.state = 'yellow'; light.timer = 2; }
          else if (light.state === 'yellow') {
            light.state = 'green';
            light.verticalGreen = !light.verticalGreen;
            light.timer = TRAFFIC.lightCycle * (0.7 + random() * 0.6);
          }
        }
      }

      const targetCars = Math.round(TRAFFIC.carCount * trafficMultiplier);
      while (cars.length < targetCars) cars.push(spawnCar());
      while (cars.length > targetCars + 2) cars.pop();

      for (const car of cars) {
        const blockedByLight = lightBlocks(car);
        const blockedByCar = vehicleAhead(car);
        const aheadX = car.x + (car.vertical ? 0 : car.dir * 70);
        const aheadY = car.y + (car.vertical ? car.dir * 70 : 0);
        const blockedByClosure = city.closureAt(aheadX, aheadY) !== null;
        car.stopped = blockedByLight || blockedByCar || blockedByClosure;
        if (car.stopped) {
          car.waitTimer += dt;
          car.speed = Math.max(0, car.speed - 400 * dt);
        } else {
          car.waitTimer = 0;
          car.speed = Math.min(car.maxSpeed, car.speed + 120 * dt);
        }
        if (car.vertical) car.y += car.dir * car.speed * dt;
        else car.x += car.dir * car.speed * dt;

        // At an intersection, sometimes turn onto the crossing road.
        const onV = city.roadsX.some((rx) => Math.abs(car.x - rx) < 4);
        const onH = city.roadsY.some((ry) => Math.abs(car.y - ry) < 4);
        if (onV && onH && random() < 0.004) {
          car.vertical = !car.vertical;
          car.dir = random() < 0.5 ? 1 : -1;
          if (car.vertical) car.x = city.roadsX.reduce((a, b) => Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a) + car.dir * 18;
          else car.y = city.roadsY.reduce((a, b) => Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a) + car.dir * 18;
        }

        if (car.x < -80 || car.x > WORLD.width + 80 || car.y < -80 || car.y > WORLD.height + 80) {
          Object.assign(car, spawnCar());
        }
      }

      for (const ped of pedestrians) {
        if (ped.waitTimer > 0) {
          ped.waitTimer -= dt;
          continue;
        }
        const dx = ped.targetX - ped.x;
        const dy = ped.targetY - ped.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 12) {
          // Pick the next stroll on the same road, or turn onto a crossing
          // road: first walk to the intersection, then along the new road.
          if (ped.road && random() < 0.25) {
            const crossing = ped.road.vertical
              ? { vertical: false, at: city.roadsY.reduce((a, b) => Math.abs(b - ped.y) < Math.abs(a - ped.y) ? b : a), side: ped.road.side }
              : { vertical: true, at: city.roadsX.reduce((a, b) => Math.abs(b - ped.x) < Math.abs(a - ped.x) ? b : a), side: ped.road.side };
            const corner = ped.road.vertical
              ? { x: ped.road.at + ped.road.side * (ROAD_HALF + 12), y: crossing.at + crossing.side * (ROAD_HALF + 12) }
              : { x: crossing.at + crossing.side * (ROAD_HALF + 12), y: ped.road.at + ped.road.side * (ROAD_HALF + 12) };
            const span = crossing.vertical ? WORLD.height : WORLD.width;
            const next = sidewalkPoint(crossing, 120 + random() * (span - 240));
            ped.waypoint = corner;
            ped.road = crossing;
            ped.targetX = next.x;
            ped.targetY = next.y;
          } else if (ped.road) {
            const span = ped.road.vertical ? WORLD.height : WORLD.width;
            const next = sidewalkPoint(ped.road, 120 + random() * (span - 240));
            ped.targetX = next.x;
            ped.targetY = next.y;
          } else {
            const next = city.randomRoadsidePoint();
            ped.targetX = next.x;
            ped.targetY = next.y;
          }
          if (random() < 0.2) ped.waitTimer = 3 + random() * 8;
          continue;
        }
        // A waypoint (a corner turn) comes before the target.
        const gx = ped.waypoint ? ped.waypoint.x : ped.targetX;
        const gy = ped.waypoint ? ped.waypoint.y : ped.targetY;
        const gdx = gx - ped.x;
        const gdy = gy - ped.y;
        const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
        if (ped.waypoint && gdist < 12) ped.waypoint = null;
        else if (gdist > 0.1) {
          ped.x += (gdx / gdist) * ped.speed * dt;
          ped.y += (gdy / gdist) * ped.speed * dt;
        }
        ped.phase += dt * 6;
        const corrected = city.collideCircle(ped.x, ped.y, 8, false);
        ped.x = corrected.x;
        ped.y = corrected.y;
      }
    },

    /** Marks a few roadside pedestrians as waiting passengers who wave. */
    setWaving(count) {
      let waved = 0;
      for (const ped of pedestrians) {
        ped.waving = false;
      }
      const shuffled = [...pedestrians].sort(() => random() - 0.5);
      for (const ped of shuffled) {
        if (waved >= count) break;
        if (city.isOnRoad(ped.x, ped.y)) continue;
        ped.waving = true;
        waved += 1;
      }
    },
  };
}
