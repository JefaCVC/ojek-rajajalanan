// Boot and the main loop. main.js owns the game object — every subsystem in one
// place — and the fixed-step update order:
//
//   1. sample input into the input ring
//   2. update clocks that are not frozen (day, orders, events)
//   3. update the player, traffic, police, and combat
//   4. resolve contacts (traffic crashes, red lights, pickups)
//   5. apply damage, reaction, and hit-stop through the subsystems
//   6. emit presentation events (juice, audio, toasts) after logic is known
//
// The render step runs once per animation frame; the logic step runs at a fixed
// 60 Hz, so the game plays the same at any display rate.

import { FIELD, STEP, ECONOMY, FUEL, UPGRADES, BIKES } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { createDayCycle } from './daycycle.js';
import { createTraffic } from './traffic.js';
import { createVehicles, createGarage, bikeDef } from './vehicles.js';
import { createOrders } from './orders.js';
import { createPlayer } from './player.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createJuice } from './juice.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createDebug, parseFlags } from './debug.js';
import { createRenderer } from './render.js';
import { createUI } from './ui.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { stageScene } from './shots.js';
import { TEXT, formatRupiah } from './text.js';

const canvas = document.getElementById('game');
canvas.width = FIELD.width;
canvas.height = FIELD.height;
const ctx = canvas.getContext('2d');

const flags = parseFlags();
const seed = flags.seed !== null ? flags.seed : (Math.floor(Math.random() * 100000) + 1);
const random = createRandom(seed);

const city = createCity(random);
const day = createDayCycle(random);
const traffic = createTraffic(city, random);
const vehicles = createVehicles(city);
const garage = createGarage();
const orders = createOrders(city, random);
const police = createPolice(city, random);
const combat = createCombat(random);
const juice = createJuice();
const audio = createAudio();
const input = createInput(canvas);
const renderer = createRenderer(canvas);
const ui = createUI();

const pangkalan = city.landmarks.pangkalan;
// Spawn on the road beside the pangkalan, facing north, so the first ride is
// clean instead of starting inside the block.
const SPAWN = { x: 520, y: 1500 };
const player = createPlayer(SPAWN.x, SPAWN.y);

const game = {
  city, day, traffic, vehicles, garage, orders, police, combat, juice, audio,
  input, ui, player, seed,
  time: 0, tick: 0,
  toasts: [],
  prompt: null,
  promptAction: null,
  punch: { phase: 'idle', ticks: 0, hitstopTicks: 0, hitDone: false },
  racer: null,
  god: flags.god,
  hasSave: hasSave(),
  autosaveTimer: 30,
  begalTimer: 75,
  redLightCooldown: 0,
  trafficCrashCooldown: 0,
};

function toast(text, color) {
  // The same message twice in a row is noise: refresh the one already showing.
  const existing = game.toasts.find((t) => t.text === text);
  if (existing) {
    existing.timeLeft = 4;
    return;
  }
  game.toasts.push({ text, color: color || null, timeLeft: 4 });
  if (game.toasts.length > 3) game.toasts.shift();
}

function save() {
  const ok = saveGame({
    player: player.serialize(),
    garage: garage.serialize(),
    orders: orders.serialize(),
    day: day.serialize(),
    muted: audio.muted,
  });
  if (ok) toast(TEXT.saved, '#3ecf6e');
  return ok;
}

function load() {
  const data = loadGame();
  if (!data) return false;
  player.restore(data.player);
  garage.restore(data.garage);
  orders.restore(data.orders);
  day.restore(data.day);
  if (data.muted) audio.setMuted(true);
  player.boardBike(garage.current);
  return true;
}

