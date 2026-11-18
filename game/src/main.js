// OJEK! King of the Streets — the entry point: builds the renderer and every
// system, runs the loop, and wires the pieces together (orders pay out,
// wanted rises and falls, missions start and end, menus act). The game
// starts on the title screen; ?shot= stages a screenshot instead.

import * as THREE from 'three';
import { CITY, LANDMARKS, ORDER_TYPES, RANKS, bikeById, fmtRp, fmtKm, rankForXp, ECONOMY, COMBAT } from './config.js';
import { loadProfile, saveProfile, clearProfile } from './save.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createCity } from './city.js';
import { createDayCycle } from './daycycle.js';
import { createEffects } from './effects.js';
import { createCamera } from './camera.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createPlayer } from './player.js';
import { createOrders } from './orders.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createStory, STORY_MISSIONS } from './story.js';
import { createEvents } from './events.js';
import { createMinimap } from './minimap.js';
import { createUI } from './ui.js';
import { createMenus } from './menus.js';
import { createShots } from './shots.js';
import { createDebug } from './debug.js';
import { checkAchievements } from './achievements.js';
import { buyBike, buyUpgrade, paintBike, refuel, repair, switchBike, bikeEntry, refuelCost } from './economy.js';
import {
  buySkill, topSpeedMult, handlingMult, fareMult, vipBoost, surgeBonusExtra,
  surgeSense, maxHpBonus, decayMult, punchMult, heavyUnlocked, hasNitro, hasLayLow,
} from './skills.js';
import { addProgress, checkCompletions, claimChallenge } from './challenges.js';

const { profile, existed } = loadProfile();
const params = new URLSearchParams(window.location.search);
const hasShot = params.has('shot') || params.has('stage');
const hasAuto = params.has('auto');

// --- Renderer, scene, camera ---
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
// Software renderers (headless SwiftShader) get a lighter load: full pixel
// ratio and big shadow maps crawl there. Real desktop GPUs keep full quality.
const glInfo = renderer.getContext().getExtension('WEBGL_debug_renderer_info');
const gpuName = glInfo ? String(renderer.getContext().getParameter(glInfo.UNMASKED_RENDERER_WEBGL)) : '';
const softwareGL = /swiftshader|llvmpipe|software/i.test(gpuName);
if (softwareGL) renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5e0);
const camera3 = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 700);
camera3.position.set(0, 12, 20);

