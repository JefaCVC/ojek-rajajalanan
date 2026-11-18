// OJEK! King of the Streets — the city: five districts, a river with bridges,
// landmarks, street furniture, traffic lights and collision. All geometry is
// low-poly boxes, cylinders and cones with canvas-painted textures, so the
// whole city is built from code and needs no asset files.

import * as THREE from 'three';
import { CITY, DISTRICTS, LANDMARKS, districtAt } from './config.js';
import { worldRandom as rng } from './random.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function facadeTexture(base, floors, lit) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const rows = floors;
    const cols = 5;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = 8 + c * 23;
        const y = 10 + r * (h / rows);
        const isLit = rng.chance(lit);
        g.fillStyle = isLit ? '#ffd98a' : '#2c3540';
        g.fillRect(x, y, 14, Math.min(18, h / rows - 8));
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, h - 14, w, 14);
  });
}

function roadTexture() {
  const t = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#41464d';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 200; i += 1) g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2);
    g.fillStyle = '#c8b23a';
    g.fillRect(w / 2 - 3, 8, 6, 24);
    g.fillStyle = '#d8d8d8';
    g.fillRect(4, 0, 3, h);
    g.fillRect(w - 7, 0, 3, h);
  });
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

function awningTexture(colorA, colorB) {
  return canvasTexture(64, 64, (g, w, h) => {
    for (let i = 0; i < 8; i += 1) {
      g.fillStyle = i % 2 === 0 ? colorA : colorB;
      g.fillRect(i * 8, 0, 8, h);
    }
  });
}

function signTexture(text, bg, fg) {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = 'bold 30px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 1);
  });
}

const SHOP_SIGNS = [
  ['WARUNG KOPI', '#7d4a2d', '#ffe9c4'],
  ['MIE AYAM', '#a6472e', '#fff2cc'],
  ['ES TEH JUMBO', '#2e6d5b', '#ffffff'],
  ['TOKO KELONTONG', '#2e4a6d', '#ffe9a8'],
  ['BENGKEL LAS', '#4a4a52', '#ffd24a'],
  ['LAUNDRY KILAT', '#5b7fa6', '#ffffff'],
  ['NASI PADANG', '#8a2e2e', '#ffe9c4'],
  ['BARBERSHOP', '#222222', '#e8d24a'],
];

const BILLBOARDS = [
  ['ES TEH 5 RIBU', '#c23b3b', '#ffffff'],
  ['SINAR JAYA MOTOR', '#1f4a8a', '#ffd24a'],
  ['KOPI PAGI KOTA', '#5b3a1f', '#ffe9c4'],
  ['OJEK! RAJA JALANAN', '#2e9e5b', '#ffffff'],
  ['MIE AYAM ENAK', '#a6472e', '#fff2cc'],
];