function snapshot() {
  const rank = player.rank(orders.storyDone);
  return {
    tick: game.tick,
    time: Math.round(game.time * 10) / 10,
    seed,
    screen: ui.screen,
    player: {
      x: Math.round(player.x), y: Math.round(player.y),
      angle: Math.round(player.angle * 100) / 100,
      speed: Math.round(player.speed),
      onBike: player.onBike, bikeId: garage.current,
      health: player.health, fuel: Math.round(player.fuel),
      money: player.money, xp: player.xp, xpNext: player.xpNext,
      level: player.level, rating: Math.round(player.rating * 100) / 100,
    },
    rank: rank.name,
    streak: orders.streak,
    streakMultiplier: orders.streakMultiplier,
    garage: {
      current: garage.current,
      owned: garage.ownedIds(),
      condition: Math.round(garage.condition(garage.current)),
      upgrades: {
        ban: garage.upgradeLevel(garage.current, 'ban'),
        mesin: garage.upgradeLevel(garage.current, 'mesin'),
        rem: garage.upgradeLevel(garage.current, 'rem'),
      },
    },
    wanted: police.wanted,
    policeCars: police.cars.length,
    enemies: combat.count,
    trafficCars: traffic.cars.length,
    trafficStopped: traffic.stoppedCount,
    pedestrians: traffic.pedestrians.length,
    boardOrders: orders.board.length,
    activeOrder: orders.active ? { id: orders.active.id, state: orders.active.state, type: orders.active.type } : null,
    storyStep: orders.storyStep,
    shift: day.shift.name,
    clock: day.hour,
    weather: day.weather.id,
    rush: day.rush,
    closures: city.closures.length,
    particles: juice.particleCount,
  };
}

function stepFrame(dt) {
  update(dt);
  render(dt);
}

function updateOnly(dt) {
  update(dt);
}

const debug = createDebug(game, input);
game.debug = debug;
game.stepFrame = stepFrame;
game.updateOnly = updateOnly;
game.snapshot = snapshot;

function completeOrder() {
  const result = orders.complete();
  if (!result) return;
  const total = result.fare + result.tip;
  player.addMoney(total);
  const leveled = player.addXp(result.xp);
  if (result.onTime) {
    if (!result.order.crashed) player.changeRating(ECONOMY.onTimeRatingGain);
    toast(`${TEXT.orderComplete} ${formatRupiah(total)}`, '#3ecf6e');
    if (result.tip > 0) toast(`${TEXT.tipEarned} ${formatRupiah(result.tip)}`, '#3ecf6e');
    if (result.multiplier > 1) toast(`${TEXT.streakBonus} x${result.multiplier.toFixed(1)}`, '#ffd94a');
  } else {
    player.changeRating(-ECONOMY.lateRatingLoss);
    toast(TEXT.lateDelivery, '#ff4757');
  }
  if (result.storyAdvanced) {
    toast(result.order.doneText, '#ffd94a');
    audio.levelUp();
  }
  if (leveled) {
    toast(`${TEXT.levelUp} Level ${player.level}`, '#ffb020');
    audio.levelUp();
    const rank = player.rank(orders.storyDone);
    toast(`${TEXT.rankUp} ${rank.name}`, '#ffd94a');
  }
  juice.cashBurst(player.x, player.y);
  audio.cash();
  save();
}

