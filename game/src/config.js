// Every tuning number, colour, and definition in one place. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size. The world itself is much bigger: a city the
// camera moves across.
//
// Dispatcher routing (open-game-skills): Phase A uses action-feel/short-special,
// juice-vfx/punchy, hitstun-recover/light-stun. ENGINE: custom (vanilla canvas 2D).
// DEFER: racing-feel, enemy-ai, quest-graph, world-map, save-checkpoint.

export const FIELD = { width: 1280, height: 720 };
export const WORLD = { width: 3600, height: 2700 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;
export const TICKS_PER_SECOND = 60;

/** Spacing scale for every panel, card, and HUD element: a 4-unit base, no one-off values. */
export const SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, huge: 48 };

export const PALETTE = {
  sky: '#ffd98a',
  ground: '#8a9a5b',
  road: '#5d5a55',
  roadLine: '#e8d98a',
  sidewalk: '#cfc6b4',
  curb: '#9a917e',
  panel: 'rgba(24, 22, 20, 0.88)',
  panelEdge: '#ffb020',
  text: '#f7f2e7',
  muted: '#c9bda6',
  accent: '#ffb020',
  green: '#3ecf6e',
  red: '#ff4757',
  blue: '#4aa8ff',
  gold: '#ffd94a',
  white: '#ffffff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the save lives between visits (this browser only). */
export const SAVE_KEY = 'ojek-raja-jalanan.save.v1';

/** The rank ladder. Rank is the visible progression: level gates the rank, and the
 *  final rank also needs the story arc finished. Each rank unlocks districts,
 *  order tiers, and bikes. */
export const RANKS = [
  { id: 'baru', name: 'Ojek Baru', level: 1, story: 0, districts: ['kota-lama'], orderTier: 1, blurb: 'Baru mulai narik di pangkalan.' },
  { id: 'tukang', name: 'Tukang Ojek', level: 2, story: 0, districts: ['kota-lama', 'pusat'], orderTier: 2, blurb: 'Pusat kota mulai kenal kamu.' },
  { id: 'andal', name: 'Driver Andal', level: 4, story: 1, districts: ['kota-lama', 'pusat', 'timur'], orderTier: 3, blurb: 'Timur terbuka. Orderan makin jauh.' },
  { id: 'bintang', name: 'Bintang Pangkalan', level: 6, story: 2, districts: ['kota-lama', 'pusat', 'timur', 'selatan'], orderTier: 4, blurb: 'Seluruh kota bisa kamu datangi.' },
  { id: 'legenda', name: 'Legenda Kota', level: 8, story: 4, districts: ['kota-lama', 'pusat', 'timur', 'selatan'], orderTier: 5, blurb: 'Penumpang VIP minta kamu langsung.' },
  { id: 'raja', name: 'Raja Jalanan', level: 10, story: 5, districts: ['kota-lama', 'pusat', 'timur', 'selatan'], orderTier: 5, blurb: 'Geng Macan kalah. Kota ini milikmu.' },
];

export const DISTRICTS = {
  'kota-lama': { name: 'Kota Lama', color: '#d9a441' },
  pusat: { name: 'Pusat Kota', color: '#3a7bd5' },
  timur: { name: 'Timur', color: '#2e9e6b' },
  selatan: { name: 'Selatan', color: '#c22e3d' },
};

/** One game day lasts six real minutes. The clock starts at 06:00. */
export const DAY = {
  secondsPerGameHour: 15,
  startHour: 6,
  shifts: [
    { id: 'pagi', name: 'Pagi', from: 6, to: 10, orderTypes: ['penumpang', 'penumpang', 'paket'], traffic: 1.25, surge: 1.2 },
    { id: 'siang', name: 'Siang', from: 10, to: 15, orderTypes: ['penumpang', 'paket', 'makanan'], traffic: 1.0, surge: 1.0 },
    { id: 'sore', name: 'Sore', from: 15, to: 19, orderTypes: ['makanan', 'paket', 'penumpang'], traffic: 1.4, surge: 1.5 },
    { id: 'malam', name: 'Malam', from: 19, to: 30, orderTypes: ['vip', 'penumpang', 'makanan'], traffic: 0.7, surge: 1.3 },
  ],
  rushHours: [[7, 9], [17, 19]],
};

export const WEATHER = {
  cycleSeconds: 90,
  types: [
    { id: 'cerah', name: 'Cerah', fare: 1.0, grip: 1.0, weight: 0.6 },
    { id: 'mendung', name: 'Mendung', fare: 1.1, grip: 0.9, weight: 0.25 },
    { id: 'hujan', name: 'Hujan', fare: 1.3, grip: 0.7, weight: 0.15 },
  ],
};

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  runSpeed: 250,
  maxHealth: 5,
  punchRange: 56,
  punchCooldown: 0.45,
  punchDamage: 1,
};

/** Combat timing contract, in logical ticks at 60 Hz (action-feel/short-special,
 *  hitstun-recover/light-stun). Hitstop freezes only the two actors in the hit;
 *  the world and every other actor keep running. */
