// Kota Sinar: the city itself. A grid of roads with blocks between them, filled
// with buildings, trees, lamps, billboards, food carts, and the landmarks the game
// needs: the pangkalan where the driver starts, the bike dealer, the gas station,
// the police post, the market, the mosque, and the school. Everything is generated
// from a seed, so the same seed always builds the same city.
//
// The city is split into four districts. The rank ladder opens them one by one:
// Kota Lama first, then Pusat, Timur, and Selatan. Random events (flood, protest,
// crash) close a stretch of road for a while; closures are solid for vehicles and
// slow or block people on foot.

import { WORLD } from './config.js';
import { randomInt, randomPick } from './random.js';

export const ROAD_HALF = 42;
export const SIDEWALK = 22;

const ROAD_X = [200, 520, 840, 1160, 1480, 1800, 2120, 2440, 2760, 3080, 3400];
const ROAD_Y = [150, 450, 750, 1050, 1350, 1650, 1950, 2250, 2550];

const STREET_V = [
  'Jl. Merdeka', 'Jl. Kenanga', 'Jl. Melati', 'Jl. Sudirman', 'Jl. Anggrek',
  'Jl. Diponegoro', 'Jl. Flamboyan', 'Jl. Thamrin', 'Jl. Cempaka', 'Jl. Gajah Mada',
  'Jl. Kamboja',
];
const STREET_H = [
  'Jl. Raya Timur', 'Jl. Ahmad Yani', 'Jl. Veteran', 'Jl. Kartini', 'Jl. Pemuda',
  'Jl. Hayam Wuruk', 'Jl. Pahlawan', 'Jl. Cendrawasih', 'Jl. Raya Selatan',
];

const BUILDING_COLORS = ['#d8c49a', '#c98f6b', '#a8b8a0', '#d9a441', '#b07a7a', '#8fa3b8', '#c4b49a', '#9ab08a'];
const ROOF_COLORS = ['#a34a2e', '#7a4a2e', '#4a6b8a', '#5a5a5a', '#8a2e2e', '#3f6b4f'];
const SHOP_NAMES = [
  'Toko Berkah', 'Warung Bu Tini', 'Fotokopi Jaya', 'Bengkel Las', 'Toko Kelontong',
  'Bakso Pakde', 'Laundry Kilat', 'Apotek Sehat', 'Warung Kopi', 'Toko Bangunan',
  'Salon Ayu', 'Konter Pulsa', 'Ayam Goreng', 'Es Teh Solo', 'Toko Emas',
];
const BILLBOARDS = [
  'ES TEH MANIS', 'BAKSO PAKDE', 'SINAR MOTOR', 'KOTA SINAR', 'PULSA MURAH', 'AYAM GORENG',
];

/** Landmark blocks, as [column, row] of the block grid between the roads. */
const LANDMARK_BLOCKS = {
  mosque: [1, 0],
  police: [5, 0],
  pangkalan: [0, 4],
  market: [5, 4],
  spbu: [9, 4],
  dealer: [5, 7],
  school: [8, 7],
};

/** Which district a point belongs to. Selatan wins by latitude, then the west-to-east bands. */
export function districtOf(x, y) {
  if (y >= 1950) return 'selatan';
  if (x < 1200) return 'kota-lama';
  if (x < 2400) return 'pusat';
  return 'timur';
}