function handleUIAction(action) {
  if (!action) return;
  audio.click();
  if (action === 'start') {
    audio.start();
    if (game.hasSave) load();
    orders.refreshBoard(day.shift, player.rank(orders.storyDone).districts, day.fareMultiplier, player.rating, player.rank(orders.storyDone).orderTier);
    ui.setScreen('playing');
  } else if (action === 'help') {
    game.prevScreen = ui.screen;
    ui.setScreen('help');
  } else if (action === 'back') {
    ui.setScreen(game.prevScreen || 'title');
  } else if (action === 'sound') {
    audio.toggleMute();
  } else if (action === 'resume') {
    ui.setScreen('playing');
  } else if (action === 'save') {
    save();
  } else if (action === 'menu') {
    save();
    ui.setScreen('title');
  } else if (action === 'close') {
    ui.setScreen('playing');
  } else if (action.startsWith('accept:')) {
    const id = parseInt(action.split(':')[1], 10);
    const order = orders.accept(id);
    if (order) {
      toast(TEXT.orderAccepted, '#3ecf6e');
      audio.pickup();
      // Story step 3 (Geng Macan): two rivals block the pangkalan.
      if (order.story && order.storyStep === 2) {
        combat.spawnRival(pangkalan.x + 40, pangkalan.y - 20);
        combat.spawnRival(pangkalan.x - 20, pangkalan.y + 60);
      }
      // Story step 4 (race): Joko races to the same destination.
      if (order.story && order.storyStep === 3) {
        game.racer = {
          x: player.x - 40, y: player.y + 30,
          destX: order.dest.x, destY: order.dest.y,
          speed: 480, finished: false,
        };
      }
      ui.setScreen('playing');
    }
  } else if (action.startsWith('tab:')) {
    ui.setDealerTab(action.split(':')[1]);
  } else if (action.startsWith('buy:')) {
    const bikeId = action.split(':')[1];
    const def = bikeDef(bikeId);
    if (player.spendMoney(def.price)) {
      garage.buy(bikeId);
      garage.select(bikeId);
      player.boardBike(bikeId);
      toast(`${def.name} dibeli.`, '#3ecf6e');
      audio.cash();
      save();
    }
  } else if (action.startsWith('select:')) {
    const bikeId = action.split(':')[1];
    if (garage.select(bikeId)) {
      player.boardBike(bikeId);
      toast(`${bikeDef(bikeId).name} dipakai.`, '#3ecf6e');
    }
  } else if (action.startsWith('upgrade:')) {
    const upgradeId = action.split(':')[1];
    const def = UPGRADES.find((u) => u.id === upgradeId);
    const level = garage.upgradeLevel(garage.current, upgradeId);
    const step = def.levels[level];
    if (step && player.spendMoney(step.price)) {
      garage.buyUpgrade(garage.current, upgradeId);
      toast(`${def.name} level ${level + 1} dipasang.`, '#3ecf6e');
      audio.cash();
      save();
    }
  } else if (action === 'repair') {
    const cost = garage.repairCost(garage.current);
    if (cost > 0 && player.spendMoney(cost)) {
      garage.repair(garage.current);
      toast(TEXT.repairDone, '#3ecf6e');
      save();
    }
  }
}

function nearestInteraction() {
  const order = orders.active;
  const landmarks = city.landmarks;
  function near(point, range) {
    return Math.hypot(player.x - point.x, player.y - point.y) < range;
  }
  if (order && order.state === 'to-pickup' && near(order.pickup, 60)) {
    return { label: TEXT.boardPassenger, action: 'pickup' };
  }
  if (order && order.state === 'to-dest' && near(order.dest, 60)) {
    return { label: TEXT.dropPassenger, action: 'dropoff' };
  }
  if (near(landmarks.dealer, 130)) return { label: TEXT.enterDealer, action: 'dealer' };
  if (near(landmarks.spbu, 130)) return { label: TEXT.refuel, action: 'refuel' };
  if (near(landmarks.police, 130) && police.wanted > 0) return { label: TEXT.payFine, action: 'fine' };
  if (!player.onBike) {
    const parked = vehicles.nearestParked(player.x, player.y, 50);
    if (parked) return { label: TEXT.stealVehicle, action: 'steal', vehicle: parked };
    if (Math.hypot(player.x - (player.bikeX || 0), player.y - (player.bikeY || 0)) < 60 && player.bikeX !== undefined) {
      return { label: TEXT.getOnBike, action: 'board' };
    }
  }
  // No prompt for a plain dismount: E still works, but the prompt would sit on
  // screen for the whole ride.
  return null;
}

