// OJEK! King of the Streets — random events: floods, protests and crashes close
// roads and show on the minimap, forcing re-routes; order surges pay more
// for a while. Events come and go on their own timer.

import * as THREE from 'three';
import { CITY } from './config.js';
import { buildCharacter } from './vehicles.js';
import { worldRandom as rng } from './random.js';

export function createEvents(scene, city) {
  const active = [];
  let timer = rng.range(45, 70);
  let surgeBonus = 0;
  let surgeTimer = 0;

  function barrierMesh(color) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.1, 0.4),
      new THREE.MeshLambertMaterial({ color }),
    );
    m.castShadow = true;
    return m;
  }

  function spawnRoadEvent() {
    const kind = rng.pick(['flood', 'protest', 'crash']);
    const vertical = rng.chance(0.5);
    const line = CITY.roadLine(rng.int(1, CITY.blocksX - 1));
    const along = rng.range(-CITY.size / 2 + 60, CITY.size / 2 - 60);
    const x = vertical ? line : along;
    const z = vertical ? along : line;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const colliders = [];
    if (kind === 'flood') {
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(vertical ? 14 : 30, vertical ? 30 : 14),
        new THREE.MeshLambertMaterial({ color: 0x3a7fb8, transparent: true, opacity: 0.75 }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.15;
      group.add(water);
      for (const off of [-12, 12]) {
        const b = barrierMesh(0xe67e22);
        b.position.set(vertical ? 0 : off, 0.55, vertical ? off : 0);
        b.rotation.y = vertical ? 0 : Math.PI / 2;
        group.add(b);
      }
      colliders.push({ minX: x - (vertical ? 7 : 15), maxX: x + (vertical ? 7 : 15), minZ: z - (vertical ? 15 : 7), maxZ: z + (vertical ? 15 : 7) });
    } else if (kind === 'protest') {
      for (let i = 0; i < 7; i += 1) {
        const c = buildCharacter({});
        c.group.position.set(rng.range(-6, 6), 0, rng.range(-6, 6));
        c.group.rotation.y = rng.range(0, Math.PI * 2);
        c.armR.rotation.x = -2.6;
        group.add(c.group);
      }
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 1.2),
        new THREE.MeshLambertMaterial({ color: 0xf2f2f2, side: THREE.DoubleSide }),
      );
      banner.position.y = 2.2;
      group.add(banner);
      colliders.push({ minX: x - 8, maxX: x + 8, minZ: z - 8, maxZ: z + 8 });
    } else {
      // Crash: two wrecked cars and barriers.
      const wreckMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
      for (const [dx, dz, ry] of [[-2, 0, 0.5], [2.5, 1, -0.4]]) {
        const wreck = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4), wreckMat);
        body.position.y = 0.6;
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2), new THREE.MeshLambertMaterial({ color: 0x333333 }));
        cab.position.y = 1.2;
        wreck.add(body, cab);
        wreck.position.set(dx, 0, dz);
        wreck.rotation.y = ry;
        group.add(wreck);
      }
      for (const off of [-8, 8]) {
        const b = barrierMesh(0xc23b3b);
        b.position.set(vertical ? 0 : off, 0.55, vertical ? off : 0);
        b.rotation.y = vertical ? 0 : Math.PI / 2;
        group.add(b);
      }
      colliders.push({ minX: x - 7, maxX: x + 7, minZ: z - 7, maxZ: z + 7 });
    }
    scene.add(group);
    const ev = {
      kind,
      x,
      z,
      label: kind === 'flood' ? 'Flood' : kind === 'protest' ? 'Protest' : 'Crash',
      group,
      colliders,
      life: rng.range(70, 120),
    };
    for (const c of colliders) city.colliders.push(c);
    active.push(ev);
    return ev;
  }

  function spawnSurge() {
    surgeBonus = 0.5;
    surgeTimer = 60;
    return { kind: 'surge', label: 'Order rush', life: 60 };
  }

  function update(dt) {
    timer -= dt;
    if (timer <= 0) {
      timer = rng.range(90, 150);
      if (active.length < 2 && rng.chance(0.65)) spawnRoadEvent();
      else if (surgeTimer <= 0) spawnSurge();
    }
    if (surgeTimer > 0) {
      surgeTimer -= dt;
      if (surgeTimer <= 0) surgeBonus = 0;
    }
    for (let i = active.length - 1; i >= 0; i -= 1) {
      const ev = active[i];
      ev.life -= dt;
      if (ev.life <= 0) {
        scene.remove(ev.group);
        for (const c of ev.colliders) {
          const idx = city.colliders.indexOf(c);
          if (idx >= 0) city.colliders.splice(idx, 1);
        }
        active.splice(i, 1);
      }
    }
  }

  return {
    update,
    get active() { return active; },
    get surgeBonus() { return surgeBonus; },
    get surgeActive() { return surgeTimer > 0; },
    get surgeTimeLeft() { return Math.max(0, surgeTimer); },
    spawnRoadEvent,
    spawnSurge,
  };
}