function blockRect(col, row) {
  const x0 = ROAD_X[col] + ROAD_HALF + SIDEWALK + 6;
  const x1 = ROAD_X[col + 1] - ROAD_HALF - SIDEWALK - 6;
  const y0 = ROAD_Y[row] + ROAD_HALF + SIDEWALK + 6;
  const y1 = ROAD_Y[row + 1] - ROAD_HALF - SIDEWALK - 6;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function createCity(random) {
  const buildings = [];
  const trees = [];
  const lamps = [];
  const billboards = [];
  const carts = [];
  const parkedSpots = [];
  const landmarks = {};
  const lights = [];
  const closures = [];
  const usedShopNames = new Set();

  function shopName() {
    const free = SHOP_NAMES.filter((name) => !usedShopNames.has(name));
    const name = free.length > 0 ? randomPick(random, free) : 'Toko ' + randomInt(random, 1, 99);
    usedShopNames.add(name);
    return name;
  }

  // Street lamps along every road, alternating sides.
  for (const x of ROAD_X) {
    for (let y = 120; y < WORLD.height; y += 260) {
      lamps.push({ x: x + ROAD_HALF + 8, y: y + (lamps.length % 2 === 0 ? 0 : 130) });
    }
  }
  for (const y of ROAD_Y) {
    for (let x = 120; x < WORLD.width; x += 280) {
      lamps.push({ x: x + (lamps.length % 2 === 0 ? 0 : 140), y: y + ROAD_HALF + 8 });
    }
  }

  // Traffic lights at four busy intersections.
  for (const [x, y] of [[1160, 750], [2120, 1350], [840, 1950], [2760, 1050]]) {
    lights.push({ x, y, state: 'green', timer: random() * 8, verticalGreen: true });
  }

  // Fill every block: landmarks get their own layout, the rest get buildings and trees.
  const landmarkAt = new Map();
  for (const [key, [col, row]] of Object.entries(LANDMARK_BLOCKS)) landmarkAt.set(col + ',' + row, key);

  for (let col = 0; col < ROAD_X.length - 1; col += 1) {
    for (let row = 0; row < ROAD_Y.length - 1; row += 1) {
      const rect = blockRect(col, row);
      const landmark = landmarkAt.get(col + ',' + row);
      if (landmark === 'market') {
        landmarks.market = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, w: rect.w, h: rect.h, name: 'Pasar Sinar' };
        for (let i = 0; i < 10; i += 1) {
          carts.push({
            x: rect.x + 24 + (i % 5) * ((rect.w - 48) / 4),
            y: rect.y + 30 + Math.floor(i / 5) * (rect.h - 60),
            angle: 0,
            color: randomPick(random, ['#d94f3d', '#2e9e6b', '#d9a441', '#3a7bd5']),
          });
        }
        for (let i = 0; i < 6; i += 1) trees.push({ x: rect.x + 12 + random() * (rect.w - 24), y: rect.y + 12 + random() * (rect.h - 24), r: 12 + random() * 6 });
        continue;
      }
      if (landmark === 'pangkalan') {
        landmarks.pangkalan = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, w: rect.w, h: rect.h, name: 'Pangkalan Ojek' };
        buildings.push({ x: rect.x + 8, y: rect.y + 8, w: 70, h: 44, color: '#b07a7a', roof: '#7a4a2e', height: 26, type: 'shelter', name: 'Pos Ojek' });
        for (let i = 0; i < 4; i += 1) parkedSpots.push({ x: rect.x + 30 + i * 34, y: rect.y + rect.h - 30, angle: -Math.PI / 2, kind: 'bike' });
        for (let i = 0; i < 4; i += 1) trees.push({ x: rect.x + 16 + random() * (rect.w - 32), y: rect.y + 60 + random() * (rect.h - 80), r: 11 + random() * 5 });
        continue;
      }
      if (landmark === 'mosque') {
        landmarks.mosque = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, w: rect.w, h: rect.h, name: 'Masjid Al Sinar' };
        buildings.push({ x: rect.x + rect.w / 2 - 60, y: rect.y + rect.h / 2 - 44, w: 120, h: 88, color: '#f2ead8', roof: '#2e9e6b', height: 44, type: 'mosque', name: 'Masjid Al Sinar' });
        continue;
      }
      if (landmark === 'police') {
        landmarks.police = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, w: rect.w, h: rect.h, name: 'Pos Polisi' };
        buildings.push({ x: rect.x + rect.w / 2 - 62, y: rect.y + rect.h / 2 - 40, w: 124, h: 80, color: '#cfd8e0', roof: '#2e4a7a', height: 36, type: 'police', name: 'Pos Polisi' });
        continue;
      }
      if (landmark === 'spbu') {
        landmarks.spbu = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, w: rect.w, h: rect.h, name: 'SPBU Sinar' };
        buildings.push({ x: rect.x + rect.w / 2 - 70, y: rect.y + 10, w: 140, h: 40, color: '#d94f3d', roof: '#f2ead8', height: 30, type: 'spbu', name: 'SPBU Sinar' });
        continue;
      }
      if (landmark === 'dealer') {
        landmarks.dealer = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, w: rect.w, h: rect.h, name: 'Dealer Sinar Jaya' };
        buildings.push({ x: rect.x + 10, y: rect.y + 10, w: rect.w - 20, h: 84, color: '#e8e0cc', roof: '#c22e3d', height: 40, type: 'dealer', name: 'Dealer Sinar Jaya' });
        for (let i = 0; i < 5; i += 1) parkedSpots.push({ x: rect.x + 26 + i * 36, y: rect.y + rect.h - 26, angle: -Math.PI / 2, kind: 'bike' });
        continue;
      }
      if (landmark === 'school') {
        landmarks.school = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, w: rect.w, h: 70, color: '#f2d98a', roof: '#a34a2e', height: 34, type: 'school', name: 'SDN Sinar 01' };
        continue;
      }

      // An ordinary block: two or three buildings along the edges, trees inside.
      const count = randomInt(random, 2, 3);
      for (let i = 0; i < count; i += 1) {
        const w = 60 + random() * 70;
        const h = 50 + random() * 60;
        const x = rect.x + 8 + random() * Math.max(8, rect.w - w - 16);
        const y = rect.y + 8 + random() * Math.max(8, rect.h - h - 16);
        const type = randomPick(random, ['ruko', 'toko', 'warung', 'rumah', 'kantor']);
        buildings.push({
          x, y, w, h,
          color: randomPick(random, BUILDING_COLORS),
          roof: randomPick(random, ROOF_COLORS),
          height: 22 + random() * 26,
          type,
          name: type === 'toko' || type === 'warung' ? shopName() : '',
        });
      }
      const treeCount = randomInt(random, 2, 5);
      for (let i = 0; i < treeCount; i += 1) {
        trees.push({ x: rect.x + 10 + random() * (rect.w - 20), y: rect.y + 10 + random() * (rect.h - 20), r: 10 + random() * 7 });
      }
      if (random() < 0.4) {
        carts.push({ x: rect.x + rect.w / 2, y: rect.y + rect.h - 18, angle: 0, color: randomPick(random, ['#d94f3d', '#2e9e6b', '#d9a441']) });
      }
    }
  }

  // Billboards along the main roads.
  for (let i = 0; i < 8; i += 1) {
    const vertical = random() < 0.5;
    billboards.push({
      x: vertical ? randomPick(random, ROAD_X) + ROAD_HALF + 14 : 140 + random() * (WORLD.width - 280),
      y: vertical ? 140 + random() * (WORLD.height - 280) : randomPick(random, ROAD_Y) + ROAD_HALF + 14,
      w: 120, h: 34,
      text: BILLBOARDS[i % BILLBOARDS.length],
      color: randomPick(random, ['#c22e3d', '#2e4a7a', '#2e9e6b', '#d9a441']),
    });
  }

  // Parked cars and bikes along quiet streets, free for the taking.
  for (let i = 0; i < 16; i += 1) {
    const vertical = random() < 0.5;
    parkedSpots.push({
      x: vertical ? randomPick(random, ROAD_X) + ROAD_HALF - 12 : 160 + random() * (WORLD.width - 320),
      y: vertical ? 160 + random() * (WORLD.height - 320) : randomPick(random, ROAD_Y) + ROAD_HALF - 12,
      angle: vertical ? Math.PI / 2 : 0,
      kind: random() < 0.6 ? 'bike' : 'car',
    });
  }

  function isOnRoad(x, y) {
    for (const rx of ROAD_X) if (Math.abs(x - rx) <= ROAD_HALF) return true;
    for (const ry of ROAD_Y) if (Math.abs(y - ry) <= ROAD_HALF) return true;
    return false;
  }

  function nearestRoadName(x, y) {
    let best = null;
    let bestDist = Infinity;
    ROAD_X.forEach((rx, i) => {
      const d = Math.abs(x - rx);
      if (d < bestDist) { bestDist = d; best = STREET_V[i]; }
    });
    ROAD_Y.forEach((ry, i) => {
      const d = Math.abs(y - ry);
      if (d < bestDist) { bestDist = d; best = STREET_H[i]; }
    });
    return best;
  }

  function randomRoadsidePoint() {
    const vertical = random() < 0.5;
    if (vertical) {
      const x = randomPick(random, ROAD_X) + (random() < 0.5 ? -1 : 1) * (ROAD_HALF + 12);
      return { x, y: 120 + random() * (WORLD.height - 240) };
    }
    const y = randomPick(random, ROAD_Y) + (random() < 0.5 ? -1 : 1) * (ROAD_HALF + 12);
    return { x: 120 + random() * (WORLD.width - 240), y };
  }

  /** A roadside point inside one of the given districts, or null after many tries. */
  function randomRoadsidePointIn(districtIds) {
    for (let i = 0; i < 40; i += 1) {
      const point = randomRoadsidePoint();
      if (districtIds.includes(districtOf(point.x, point.y))) return point;
    }
    return null;
  }

  /** The closure covering a point, if any. */
  function closureAt(x, y) {
    for (const c of closures) {
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return c;
    }
    return null;
  }

  /**
   * Pushes a circle out of buildings, closures, and the world edge. Returns the
   * corrected position plus whether the circle is wading through a flood (slow).
   * On a bike, every closure is solid; on foot, a flood only slows you down.
   */
  function collideCircle(x, y, radius, onBike) {
    let nx = Math.max(radius + 8, Math.min(WORLD.width - radius - 8, x));
    let ny = Math.max(radius + 8, Math.min(WORLD.height - radius - 8, y));
    let wading = false;
    const solids = [buildings, closures.filter((c) => onBike || c.kind !== 'banjir')];
    for (const list of solids) {
      for (const b of list) {
        const cx = Math.max(b.x, Math.min(nx, b.x + b.w));
        const cy = Math.max(b.y, Math.min(ny, b.y + b.h));
        const dx = nx - cx;
        const dy = ny - cy;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < radius * radius) {
          if (dist2 === 0) { ny = b.y - radius; continue; }
          const dist = Math.sqrt(dist2);
          nx = cx + (dx / dist) * radius;
          ny = cy + (dy / dist) * radius;
        }
      }
    }
    if (!onBike) {
      const c = closureAt(nx, ny);
      if (c && c.kind === 'banjir') wading = true;
    }
    return { x: nx, y: ny, wading };
  }

  function lightAt(x, y) {
    for (const light of lights) {
      if (Math.abs(light.x - x) < ROAD_HALF + 10 && Math.abs(light.y - y) < ROAD_HALF + 10) return light;
    }
    return null;
  }

  /** Closes a stretch of road for an event; returns the closure, or null if the spot is taken. */
  function addClosure(kind, durationSeconds) {
    const vertical = random() < 0.5;
    let x;
    let y;
    let w;
    let h;
    if (vertical) {
      const rx = randomPick(random, ROAD_X);
      x = rx - ROAD_HALF;
      w = ROAD_HALF * 2;
      y = 200 + random() * (WORLD.height - 500);
      h = 170;
    } else {
      const ry = randomPick(random, ROAD_Y);
      y = ry - ROAD_HALF;
      h = ROAD_HALF * 2;
      x = 200 + random() * (WORLD.width - 500);
      w = 170;
    }
    for (const c of closures) {
      if (x < c.x + c.w && x + w > c.x && y < c.y + c.h && y + h > c.y) return null;
    }
    const closure = { x, y, w, h, kind, timeLeft: durationSeconds };
    closures.push(closure);
    return closure;
  }

  function updateClosures(dt) {
    for (let i = closures.length - 1; i >= 0; i -= 1) {
      closures[i].timeLeft -= dt;
      if (closures[i].timeLeft <= 0) closures.splice(i, 1);
    }
  }

  return {
    roadsX: ROAD_X, roadsY: ROAD_Y, buildings, trees, lamps, billboards, carts,
    parkedSpots, landmarks, lights, closures, isOnRoad, nearestRoadName,
    randomRoadsidePoint, randomRoadsidePointIn, collideCircle, lightAt,
    closureAt, addClosure, updateClosures,
  };
}