function doInteraction(interaction) {
  if (!interaction) return;
  if (interaction.action === 'pickup') {
    orders.markPickedUp();
    toast(TEXT.orderAccepted, '#3ecf6e');
    audio.pickup();
  } else if (interaction.action === 'dropoff') {
    if (game.racer && !game.racer.finished) {
      toast('Kamu sampai duluan. Joko kalah.', '#ffd94a');
      game.racer = null;
    }
    completeOrder();
  } else if (interaction.action === 'dealer') {
    ui.setScreen('dealer');
  } else if (interaction.action === 'refuel') {
    if (player.spendMoney(FUEL.refillPrice)) {
      player.refuel();
      toast('Bensin penuh.', '#3ecf6e');
      audio.cash();
    } else {
      toast('Uang tidak cukup untuk bensin.', '#ff4757');
    }
  } else if (interaction.action === 'fine') {
    const fine = police.fineAmount();
    if (player.spendMoney(fine)) {
      police.clearWanted();
      toast('Denda dibayar. Polisi tidak mengejar lagi.', '#3ecf6e');
    } else {
      toast('Uang tidak cukup untuk bayar denda.', '#ff4757');
    }
  } else if (interaction.action === 'steal') {
    interaction.vehicle.taken = true;
    player.boardBorrowed(interaction.vehicle);
    police.addWanted(1);
    toast(TEXT.stolen, '#ff4757');
  } else if (interaction.action === 'board') {
    player.boardBike(garage.current);
  } else if (interaction.action === 'dismount') {
    player.bikeX = player.x;
    player.bikeY = player.y;
    player.dismount();
  }
}

