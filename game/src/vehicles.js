// OJEK! King of the Streets — low-poly model builders: bikes, cars, angkot, bajaj,
// trucks, police cars, the police helicopter and people. Everything is built
// from boxes, cylinders and spheres, faces local +Z, and exposes the parts
// that move (wheels, rotors, limbs) so gameplay can animate them.

import * as THREE from 'three';

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildBike(color, wheelR = 0.35) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const dark = 0x1c1c20;
  const frame = box(0.28, 0.22, 1.5, dark, 0, 0.62, 0);
  const tank = box(0.42, 0.28, 0.55, color, 0, 0.86, 0.28);
  const seat = box(0.36, 0.14, 0.6, 0x2a2a2a, 0, 0.82, -0.35);
  const front = box(0.3, 0.5, 0.2, color, 0, 0.95, 0.72);
  const fender = box(0.34, 0.08, 0.5, color, 0, 0.78, 0.82);
  const rear = box(0.3, 0.1, 0.4, dark, 0, 0.72, -0.75);
  const bar = cyl(0.03, 0.03, 0.62, dark, 0, 1.12, 0.55, 6);
  bar.rotation.z = Math.PI / 2;
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xffdf7a, emissiveIntensity: 0.6 }),
  );
  light.position.set(0, 0.95, 0.85);
  const plate = box(0.24, 0.14, 0.03, 0xeeeeee, 0, 0.6, -0.95);
  body.add(frame, tank, seat, front, fender, rear, bar, light, plate);
  const wheels = [];
  const tireGeo = new THREE.TorusGeometry(wheelR, 0.09, 8, 14);
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const hubGeo = new THREE.CylinderGeometry(wheelR * 0.5, wheelR * 0.5, 0.08, 10);
  const hubMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  for (const z of [0.78, -0.78]) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    wheel.add(tire, hub);
    wheel.position.set(0, wheelR, z);
    wheel.rotation.y = Math.PI / 2;
    g.add(wheel);
    wheels.push(wheel);
  }
  g.add(body);
  g.userData.bodyParts = [tank, front, fender];
  g.userData.paint = (c) => { for (const p of g.userData.bodyParts) p.material.color.setHex(c); };
  return { group: g, wheels, body };
}

function carWheels(g, w, zf, zr, r = 0.36) {
  const wheels = [];
  const geo = new THREE.CylinderGeometry(r, r, 0.28, 12);
  const mat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [x, z] of [[-w / 2 + 0.1, zf], [w / 2 - 0.1, zf], [-w / 2 + 0.1, zr], [w / 2 - 0.1, zr]]) {
    const wheel = new THREE.Mesh(geo, mat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, r, z);
    wheel.castShadow = true;
    g.add(wheel);
    wheels.push(wheel);
  }
  return wheels;
}

export function buildCar(color, type = 'sedan') {
  const g = new THREE.Group();
  let wheels;
  if (type === 'bajaj') {
    g.add(box(1.1, 0.7, 1.7, 0xe8a020, 0, 0.55, 0));
    g.add(box(1.0, 0.55, 1.2, 0x2e9e5b, 0, 1.15, -0.1));
    g.add(box(0.9, 0.4, 0.1, 0x9ad4e8, 0, 1.1, 0.55));
    wheels = carWheels(g, 1.0, 0.55, -0.55, 0.26);
  } else if (type === 'angkot') {
    g.add(box(1.7, 1.0, 3.4, color, 0, 0.75, 0));
    g.add(box(1.6, 0.8, 3.0, 0x9ad4e8, 0, 1.6, 0));
    g.add(box(1.72, 0.25, 3.42, 0xffffff, 0, 1.28, 0));
    wheels = carWheels(g, 1.6, 1.15, -1.15, 0.36);
  } else if (type === 'truck') {
    g.add(box(2.0, 1.6, 1.6, color, 0, 1.1, 2.2));
    g.add(box(1.9, 0.7, 1.5, 0x9ad4e8, 0, 1.6, 2.2));
    g.add(box(2.1, 2.2, 3.8, 0xd8d2c2, 0, 1.5, -1.0));
    wheels = carWheels(g, 2.0, 2.2, -1.6, 0.42);
  } else if (type === 'police') {
    g.add(box(1.8, 0.75, 4.2, 0xf2f2f2, 0, 0.6, 0));
    g.add(box(1.6, 0.65, 2.2, 0x1c2a4a, 0, 1.25, -0.2));
    g.add(box(1.82, 0.3, 4.22, 0x1c2a4a, 0, 0.75, 0));
    const bar = box(1.2, 0.22, 0.4, 0x222222, 0, 1.7, -0.2);
    g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 1 }));
    red.position.set(-0.32, 1.86, -0.2);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a6aff, emissive: 0x2a6aff, emissiveIntensity: 1 }));
    blue.position.set(0.32, 1.86, -0.2);
    g.add(red, blue);
    g.userData.lightBar = { red, blue };
    wheels = carWheels(g, 1.7, 1.4, -1.4, 0.38);
  } else {
    g.add(box(1.75, 0.7, 4.0, color, 0, 0.6, 0));
    g.add(box(1.55, 0.62, 2.0, 0x9ad4e8, 0, 1.22, -0.25));
    g.add(box(1.6, 0.18, 1.9, color, 0, 1.55, -0.25));
    wheels = carWheels(g, 1.65, 1.35, -1.35, 0.38);
  }
  return { group: g, wheels };
}

