// OJEK! King of the Streets — achievements: small goals across the whole game,
// checked after every meaningful action and toasted when unlocked.

import { rankForXp } from './config.js';

export const ACHIEVEMENTS = [
  { id: 'first-order', name: 'First Order', desc: 'Finish your first order.', check: (p) => p.stats.ordersDone >= 1 },
  { id: 'ten-orders', name: 'Ten Orders', desc: 'Finish 10 orders.', check: (p) => p.stats.ordersDone >= 10 },
  { id: 'fifty-orders', name: 'Fifty Orders', desc: 'Finish 50 orders.', check: (p) => p.stats.ordersDone >= 50 },
  { id: 'first-bike', name: 'New Bike', desc: 'Buy your second bike.', check: (p) => p.ownedBikes.length >= 2 },
  { id: 'all-bikes', name: 'Bike Collector', desc: 'Own all seven dealer bikes.', check: (p) => p.ownedBikes.length >= 7 },
  { id: 'rank-3', name: 'Depot Star', desc: 'Reach rank Depot Star.', check: (p) => rankForXp(p.xp) >= 3 },
  { id: 'rank-5', name: 'King of the Streets', desc: 'Reach the highest rank, King of the Streets.', check: (p) => rankForXp(p.xp) >= 5 },
  { id: 'rich', name: 'Millionaire', desc: 'Earn Rp 1.000.000 in total.', check: (p) => p.stats.earned >= 1000000 },
  { id: 'distance-100', name: 'Hundred Kilometres', desc: 'Ride 100 km on the city streets.', check: (p) => p.stats.distanceKm >= 100 },
  { id: 'streak-5', name: 'Streak of Five', desc: 'Reach a 5-order streak with no late delivery.', check: (p) => p.bestStreak >= 5 },
  { id: 'story-done', name: 'Tiger Down', desc: 'Finish all seven Geng Macan missions.', check: (p) => p.storyDone.length >= 7 },
  { id: 'escape', name: 'Lost the Police', desc: 'Escape a police chase once.', check: (p) => (p.stats.escapes || 0) >= 1 },
  { id: 'fighter', name: 'Street Fighter', desc: 'Knock down 25 opponents.', check: (p) => p.stats.punches >= 25 },
  { id: 'night-owl', name: 'Night Owl', desc: 'Deliver 5 orders at night.', check: (p) => (p.stats.nightDeliveries || 0) >= 5 },
];

export function checkAchievements(profile) {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (profile.achievements.includes(a.id)) continue;
    if (a.check(profile)) {
      profile.achievements.push(a.id);
      unlocked.push(a);
    }
  }
  return unlocked;
}
