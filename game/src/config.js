// OJEK! King of the Streets — shared constants: city layout, bikes, ranks, economy.
// Every system reads from here so the city, traffic, orders and minimap agree
// on the same streets, prices and rules.

export const CITY = {
  blocksX: 10,
  blocksZ: 10,
  block: 36, // metres of buildings inside one block
  road: 14, // metres of road between blocks
  get pitch() { return this.block + this.road; },
  get size() { return this.blocksX * this.pitch + this.road; },
  // Road centre lines sit at these coordinates on each axis.
  roadLine(i) { return -this.size / 2 + this.road / 2 + i * this.pitch; },
  clamp(v) { const h = this.size / 2 - 4; return Math.max(-h, Math.min(h, v)); },
};

// Five districts, each with its own building look and street furniture.
export const DISTRICTS = [
  { id: 'downtown', name: 'Pusat Kota', x0: -2, z0: -2, x1: 2, z1: 2, tower: true, palette: ['#c9a37e', '#b08d6f', '#9fb3c8', '#c8b299'], roof: '#8a5a3b' },
  { id: 'market', name: 'Pasar Sinar', x0: -5, z0: -5, x1: -2, z1: -2, tower: false, palette: ['#d9b36c', '#c98f4e', '#a8c686', '#e0a899'], roof: '#a6472e' },
  { id: 'kampung', name: 'Kampung Melati', x0: 2, z0: -5, x1: 5, z1: -2, tower: false, palette: ['#e8d8b0', '#d4c08a', '#b5d3a7', '#e5b8a0'], roof: '#7d4a2d' },
  { id: 'port', name: 'Pelabuhan', x0: -5, z0: 2, x1: -2, z1: 5, tower: false, palette: ['#8fa3ad', '#7d929e', '#a8b8c0', '#94a89a'], roof: '#4a5a66' },
  { id: 'riverside', name: 'Tepi Sungai', x0: 2, z0: 2, x1: 5, z1: 5, tower: false, palette: ['#cfe0b8', '#b8d0a0', '#dce8c8', '#a9cfa5'], roof: '#5d7d4a' },
];

export function districtAt(x, z) {
  const gx = Math.floor((x + CITY.size / 2) / CITY.pitch) - 5;
  const gz = Math.floor((z + CITY.size / 2) / CITY.pitch) - 5;
  for (const d of DISTRICTS) {
    if (gx >= d.x0 && gx <= d.x1 && gz >= d.z0 && gz <= d.z1) return d;
  }
  return DISTRICTS[0];
}

// Landmarks, placed on road corners so the player can always reach them.
export const LANDMARKS = {
  dealer: { name: 'Sinar Jaya Dealer', x: CITY.roadLine(6), z: CITY.roadLine(4) },
  garage: { name: 'Garage', x: CITY.roadLine(4), z: CITY.roadLine(6) },
  gasA: { name: 'Kenanga Gas Station', x: CITY.roadLine(2), z: CITY.roadLine(8) },
  gasB: { name: 'Merdeka Gas Station', x: CITY.roadLine(8), z: CITY.roadLine(2) },
  mosque: { name: 'Masjid Al Sinar', x: CITY.roadLine(2), z: CITY.roadLine(2) },
  school: { name: 'SDN Melati', x: CITY.roadLine(8), z: CITY.roadLine(8) },
  market: { name: 'Pasar Sinar', x: CITY.roadLine(2), z: CITY.roadLine(2) },
  park: { name: 'Taman Sungai', x: CITY.roadLine(8), z: CITY.roadLine(8) },
  spawn: { x: CITY.roadLine(5), z: CITY.roadLine(5) },
};

// Seven bikes. topSpeed in km/h; accel/handling/brake are 0..1.3 multipliers.
export const BIKES = [
  { id: 'bebek-tua', name: 'Old Cub', desc: 'Your first bike. Slow, wobbly, sometimes stalls.', topSpeed: 72, accel: 0.55, handling: 0.7, brake: 0.6, price: 0, rank: 0, color: 0xb03a2e, wheel: 0.34 },
  { id: 'matic-110', name: 'City Matic 110', desc: 'Thrifty automatic for a full day of fares.', topSpeed: 92, accel: 0.7, handling: 0.85, brake: 0.7, price: 450000, rank: 0, color: 0x2e6db0, wheel: 0.34 },
  { id: 'bebek-sport', name: 'Sport Cub', desc: 'A cub with sport blood. Fast on the straights.', topSpeed: 112, accel: 0.8, handling: 0.9, brake: 0.75, price: 1150000, rank: 1, color: 0x2e9e5b, wheel: 0.35 },
  { id: 'sport-150', name: 'Sport 150', desc: '150cc sport. Overtaking traffic gets easy.', topSpeed: 136, accel: 0.9, handling: 0.95, brake: 0.85, price: 2600000, rank: 2, color: 0xc23b3b, wheel: 0.36 },
  { id: 'sport-250', name: 'Sport 250', desc: '250cc, growling exhaust, eager pull.', topSpeed: 162, accel: 1.0, handling: 1.0, brake: 0.9, price: 4800000, rank: 3, color: 0x8e44ad, wheel: 0.37 },
  { id: 'moge-250', name: 'Big Bike 250', desc: 'A real 250cc big bike. King of the road material.', topSpeed: 186, accel: 1.1, handling: 1.0, brake: 0.95, price: 6200000, rank: 4, color: 0x1f1f24, wheel: 0.38 },
  { id: 'moge-1000', name: 'Big Bike 1000', desc: '1000cc. One twist of the throttle and the city is behind you.', topSpeed: 222, accel: 1.25, handling: 1.05, brake: 1.0, price: 12500000, rank: 5, color: 0xd4a017, wheel: 0.4 },
];

