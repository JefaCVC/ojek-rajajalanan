// OJEK! King of the Streets — the minimap: a north-up canvas centred on the
// player, showing roads, the river, the order target, police, the
// helicopter, road events, landmarks and the parked bike. drawFull renders
// the same view for the whole city on any canvas (the Map tab).

import { CITY, LANDMARKS } from './config.js';

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const RANGE = 130; // metres shown from centre to edge

  function drawOn(c, w, h, state, opts = {}) {
    const range = opts.range || RANGE;
    const cx = opts.centerX ?? state.playerPos.x;
    const cz = opts.centerZ ?? state.playerPos.z;
    const { playerPos, heading, target, police, events, storyDest, ownBike, traffic, surgeZones } = state;
    function toScreen(x, z) {
      const s = w / (range * 2);
      return [w / 2 + (x - cx) * s, h / 2 + (z - cz) * s];
    }
    c.clearRect(0, 0, w, h);
    // Base: dark city ground.
    c.fillStyle = '#1d2733';
    c.fillRect(0, 0, w, h);
    // Roads.
    c.strokeStyle = '#4a5568';
    c.lineWidth = Math.max(2, (CITY.road / (range * 2)) * w);
    c.beginPath();
    for (let i = 0; i <= CITY.blocksX; i += 1) {
      const line = CITY.roadLine(i);
      const [x0] = toScreen(line, 0);
      const [, z0] = toScreen(0, line);
      c.moveTo(x0, 0);
      c.lineTo(x0, h);
      c.moveTo(0, z0);
      c.lineTo(w, z0);
    }
    c.stroke();
    // River strip.
    const rx0 = CITY.roadLine(9) + 12;
    const rx1 = CITY.roadLine(10) - 12;
    const [rxa] = toScreen(rx0, 0);
    const [rxb] = toScreen(rx1, 0);
    c.fillStyle = '#2e6da8';
    c.fillRect(rxa, 0, rxb - rxa, h);
    // Surge zones (Surge Sense only): pulsing gold rings where fares spike.
    if (surgeZones) {
      const pulse = 1 + Math.sin(Date.now() / 300) * 0.08;
      for (const zn of surgeZones) {
        const [x, y] = toScreen(zn.x, zn.z);
        const r = (zn.r / (range * 2)) * w * pulse;
        c.fillStyle = 'rgba(255, 210, 74, 0.14)';
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255, 210, 74, 0.8)';
        c.lineWidth = 2;
        c.stroke();
      }
    }
    // Landmarks: dealer (D), garage (G), gas (S).
    const marks = [
      [LANDMARKS.dealer, '#ffd24a', 'D'],
      [LANDMARKS.garage, '#9ad4e8', 'G'],
      [LANDMARKS.gasA, '#ff8a5a', 'S'],
      [LANDMARKS.gasB, '#ff8a5a', 'S'],
    ];
    c.font = 'bold 11px Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const [lm, color, letter] of marks) {
      const [x, y] = toScreen(lm.x, lm.z);
      if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;
      c.fillStyle = color;
      c.beginPath();
      c.arc(x, y, 8, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1d2733';
      c.fillText(letter, x, y + 0.5);
    }
    // Road events.
    for (const ev of events || []) {
      const [x, y] = toScreen(ev.x, ev.z);
      c.fillStyle = '#ff8a2a';
      c.beginPath();
      c.arc(x, y, 6, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.5;
      c.stroke();
    }
    // Traffic (faint dots).
    if (traffic) {
      c.fillStyle = 'rgba(200,200,200,0.5)';
      for (const v of traffic.vehicles) {
        const p = traffic.vehiclePos(v);
        const [x, y] = toScreen(p.x, p.z);
        if (x < 0 || x > w || y < 0 || y > h) continue;
        c.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
    // Police cars + helicopter.
    if (police) {
      for (const car of police.cars) {
        const [x, y] = toScreen(car.pos.x, car.pos.z);
        c.fillStyle = '#3a8aff';
        c.beginPath();
        c.arc(x, y, 5, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1;
        c.stroke();
      }
      if (police.helicopter) {
        const hp = police.helicopter.group.position;
        const [x, y] = toScreen(hp.x, hp.z);
        c.fillStyle = '#3a8aff';
        c.beginPath();
        c.arc(x, y, 7, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 2;
        c.stroke();
      }
    }
    // Own parked bike.
    if (ownBike) {
      const [x, y] = toScreen(ownBike.x, ownBike.z);
      c.fillStyle = '#2eff8a';
      c.fillRect(x - 4, y - 4, 8, 8);
    }
    // Order target + story destination.
    const pulse = 6 + Math.sin(Date.now() / 250) * 1.5;
    if (target) {
      const [x, y] = toScreen(target.x, target.z);
      const clampedX = Math.max(10, Math.min(w - 10, x));
      const clampedY = Math.max(10, Math.min(h - 10, y));
      c.fillStyle = '#2eff8a';
      c.beginPath();
      c.arc(clampedX, clampedY, pulse, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      c.stroke();
    }
    if (storyDest) {
      const [x, y] = toScreen(storyDest.x, storyDest.z);
      const clampedX = Math.max(10, Math.min(w - 10, x));
      const clampedY = Math.max(10, Math.min(h - 10, y));
      c.fillStyle = '#ff5a5a';
      c.beginPath();
      c.arc(clampedX, clampedY, pulse, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      c.stroke();
    }
    // Player arrow, rotated by heading.
    const [px, py] = toScreen(playerPos.x, playerPos.z);
    c.save();
    c.translate(px, py);
    c.rotate(heading);
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#1d2733';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -9);
    c.lineTo(6, 7);
    c.lineTo(-6, 7);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
    // Border ring.
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 2;
    c.strokeRect(1, 1, w - 2, h - 2);
  }

  function draw(state) {
    drawOn(ctx, W, H, state);
  }

  // Whole-city map on any canvas (the Map tab in the phone menu).
  function drawFull(targetCanvas, state) {
    const c = targetCanvas.getContext('2d');
    drawOn(c, targetCanvas.width, targetCanvas.height, state, {
      range: CITY.size / 2 + 20,
      centerX: 0,
      centerZ: 0,
    });
  }

  return { draw, drawFull };
}