function update(dt) {
  game.time += dt;
  game.tick += 1;
  game.redLightCooldown = Math.max(0, game.redLightCooldown - dt);
  game.trafficCrashCooldown = Math.max(0, game.trafficCrashCooldown - dt);

  // Toasts always tick down.
  for (let i = game.toasts.length - 1; i >= 0; i -= 1) {
    game.toasts[i].timeLeft -= dt;
    if (game.toasts[i].timeLeft <= 0) game.toasts.splice(i, 1);
  }

  // Mouse clicks on menus.
  if (input.mouse.clicked && ui.screen !== 'playing') {
    handleUIAction(ui.click(input.mouse.x, input.mouse.y));
  }

  // Global keys.
  if (input.wasPressed('KeyN')) audio.toggleMute();
  if (input.wasPressed('Escape')) {
    if (ui.screen === 'playing') ui.setScreen('paused');
    else if (ui.screen === 'paused' || ui.screen === 'orders' || ui.screen === 'dealer') ui.setScreen('playing');
    else if (ui.screen === 'help') ui.setScreen(game.time > 0 ? 'paused' : 'title');
  }
  if (ui.screen === 'playing' && input.wasPressed('KeyQ')) {
    orders.refreshBoard(day.shift, player.rank(orders.storyDone).districts, day.fareMultiplier, player.rating, player.rank(orders.storyDone).orderTier);
    ui.setScreen('orders');
  }
  if (ui.screen === 'orders' && input.wasPressed('KeyQ')) {
    ui.setScreen('playing');
  }

  if (ui.screen !== 'playing') {
    // The title screen keeps the city alive behind it: traffic moves, the day
    // advances, but nothing else ticks.
    if (ui.screen === 'title') {
      day.update(dt);
      traffic.update(dt, day.trafficMultiplier, city.closures);
      juice.update(dt);
    }
    input.endFrame();
    return;
  }

  // 2. Clocks: the day, the orders, the events.
  const dayEvents = day.update(dt);
  for (const event of dayEvents) {
    if (event.type === 'shift') {
      toast(`${TEXT.shiftChange}: ${event.shift.name}`, '#ffb020');
      orders.refreshBoard(day.shift, player.rank(orders.storyDone).districts, day.fareMultiplier, player.rating, player.rank(orders.storyDone).orderTier);
    }
    if (event.type === 'rush-start') toast(TEXT.rushHour, '#ff4757');
    if (event.type === 'rush-end') toast(TEXT.rushOver, '#c9bda6');
    if (event.type === 'weather') {
      if (event.weather.id === 'hujan') toast(TEXT.rainStart, '#4aa8ff');
      else if (event.weather.id === 'cerah') toast(TEXT.rainStop, '#c9bda6');
    }
  }
  city.updateClosures(dt);
  orders.update(dt, (event) => {
    if (event.type === 'event') {
      if (event.kind === 'banjir') toast(TEXT.eventFlood, '#4aa8ff');
      else if (event.kind === 'demo') toast(TEXT.eventProtest, '#ff4757');
      else if (event.kind === 'kecelakaan') toast(TEXT.eventCrash, '#ff4757');
      else if (event.kind === 'vip') {
        toast(TEXT.eventVip, '#ffd94a');
        orders.pushEventOrder('vip', player.rank(orders.storyDone).districts, day.fareMultiplier, player.rating);
      } else if (event.kind === 'paket-kilat') {
        toast(TEXT.eventParcel, '#ffd94a');
        orders.pushEventOrder('paket-kilat', player.rank(orders.storyDone).districts, day.fareMultiplier, player.rating);
      }
    }
    if (event.type === 'event-over') toast(TEXT.eventOver, '#3ecf6e');
    if (event.type === 'order-expired') {
      player.changeRating(-ECONOMY.lateRatingLoss);
      toast(TEXT.lateDelivery, '#ff4757');
    }
  });

  // Night begal: muggers appear near the player after dark.
  if (day.night) {
    game.begalTimer -= dt;
    if (game.begalTimer <= 0) {
      game.begalTimer = 75 + Math.random() * 45;
      const angle = Math.random() * Math.PI * 2;
      combat.spawnBegal(player.x + Math.cos(angle) * 320, player.y + Math.sin(angle) * 320);
      toast(TEXT.begalWarning, '#ff4757');
    }
  }

  // 3. The player.
  const bikeStats = player.borrowed
    ? { topSpeed: player.borrowed.topSpeed, accel: player.borrowed.accel, handling: player.borrowed.handling, braking: player.borrowed.braking, fuelDrain: 1.5 }
    : garage.currentStats;
  const isOldBike = !player.borrowed && garage.current === 'bebek-tua';
  const playerEvents = player.update(dt, input, city, bikeStats, day.gripMultiplier, isOldBike);
  for (const event of playerEvents) {
    if (event.type === 'crash') {
      garage.damage(ECONOMY.crashDamageMin + Math.random() * (ECONOMY.crashDamageMax - ECONOMY.crashDamageMin));
      juice.shake(8, 0.25);
      juice.hitSparks(player.x, player.y, player.angle, true);
      audio.thud();
      if (orders.active) {
        orders.markCrashed();
        player.changeRating(-ECONOMY.crashRatingLoss);
      }
      if (garage.condition(garage.current) < 30) toast(TEXT.bikeDamaged, '#ff4757');
    }
    if (event.type === 'stall') toast(TEXT.bikeStalled, '#ffb020');
    if (event.type === 'fuel-empty') toast(TEXT.fuelEmpty, '#ff4757');
    if (event.type === 'fuel-low') toast(TEXT.fuelLow, '#ffb020');
  }
  if (game.god) player.refuel();

  // Skid marks on hard turns at speed.
  if (player.onBike && Math.abs(player.speed) > 400 && Math.abs(input.moveVector().x) > 0.5) {
    juice.skidMark(player.x - Math.cos(player.angle) * 12, player.y - Math.sin(player.angle) * 12, player.angle);
  }

  // 4. Contacts: traffic crashes and red lights.
  if (player.onBike && game.trafficCrashCooldown <= 0) {
    for (const car of traffic.cars) {
      const dist = Math.hypot(car.x - player.x, car.y - player.y);
      if (dist < 30 && Math.abs(player.speed) > 150) {
        game.trafficCrashCooldown = 1;
        player.bounce(-0.3);
        garage.damage(ECONOMY.crashDamageMin);
        juice.shake(10, 0.3);
        juice.hitSparks(player.x, player.y, player.angle, true);
        audio.thud();
        if (orders.active) {
          orders.markCrashed();
          player.changeRating(-ECONOMY.crashRatingLoss);
        }
        if (police.cars.some((p) => Math.hypot(p.x - player.x, p.y - player.y) < 600)) {
          police.addWanted(1);
          toast(TEXT.hitAndRun, '#ff4757');
        }
        player.setPosition(player.x - Math.cos(player.angle) * 20, player.y - Math.sin(player.angle) * 20);
        break;
      }
    }
  }
  if (player.onBike) {
    const light = city.lightAt(player.x, player.y);
    if (light && light.state !== 'green' && Math.abs(player.speed) > 120 && game.redLightCooldown <= 0) {
      const onVerticalRoad = city.roadsX.some((rx) => Math.abs(player.x - rx) < 10);
      const greenForMe = light.verticalGreen === onVerticalRoad;
      if (!greenForMe && police.cars.some((p) => Math.hypot(p.x - player.x, p.y - player.y) < 600)) {
        police.addWanted(1);
        toast(TEXT.redLight, '#ff4757');
        game.redLightCooldown = 5;
      }
    }
  }

  traffic.update(dt, day.trafficMultiplier * (day.rush ? 1.3 : 1), city.closures);
  const bust = police.update(dt, player, city);
  if (bust === 'busted' && !game.god) {
    const fine = Math.round(player.money * ECONOMY.bustFineRate);
    player.spendMoney(fine);
    player.changeRating(-ECONOMY.bustRatingLoss);
    police.clearWanted();
    audio.busted();
    ui.setScreen('busted');
  }

  // Combat.
  if (input.wasPressed('KeyF')) combat.queuePunch();
  if (input.wasPressed('KeyH')) audio.horn();
  const combatEvents = combat.update(player, city, game.punch);
  for (const event of combatEvents) {
    if (event.type === 'hit') {
      juice.hitSparks(event.x, event.y, event.angle, event.heavy);
      juice.shake(event.heavy ? 7 : 4, 0.15);
      audio.punch();
    }
    if (event.type === 'enemy-down') {
      player.addMoney(ECONOMY.rivalReward);
      toast(TEXT.rivalDown, '#3ecf6e');
      juice.cashBurst(event.x, event.y);
    }
    if (event.type === 'player-hit') {
      juice.shake(9, 0.25);
      juice.hitSparks(event.x, event.y, event.angle, false);
      audio.thud();
      if (player.health <= 0 && !game.god) {
        const lost = Math.round(player.money * 0.1);
        player.spendMoney(lost);
        orders.cancelActive();
        player.respawn(SPAWN.x, SPAWN.y);
        ui.setScreen('knocked');
      }
    }
  }

  // The race rival drives along the roads toward the same destination.
  if (game.racer) {
    const racer = game.racer;
    const dx = racer.destX - racer.x;
    const dy = racer.destY - racer.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 50) {
      racer.finished = true;
      toast('Joko sampai duluan. Balapan kalah.', '#ff4757');
      game.racer = null;
    } else {
      // Road-following: first align to the destination's vertical road, then go down it.
      const targetRoadX = city.roadsX.reduce((a, b) => Math.abs(b - racer.destX) < Math.abs(a - racer.destX) ? b : a);
      if (Math.abs(racer.x - targetRoadX) > 10) {
        racer.x += Math.sign(targetRoadX - racer.x) * racer.speed * dt;
      } else {
        racer.y += Math.sign(dy) * racer.speed * dt;
      }
    }
  }

  // The interaction prompt and the E key. E with no interaction on a bike just
  // dismounts; on foot with no interaction it does nothing.
  const interaction = nearestInteraction();
  game.prompt = interaction ? interaction.label : null;
  if (input.wasPressed('KeyE')) {
    if (interaction) doInteraction(interaction);
    else if (player.onBike) doInteraction({ action: 'dismount' });
  }

  // 6. Presentation: juice, audio, rain.
  juice.update(dt);
  juice.updateRain(dt, day.weather.id === 'hujan', renderer.camera.x, renderer.camera.y, FIELD.width, FIELD.height);
  audio.updateEngine(player.speed, bikeStats.topSpeed, player.onBike, ui.screen === 'playing');
  audio.updateSiren(police.cars.some((p) => Math.hypot(p.x - player.x, p.y - player.y) < 700), game.time);
  audio.updateRain(day.weather.id === 'hujan');

  // Autosave.
  game.autosaveTimer -= dt;
  if (game.autosaveTimer <= 0) {
    game.autosaveTimer = 30;
    saveGame({
      player: player.serialize(), garage: garage.serialize(),
      orders: orders.serialize(), day: day.serialize(), muted: audio.muted,
    });
  }

  input.endFrame();
}