export function bikeById(id) { return BIKES.find((b) => b.id === id) || BIKES[0]; }

// Six ranks. xp is the total XP needed to reach the rank.
export const RANKS = [
  { name: 'Rookie Rider', xp: 0, desc: 'Just started riding.' },
  { name: 'Street Rider', xp: 150, desc: 'Orders are picking up.' },
  { name: 'Pro Driver', xp: 400, desc: 'Regulars know your name.' },
  { name: 'Depot Star', xp: 800, desc: 'A name to reckon with at the depot.' },
  { name: 'City Legend', xp: 1400, desc: 'Everyone in town knows your name.' },
  { name: 'King of the Streets', xp: 2200, desc: 'The top of this city.' },
];

export function rankForXp(xp) {
  let r = 0;
  for (let i = 0; i < RANKS.length; i += 1) if (xp >= RANKS[i].xp) r = i;
  return r;
}

// Order types: base fare + per-km rate, in rupiah. Timers in seconds.
export const ORDER_TYPES = {
  penumpang: { label: 'Ride', base: 12000, perKm: 9000, tip: 0.2, icon: 'R' },
  paket: { label: 'Parcel', base: 10000, perKm: 7500, tip: 0.15, icon: 'P' },
  makanan: { label: 'Food Delivery', base: 14000, perKm: 10000, tip: 0.3, timer: 150, icon: 'F' },
  vip: { label: 'VIP Ride', base: 40000, perKm: 20000, tip: 0.5, icon: 'V', minRank: 3 },
  kilat: { label: 'Rush Parcel', base: 25000, perKm: 14000, tip: 0.25, timer: 120, icon: 'R!', minRank: 1 },
};

export const SHIFTS = [
  { id: 'pagi', name: 'Morning', from: 6, to: 11, traffic: 0.9, surge: 1.2 },
  { id: 'siang', name: 'Midday', from: 11, to: 16, traffic: 0.7, surge: 1.0 },
  { id: 'sore', name: 'Evening', from: 16, to: 21, traffic: 1.0, surge: 1.4 },
  { id: 'malam', name: 'Night', from: 21, to: 30, traffic: 0.45, surge: 1.1 },
];

export function shiftAt(hour) {
  const h = hour >= 24 ? hour - 24 : hour;
  for (const s of SHIFTS) {
    const from = s.from >= 24 ? s.from - 24 : s.from;
    const to = s.to >= 24 ? s.to - 24 : s.to;
    if (from <= to ? (h >= from && h < to) : (h >= from || h < to)) return s;
  }
  return SHIFTS[1];
}

export const DAY_LENGTH = 360; // one full day, in real seconds
export const WEATHER = {
  clear: { label: 'Clear', fare: 1.0, grip: 1.0, fog: 0 },
  cloudy: { label: 'Cloudy', fare: 1.1, grip: 0.95, fog: 0.25 },
  rain: { label: 'Rain', fare: 1.3, grip: 0.75, fog: 0.6 },
};

export const UPGRADES = [
  { id: 'engine', name: 'Engine', desc: 'Top speed and acceleration up.', prices: [180000, 420000, 900000] },
  { id: 'tires', name: 'Tires', desc: 'More grip, safer in the rain.', prices: [120000, 300000, 650000] },
  { id: 'brakes', name: 'Brakes', desc: 'Stronger brakes, safer corners.', prices: [100000, 250000, 550000] },
];

export const PAINTS = [
  { name: 'Red', color: 0xc23b3b, price: 50000 },
  { name: 'Blue', color: 0x2e6db0, price: 50000 },
  { name: 'Green', color: 0x2e9e5b, price: 50000 },
  { name: 'Yellow', color: 0xd4a017, price: 75000 },
  { name: 'Purple', color: 0x8e44ad, price: 75000 },
  { name: 'Black', color: 0x1f1f24, price: 100000 },
  { name: 'White', color: 0xe8e8e8, price: 100000 },
  { name: 'Orange', color: 0xe67e22, price: 75000 },
];

export const ECONOMY = {
  fuelTank: 100,
  fuelPerKm: 6,
  fuelPricePerUnit: 350,
  repairPerPoint: 800,
  bustMoneyLoss: 0.15,
  bustRatingLoss: 0.3,
  startMoney: 50000,
  startFuel: 80,
  startRating: 4.2,
};

export const WANTED = {
  steal: 1,
  hitPedestrian: 1,
  hitVehicle: 1,
  hitPolice: 2,
  decaySeconds: 25,
  bustHoldSeconds: 3,
};

export const COMBAT = {
  playerHp: 100,
  punchDamage: 22,
  punchRange: 2.4,
  punchCooldown: 0.42,
  hitStopLight: 0.07,
  hitStopHeavy: 0.12,
  dodgeSeconds: 0.45,
  dodgeCooldown: 0.9,
};

export const fmtRp = (n) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
export const fmtKm = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
export const fmtClock = (hour) => {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
