// OJEK! King of the Streets — the order board: passenger rides, parcels, hot food,
// VIPs and rush jobs. Orders show their distance and price up front and the
// player picks freely; a run is pickup, then delivery, then payout with tip,
// streak and rating on top.

import * as THREE from 'three';
import { ORDER_TYPES, districtAt } from './config.js';
import { worldRandom as rng } from './random.js';

const NAMES = ['Budi', 'Sari', 'Andi', 'Dewi', 'Rudi', 'Maya', 'Agus', 'Rina', 'Joko', 'Putri', 'Eko', 'Lina', 'Fajar', 'Nina', 'Dedi', 'Wati'];
const PARCELS = ['clothing parcel', 'documents', 'electronics parcel', 'books', 'cake box', 'bike spare parts'];
const FOODS = ['fried rice', 'chicken noodles', 'chicken satay', 'meatball soup', 'smashed chicken', 'jumbo iced tea'];

let orderId = 1;

export function createOrders(scene, city, daycycle, pedestrians) {
  const board = [];
  let active = null;
  let beacon = null;
  let ring = null;
  let waitingPed = null;
  let refreshTimer = 0;
  let fareMult = 1;
  let vipBoost = false;

  function makeBeacon(color) {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.8, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.y = 13;
    const ground = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 2.4, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.08;
    g.add(beam, ground);
    g.visible = false;
    scene.add(g);
    return g;
  }

  function surgeNow() {
    return daycycle.shift.surge * daycycle.weatherInfo.fare;
  }

  function unlockedDistricts(rank) {
    // Rank opens the city up: market + kampung first, the rest follows.
    const all = ['market', 'kampung', 'downtown', 'riverside', 'port'];
    return all.slice(0, Math.min(all.length, rank + 2));
  }

  function generateOrder(rank) {
    const types = ['penumpang', 'penumpang', 'paket', 'paket', 'makanan'];
    if (rank >= 1) types.push('kilat');
    if (rank >= 3) types.push('vip');
    // VIP Magnet: VIP orders open up a rank early and weigh far heavier.
    if (vipBoost && rank >= 2) types.push('vip', 'vip', 'vip');
    const type = rng.pick(types);
    const def = ORDER_TYPES[type];
    const districts = unlockedDistricts(rank);
    const pickup = city.randomRoadPointInDistrict(rng, rng.pick(districts));
    let dest = city.randomRoadPointInDistrict(rng, rng.pick(districts));
    let tries = 0;
    while (Math.hypot(dest.x - pickup.x, dest.z - pickup.z) < 90 && tries < 12) {
      dest = city.randomRoadPoint(rng);
      tries += 1;
    }
    const distance = Math.hypot(dest.x - pickup.x, dest.z - pickup.z);
    const km = distance / 1000;
    const fare = Math.round((def.base + def.perKm * km) * surgeNow() * fareMult / 100) * 100;
    const order = {
      id: orderId,
      type,
      label: def.label,
      detail: type === 'penumpang' || type === 'vip'
        ? rng.pick(NAMES)
        : type === 'paket' || type === 'kilat'
          ? rng.pick(PARCELS)
          : rng.pick(FOODS),
      pickup,
      dest,
      distance,
      fare,
      timer: def.timer ? def.timer + Math.round(km * 60) : null,
      timeLeft: def.timer ? def.timer + Math.round(km * 60) : null,
      expires: 120,
      pickupDistrict: districtAt(pickup.x, pickup.z).name,
      destDistrict: districtAt(dest.x, dest.z).name,
    };
    orderId += 1;
    return order;
  }

  function fillBoard(rank) {
    while (board.length < 7) board.push(generateOrder(rank));
  }

  function setBeacon(target, color) {
    if (!beacon) beacon = makeBeacon(0x2eff8a);
    if (!ring) ring = makeBeacon(0x2eff8a);
    beacon.visible = true;
    beacon.position.set(target.x, 0, target.z);
    beacon.children.forEach((c) => c.material.color.setHex(color));
  }

  function hideBeacon() {
    if (beacon) beacon.visible = false;
  }

  function accept(id, playerPos) {
    if (active) return null;
    const idx = board.findIndex((o) => o.id === id);
    if (idx < 0) return null;
    const order = board.splice(idx, 1)[0];
    order.stage = 'pickup';
    order.startedAt = Date.now();
    active = order;
    waitingPed = pedestrians.spawnWaiting(order.pickup);
    setBeacon(order.pickup, 0x2eff8a);
    return order;
  }

  function cancel() {
    if (!active) return null;
    const order = active;
    active = null;
    hideBeacon();
    if (waitingPed) { pedestrians.removeWaiting(waitingPed); waitingPed = null; }
    return order;
  }

  // Returns an event object when something happens this frame, else null.
  function update(dt, playerPos, rank) {
    refreshTimer -= dt;
    if (refreshTimer <= 0) {
      refreshTimer = 4;
      for (let i = board.length - 1; i >= 0; i -= 1) {
        board[i].expires -= 4;
        if (board[i].expires <= 0) board.splice(i, 1);
      }
      fillBoard(rank);
    }
    if (beacon && beacon.visible) {
      beacon.rotation.y += dt * 1.2;
      const s = 1 + Math.sin(Date.now() / 300) * 0.06;
      beacon.scale.set(s, 1, s);
    }
    if (!active) return null;
    if (active.timeLeft != null) {
      active.timeLeft -= dt;
      if (active.timeLeft <= 0) {
        const failed = active;
        cancel();
        return { kind: 'failed', order: failed, reason: 'Time ran out' };
      }
    }
    const target = active.stage === 'pickup' ? active.pickup : active.dest;
    const d = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
    if (d < 7) {
      if (active.stage === 'pickup') {
        active.stage = 'deliver';
        if (waitingPed) { pedestrians.removeWaiting(waitingPed); waitingPed = null; }
        setBeacon(active.dest, 0xffd24a);
        return { kind: 'pickup', order: active };
      }
      const done = active;
      active = null;
      hideBeacon();
      return { kind: 'delivered', order: done };
    }
    return null;
  }

  function targetInfo(playerPos) {
    if (!active) return null;
    const target = active.stage === 'pickup' ? active.pickup : active.dest;
    return {
      order: active,
      target,
      distance: Math.hypot(playerPos.x - target.x, playerPos.z - target.z),
      stage: active.stage,
    };
  }

  return {
    board,
    get active() { return active; },
    fillBoard,
    accept,
    cancel,
    update,
    targetInfo,
    setBeacon,
    hideBeacon,
    surgeNow,
    setFareMult(n) { fareMult = n; },
    setVipBoost(on) { vipBoost = on; },
  };
}