function render(dt) {
  renderer.render(game, dt);
  if (ui.screen !== 'playing') {
    ui.draw(ctx, game, input.mouse);
  }
  debug.draw(ctx, FIELD.width);
  debug.tick(dt);
}

let lastTime = performance.now();
let accumulator = 0;
function frame(now) {
  const realDt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += realDt;
  let steps = 0;
  while (accumulator >= STEP && steps < 5) {
    try {
      update(STEP);
    } catch (error) {
      // One bad step must not kill the whole game: log it and keep the loop alive.
      console.error('update failed', error);
    }
    accumulator -= STEP;
    steps += 1;
  }
  render(realDt);
  requestAnimationFrame(frame);
}

// Stage flags and the autotest, after the first frame so the city exists.
if (flags.auto || flags.stage || flags.shot) {
  audio.setMuted(true);
  ui.setScreen('playing');
  orders.refreshBoard(day.shift, ['kota-lama', 'pusat', 'timur', 'selatan'], 1, 4.5, 5);
}
if (flags.stage) stageScene(game, flags.stage);
if (flags.shot) stageScene(game, flags.shot);

// The scripted smoke test (?autotest=1): a full order and a dealer purchase,
// driven through the real systems. Teleports are labeled overrides, so the
// evidence is scripted-scene, not a natural clear.
if (new URLSearchParams(window.location.search).has('autotest')) {
  audio.setMuted(true);
  ui.setScreen('playing');
  setTimeout(() => {
    const result = { order: 'fail', dealer: 'fail', steps: [] };
    try {
      orders.refreshBoard(day.shift, ['kota-lama', 'pusat', 'timur', 'selatan'], 1, 4.5, 5);
      const order = orders.board.find((o) => !o.story);
      if (!order) throw new Error('no order on board');
      const moneyBefore = player.money;
      orders.accept(order.id);
      result.steps.push('accepted ' + order.id);
      player.setPosition(order.pickup.x, order.pickup.y);
      orders.markPickedUp();
      result.steps.push('picked up');
      player.setPosition(order.dest.x, order.dest.y);
      const payout = orders.complete();
      if (!payout) throw new Error('complete returned null');
      player.addMoney(payout.fare + payout.tip);
      player.addXp(payout.xp);
      result.steps.push('completed fare ' + payout.fare + ' tip ' + payout.tip);
      if (player.money > moneyBefore) result.order = 'pass';
      const def = bikeDef('matic-110');
      player.addMoney(def.price + 1000);
      if (player.spendMoney(def.price) && garage.buy('matic-110')) {
        result.dealer = garage.owns('matic-110') ? 'pass' : 'fail';
      }
      result.steps.push('dealer owns matic-110: ' + garage.owns('matic-110'));
    } catch (error) {
      result.error = String(error);
    }
    window.__autotest = result;
  }, 500);
}

requestAnimationFrame(frame);