export function createCity(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const lampLights = [];
  const lampMats = [];
  const trafficLights = [];

  const size = CITY.size;
  const half = size / 2;
  const roadTex = roadTexture();

  const addCollider = (x, z, w, d) => {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  };

  // Ground: grass around the city, concrete inside.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 400, size + 400),
    new THREE.MeshLambertMaterial({ color: 0x6fae5e }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshLambertMaterial({ color: 0x9aa0a3 }),
  );
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = 0.0;
  slab.receiveShadow = true;
  group.add(slab);

  // Roads: one long strip per road line, textured with dashes.
  const roadGeoV = new THREE.PlaneGeometry(CITY.road, size);
  const roadGeoH = new THREE.PlaneGeometry(size, CITY.road);
  for (let i = 0; i <= CITY.blocksX; i += 1) {
    const line = CITY.roadLine(i);
    const texV = roadTex.clone();
    texV.needsUpdate = true;
    texV.repeat.set(1, size / 16);
    const rv = new THREE.Mesh(roadGeoV, new THREE.MeshLambertMaterial({ map: texV }));
    rv.rotation.x = -Math.PI / 2;
    rv.position.set(line, 0.02, 0);
    rv.receiveShadow = true;
    group.add(rv);
    const texH = roadTex.clone();
    texH.needsUpdate = true;
    texH.repeat.set(size / 16, 1);
    const rh = new THREE.Mesh(roadGeoH, new THREE.MeshLambertMaterial({ map: texH }));
    rh.rotation.x = -Math.PI / 2;
    rh.rotation.z = Math.PI / 2;
    rh.position.set(0, 0.02, line);
    rh.receiveShadow = true;
    group.add(rh);
  }

  // River: a north-south strip through the block column east of road 9.
  const riverX0 = CITY.roadLine(9) + 12;
  const riverX1 = CITY.roadLine(10) - 12;
  const riverW = riverX1 - riverX0;
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(riverW, size),
    new THREE.MeshLambertMaterial({ color: 0x3a7fb8 }),
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set((riverX0 + riverX1) / 2, 0.03, 0);
  group.add(river);
  // Banks: collision segments between bridges, bridges at every road crossing.
  const bridgeMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5c });
  const railMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
  for (let j = 0; j <= CITY.blocksZ; j += 1) {
    const z = CITY.roadLine(j);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(riverW + 6, 0.5, CITY.road + 2), bridgeMat);
    deck.position.set((riverX0 + riverX1) / 2, 0.25, z);
    deck.receiveShadow = true;
    group.add(deck);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(riverW + 6, 0.9, 0.3), railMat);
      rail.position.set((riverX0 + riverX1) / 2, 0.9, z + side * (CITY.road / 2 + 0.5));
      group.add(rail);
    }
    if (j < CITY.blocksZ) {
      const z0 = z + CITY.road / 2 + 1;
      const z1 = CITY.roadLine(j + 1) - CITY.road / 2 - 1;
      addCollider((riverX0 + riverX1) / 2, (z0 + z1) / 2, riverW, z1 - z0);
    }
  }

  // Blocks: sidewalks + buildings, shaped by district.
  const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xb9b3a4 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < CITY.blocksX; i += 1) {
    for (let j = 0; j < CITY.blocksZ; j += 1) {
      const cx = CITY.roadLine(i) + CITY.pitch / 2;
      const cz = CITY.roadLine(j) + CITY.pitch / 2;
      const d = districtAt(cx, cz);
      // River column: no buildings.
      if (cx > riverX0 - 8 && cx < riverX1 + 8) continue;
      // Downtown plaza: fountain instead of buildings.
      const isPlaza = i === 5 && j === 5;
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(CITY.block + 2, CITY.block + 2), sidewalkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.05, cz);
      walk.receiveShadow = true;
      group.add(walk);
      if (isPlaza) {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1.2, 12), new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }));
        base.position.set(cx, 0.6, cz);
        group.add(base);
        const water = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.3, 12), new THREE.MeshLambertMaterial({ color: 0x4a9ad4 }));
        water.position.set(cx, 1.2, cz);
        group.add(water);
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3, 8), new THREE.MeshLambertMaterial({ color: 0xd8d2c2 }));
        spout.position.set(cx, 2.5, cz);
        group.add(spout);
        addCollider(cx, cz, 16, 16);
        continue;
      }
      const count = d.tower ? 1 : rng.int(2, 4);
      for (let k = 0; k < count; k += 1) {
        const w = d.tower ? rng.range(16, 22) : rng.range(8, 14);
        const dep = d.tower ? rng.range(16, 22) : rng.range(8, 12);
        const ox = count === 1 ? 0 : rng.range(-8, 8);
        const oz = count === 1 ? 0 : rng.range(-8, 8);
        const bx = cx + ox;
        const bz = cz + oz;
        let h;
        if (d.tower) h = rng.range(22, 58);
        else if (d.id === 'port') h = rng.range(6, 10);
        else h = rng.range(4, 12);
        const color = rng.pick(d.palette);
        const floors = Math.max(1, Math.round(h / 3.2));
        const facade = facadeTexture(color, floors, d.tower ? 0.35 : 0.25);
        facade.repeat.set(Math.max(1, Math.round(w / 10)), 1);
        facade.wrapS = THREE.RepeatWrapping;
        const mat = new THREE.MeshLambertMaterial({ map: facade, emissive: 0xffc46b, emissiveMap: facade, emissiveIntensity: 0 });
        lampMats.push(mat);
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, dep);
        b.position.set(bx, h / 2, bz);
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
        // Roof: pyramid for houses, flat cap for towers and warehouses.
        if (!d.tower && d.id !== 'port') {
          const roof = new THREE.Mesh(
            new THREE.ConeGeometry(Math.max(w, dep) * 0.75, rng.range(2, 3.5), 4),
            new THREE.MeshLambertMaterial({ color: d.roof }),
          );
          roof.rotation.y = Math.PI / 4;
          roof.position.set(bx, h + 1.2, bz);
          roof.castShadow = true;
          group.add(roof);
        } else {
          const cap = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: d.roof }));
          cap.scale.set(w + 0.6, 0.6, dep + 0.6);
          cap.position.set(bx, h + 0.3, bz);
          group.add(cap);
        }
        addCollider(bx, bz, w, dep);
        // Shopfront awning + sign for street-level buildings in the market.
        if (d.id === 'market' && k === 0 && rng.chance(0.8)) {
          const [text, bg, fg] = rng.pick(SHOP_SIGNS);
          const awn = new THREE.Mesh(
            new THREE.PlaneGeometry(w * 0.8, 2.4),
            new THREE.MeshLambertMaterial({ map: awningTexture('#c23b3b', '#f2f2f2'), side: THREE.DoubleSide }),
          );
          awn.position.set(bx, 3.4, bz + dep / 2 + 1.2);
          awn.rotation.x = -0.5;
          group.add(awn);
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(w * 0.8, 2),
            new THREE.MeshLambertMaterial({ map: signTexture(text, bg, fg) }),
          );
          sign.position.set(bx, 4.6, bz + dep / 2 + 0.15);
          group.add(sign);
        }
      }
    }
  }

  // Trees along the sidewalks and in the park. Positions are collected first,
  // then drawn as two instanced meshes (trunks, leaves) to keep draw calls low.
  const treeSpots = [];
  function tree(x, z, s = 1) {
    treeSpots.push({ x, z, s });
    addCollider(x, z, 0.9, 0.9);
  }
  for (let i = 0; i <= CITY.blocksX; i += 1) {
    for (let j = 0; j <= CITY.blocksZ; j += 1) {
      if (rng.chance(0.35)) tree(CITY.roadLine(i) + 8.5, CITY.roadLine(j) + rng.range(-16, 16), rng.range(0.8, 1.3));
      if (rng.chance(0.3)) tree(CITY.roadLine(i) + rng.range(-16, 16), CITY.roadLine(j) + 8.5, rng.range(0.8, 1.3));
    }
  }
  // Park: dense trees + benches + pond.
  const park = LANDMARKS.park;
  for (let k = 0; k < 14; k += 1) tree(park.x + rng.range(-16, 16), park.z + rng.range(-16, 16), rng.range(1, 1.5));
  {
    const dummy = new THREE.Object3D();
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a2f }), treeSpots.length);
    const leafGeo = new THREE.SphereGeometry(1.8, 7, 6);
    const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), treeSpots.length);
    const leafA = new THREE.Color(0x3f8a3a);
    const leafB = new THREE.Color(0x5aa844);
    treeSpots.forEach((t, i) => {
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.position.set(t.x, 1.2, t.z);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.scale.setScalar(t.s);
      dummy.position.set(t.x, 3.4, t.z);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
      leaves.setColorAt(i, rng.chance(0.5) ? leafA : leafB);
    });
    trunks.castShadow = true;
    leaves.castShadow = true;
    group.add(trunks, leaves);
  }
  const pond = new THREE.Mesh(new THREE.CircleGeometry(6, 16), new THREE.MeshLambertMaterial({ color: 0x4a9ad4 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(park.x + 8, 0.06, park.z - 8);
  group.add(pond);

  // Street lamps along the roads; a few carry real point lights at night.
  // Poles and bulbs are instanced; the glow comes from one shared material.
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const bulbGeo = new THREE.SphereGeometry(0.35, 8, 6);
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xffdf7a, emissiveIntensity: 0 });
  lampMats.push(bulbMat);
  const lampSpots = [];
  let lampCount = 0;
  for (let i = 0; i <= CITY.blocksX; i += 1) {
    for (let j = 0; j <= CITY.blocksZ; j += 1) {
      if ((i + j) % 2 !== 0) continue;
      const x = CITY.roadLine(i) + 7.6;
      const z = CITY.roadLine(j);
      lampSpots.push({ x, z });
      addCollider(x, z, 0.5, 0.5);
      lampCount += 1;
      if (lampCount % 9 === 0) {
        const light = new THREE.PointLight(0xffdf7a, 0, 34, 1.6);
        light.position.set(x, 6.4, z);
        group.add(light);
        lampLights.push(light);
      }
    }
  }
  {
    const dummy = new THREE.Object3D();
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
    const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampSpots.length);
    lampSpots.forEach((l, i) => {
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.position.set(l.x, 3, l.z);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      dummy.position.set(l.x - 0.8, 6.1, l.z);
      dummy.updateMatrix();
      bulbs.setMatrixAt(i, dummy.matrix);
    });
    group.add(poles, bulbs);
  }

  // Traffic lights at every third intersection.
  const lightHeadGeo = new THREE.BoxGeometry(0.7, 1.8, 0.5);
  const lightPoleGeo = new THREE.CylinderGeometry(0.12, 0.14, 5.4, 6);
  for (let i = 0; i <= CITY.blocksX; i += 3) {
    for (let j = 0; j <= CITY.blocksZ; j += 3) {
      const x = CITY.roadLine(i) + 7.4;
      const z = CITY.roadLine(j) - 7.4;
      const pole = new THREE.Mesh(lightPoleGeo, poleMat);
      pole.position.set(x, 2.7, z);
      group.add(pole);
      const head = new THREE.Mesh(lightHeadGeo, new THREE.MeshLambertMaterial({ color: 0x222222 }));
      head.position.set(x, 5.6, z);
      group.add(head);
      const dots = [];
      for (let k = 0; k < 3; k += 1) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0x333333, emissive: 0x000000, emissiveIntensity: 1 }),
        );
        dot.position.set(x, 6.15 - k * 0.55, z + 0.28);
        group.add(dot);
        dots.push(dot);
      }
      trafficLights.push({ ix: i, iz: j, dots, offset: (i * 3 + j * 5) % 24 });
      addCollider(x, z, 0.6, 0.6);
    }
  }

  // Billboards.
  const bbSpots = [
    [CITY.roadLine(1), CITY.roadLine(5)], [CITY.roadLine(5), CITY.roadLine(1)],
    [CITY.roadLine(9), CITY.roadLine(5)], [CITY.roadLine(5), CITY.roadLine(9)],
    [CITY.roadLine(3), CITY.roadLine(3)], [CITY.roadLine(7), CITY.roadLine(7)],
  ];
  bbSpots.forEach(([x, z], idx) => {
    const [text, bg, fg] = BILLBOARDS[idx % BILLBOARDS.length];
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 9, 8), poleMat);
    pole.position.set(x + 9, 4.5, z + 9);
    group.add(pole);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 4),
      new THREE.MeshLambertMaterial({ map: signTexture(text, bg, fg), side: THREE.DoubleSide }),
    );
    board.position.set(x + 9, 10.5, z + 9);
    board.rotation.y = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    group.add(board);
    addCollider(x + 9, z + 9, 1, 1);
  });

  // Warung stalls in the market district.
  for (let k = 0; k < 8; k += 1) {
    const x = LANDMARKS.market.x + rng.range(-30, 30);
    const z = LANDMARKS.market.z + rng.range(-30, 30);
    const stall = new THREE.Group();
    const counter = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: rng.pick([0x8a5a3b, 0x5b7fa6, 0x7d4a2d]) }));
    counter.scale.set(3, 1.1, 1.6);
    counter.position.y = 0.55;
    counter.castShadow = true;
    const roof = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.4),
      new THREE.MeshLambertMaterial({ map: awningTexture('#2e9e5b', '#f2f2f2'), side: THREE.DoubleSide }),
    );
    roof.position.y = 2.5;
    roof.rotation.x = -0.25;
    stall.add(counter, roof);
    stall.position.set(x, 0, z);
    stall.rotation.y = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    group.add(stall);
    addCollider(x, z, 3, 2);
  }

  // Landmark buildings: mosque, school, gas stations, dealer, garage.
  function landmarkBuilding(x, z, w, h, d, color, signText, signBg) {
    const b = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
    b.scale.set(w, h, d);
    b.position.set(x, h / 2, z);
    b.castShadow = true;
    b.receiveShadow = true;
    group.add(b);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(w * 0.9, 14), 2),
      new THREE.MeshLambertMaterial({ map: signTexture(signText, signBg, '#ffffff') }),
    );
    sign.position.set(x, h + 1.4, z + d / 2 + 0.2);
    group.add(sign);
    addCollider(x, z, w, d);
    return b;
  }

  const mosque = LANDMARKS.mosque;
  landmarkBuilding(mosque.x + 20, mosque.z + 20, 18, 8, 14, 0xe8e4d8, 'MASJID AL SINAR', '#2e6d5b');
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2e9e5b }));
  dome.position.set(mosque.x + 20, 8, mosque.z + 20);
  group.add(dome);
  const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 18, 8), new THREE.MeshLambertMaterial({ color: 0xe8e4d8 }));
  minaret.position.set(mosque.x + 30, 9, mosque.z + 12);
  group.add(minaret);
  const minTop = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3, 8), new THREE.MeshLambertMaterial({ color: 0x2e9e5b }));
  minTop.position.set(mosque.x + 30, 19.5, mosque.z + 12);
  group.add(minTop);

  const school = LANDMARKS.school;
  landmarkBuilding(school.x - 20, school.z - 20, 22, 6, 12, 0xd8c98f, 'SDN MELATI', '#2e6db0');
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 6), poleMat);
  flagPole.position.set(school.x - 20, 4, school.z - 10);
  group.add(flagPole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xc23b3b, side: THREE.DoubleSide }));
  flag.position.set(school.x - 19, 7.2, school.z - 10);
  group.add(flag);

  function gasStation(lm) {
    const canopy = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xc23b3b }));
    canopy.scale.set(14, 1, 10);
    canopy.position.set(lm.x + 16, 6, lm.z + 16);
    canopy.castShadow = true;
    group.add(canopy);
    for (const [dx, dz] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 6), new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
      col.position.set(lm.x + 16 + dx, 3, lm.z + 16 + dz);
      group.add(col);
    }
    for (const dx of [-3, 3]) {
      const pump = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
      pump.scale.set(1.4, 2, 1);
      pump.position.set(lm.x + 16 + dx, 1, lm.z + 16);
      group.add(pump);
    }
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 2.4),
      new THREE.MeshLambertMaterial({ map: signTexture(lm.name.toUpperCase(), '#c23b3b', '#ffffff') }),
    );
    sign.position.set(lm.x + 16, 8, lm.z + 21.2);
    group.add(sign);
    addCollider(lm.x + 16, lm.z + 16, 12, 8);
  }
  gasStation(LANDMARKS.gasA);
  gasStation(LANDMARKS.gasB);

  const dealer = LANDMARKS.dealer;
  landmarkBuilding(dealer.x + 20, dealer.z - 20, 24, 9, 16, 0x2e4a6d, 'SINAR JAYA MOTOR', '#1f4a8a');
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), new THREE.MeshLambertMaterial({ color: 0x9ad4e8, emissive: 0x3a7fb8, emissiveIntensity: 0.4 }));
  glass.position.set(dealer.x + 20, 3, dealer.z - 20 + 8.2);
  group.add(glass);

  const garage = LANDMARKS.garage;
  landmarkBuilding(garage.x - 20, garage.z + 20, 20, 7, 14, 0x6b5a3a, 'GARASI', '#5b4a2a');
  const door = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.5), new THREE.MeshLambertMaterial({ color: 0x8a8a8a }));
  door.position.set(garage.x - 20, 2.4, garage.z + 20 + 7.2);
  group.add(door);

  // Port containers.
  const containerColors = [0xc23b3b, 0x2e6db0, 0x2e9e5b, 0xd4a017, 0x8e44ad];
  for (let k = 0; k < 18; k += 1) {
    const x = CITY.roadLine(1) + rng.range(-20, 20);
    const z = CITY.roadLine(8) + rng.range(-20, 20);
    const c = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: rng.pick(containerColors) }));
    c.scale.set(6, 2.6, 2.4);
    c.position.set(x, 1.3 + (rng.chance(0.3) ? 2.6 : 0), z);
    c.rotation.y = rng.pick([0, Math.PI / 2]);
    c.castShadow = true;
    group.add(c);
    addCollider(x, z, 6, 2.6);
  }

  // Boundary walls keep the player inside the city.
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8a8578 });
  for (const [x, z, w, d] of [[0, -half - 2, size + 8, 2], [0, half + 2, size + 8, 2], [-half - 2, 0, 2, size + 8], [half + 2, 0, 2, size + 8]]) {
    const wall = new THREE.Mesh(boxGeo, wallMat);
    wall.scale.set(w, 3, d);
    wall.position.set(x, 1.5, z);
    group.add(wall);
  }

  // --- Queries used by gameplay systems ---

  function nearestRoadPoint(x, z) {
    let bestX = x;
    let bestZ = z;
    let best = Infinity;
    for (let i = 0; i <= CITY.blocksX; i += 1) {
      const line = CITY.roadLine(i);
      const dx = Math.abs(x - line);
      if (dx < best) { best = dx; bestX = line; bestZ = z; }
      const dz = Math.abs(z - line);
      if (dz < best) { best = dz; bestX = x; bestZ = line; }
    }
    return { x: bestX, z: bestZ };
  }

  function randomRoadPoint(r, margin = 1) {
    const vertical = r.chance(0.5);
    const i = r.int(margin, CITY.blocksX - margin);
    const line = CITY.roadLine(i);
    const along = r.range(-half + 20, half - 20);
    return vertical ? { x: line, z: along } : { x: along, z: line };
  }

  function randomRoadPointInDistrict(r, districtId) {
    const d = DISTRICTS.find((x) => x.id === districtId) || DISTRICTS[0];
    for (let tries = 0; tries < 24; tries += 1) {
      const p = randomRoadPoint(r);
      if (districtAt(p.x, p.z).id === districtId) return p;
    }
    return randomRoadPoint(r);
  }

  // Push a circle out of every collider it overlaps. Returns true on contact.
  function resolveCircle(pos, radius) {
    let hit = false;
    for (const c of colliders) {
      const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - nx;
      const dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      hit = true;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (radius - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      } else {
        // Centre inside the box: push out along the shallowest axis.
        const l = pos.x - c.minX;
        const rr = c.maxX - pos.x;
        const t = pos.z - c.minZ;
        const b = c.maxZ - pos.z;
        const m = Math.min(l, rr, t, b);
        if (m === l) pos.x = c.minX - radius;
        else if (m === rr) pos.x = c.maxX + radius;
        else if (m === t) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      }
    }
    return hit;
  }

  // Traffic light cycle: 24s period. Returns 'ns' | 'ew' | null.
  function lightState(ix, iz, time) {
    const light = trafficLights.find((l) => l.ix === ix && l.iz === iz);
    if (!light) return null;
    const phase = (time + light.offset) % 24;
    if (phase < 10) return 'ns';
    if (phase < 12) return 'ns-yellow';
    if (phase < 22) return 'ew';
    return 'ew-yellow';
  }

  function update(time, nightFactor) {
    for (const m of lampMats) m.emissiveIntensity = nightFactor * 0.85;
    for (const l of lampLights) l.intensity = nightFactor * 55;
    for (const light of trafficLights) {
      const phase = (time + light.offset) % 24;
      const nsGreen = phase < 10;
      const ewGreen = phase >= 12 && phase < 22;
      const colors = [0xff2a2a, 0xffc21a, 0x2aff5a];
      light.dots.forEach((dot, k) => {
        const on = (k === 0 && !nsGreen && !ewGreen) || (k === 1 && ((phase >= 10 && phase < 12) || phase >= 22)) || (k === 2 && (nsGreen || ewGreen));
        dot.material.emissive.setHex(on ? colors[k] : 0x000000);
        dot.material.color.setHex(on ? colors[k] : 0x333333);
      });
    }
  }

  return {
    group,
    colliders,
    update,
    resolveCircle,
    nearestRoadPoint,
    randomRoadPoint,
    randomRoadPointInDistrict,
    lightState,
    districtAt,
  };
}