window.addEventListener('resize', () => {
  camera3.aspect = window.innerWidth / window.innerHeight;
  camera3.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Systems ---
const world = {};
const city = createCity(scene);
const daycycle = createDayCycle(scene);
if (softwareGL) daycycle.sun.shadow.mapSize.set(1024, 1024);
daycycle.setHour(profile.hour || 8.0);
const effects = createEffects(scene, camera3, document.getElementById('float-layer'));
const cameraRig = createCamera(camera3, city);
world.camera = cameraRig;
const traffic = createTraffic(scene, city);
const pedestrians = createPedestrians(scene);
const audio = createAudio();
audio.setMuted(!!profile.settings.muted);
audio.setRadioOn(profile.settings.radioOn !== false);
world.city = city;
world.traffic = traffic;
world.pedestrians = pedestrians;
world.effects = effects;
world.audio = audio;

const player = createPlayer(scene, world);
player.setEntry(bikeEntry(profile));
const spawn = profile.player && profile.player.x !== 0
  ? { x: profile.player.x, z: profile.player.z, heading: profile.player.heading || 0 }
  : { x: LANDMARKS.spawn.x, z: LANDMARKS.spawn.z, heading: 0 };
player.teleport(spawn.x, spawn.z, spawn.heading);
player.mountOwn();

const orders = createOrders(scene, city, daycycle, pedestrians);
orders.fillBoard(rankForXp(profile.xp));
const police = createPolice(scene, city, audio);
world.orders = orders;
world.police = police;
const combat = createCombat(scene, world);
world.combat = combat;
const story = createStory(scene, { city, combat, orders });
world.story = story;
const events = createEvents(scene, city);
const minimap = createMinimap(document.getElementById('minimap'));
const input = createInput(renderer.domElement);

// --- UI + menus ---
let mode = 'title';
let prevWanted = 0;
let trafficHitCooldown = 0;
let begalTimer = 45;
let currentShift = daycycle.shift.id;
let titleOrbit = 0;
let challengeTimer = 0;

// Active skills: cooldowns in seconds, counted down in step().
const SKILL_CD = { nitro: 20, fix: 45, laylow: 60 };
const skillCd = { nitro: 0, fix: 0, laylow: 0 };
const NITRO_SECONDS = 3;
const FIX_COST = 5000;
const FIX_AMOUNT = 40;

const ui = createUI({ onAction: handleAction });
const menus = createMenus({
  onAction: handleAction,
  getState: () => ({
    profile,
    profileExisted: existed,
    rank: rankForXp(profile.xp),
    activeOrder: orders.active,
    board: orders.board,
    storyMissions: STORY_MISSIONS,
    storyActive: !!story.active,
    muted: audio.isMuted(),
    radioOn: audio.isRadioOn(),
    stations: audio.stations(),
    stationIndex: audio.stationIndex(),
    drawMap: (canvas) => minimap.drawFull(canvas, mapState()),
  }),
});

// Push the profile's skill tiers into every system that reads them. Called
// at boot, after buying a skill, and after loading a save.
function applySkillEffects() {
  player.setSkillMods({ topSpeed: topSpeedMult(profile), handling: handlingMult(profile) });
  player.setMaxHp(COMBAT.playerHp + maxHpBonus(profile));
  orders.setFareMult(fareMult(profile));
  orders.setVipBoost(vipBoost(profile));
  police.setDecayMult(decayMult(profile));
  combat.setPunchMult(punchMult(profile));
  combat.setHeavyUnlocked(heavyUnlocked(profile));
}

function logEarning(label, amount) {
  if (!Array.isArray(profile.earningsLog)) profile.earningsLog = [];
  profile.earningsLog.push({ hour: daycycle.hour, label, amount });
  while (profile.earningsLog.length > 30) profile.earningsLog.shift();
}

function checkChallengeCompletions() {
  for (const def of checkCompletions(profile)) {
    claimChallenge(profile, def.id);
    profile.money += def.rewardMoney;
    logEarning(`Challenge: ${def.text}`, def.rewardMoney);
    ui.toast(`Challenge complete: ${def.text}! +${fmtRp(def.rewardMoney)}`, 'good');
    audio.levelUp();
    addXp(def.rewardXp);
  }
}

function useSkill(id) {
  if (id === 'nitro') {
    if (!hasNitro(profile)) { ui.toast('Nitro is locked. Unlock it in the Skills tab.', 'bad'); return; }
    if (!player.riding) { ui.toast('Nitro only works on the bike.', 'bad'); return; }
    if (skillCd.nitro > 0) return;
    skillCd.nitro = SKILL_CD.nitro;
    player.activateNitro(NITRO_SECONDS);
    audio.sirenBurst();
    effects.spawn(player.pos.clone().add(new THREE.Vector3(0, 1, 0)), { color: 0x2eff8a, count: 20, speed: 6, life: 0.6 });
    world.camera.addTrauma(0.2);
  } else if (id === 'fix') {
    if (skillCd.fix > 0) return;
    const entry = bikeEntry(profile);
    if (!entry || entry.condition >= 99) { ui.toast('Bike is already in good shape.', 'info'); return; }
    if (profile.money < FIX_COST) { ui.toast(`Not enough money. Quick Fix costs ${fmtRp(FIX_COST)}.`, 'bad'); return; }
    profile.money -= FIX_COST;
    entry.condition = Math.min(100, entry.condition + FIX_AMOUNT);
    skillCd.fix = SKILL_CD.fix;
    audio.cash();
    ui.toast(`Quick Fix: condition +${FIX_AMOUNT}%.`, 'good');
    save();
  } else if (id === 'laylow') {
    if (!hasLayLow(profile)) { ui.toast('Lay Low is locked. Unlock Ghost in the Skills tab.', 'bad'); return; }
    if (police.wanted <= 0) { ui.toast('No heat to lose right now.', 'info'); return; }
    if (skillCd.laylow > 0) return;
    skillCd.laylow = SKILL_CD.laylow;
    police.setWanted(police.wanted - 1);
    ui.toast('You lay low. The heat drops a star.', 'good');
  }
}

function save() {
  profile.player = { x: player.pos.x, z: player.pos.z, heading: player.heading, riding: player.riding };
  profile.hour = daycycle.hour;
  saveProfile(profile);
}

function addXp(amount) {
  const before = rankForXp(profile.xp);
  profile.xp += amount;
  const after = rankForXp(profile.xp);
  if (after > before) {
    audio.levelUp();
    profile.skillPoints = (profile.skillPoints || 0) + 1;
    ui.banner(`Rank Up: ${RANKS[after].name}`, RANKS[after].desc, 3600);
    ui.toast(`New rank: ${RANKS[after].name}. New districts and bikes unlocked. +1 skill point.`, 'good');
  }
}

function announceAchievements() {
  const unlocked = checkAchievements(profile);
  for (const a of unlocked) {
    audio.levelUp();
    ui.toast(`Achievement: ${a.name} - ${a.desc}`, 'good');
  }
}

function showMissionResults(mission, extraStats) {
  menus.show('results', {
    title: `Mission Complete: ${mission.title}`,
    sub: 'Reward received. One step closer to owning this city.',
    stats: [
      ['Mission reward', fmtRp(mission.reward)],
      ['Mission XP', `+${mission.xp} XP`],
      ['Orders done', String(profile.stats.ordersDone)],
      ['Total earnings', fmtRp(profile.stats.earned)],
      ['Distance ridden', `${profile.stats.distanceKm.toFixed(1)} km`],
      ['Rank', RANKS[rankForXp(profile.xp)].name],
      ...extraStats,
    ],
  });
  mode = 'menu';
}

function completeMission(result) {
  const mission = result.mission;
  profile.money += mission.reward;
  profile.skillPoints = (profile.skillPoints || 0) + 1;
  logEarning(`Mission: ${mission.title}`, mission.reward);
  addXp(mission.xp);
  profile.storyIndex = Math.min(STORY_MISSIONS.length, profile.storyIndex + 1);
  if (!profile.storyDone.includes(mission.id)) profile.storyDone.push(mission.id);
  if (mission.kind === 'race' || mission.kind === 'finale') profile.stats.racesWon += 1;
  audio.cash();
  announceAchievements();
  save();
  showMissionResults(mission, [['Rating', `${profile.rating.toFixed(1)} out of 5`], ['Skill point', '+1']]);
}

function failMission(result) {
  audio.fail();
  ui.showDialog({
    title: 'Mission Failed',
    body: `${result.mission.title}: ${result.reason || 'Try again.'}`,
    buttons: [
      { label: 'Try Again', action: 'start-story', primary: true },
      { label: 'Later', action: 'dialog-close' },
    ],
  });
}

function handleAction(action, payload) {
  switch (action) {
    case 'dialog-close':
      ui.hideDialog();
      break;
    case 'start-game': {
      menus.hide();
      mode = 'playing';
      audio.unlock();
      if (!profile.tutorialDone) {
        menus.show('tutorial', { step: 0 });
        mode = 'menu';
      }
      break;
    }
    case 'close-menu':
      menus.hide();
      mode = 'playing';
      break;
    case 'open-menu':
      menus.show(payload);
      mode = 'menu';
      break;
    case 'open-phone':
      menus.show('phone', { tab: 'orders' });
      mode = 'menu';
      break;
    case 'open-phone-tab':
      menus.show('phone', { tab: payload });
      mode = 'menu';
      break;
    case 'buy-skill': {
      const r = buySkill(profile, payload.branch, payload.tier);
      ui.toast(r.message || r.reason, r.ok ? 'good' : 'bad');
      if (r.ok) {
        applySkillEffects();
        audio.levelUp();
        save();
      }
      menus.show('phone', { tab: 'skills' });
      break;
    }
    case 'use-skill':
      useSkill(payload);
      break;
    case 'set-station': {
      const name = audio.setStation(payload);
      ui.toast(`Radio: ${name}`, 'info');
      menus.show('phone', { tab: 'radio' });
      break;
    }
    case 'to-title':
      save();
      menus.show('title');
      mode = 'title';
      break;
    case 'save-now':
      save();
      ui.toast('Progress saved.', 'good');
      break;
    case 'accept-order': {
      const order = orders.accept(payload, player.pos);
      if (order) {
        menus.hide();
        mode = 'playing';
        audio.pickup();
        ui.toast(`Order taken: ${order.label}. Follow the green marker.`, 'good');
      } else {
        ui.toast('Cannot take the order. Finish the current one first.');
      }
      break;
    }
    case 'cancel-order': {
      const order = orders.cancel();
      if (order) ui.toast('Order cancelled.');
      menus.show('orders');
      break;
    }
    case 'buy-bike': {
      const r = buyBike(profile, payload);
      ui.toast(r.message, r.ok ? 'good' : 'bad');
      if (r.ok) {
        player.setEntry(bikeEntry(profile));
        audio.cash();
        announceAchievements();
        save();
      }
      menus.show('dealer');
      break;
    }
    case 'buy-upgrade': {
      const entry = bikeEntry(profile);
      const r = buyUpgrade(profile, entry, payload);
      ui.toast(r.message, r.ok ? 'good' : 'bad');
      if (r.ok) save();
      menus.show('garage');
      break;
    }
    case 'paint-bike': {
      const entry = bikeEntry(profile);
      const r = paintBike(profile, entry, payload);
      ui.toast(r.message, r.ok ? 'good' : 'bad');
      if (r.ok) {
        player.setEntry(entry);
        save();
      }
      menus.show('garage');
      break;
    }
    case 'switch-bike': {
      const r = switchBike(profile, payload);
      ui.toast(r.message, r.ok ? 'good' : 'bad');
      if (r.ok) {
        player.setEntry(bikeEntry(profile));
        save();
      }
      menus.show('garage');
      break;
    }
    case 'refuel': {
      const entry = bikeEntry(profile);
      const r = refuel(profile, entry);
      ui.toast(r.message, r.ok ? 'good' : 'bad');
      if (r.ok) save();
      menus.show('garage');
      break;
    }
    case 'repair': {
      const entry = bikeEntry(profile);
      const r = repair(profile, entry);
      ui.toast(r.message, r.ok ? 'good' : 'bad');
      if (r.ok) save();
      menus.show('garage');
      break;
    }
    case 'gas-refuel': {
      const entry = bikeEntry(profile);
      const r = refuel(profile, entry);
      ui.toast(r.message, r.ok ? 'good' : 'bad');
      if (r.ok) save();
      break;
    }
    case 'start-story': {
      const mission = STORY_MISSIONS[profile.storyIndex];
      if (!mission) { ui.toast('All missions done.'); break; }
      if (rankForXp(profile.xp) < mission.minRank) {
        ui.toast(`Needs rank ${RANKS[mission.minRank].name} for this mission.`, 'bad');
        break;
      }
      const started = story.start(mission, { player });
      menus.hide();
      ui.hideDialog();
      mode = 'playing';
      ui.banner(mission.title, mission.brief, 4200);
      break;
    }
    case 'cancel-story':
      story.cancel();
      ui.toast('Mission cancelled.');
      menus.show('story');
      break;
    case 'tutorial-next':
      menus.show('tutorial', { step: payload });
      break;
    case 'tutorial-done':
      profile.tutorialDone = true;
      save();
      menus.hide();
      mode = 'playing';
      break;
    case 'toggle-mute': {
      const m = !audio.isMuted();
      audio.setMuted(m);
      profile.settings.muted = m;
      save();
      menus.show('settings');
      break;
    }
    case 'toggle-radio': {
      const on = !audio.isRadioOn();
      audio.setRadioOn(on);
      profile.settings.radioOn = on;
      save();
      const screen = menus.currentScreen();
      if (screen === 'phone') menus.show('phone', { tab: 'radio' });
      else menus.show(screen || 'settings');
      break;
    }
    case 'reset-save':
      ui.showDialog({
        title: 'Erase Save?',
        body: 'All money, bikes, ranks and missions are lost. Start from zero again.',
        buttons: [
          { label: 'Yes, Erase', action: 'reset-confirm', primary: true },
          { label: 'Cancel', action: 'dialog-close' },
        ],
      });
      break;
    case 'reset-confirm':
      clearProfile();
      window.location.href = window.location.pathname;
      break;
    default:
      break;
  }
}

// --- World callbacks ---
world.onCrash = () => {
  if (player.riding && player.speedKmh > 40) ui.toast('Crash! Bike damaged, condition down.', 'bad');
};
world.onHitTraffic = () => {
  if (trafficHitCooldown <= 0) {
    trafficHitCooldown = 3;
    police.addWanted(1);
    ui.toast('You hit another vehicle. The police are after you.', 'bad');
  }
};
world.onHitPedestrian = () => {
  police.addWanted(1);
  ui.toast('You hit a pedestrian!', 'bad');
};
world.onDistance = (km) => {
  profile.stats.distanceKm += km;
  addProgress(profile, 'distance', km);
};
world.onEnemyDown = (enemy) => {
  profile.money += enemy.reward;
  profile.stats.punches += 1;
  effects.floatText(enemy.pos.clone().add(new THREE.Vector3(0, 2, 0)), `+${fmtRp(enemy.reward)}`, '#2eff8a');
  const r = story.onEnemyDown(enemy);
  if (r) {
    if (r.kind === 'complete') completeMission(r);
    else failMission(r);
  }
  announceAchievements();
};
world.onKnockedOut = () => {
  const loss = Math.round(profile.money * 0.1);
  profile.money -= loss;
  ui.toast(`You lost the fight. Lost ${fmtRp(loss)}.`, 'bad');
  const r = story.onKnockedOut();
  if (r) failMission(r);
  save();
};
world.onRevive = () => {
  player.revive({ x: LANDMARKS.spawn.x, z: LANDMARKS.spawn.z });
  ui.toast('You wake up at the depot. Be careful next time.');
};

// --- Order payout ---
function payOut(order) {
  const def = ORDER_TYPES[order.type];
  const onTime = order.timeLeft == null || order.timeLeft > (order.timer || 1) * 0.1;
  const fast = order.timeLeft == null || order.timeLeft > (order.timer || 1) * 0.4;
  const tip = fast ? Math.round(order.fare * def.tip) : 0;
  const streakMult = 1 + Math.min(1, Math.max(0, profile.streak - 1) * 0.1);
  const surge = events.surgeBonus > 0 ? events.surgeBonus + surgeBonusExtra(profile) : 0;
  const payout = Math.round((order.fare + tip) * streakMult * (1 + surge));
  profile.money += payout;
  profile.stats.earned += payout;
  profile.stats.ordersDone += 1;
  profile.stats.trips += 1;
  addProgress(profile, 'orders', 1);
  addProgress(profile, 'earned', payout);
  if (order.type === 'makanan') {
    profile.stats.foodDone = (profile.stats.foodDone || 0) + 1;
    addProgress(profile, 'food', 1);
  }
  if (daycycle.isNight) {
    profile.stats.nightDeliveries += 1;
    addProgress(profile, 'night', 1);
  }
  if (onTime) {
    profile.streak += 1;
    profile.bestStreak = Math.max(profile.bestStreak, profile.streak);
    profile.rating = Math.min(5, profile.rating + 0.04);
  } else {
    profile.streak = 0;
    profile.rating = Math.max(1, profile.rating - 0.08);
  }
  addProgress(profile, 'streak', profile.streak);
  profile.ratingsCount += 1;
  logEarning(`Order: ${order.label} (${order.detail})`, payout);
  const xp = 20 + Math.round((order.distance / 1000) * 10) + (order.type === 'vip' ? 30 : 0);
  addXp(xp);
  audio.cash();
  effects.spawn(player.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), { color: 0x2eff8a, count: 16, speed: 4, life: 0.8 });
  effects.floatText(player.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), `+${fmtRp(payout)}`, '#2eff8a');
  ui.toast(`Order done. Paid ${fmtRp(payout)}${tip > 0 ? ` (including tip ${fmtRp(tip)})` : ''}.`, 'good');
  announceAchievements();
  checkChallengeCompletions();
  save();
  const r = story.onOrderDelivered(order, daycycle.isNight);
  if (r) {
    if (r.kind === 'complete') completeMission(r);
    else failMission(r);
  }
}

