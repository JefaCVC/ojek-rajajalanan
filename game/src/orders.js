// Orders, the story arc, streaks, and random events. The order board always
// holds a few jobs the player can freely choose between; each shows its type,
// distance, and fare before the player commits. Order types follow the shift:
// commuters in the morning, school and parcels midday, food in the afternoon,
// VIPs at night. Premium orders only appear for high-rated drivers.
//
// The story arc is five missions against the rival Geng Macan, gated by rank.
// Random events (flood, protest, crash, VIP, rush parcel) arrive every minute
// or two and force the player to re-route or grab a bonus.

import { ECONOMY, EVENTS } from './config.js';
import { STORY as STORY_TEXT } from './text.js';
import { districtOf } from './city.js';
import { randomInt, randomPick } from './random.js';

const PASSENGER_NAMES = [
  'Bu Ratna', 'Pak Haji', 'Mbak Sari', 'Mas Budi', 'Dek Rani', 'Pak Dedi',
  'Bu Lilis', 'Mas Yoga', 'Mbak Putri', 'Pak Slamet', 'Bu Ani', 'Dek Fajar',
];

export function createOrders(city, random) {
  let nextId = 1;
  const board = [];
  let active = null;
  let storyStep = 0;
  let storyDone = 0;
  let streak = 0;
  let eventTimer = 45;
  let activeEvent = null;

  function distanceBetween(a, b) {
    // Roads run on a grid, so Manhattan distance is the honest one.
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function fareFor(type, distance, fareMultiplier, rating) {
    let fare = ECONOMY.baseFare + distance * ECONOMY.farePerMetre;
    if (type === 'vip') fare += ECONOMY.vipFareBonus;
    if (type === 'makanan') fare *= 1.15;
    fare *= fareMultiplier;
    if (rating >= ECONOMY.premiumRating) fare *= 1.1;
    return Math.round(fare / 500) * 500;
  }

  function makeOrder(type, districts, fareMultiplier, rating) {
    const pickup = city.randomRoadsidePointIn(districts);
    let dest = city.randomRoadsidePointIn(districts);
    let tries = 0;
    while (dest && pickup && distanceBetween(pickup, dest) < 500 && tries < 10) {
      dest = city.randomRoadsidePointIn(districts);
      tries += 1;
    }
    if (!pickup || !dest) return null;
    const distance = distanceBetween(pickup, dest);
    const name = type === 'paket'
      ? randomPick(random, ['Dokumen', 'Bingkisan', 'Belanjaan', 'Barang toko', 'Paket COD'])
      : type === 'makanan'
        ? randomPick(random, ['Nasi goreng', 'Bakso', 'Ayam geprek', 'Es teh', 'Soto ayam'])
        : randomPick(random, PASSENGER_NAMES);
    const order = {
      id: nextId++,
      type,
      name,
      pickup,
      dest,
      pickupName: city.nearestRoadName(pickup.x, pickup.y),
      destName: city.nearestRoadName(dest.x, dest.y),
      distance,
      fare: fareFor(type, distance, fareMultiplier, rating),
      rating: randomInt(random, 4, 5),
      state: 'offered',
      timeLimit: type === 'makanan' ? ECONOMY.foodTimerSeconds : distance / 260 + 45,
      timeLeft: 0,
      crashed: false,
      story: false,
    };
    return order;
  }

  function makeStoryOrder(step, fareMultiplier) {
    const def = STORY_TEXT[step];
    if (!def) return null;
    const pickup = city.randomRoadsidePoint();
    let dest = city.randomRoadsidePoint();
    let tries = 0;
    while (distanceBetween(pickup, dest) < 600 && tries < 10) {
      dest = city.randomRoadsidePoint();
      tries += 1;
    }
    return {
      id: nextId++,
      type: step === 2 ? 'penumpang' : step === 3 ? 'penumpang' : 'penumpang',
      name: def.title,
      pickup,
      dest,
      pickupName: city.nearestRoadName(pickup.x, pickup.y),
      destName: city.nearestRoadName(dest.x, dest.y),
      distance: distanceBetween(pickup, dest),
      fare: Math.round(def.fare * fareMultiplier / 500) * 500,
      rating: 5,
      state: 'offered',
      timeLimit: distanceBetween(pickup, dest) / 260 + 60,
      timeLeft: 0,
      crashed: false,
      story: true,
      storyId: def.id,
      storyStep: step,
      brief: def.brief,
      doneText: def.done,
    };
  }

  return {
    get board() { return board; },
    get active() { return active; },
    get storyStep() { return storyStep; },
    get storyDone() { return storyDone; },
    get streak() { return streak; },
    get activeEvent() { return activeEvent; },
    get streakMultiplier() {
      return Math.min(ECONOMY.streakMaxMultiplier, 1 + streak * ECONOMY.streakBonusPerStreak);
    },

    /** Refills the board to five offers, using the shift's order types. */
    refreshBoard(shift, districts, fareMultiplier, rating, rankTier) {
      while (board.length < 5) {
        let type = randomPick(random, shift.orderTypes);
        if (type === 'vip' && rating < ECONOMY.premiumRating && random() < 0.7) type = 'penumpang';
        if (rankTier < 3 && type === 'vip') type = 'penumpang';
        const order = makeOrder(type, districts, fareMultiplier, rating);
        if (!order) break;
        board.push(order);
      }
      // The next story mission sits on the board as a gold card when unlocked.
      const hasStory = board.some((o) => o.story);
      if (!hasStory && storyStep < STORY_TEXT.length) {
        const story = makeStoryOrder(storyStep, fareMultiplier);
        if (story) board.unshift(story);
      }
    },

    accept(orderId) {
      if (active) return null;
      const index = board.findIndex((o) => o.id === orderId);
      if (index === -1) return null;
      active = board.splice(index, 1)[0];
      active.state = 'to-pickup';
      active.timeLeft = active.timeLimit;
      return active;
    },

    markPickedUp() {
      if (!active) return;
      active.state = 'to-dest';
    },

    markCrashed() {
      if (active) active.crashed = true;
    },

    /** Completes the active order. Returns the payout breakdown, or null. */
    complete() {
      if (!active) return null;
      const order = active;
      active = null;
      const onTime = order.timeLeft > 0;
      const streakBefore = streak;
      if (onTime) streak += 1;
      else streak = 0;
      const multiplier = onTime
        ? Math.min(ECONOMY.streakMaxMultiplier, 1 + streakBefore * ECONOMY.streakBonusPerStreak)
        : 1;
      const fare = Math.round(order.fare * multiplier);
      let tip = 0;
      if (onTime && !order.crashed) {
        tip = Math.round(order.fare * (order.type === 'vip' ? ECONOMY.premiumTipRate : ECONOMY.tipRate));
      }
      const xp = 10 + Math.round(order.fare / 2000) + (order.story ? 20 : 0);
      let storyAdvanced = false;
      if (order.story) {
        storyDone += 1;
        storyStep += 1;
        storyAdvanced = true;
      }
      return { order, fare, tip, xp, onTime, streak, multiplier, storyAdvanced };
    },

    cancelActive() {
      if (!active) return;
      active = null;
      streak = 0;
    },

    update(dt, onEvent) {
      if (active) {
        active.timeLeft -= dt;
        if (active.timeLeft <= -30) {
          // Far too late: the passenger gives up and the order is lost.
          active = null;
          streak = 0;
          if (onEvent) onEvent({ type: 'order-expired' });
        }
      }
      eventTimer -= dt;
      if (eventTimer <= 0) {
        eventTimer = EVENTS.minGapSeconds + random() * (EVENTS.maxGapSeconds - EVENTS.minGapSeconds);
        const kind = randomPick(random, EVENTS.types);
        if (kind === 'banjir' || kind === 'demo' || kind === 'kecelakaan') {
          const closure = city.addClosure(kind, EVENTS.closureDurationSeconds);
          if (closure) {
            activeEvent = { kind, closure, timeLeft: EVENTS.closureDurationSeconds };
            if (onEvent) onEvent({ type: 'event', kind, closure });
          }
        } else {
          activeEvent = { kind, timeLeft: 60 };
          if (onEvent) onEvent({ type: 'event', kind });
        }
      }
      if (activeEvent) {
        activeEvent.timeLeft -= dt;
        if (activeEvent.timeLeft <= 0) {
          const ended = activeEvent;
          activeEvent = null;
          if (onEvent && (ended.kind === 'banjir' || ended.kind === 'demo' || ended.kind === 'kecelakaan')) {
            onEvent({ type: 'event-over', kind: ended.kind });
          }
        }
      }
    },

    /** A rush parcel or VIP event order, pushed straight to the board. */
    pushEventOrder(kind, districts, fareMultiplier, rating) {
      const type = kind === 'paket-kilat' ? 'paket' : 'vip';
      const order = makeOrder(type, districts, fareMultiplier, rating);
      if (!order) return null;
      order.fare = Math.round(order.fare * 1.6 / 500) * 500;
      order.timeLimit = Math.min(order.timeLimit, 60);
      order.event = true;
      board.unshift(order);
      return order;
    },

    serialize() {
      return {
        storyStep, storyDone, streak,
        board: board.map((o) => ({ ...o, pickup: o.pickup, dest: o.dest })),
        active: active ? { ...active } : null,
      };
    },

    restore(data) {
      if (!data) return;
      storyStep = data.storyStep || 0;
      storyDone = data.storyDone || 0;
      streak = data.streak || 0;
      board.length = 0;
      if (Array.isArray(data.board)) board.push(...data.board);
      active = data.active || null;
    },
  };
}
