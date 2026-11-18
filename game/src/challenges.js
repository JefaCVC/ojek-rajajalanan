// OJEK! King of the Streets — daily challenges: three goals a day, picked
// deterministically from the calendar date so every player gets the same
// set. Progress is tracked per day on the profile and resets at midnight.

export const CHALLENGE_POOL = [
  { id: 'orders-5', text: 'Complete 5 orders', metric: 'orders', target: 5, rewardMoney: 25000, rewardXp: 40 },
  { id: 'earn-200k', text: 'Earn Rp 200.000', metric: 'earned', target: 200000, rewardMoney: 30000, rewardXp: 50 },
  { id: 'speed-120', text: 'Reach 120 km/h', metric: 'maxSpeed', target: 120, rewardMoney: 15000, rewardXp: 30 },
  { id: 'food-3', text: 'Deliver 3 food orders', metric: 'food', target: 3, rewardMoney: 20000, rewardXp: 35 },
  { id: 'distance-20', text: 'Ride 20 km', metric: 'distance', target: 20, rewardMoney: 20000, rewardXp: 35 },
  { id: 'streak-3', text: 'Reach a 3-order streak', metric: 'streak', target: 3, rewardMoney: 20000, rewardXp: 35 },
  { id: 'night-2', text: 'Deliver 2 orders at night', metric: 'night', target: 2, rewardMoney: 25000, rewardXp: 40 },
  { id: 'orders-10', text: 'Complete 10 orders', metric: 'orders', target: 10, rewardMoney: 50000, rewardXp: 80 },
];

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hashKey(key) {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

export function ensureDay(profile) {
  const key = todayKey();
  if (!profile.challenges || profile.challenges.date !== key) {
    profile.challenges = { date: key, progress: {}, claimed: [] };
  }
  if (!profile.challenges.progress) profile.challenges.progress = {};
  if (!Array.isArray(profile.challenges.claimed)) profile.challenges.claimed = [];
  return profile.challenges;
}

export function dailyChallenges(profile) {
  const day = ensureDay(profile);
  const h = hashKey(day.date);
  const out = [];
  for (let i = 0; i < 3; i += 1) {
    out.push(CHALLENGE_POOL[(h + i * 3) % CHALLENGE_POOL.length]);
  }
  return out;
}

export function challengeProgress(profile, def) {
  ensureDay(profile);
  const p = profile.challenges.progress[def.metric];
  if (def.metric === 'distance') return Math.floor((p || 0) * 10) / 10;
  return Math.floor(p || 0);
}

// Add to a metric. maxSpeed and streak keep the best value, the rest sum.
export function addProgress(profile, metric, amount) {
  const day = ensureDay(profile);
  if (metric === 'maxSpeed' || metric === 'streak') {
    day.progress[metric] = Math.max(day.progress[metric] || 0, amount);
  } else {
    day.progress[metric] = (day.progress[metric] || 0) + amount;
  }
}

// Challenges that just completed and have not been claimed yet. The caller
// grants the reward and marks them claimed with claimChallenge.
export function checkCompletions(profile) {
  const done = [];
  for (const def of dailyChallenges(profile)) {
    if (profile.challenges.claimed.includes(def.id)) continue;
    if (challengeProgress(profile, def) >= def.target) done.push(def);
  }
  return done;
}

export function claimChallenge(profile, id) {
  ensureDay(profile);
  if (!profile.challenges.claimed.includes(id)) profile.challenges.claimed.push(id);
}

export function isClaimed(profile, id) {
  ensureDay(profile);
  return profile.challenges.claimed.includes(id);
}