// --- Interactions ---
function nearestLandmark() {
  const p = player.pos;
  for (const [key, lm] of Object.entries(LANDMARKS)) {
    if (key === 'spawn') continue;
    const d = Math.hypot(p.x - lm.x, p.z - lm.z);
    if (d < 16) return { key, lm, dist: d };
  }
  return null;
}

function hintText() {
  const p = player.pos;
  if (player.riding) return 'W throttle, S brake, A/D steer\nE dismount, Q phone, H horn';
  const parked = traffic.nearestParked(p.x, p.z, 3.5);
  if (player.ownParked && Math.hypot(p.x - player.ownParked.x, p.z - player.ownParked.z) < 3.5) {
    return 'E mount bike';
  }
  if (parked) return 'E borrow vehicle (police will chase)';
  const lm = nearestLandmark();
  if (lm) {
    if (lm.key === 'dealer') return 'E open Sinar Jaya Dealer';
    if (lm.key === 'garage') return 'E open Garage';
    if (lm.key === 'gasA' || lm.key === 'gasB') return `E refuel (${fmtRp(refuelCost(bikeEntry(profile)))})`;
  }
  return 'WASD walk, F punch, Space dodge\nE interact, Q phone, Esc pause';
}

function interact() {
  if (player.riding) {
    player.dismount();
    return;
  }
  const p = player.pos;
  if (player.ownParked && Math.hypot(p.x - player.ownParked.x, p.z - player.ownParked.z) < 3.5) {
    player.mountOwn();
    return;
  }
  const parked = traffic.nearestParked(p.x, p.z, 3.5);
  if (parked) {
    traffic.takeParked(parked);
    player.mountBorrowed(parked);
    police.addWanted(1);
    ui.toast('Borrowed bike. The police are after you.', 'bad');
    return;
  }
  const lm = nearestLandmark();
  if (lm) {
    if (lm.key === 'dealer') { menus.show('dealer'); mode = 'menu'; return; }
    if (lm.key === 'garage') { menus.show('garage'); mode = 'menu'; return; }
    if (lm.key === 'gasA' || lm.key === 'gasB') {
      const cost = refuelCost(bikeEntry(profile));
      ui.showDialog({
        title: lm.lm.name,
        body: cost > 0 ? `Fill the tank: ${fmtRp(cost)}.` : 'Tank is already full.',
        buttons: cost > 0
          ? [{ label: `Refuel (${fmtRp(cost)})`, action: 'gas-refuel', primary: true }, { label: 'Cancel', action: 'dialog-close' }]
          : [{ label: 'Close', action: 'dialog-close', primary: true }],
      });
    }
  }
}

