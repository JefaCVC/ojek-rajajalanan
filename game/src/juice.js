// Presentation only (juice-vfx/punchy): hit sparks, screen shake, skid marks,
// speed lines, and rain. Every effect is spawned by an authoritative gameplay
// event and never changes gameplay state. Particles live in a fixed-capacity ring
// buffer, so a burst of hits cannot allocate without bound.
//
// Hit-stop lives here too, as a per-actor clock freeze: the attacker and the
// victim each pause for their own authored tick count, while the world and every
// other actor keep running (action-feel/short-special).

import { JUICE } from './config.js';

export function createJuice() {
  const particles = [];
  const skids = [];
  const rain = [];
  let shakeTime = 0;
  let shakePower = 0;
  let shakeX = 0;
  let shakeY = 0;

  function spawnParticle(particle) {
    if (particles.length >= JUICE.maxParticles) particles.shift();
    particles.push(particle);
  }

  return {
    /** A burst of sparks at a contact point, flying along the hit direction. */
    hitSparks(x, y, angle, heavy) {
      const count = heavy ? 14 : 8;
      for (let i = 0; i < count; i += 1) {
        const spread = (Math.random() - 0.5) * 1.4;
        const speed = 120 + Math.random() * (heavy ? 260 : 140);
        spawnParticle({
          x, y,
          vx: Math.cos(angle + spread) * speed,
          vy: Math.sin(angle + spread) * speed,
          life: 0.25 + Math.random() * 0.2,
          maxLife: 0.45,
          size: heavy ? 3.5 : 2.5,
          color: heavy ? '#ffd94a' : '#ffffff',
        });
      }
    },
    /** A puff of dust or exhaust at a point. */
    puff(x, y, color) {
      spawnParticle({
        x, y,
        vx: (Math.random() - 0.5) * 30,
        vy: -20 - Math.random() * 30,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 4 + Math.random() * 4,
        color: color || '#c9bda6',
      });
    },
    /** Cash notes flying up from a delivery. */
    cashBurst(x, y) {
      for (let i = 0; i < 10; i += 1) {
        spawnParticle({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 80,
          vy: -80 - Math.random() * 120,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          size: 4,
          color: '#3ecf6e',
        });
      }
    },
    /** A skid mark segment left by a hard turn or stop. */
    skidMark(x, y, angle) {
      if (skids.length >= JUICE.maxSkidMarks) skids.shift();
      skids.push({ x, y, angle, life: 6 });
    },
    /** Starts a camera shake. Power is in pixels; stronger hits shake harder. */
    shake(power, seconds) {
      shakePower = Math.min(JUICE.shakeMax, Math.max(shakePower, power));
      shakeTime = Math.max(shakeTime, seconds);
    },
    get shakeOffset() { return { x: shakeX, y: shakeY }; },
    get particleCount() { return particles.length; },
    get skidCount() { return skids.length; },

    update(dt) {
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
      for (let i = skids.length - 1; i >= 0; i -= 1) {
        skids[i].life -= dt;
        if (skids[i].life <= 0) skids.splice(i, 1);
      }
      if (shakeTime > 0) {
        shakeTime -= dt;
        const decay = Math.max(0, shakeTime / 0.3);
        shakeX = (Math.random() - 0.5) * 2 * shakePower * decay;
        shakeY = (Math.random() - 0.5) * 2 * shakePower * decay;
        if (shakeTime <= 0) { shakeX = 0; shakeY = 0; shakePower = 0; }
      }
    },

    /** Rain follows the camera: only drops near the view are simulated. */
    updateRain(dt, raining, camX, camY, viewW, viewH) {
      if (!raining) { rain.length = 0; return; }
      while (rain.length < JUICE.maxRainDrops) {
        rain.push({
          x: camX + Math.random() * viewW,
          y: camY + Math.random() * viewH,
          speed: 700 + Math.random() * 300,
        });
      }
      for (const drop of rain) {
        drop.y += drop.speed * dt;
        drop.x -= drop.speed * 0.15 * dt;
        if (drop.y > camY + viewH) {
          drop.y = camY - 10;
          drop.x = camX + Math.random() * viewW;
        }
      }
    },

    drawWorld(ctx, camX, camY, viewW, viewH) {
      for (const skid of skids) {
        if (skid.x < camX - 20 || skid.x > camX + viewW + 20 || skid.y < camY - 20 || skid.y > camY + viewH + 20) continue;
        ctx.save();
        ctx.translate(skid.x, skid.y);
        ctx.rotate(skid.angle);
        ctx.globalAlpha = Math.min(0.5, skid.life / 6 * 0.5);
        ctx.fillStyle = '#2a2724';
        ctx.fillRect(-8, -2, 16, 4);
        ctx.restore();
      }
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    drawRain(ctx) {
      if (rain.length === 0) return;
      ctx.strokeStyle = 'rgba(170, 200, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const drop of rain) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 3, drop.y + 14);
      }
      ctx.stroke();
    },

    /** Speed lines at the screen edges when the bike is fast. */
    drawSpeedLines(ctx, speed, width, height) {
      if (speed < JUICE.speedLineMinSpeed) return;
      const strength = Math.min(1, (speed - JUICE.speedLineMinSpeed) / 300);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * strength})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const y = ((i * 173 + Math.floor(performance.now() / 16) * 60) % (height + 80)) - 40;
        const len = 30 + (i % 3) * 25;
        ctx.moveTo(width - 12, y);
        ctx.lineTo(width - 12 - len, y);
        ctx.moveTo(12, height - y);
        ctx.lineTo(12 + len, height - y);
      }
      ctx.stroke();
    },
  };
}