export const COMBAT = {
  punchStartupTicks: 4,
  punchActiveTicks: 6,
  punchRecoveryTicks: 10,
  bufferTicks: 6,
  hitstopAttackerTicks: 3,
  hitstopVictimLightTicks: 5,
  hitstopVictimHeavyTicks: 8,
  hitstunLightTicks: 12,
  hitstunHeavyTicks: 20,
  knockbackLight: 90,
  knockbackHeavy: 220,
  magnetRange: 90,
  magnetSlide: 60,
  rivalHealth: 3,
  rivalDamage: 1,
  rivalAttackCooldown: 1.4,
  begalHealth: 2,
  playerInvulnSeconds: 0.8,
};

/** The five bikes. Price in rupiah; level is the driver level needed to buy. */
export const BIKES = [
  {
    id: 'bebek-tua', name: 'Bebek Tua', price: 0, level: 1,
    topSpeed: 430, accel: 260, handling: 2.4, braking: 300, fuelDrain: 1.9,
    color: '#b0563a', desc: 'Motor pertamamu. Pelan, goyang, kadang mogok.',
  },
  {
    id: 'matic-110', name: 'Matic 110', price: 450000, level: 1,
    topSpeed: 540, accel: 340, handling: 2.9, braking: 380, fuelDrain: 1.4,
    color: '#3a7bd5', desc: 'Matic irit buat narik seharian.',
  },
  {
    id: 'bebek-sport', name: 'Bebek Sport', price: 1150000, level: 2,
    topSpeed: 640, accel: 430, handling: 3.2, braking: 440, fuelDrain: 1.5,
    color: '#2e9e6b', desc: 'Bebek rasa sport. Kencang di jalan lurus.',
  },
  {
    id: 'sport-150', name: 'Sport 150', price: 2600000, level: 3,
    topSpeed: 740, accel: 540, handling: 3.6, braking: 520, fuelDrain: 1.7,
    color: '#c22e3d', desc: 'Sport 150cc. Nyalip angkot jadi gampang.',
  },
  {
    id: 'moge-250', name: 'Moge 250', price: 6200000, level: 5,
    topSpeed: 860, accel: 660, handling: 3.9, braking: 620, fuelDrain: 2.1,
    color: '#22242a', desc: 'Moge 250cc. Raja jalanan beneran.',
  },
];

/** Upgrades, fitted per bike at the dealer. Three levels each; effects stack. */
export const UPGRADES = [
  {
    id: 'ban', name: 'Ban', desc: 'Grip lebih baik, belok lebih tajam.',
    levels: [
      { price: 120000, handling: 0.25, grip: 0.08 },
      { price: 300000, handling: 0.5, grip: 0.16 },
      { price: 650000, handling: 0.8, grip: 0.26 },
    ],
  },
  {
    id: 'mesin', name: 'Mesin', desc: 'Top speed dan akselerasi naik.',
    levels: [
      { price: 150000, topSpeed: 50, accel: 40 },
      { price: 380000, topSpeed: 110, accel: 90 },
      { price: 800000, topSpeed: 180, accel: 150 },
    ],
  },
  {
    id: 'rem', name: 'Rem', desc: 'Berhenti lebih cepat, tabrakan berkurang.',
    levels: [
      { price: 100000, braking: 90 },
      { price: 250000, braking: 200 },
      { price: 550000, braking: 340 },
    ],
  },
];

export const FUEL = { max: 100, refillPrice: 15000, refillAmount: 100 };

export const ECONOMY = {
  startMoney: 50000,
  baseFare: 5000,
  farePerMetre: 22,
  vipFareBonus: 25000,
  foodTimerSeconds: 75,
  tipRate: 0.3,
  premiumTipRate: 0.5,
  finePerStar: 20000,
  bustFineRate: 0.15,
  bustRatingLoss: 0.3,
  rivalReward: 5000,
  repairCostPerPoint: 1500,
  crashDamageMin: 8,
  crashDamageMax: 15,
  lateRatingLoss: 0.15,
  crashRatingLoss: 0.1,
  onTimeRatingGain: 0.05,
  startRating: 4.2,
  minRating: 3.0,
  maxRating: 5.0,
  premiumRating: 4.5,
  streakBonusPerStreak: 0.1,
  streakMaxMultiplier: 2.0,
};

export const LEVELS = {
  /** XP needed to go from level n to n+1. */
  xpFor(level) { return 80 + level * 60; },
  max: 10,
};

export const WANTED = {
  max: 5,
  decaySeconds: 20,
  bustHoldSeconds: 2.5,
  bustRange: 44,
  policeTopSpeed: 700,
};

export const TRAFFIC = {
  carCount: 12,
  pedestrianCount: 42,
  lightCycle: 18,
  jamChance: 0.25,
};

export const EVENTS = {
  minGapSeconds: 70,
  maxGapSeconds: 110,
  closureDurationSeconds: 60,
  types: ['banjir', 'demo', 'kecelakaan', 'vip', 'paket-kilat'],
};

export const CAMERA = { lookAhead: 90, smoothing: 6 };

/** Juice budgets (juice-vfx/punchy): every effect class has a cap and an owner. */
export const JUICE = {
  maxParticles: 400,
  maxSkidMarks: 120,
  maxRainDrops: 220,
  shakeMax: 14,
  speedLineMinSpeed: 520,
};
