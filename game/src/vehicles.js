// Vehicles: the player's bikes, their upgrades and damage, and the parked bikes
// and cars around the city that can be borrowed (at a wanted cost). A bike's real
// stats are its base stats plus fitted upgrades, minus the penalty of damage.

import { BIKES, UPGRADES, ECONOMY } from './config.js';

export function bikeDef(id) {
  return BIKES.find((bike) => bike.id === id) || BIKES[0];
}

export function createVehicles(city) {
  const parked = city.parkedSpots.map((spot, index) => ({
    id: 'parked-' + index,
    x: spot.x, y: spot.y, angle: spot.angle, kind: spot.kind,
    taken: false,
    // A borrowed vehicle drives like a mid-tier bike; a car is faster but clumsier.
    topSpeed: spot.kind === 'car' ? 700 : 560,
    accel: spot.kind === 'car' ? 380 : 400,
    handling: spot.kind === 'car' ? 2.2 : 3.0,
    braking: 420,
    color: spot.kind === 'car' ? '#7a8a9a' : '#c9a13a',
  }));

  return {
    parked,
    /** The nearest parked vehicle within reach, or null. */
    nearestParked(x, y, range) {
      let best = null;
      let bestDist = range;
      for (const vehicle of parked) {
        if (vehicle.taken) continue;
        const dx = vehicle.x - x;
        const dy = vehicle.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) { bestDist = dist; best = vehicle; }
      }
      return best;
    },
  };
}

/** A player's garage: owned bikes, the current one, upgrades, and condition. */
export function createGarage() {
  const owned = new Map();
  owned.set('bebek-tua', { upgrades: { ban: 0, mesin: 0, rem: 0 }, condition: 100 });
  let current = 'bebek-tua';

  function statsFor(bikeId) {
    const base = bikeDef(bikeId);
    const record = owned.get(bikeId);
    const stats = {
      topSpeed: base.topSpeed, accel: base.accel, handling: base.handling,
      braking: base.braking, fuelDrain: base.fuelDrain,
    };
    if (!record) return stats;
    for (const upgrade of UPGRADES) {
      const level = record.upgrades[upgrade.id] || 0;
      for (let i = 0; i < level; i += 1) {
        const step = upgrade.levels[i];
        if (step.topSpeed) stats.topSpeed += step.topSpeed;
        if (step.accel) stats.accel += step.accel;
        if (step.handling) stats.handling += step.handling;
        if (step.braking) stats.braking += step.braking;
      }
    }
    // A damaged bike loses top speed and starts stalling.
    if (record.condition < 30) stats.topSpeed *= 0.7;
    else if (record.condition < 60) stats.topSpeed *= 0.85;
    return stats;
  }

  return {
    get current() { return current; },
    get currentDef() { return bikeDef(current); },
    get currentStats() { return statsFor(current); },
    owns(bikeId) { return owned.has(bikeId); },
    ownedIds() { return [...owned.keys()]; },
    condition(bikeId) {
      const record = owned.get(bikeId || current);
      return record ? record.condition : 100;
    },
    upgradeLevel(bikeId, upgradeId) {
      const record = owned.get(bikeId);
      return record ? (record.upgrades[upgradeId] || 0) : 0;
    },
    statsFor,
    buy(bikeId) {
      if (owned.has(bikeId)) return false;
      owned.set(bikeId, { upgrades: { ban: 0, mesin: 0, rem: 0 }, condition: 100 });
      return true;
    },
    select(bikeId) {
      if (!owned.has(bikeId)) return false;
      current = bikeId;
      return true;
    },
    damage(amount) {
      const record = owned.get(current);
      if (!record) return;
      record.condition = Math.max(0, record.condition - amount);
    },
    repairCost(bikeId) {
      const record = owned.get(bikeId || current);
      if (!record) return 0;
      return Math.round((100 - record.condition) * ECONOMY.repairCostPerPoint);
    },
    repair(bikeId) {
      const record = owned.get(bikeId || current);
      if (!record) return false;
      record.condition = 100;
      return true;
    },
    buyUpgrade(bikeId, upgradeId) {
      const record = owned.get(bikeId);
      if (!record) return false;
      const def = UPGRADES.find((u) => u.id === upgradeId);
      if (!def) return false;
      const level = record.upgrades[upgradeId] || 0;
      if (level >= def.levels.length) return false;
      record.upgrades[upgradeId] = level + 1;
      return true;
    },
    serialize() {
      return {
        current,
        owned: [...owned.entries()].map(([id, record]) => ({ id, upgrades: record.upgrades, condition: record.condition })),
      };
    },
    restore(data) {
      if (!data || !Array.isArray(data.owned)) return;
      owned.clear();
      for (const entry of data.owned) {
        owned.set(entry.id, {
          upgrades: { ban: 0, mesin: 0, rem: 0, ...(entry.upgrades || {}) },
          condition: typeof entry.condition === 'number' ? entry.condition : 100,
        });
      }
      if (data.current && owned.has(data.current)) current = data.current;
      if (!owned.has('bebek-tua')) owned.set('bebek-tua', { upgrades: { ban: 0, mesin: 0, rem: 0 }, condition: 100 });
    },
  };
}