// --- Autopilot (for ?auto smoke tests) ---
function autopilot(dt) {
  const t = orders.targetInfo(player.pos);
  if (!orders.active) {
    const first = orders.board[0];
    if (first) {
      const o = orders.accept(first.id, player.pos);
      if (o) ui.toast(`Auto order: ${o.label}.`, 'info');
    }
    return;
  }
  if (!t) return;
  const dx = t.target.x - player.pos.x;
  const dz = t.target.z - player.pos.z;
  const dist = Math.hypot(dx, dz);
  const wantHeading = Math.atan2(dx, dz);
  let dh = wantHeading - player.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  if (!player.riding) {
    if (player.ownParked && Math.hypot(player.pos.x - player.ownParked.x, player.pos.z - player.ownParked.z) < 3.5) player.mountOwn();
    return;
  }
  // Steer toward the target, throttle unless close or badly off-course.
  player.state.heading += THREE.MathUtils.clamp(dh, -1.6 * dt, 1.6 * dt);
  if (dist > 12) player.state.speed = Math.min(player.state.speed + 12 * dt, 14);
  else player.state.speed = Math.max(0, player.state.speed - 20 * dt);
}

// --- Debug + shots ---
const game = {
  profile,
  player,
  orders,
  police,
  story,
  combat,
  daycycle,
  traffic,
  events,
  menus,
  ui,
  camera: cameraRig,
  acceptOrder: (id) => orders.accept(id, player.pos),
  addXp,
  useSkill,
  skillCd,
  applySkillEffects,
  setMode: (m) => { mode = m; },
  getMode: () => mode,
};
const debug = createDebug(game);
if (debug.muted) audio.setMuted(true);
const shots = createShots(game);
window.__game = game;
applySkillEffects();