export function buildHelicopter() {
  const g = new THREE.Group();
  g.add(box(1.8, 1.4, 3.2, 0x1c2a4a, 0, 0, 0));
  g.add(box(1.6, 0.8, 1.2, 0x9ad4e8, 0, 0.3, 1.2));
  g.add(box(0.4, 0.4, 3.4, 0x1c2a4a, 0, 0.3, -3.0));
  g.add(box(0.15, 1.2, 0.8, 0x1c2a4a, 0, 0.8, -4.5));
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.08, 0.3), bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 1.0;
  g.add(rotor);
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 18, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  spot.position.y = -9;
  spot.rotation.x = Math.PI;
  g.add(spot);
  const lamp = new THREE.PointLight(0xfff2b0, 60, 30, 1.5);
  lamp.position.y = -1;
  g.add(lamp);
  return { group: g, rotor };
}

const SKIN = [0xc68642, 0x8d5524, 0xe0ac69, 0xa05a2c];
const SHIRTS = [0xc23b3b, 0x2e6db0, 0x2e9e5b, 0xd4a017, 0x8e44ad, 0xe67e22, 0x4a90a4, 0xd87093];
const PANTS = [0x2a2a35, 0x3a4a5a, 0x5a4a3a, 0x222222, 0x4a5a6a];

export function buildCharacter(opts = {}) {
  const skin = opts.skin ?? SKIN[Math.floor(Math.random() * SKIN.length)];
  const shirt = opts.shirt ?? SHIRTS[Math.floor(Math.random() * SHIRTS.length)];
  const pants = opts.pants ?? PANTS[Math.floor(Math.random() * PANTS.length)];
  const g = new THREE.Group();
  const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.26);
  const legMat = new THREE.MeshLambertMaterial({ color: pants });
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  const legMeshL = new THREE.Mesh(legGeo, legMat);
  legMeshL.position.y = -0.38;
  legMeshL.castShadow = true;
  const legMeshR = new THREE.Mesh(legGeo, legMat);
  legMeshR.position.y = -0.38;
  legMeshR.castShadow = true;
  legL.add(legMeshL);
  legR.add(legMeshR);
  legL.position.set(-0.14, 0.78, 0);
  legR.position.set(0.14, 0.78, 0);
  const torso = box(0.52, 0.62, 0.3, shirt, 0, 1.1, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), new THREE.MeshLambertMaterial({ color: skin }));
  head.position.set(0, 1.62, 0);
  head.castShadow = true;
  const armGeo = new THREE.BoxGeometry(0.16, 0.62, 0.18);
  const armMat = new THREE.MeshLambertMaterial({ color: shirt });
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  const armMeshL = new THREE.Mesh(armGeo, armMat);
  armMeshL.position.y = -0.28;
  armMeshL.castShadow = true;
  const armMeshR = new THREE.Mesh(armGeo, armMat);
  armMeshR.position.y = -0.28;
  armMeshR.castShadow = true;
  armL.add(armMeshL);
  armR.add(armMeshR);
  armL.position.set(-0.36, 1.38, 0);
  armR.position.set(0.36, 1.38, 0);
  g.add(legL, legR, torso, head, armL, armR);
  let helmet = null;
  if (opts.helmet) {
    helmet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshLambertMaterial({ color: opts.helmet }));
    helmet.position.set(0, 1.68, 0);
    g.add(helmet);
    const visor = box(0.3, 0.12, 0.05, 0x222222, 0, 1.66, 0.22);
    g.add(visor);
  }
  return { group: g, legL, legR, armL, armR, torso, head, helmet };
}

export function poseWalk(char, phase, amount) {
  const swing = Math.sin(phase) * 0.55 * amount;
  char.legL.rotation.x = swing;
  char.legR.rotation.x = -swing;
  char.armL.rotation.x = -swing * 0.7;
  char.armR.rotation.x = swing * 0.7;
  char.group.position.y = Math.abs(Math.sin(phase)) * 0.04 * amount;
}

export function poseRiding(char) {
  char.legL.rotation.x = -1.25;
  char.legR.rotation.x = -1.25;
  char.armL.rotation.x = -0.85;
  char.armR.rotation.x = -0.85;
  char.group.position.y = 0;
}

export function poseIdle(char) {
  char.legL.rotation.x = 0;
  char.legR.rotation.x = 0;
  char.armL.rotation.x = 0;
  char.armR.rotation.x = 0;
  char.group.position.y = 0;
}
