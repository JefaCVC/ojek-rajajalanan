// OJEK! King of the Streets — save and load. The profile lives in localStorage as
// one JSON object; a broken or missing save falls back to a fresh profile.

import { ECONOMY } from './config.js';

const SAVE_KEY = 'ojek-raja-jalanan-save-v1';

export function freshProfile() {
  return {
    money: ECONOMY.startMoney,
    xp: 0,
    rating: ECONOMY.startRating,
    ratingsCount: 12,
    streak: 0,
    bestStreak: 0,
    ownedBikes: [{ id: 'bebek-tua', paint: null, upgrades: { engine: 0, tires: 0, brakes: 0 }, condition: 100, fuel: ECONOMY.startFuel }],
    activeBike: 0,
    storyIndex: 0,
    storyDone: [],
    achievements: [],
    skillPoints: 0,
    skills: { speed: 0, business: 0, street: 0 },
    challenges: { date: '', progress: {}, claimed: [] },
    earningsLog: [],
    tutorialDone: false,
    settings: { muted: false, radioOn: true },
    stats: { ordersDone: 0, distanceKm: 0, earned: 0, busted: 0, racesWon: 0, punches: 0, trips: 0, escapes: 0, nightDeliveries: 0, maxSpeedKmh: 0, foodDone: 0 },
    player: { x: 0, z: 0, heading: 0, riding: true },
    hour: 8.0,
    version: 1,
  };
}

function mergeProfile(saved) {
  const base = freshProfile();
  if (!saved || typeof saved !== 'object') return base;
  const out = { ...base, ...saved };
  out.settings = { ...base.settings, ...(saved.settings || {}) };
  out.stats = { ...base.stats, ...(saved.stats || {}) };
  out.player = { ...base.player, ...(saved.player || {}) };
  out.skills = { ...base.skills, ...(saved.skills || {}) };
  out.challenges = { ...base.challenges, ...(saved.challenges || {}) };
  if (!out.challenges.progress || typeof out.challenges.progress !== 'object') out.challenges.progress = {};
  if (!Array.isArray(out.challenges.claimed)) out.challenges.claimed = [];
  if (!Array.isArray(out.earningsLog)) out.earningsLog = [];
  if (typeof out.skillPoints !== 'number') out.skillPoints = 0;
  if (!Array.isArray(out.ownedBikes) || out.ownedBikes.length === 0) out.ownedBikes = base.ownedBikes;
  out.ownedBikes = out.ownedBikes.map((b) => ({
    id: b.id,
    paint: b.paint ?? null,
    upgrades: { engine: 0, tires: 0, brakes: 0, ...(b.upgrades || {}) },
    condition: typeof b.condition === 'number' ? b.condition : 100,
    fuel: typeof b.fuel === 'number' ? b.fuel : ECONOMY.startFuel,
  }));
  if (typeof out.activeBike !== 'number' || out.activeBike >= out.ownedBikes.length) out.activeBike = 0;
  return out;
}

export function loadProfile() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { profile: freshProfile(), existed: false };
    return { profile: mergeProfile(JSON.parse(raw)), existed: true };
  } catch {
    return { profile: freshProfile(), existed: false };
  }
}

export function saveProfile(profile) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function clearProfile() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