if (hasShot || hasAuto) {
  mode = 'playing';
} else {
  menus.show('title');
}

// First gesture unlocks audio.
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });
window.addEventListener('beforeunload', save);

// --- Main loop ---
const clock = new THREE.Clock();
let fps = 60;
let fpsTimer = 0;
let frozen = false;
// Screenshot harness: stop the loop after staging so the compositor can
// capture the frame without fighting the renderer for GPU time.
window.__freezeFrame = () => { frozen = true; };

// Escape navigates menus in both playing and menu mode: from a sub-menu back
// to pause, from pause back into the game, from play into pause.
function handleEscape() {
  if (menus.current) {
    if (menus.current === 'pause') { menus.hide(); mode = 'playing'; }
    else if (mode === 'menu' && menus.current !== 'title') { menus.show('pause'); }
  } else if (mode === 'playing') {
    menus.show('pause');
    mode = 'menu';
  }
}

function step(dt) {
  const time = clock.elapsedTime;
  trafficHitCooldown = Math.max(0, trafficHitCooldown - dt);
  for (const k in skillCd) skillCd[k] = Math.max(0, skillCd[k] - dt);
  profile.stats.maxSpeedKmh = Math.max(profile.stats.maxSpeedKmh || 0, player.speedKmh);
  addProgress(profile, 'maxSpeed', player.speedKmh);
  challengeTimer -= dt;
  if (challengeTimer <= 0) {
    challengeTimer = 1;
    checkChallengeCompletions();
  }

  daycycle.update(dt, player.pos);
  city.update(time, daycycle.nightFactor);
  const density = daycycle.shift.traffic * (daycycle.isNight ? 0.8 : 1);
  traffic.update(dt, time, density);
  pedestrians.update(dt);
  events.update(dt);

  // Shift change.
  if (daycycle.shift.id !== currentShift) {
    currentShift = daycycle.shift.id;
    const s = daycycle.shift;
    ui.toast(`Shift ${s.name} started. Fares x${s.surge.toFixed(1)}.`, 'info');
  }

  // Night muggers: begal appear near a player on foot at night.
  begalTimer -= dt;
  if (begalTimer <= 0) {
    begalTimer = 50;
    if (daycycle.isNight && !player.riding && combat.enemies.length < 3) {
      const a = Math.random() * Math.PI * 2;
      const at = { x: player.pos.x + Math.cos(a) * 18, z: player.pos.z + Math.sin(a) * 18 };
      combat.spawn(at, { gang: false, hp: 50, reward: 20000, name: 'Mugger' });
      ui.toast('Muggers lurk in the dark!', 'bad');
    }
  }

  if (debug.auto) autopilot(dt);
  const grip = daycycle.weatherInfo.grip;
  player.update(dt, input, { grip });
  combat.update(dt, player);

  // Order events.
  const ev = orders.update(dt, player.pos, rankForXp(profile.xp));
  if (ev) {
    if (ev.kind === 'pickup') {
      audio.pickup();
      if (ev.order.type === 'penumpang' || ev.order.type === 'vip') player.setPassenger(true);
      ui.toast(ev.order.type === 'penumpang' || ev.order.type === 'vip' ? 'Passenger aboard. Take them to the destination.' : 'Parcel picked up. Take it to the destination.', 'good');
    } else if (ev.kind === 'delivered') {
      player.setPassenger(false);
      payOut(ev.order);
    } else if (ev.kind === 'failed') {
      player.setPassenger(false);
      profile.streak = 0;
      profile.rating = Math.max(1, profile.rating - 0.1);
      audio.fail();
      ui.toast(`Order failed: ${ev.reason}. Streak broken.`, 'bad');
      save();
    }
  }

  // Story events.
  const sev = story.update(dt, { player });
  if (sev) {
    if (sev.kind === 'complete') completeMission(sev);
    else if (sev.kind === 'failed') failMission(sev);
    else if (sev.kind === 'phase') ui.banner('Duel!', sev.text, 3000);
  }

  // Police.
  const pev = police.update(dt, player, time);
  if (pev && pev.kind === 'busted') {
    const loss = Math.round(profile.money * ECONOMY.bustMoneyLoss);
    profile.money -= loss;
    profile.rating = Math.max(1, profile.rating - ECONOMY.bustRatingLoss);
    profile.stats.busted += 1;
    profile.streak = 0;
    audio.fail();
    ui.showDialog({
      title: 'Busted by Police!',
      body: `You got caught. Fine ${fmtRp(loss)} and rating down 0.3.`,
      buttons: [{ label: 'Continue', action: 'dialog-close', primary: true }],
    });
    save();
  }
  if (prevWanted > 0 && police.wanted === 0 && !pev) {
    profile.stats.escapes += 1;
    ui.toast('You lost the police!', 'good');
    announceAchievements();
  }
  prevWanted = police.wanted;

  // Player attacks.
  if (input.pressed('KeyF')) {
    if (player.punch()) {
      const hit = combat.playerPunch(player);
      if (hit) profile.stats.punches += 1;
    }
  }
  if (input.pressed('Space') && !player.riding) player.dodge();
  if (input.pressed('KeyE')) interact();
  if (input.pressed('KeyH')) audio.horn();
  if (input.pressed('KeyR')) ui.toast(`Radio: ${audio.nextStation()}`, 'info');
  if (input.pressed('KeyM')) {
    const m = !audio.isMuted();
    audio.setMuted(m);
    profile.settings.muted = m;
    ui.toast(m ? 'Sound off.' : 'Sound on.');
  }
  if (input.pressed('KeyQ')) {
    if (mode === 'playing') { menus.show('phone', { tab: 'orders' }); mode = 'menu'; }
    else if (menus.current === 'phone' || menus.current === 'orders') { menus.hide(); mode = 'playing'; }
  }
  if (input.pressed('Digit1') || input.pressed('ShiftLeft') || input.pressed('ShiftRight')) useSkill('nitro');
  if (input.pressed('Digit2')) useSkill('fix');
  if (input.pressed('Digit3')) useSkill('laylow');
  if (input.pressed('Escape')) handleEscape();

  // Engine + rain audio.
  if (player.riding) {
    const spec = player.effectiveSpec();
    const throttle = input.moveAxes().forward > 0;
    audio.setEngine(player.speedKmh, spec.topSpeed, throttle);
  } else {
    audio.setEngine(0, 100, false);
  }
  audio.setRain(daycycle.rainAmount);

  effects.update(dt, player.pos, daycycle.rainAmount);
  input.endFrame();
}

