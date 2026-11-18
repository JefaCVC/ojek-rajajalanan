// OJEK! King of the Streets — particles, skid marks, rain and floating text.
// Particles are pooled meshes so a burst costs no allocation; floating text
// is DOM so it stays crisp and never overflows a box.

import * as THREE from 'three';

export function createEffects(scene, camera, floatLayer) {
  const pool = [];
  const active = [];
  const skidMarks = [];
  const floats = [];
  let rain = null;
  let rainPositions = null;

  const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const mats = {};
  function matFor(color) {
    if (!mats[color]) mats[color] = new THREE.MeshBasicMaterial({ color, transparent: true });
    return mats[color];
  }

  function spawn(pos, { color = 0xffd24a, count = 10, speed = 4, life = 0.6, up = 2, size = 1 } = {}) {
    for (let i = 0; i < count; i += 1) {
      let p = pool.pop();
      if (!p) {
        p = { mesh: new THREE.Mesh(geo, matFor(color)), vel: new THREE.Vector3(), life: 0, maxLife: 1 };
        scene.add(p.mesh);
      }
      p.mesh.material = matFor(color);
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.scale.setScalar(size);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      p.vel.set(Math.cos(a) * r, Math.random() * up + 1, Math.sin(a) * r);
      p.life = life * (0.6 + Math.random() * 0.7);
      p.maxLife = p.life;
      active.push(p);
    }
  }

  function addSkid(pos, heading) {
    if (skidMarks.length > 220) {
      const old = skidMarks.shift();
      scene.remove(old.mesh);
    }
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 1.4),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -heading;
    mesh.position.set(pos.x, 0.06, pos.z);
    scene.add(mesh);
    skidMarks.push({ mesh, life: 14 });
  }

  function floatText(worldPos, text, color = '#ffffff') {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.color = color;
    floatLayer.appendChild(el);
    floats.push({ el, pos: worldPos.clone(), life: 1.4 });
  }

  function ensureRain() {
    if (rain) return;
    const count = 900;
    rainPositions = new Float32Array(count * 3);
    const geoRain = new THREE.BufferGeometry();
    geoRain.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    rain = new THREE.Points(geoRain, new THREE.PointsMaterial({ color: 0xa8c4d8, size: 0.35, transparent: true, opacity: 0.6 }));
    rain.visible = false;
    rain.frustumCulled = false;
    scene.add(rain);
    for (let i = 0; i < count; i += 1) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 90;
      rainPositions[i * 3 + 1] = Math.random() * 35;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
  }

  function update(dt, focus, rainAmount) {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      const p = active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        pool.push(p);
        active.splice(i, 1);
        continue;
      }
      p.vel.y -= 9 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.y += dt * 3;
    }
    for (let i = skidMarks.length - 1; i >= 0; i -= 1) {
      const s = skidMarks[i];
      s.life -= dt;
      if (s.life < 3) s.mesh.material.opacity = Math.max(0, s.life / 3) * 0.55;
      if (s.life <= 0) {
        scene.remove(s.mesh);
        skidMarks.splice(i, 1);
      }
    }
    const v = new THREE.Vector3();
    for (let i = floats.length - 1; i >= 0; i -= 1) {
      const f = floats[i];
      f.life -= dt;
      f.pos.y += dt * 1.2;
      if (f.life <= 0) {
        f.el.remove();
        floats.splice(i, 1);
        continue;
      }
      v.copy(f.pos).project(camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      f.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
      f.el.style.opacity = String(Math.min(1, f.life));
    }
    ensureRain();
    if (rainAmount > 0.02 && focus) {
      rain.visible = true;
      rain.position.set(focus.x, 0, focus.z);
      rain.material.opacity = 0.6 * rainAmount;
      const count = rainPositions.length / 3;
      for (let i = 0; i < count; i += 1) {
        rainPositions[i * 3 + 1] -= dt * 26;
        if (rainPositions[i * 3 + 1] < 0) {
          rainPositions[i * 3 + 1] = 30 + Math.random() * 6;
          rainPositions[i * 3] = (Math.random() - 0.5) * 90;
          rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
        }
      }
      rain.geometry.attributes.position.needsUpdate = true;
    } else if (rain) {
      rain.visible = false;
    }
  }

  return { spawn, addSkid, floatText, update };
}
