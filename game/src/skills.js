// OJEK! King of the Streets — the skill tree: three branches, three tiers
// each. Points come from rank-ups and story missions. Every node maps to a
// real bonus that the game systems read through the getters below.

export const SKILL_BRANCHES = [
  {
    id: 'speed',
    name: 'Rider',
    tagline: 'Speed branch',
    tiers: [
      { name: 'Nitro Boost', desc: 'Unlocks Nitro: a short speed burst. Press 1 or Shift.', cost: 1 },
      { name: 'Turbo Engine', desc: '+15% top speed on every bike you ride.', cost: 1 },
      { name: 'Apex Handling', desc: '+20% handling. Tighter turns at full speed.', cost: 1 },
    ],
  },
  {
    id: 'business',
    name: 'Hustler',
    tagline: 'Business branch',
    tiers: [
      { name: 'Haggler', desc: '+10% fares on every order.', cost: 1 },
      { name: 'VIP Magnet', desc: 'VIP orders appear much more often.', cost: 1 },
      { name: 'Surge Sense', desc: 'Surge zones show on the minimap. +15% surge bonus.', cost: 1 },
    ],
  },
  {
    id: 'street',
    name: 'Survivor',
    tagline: 'Street branch',
    tiers: [
      { name: 'Tough Skin', desc: '+25 max health.', cost: 1 },
      { name: 'Ghost', desc: 'Wanted level drops twice as fast. Unlocks Lay Low (key 3).', cost: 1 },
      { name: 'Brawler', desc: '+50% punch damage. Unlocks the heavy punch.', cost: 1 },
    ],
  },
];

export function branchById(id) {
  return SKILL_BRANCHES.find((b) => b.id === id) || SKILL_BRANCHES[0];
}

export function skillTier(profile, branch) {
  return (profile.skills && profile.skills[branch]) || 0;
}

export function hasSkill(profile, branch, tier) {
  return skillTier(profile, branch) >= tier;
}

export function tierDef(branch, tier) {
  return branchById(branch).tiers[tier - 1] || null;
}

export function canBuySkill(profile, branch, tier) {
  const def = tierDef(branch, tier);
  if (!def) return { ok: false, reason: 'No such skill.' };
  if (skillTier(profile, branch) >= tier) return { ok: false, reason: 'Already unlocked.' };
  if (skillTier(profile, branch) !== tier - 1) {
    return { ok: false, reason: `Requires ${tierDef(branch, tier - 1).name} first.` };
  }
  if ((profile.skillPoints || 0) < def.cost) {
    return { ok: false, reason: 'No skill points. Rank up or finish a story mission.' };
  }
  return { ok: true };
}

export function buySkill(profile, branch, tier) {
  const check = canBuySkill(profile, branch, tier);
  if (!check.ok) return check;
  const def = tierDef(branch, tier);
  if (!profile.skills) profile.skills = { speed: 0, business: 0, street: 0 };
  profile.skills[branch] = tier;
  profile.skillPoints -= def.cost;
  return { ok: true, message: `${def.name} unlocked!` };
}

// --- Bonus getters: the game systems read these, never the raw tiers ---

export function topSpeedMult(profile) {
  return hasSkill(profile, 'speed', 2) ? 1.15 : 1;
}

export function handlingMult(profile) {
  return hasSkill(profile, 'speed', 3) ? 1.2 : 1;
}

export function fareMult(profile) {
  return hasSkill(profile, 'business', 1) ? 1.1 : 1;
}

export function vipBoost(profile) {
  return hasSkill(profile, 'business', 2);
}

export function surgeBonusExtra(profile) {
  return hasSkill(profile, 'business', 3) ? 0.15 : 0;
}

export function surgeSense(profile) {
  return hasSkill(profile, 'business', 3);
}

export function maxHpBonus(profile) {
  return hasSkill(profile, 'street', 1) ? 25 : 0;
}

export function decayMult(profile) {
  return hasSkill(profile, 'street', 2) ? 0.5 : 1;
}

export function punchMult(profile) {
  return hasSkill(profile, 'street', 3) ? 1.5 : 1;
}

export function heavyUnlocked(profile) {
  return hasSkill(profile, 'street', 3);
}

export function hasNitro(profile) {
  return hasSkill(profile, 'speed', 1);
}

export function hasLayLow(profile) {
  return hasSkill(profile, 'street', 2);
}