// Shared map state for the HUD minimap and the phone Map tab.
function mapState() {
  const t = orders.targetInfo(player.pos);
  const surgeZones = surgeSense(profile) && events.surgeActive ? [
    { x: 0, z: 0, r: 60 },
    { x: LANDMARKS.market.x, z: LANDMARKS.market.z, r: 60 },
  ] : [];
  return {
    playerPos: player.pos,
    heading: player.heading,
    target: t ? t.target : null,
    police,
    events: events.active,
    storyDest: story.dest,
    ownBike: player.ownParked,
    traffic,
    surgeZones,
  };
}

function renderHUD() {
  const t = orders.targetInfo(player.pos);
  const objective = ui.objectiveText(t, story);
  ui.updateHUD({
    money: profile.money,
    rating: profile.rating,
    streak: profile.streak,
    rank: rankForXp(profile.xp),
    xp: profile.xp,
    hour: daycycle.hour,
    shift: daycycle.shift.name,
    weather: daycycle.weatherInfo.label,
    wanted: police.wanted,
    objective,
    hint: mode === 'playing' ? hintText() : '',
    speedKmh: player.speedKmh,
    fuel: player.fuel(),
    condition: player.condition(),
    hp: player.hp,
    radioStation: audio.station(),
    muted: audio.isMuted(),
    bustProgress: police.bustProgress,
    skills: [
      { id: 'nitro', locked: !hasNitro(profile), cd: skillCd.nitro, cdMax: SKILL_CD.nitro, active: player.nitroActive },
      { id: 'fix', locked: false, cd: skillCd.fix, cdMax: SKILL_CD.fix, active: false },
      { id: 'laylow', locked: !hasLayLow(profile), cd: skillCd.laylow, cdMax: SKILL_CD.laylow, active: false },
    ],
  });
  minimap.draw(mapState());
}

