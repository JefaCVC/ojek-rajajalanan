// OJEK! King of the Streets — money in, money out: buying bikes, upgrades and
// paint, fuel and repairs, switching bikes in the garage. Every function
// returns { ok, message } so the UI can say exactly why a purchase failed.

import { BIKES, UPGRADES, PAINTS, ECONOMY, bikeById, fmtRp } from './config.js';

export function buyBike(profile, bikeId) {
  const bike = bikeById(bikeId);
  if (profile.ownedBikes.some((b) => b.id === bikeId)) {
    return { ok: false, message: 'You already own this bike.' };
  }
  if (profile.money < bike.price) {
    return { ok: false, message: `Not enough money. Need ${fmtRp(bike.price)}.` };
  }
  profile.money -= bike.price;
  profile.ownedBikes.push({ id: bikeId, paint: null, upgrades: { engine: 0, tires: 0, brakes: 0 }, condition: 100, fuel: 100 });
  profile.activeBike = profile.ownedBikes.length - 1;
  return { ok: true, message: `${bike.name} bought. Your new bike is in the garage.` };
}

export function bikeEntry(profile) {
  return profile.ownedBikes[profile.activeBike];
}

export function buyUpgrade(profile, entry, upgradeId) {
  const def = UPGRADES.find((u) => u.id === upgradeId);
  if (!def) return { ok: false, message: 'Unknown upgrade.' };
  const level = entry.upgrades[upgradeId] || 0;
  if (level >= 3) return { ok: false, message: `${def.name} is already max level.` };
  const price = def.prices[level];
  if (profile.money < price) {
    return { ok: false, message: `Not enough money. Need ${fmtRp(price)}.` };
  }
  profile.money -= price;
  entry.upgrades[upgradeId] = level + 1;
  return { ok: true, message: `${def.name} upgraded to level ${level + 1}.` };
}

export function paintCost(entry) {
  return 50000;
}

export function paintBike(profile, entry, paintIndex) {
  const paint = PAINTS[paintIndex];
  if (!paint) return { ok: false, message: 'Unknown color.' };
  if (profile.money < paint.price) {
    return { ok: false, message: `Not enough money. Need ${fmtRp(paint.price)}.` };
  }
  profile.money -= paint.price;
  entry.paint = paint.color;
  return { ok: true, message: `Bike painted ${paint.name}.` };
}

export function refuelCost(entry) {
  return Math.ceil((100 - entry.fuel) * ECONOMY.fuelPricePerUnit);
}

export function refuel(profile, entry) {
  const cost = refuelCost(entry);
  if (cost <= 0) return { ok: false, message: 'Tank is already full.' };
  if (profile.money < cost) {
    return { ok: false, message: `Not enough money. Need ${fmtRp(cost)}.` };
  }
  profile.money -= cost;
  entry.fuel = 100;
  return { ok: true, message: `Tank full. Paid ${fmtRp(cost)}.` };
}

export function repairCost(entry) {
  return Math.ceil((100 - entry.condition) * ECONOMY.repairPerPoint);
}

export function repair(profile, entry) {
  const cost = repairCost(entry);
  if (cost <= 0) return { ok: false, message: 'Bike is still in good shape.' };
  if (profile.money < cost) {
    return { ok: false, message: `Not enough money. Need ${fmtRp(cost)}.` };
  }
  profile.money -= cost;
  entry.condition = 100;
  return { ok: true, message: `Bike serviced. Paid ${fmtRp(cost)}.` };
}

export function switchBike(profile, index) {
  if (index < 0 || index >= profile.ownedBikes.length) {
    return { ok: false, message: 'No such bike.' };
  }
  profile.activeBike = index;
  const bike = bikeById(profile.ownedBikes[index].id);
  return { ok: true, message: `Now riding the ${bike.name}.` };
}

export function affordableBikes(profile, rank) {
  return BIKES.filter((b) => b.rank <= rank && !profile.ownedBikes.some((o) => o.id === b.id));
}