function animate() {
  if (!frozen) requestAnimationFrame(animate);
  const rawDt = Math.min(0.05, clock.getDelta());
  fpsTimer += rawDt;
  if (fpsTimer > 0.5) {
    fps = Math.round(1 / Math.max(0.001, rawDt));
    fpsTimer = 0;
  }

  if (debug.stepping) {
    if (debug.consumeStep()) step(1 / 60);
  } else if (mode === 'playing') {
    step(rawDt);
  } else if (mode === 'title') {
    // Living backdrop behind the title: traffic and pedestrians keep moving.
    daycycle.update(rawDt, player.pos);
    city.update(clock.elapsedTime, daycycle.nightFactor);
    traffic.update(rawDt, clock.elapsedTime, 0.8);
    pedestrians.update(rawDt);
    effects.update(rawDt, player.pos, daycycle.rainAmount);
    titleOrbit += rawDt * 0.05;
    const cx = LANDMARKS.spawn.x;
    const cz = LANDMARKS.spawn.z;
    camera3.position.set(cx + Math.cos(titleOrbit) * 42, 20, cz + Math.sin(titleOrbit) * 42);
    camera3.lookAt(cx, 0, cz);
    input.endFrame();
  }
  // mode 'menu': the world freezes while a menu is open, but Escape and Q
  // still navigate (the sim step never runs here, so keys are read directly).
  if (mode === 'menu') {
    if (input.pressed('Escape')) handleEscape();
    if (input.pressed('KeyQ') && (menus.current === 'phone' || menus.current === 'orders')) { menus.hide(); mode = 'playing'; }
    input.endFrame();
  }

  if (mode !== 'title') {
    const orbit = input.takeOrbit();
    const wheel = input.takeWheel();
    cameraRig.update(rawDt, player.pos.clone().add(new THREE.Vector3(0, 1, 0)), player.heading, player.speedKmh, orbit, wheel);
  }

  shots.update(rawDt);
  renderHUD();
  debug.updatePanel(fps);
  renderer.render(scene, camera3);
}

animate();
