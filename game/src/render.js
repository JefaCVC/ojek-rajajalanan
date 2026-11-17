// Rendering: the city, the actors, the weather and day light, and the HUD.
// The world is drawn in world coordinates under a camera that follows the player
// with a look-ahead; the HUD is drawn in screen coordinates on top, following the
// documented 4-unit spacing scale. Nothing is drawn outside its own box: every
// panel measures its text before it paints it.

import { FIELD, WORLD, PALETTE, SPACE, FONT, FUEL } from './config.js';
import { ROAD_HALF } from './city.js';
import { formatRupiah, formatDistance, formatClock, TEXT } from './text.js';
import { drawMinimap, MINIMAP } from './minimap.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const camera = { x: 0, y: 0 };

  function updateCamera(player, dt) {
    const lookX = player.x + Math.cos(player.angle) * 90;
    const lookY = player.y + Math.sin(player.angle) * 90;
    const targetX = lookX - FIELD.width / 2;
    const targetY = lookY - FIELD.height / 2;
    const t = Math.min(1, 6 * dt);
    camera.x += (targetX - camera.x) * t;
    camera.y += (targetY - camera.y) * t;
    camera.x = Math.max(0, Math.min(WORLD.width - FIELD.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD.height - FIELD.height, camera.y));
  }

  function drawGround(game) {
    const city = game.city;
    const camX = camera.x;
    const camY = camera.y;
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(camX, camY, FIELD.width, FIELD.height);

    // Sidewalks: pale strips along every road.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of city.roadsX) {
      ctx.fillRect(rx - ROAD_HALF - 22, camY, (ROAD_HALF + 22) * 2, FIELD.height);
    }
    for (const ry of city.roadsY) {
      ctx.fillRect(camX, ry - ROAD_HALF - 22, FIELD.width, (ROAD_HALF + 22) * 2);
    }

    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const rx of city.roadsX) {
      ctx.fillRect(rx - ROAD_HALF, camY, ROAD_HALF * 2, FIELD.height);
    }
    for (const ry of city.roadsY) {
      ctx.fillRect(camX, ry - ROAD_HALF, FIELD.width, ROAD_HALF * 2);
    }

    // Dashed centre lines.
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    for (const rx of city.roadsX) {
      if (rx < camX - 10 || rx > camX + FIELD.width + 10) continue;
      ctx.beginPath();
      ctx.moveTo(rx, camY);
      ctx.lineTo(rx, camY + FIELD.height);
      ctx.stroke();
    }
    for (const ry of city.roadsY) {
      if (ry < camY - 10 || ry > camY + FIELD.height + 10) continue;
      ctx.beginPath();
      ctx.moveTo(camX, ry);
      ctx.lineTo(camX + FIELD.width, ry);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Zebra crossings at lit intersections.
    ctx.fillStyle = 'rgba(247, 242, 231, 0.75)';
    for (const light of city.lights) {
      for (let i = -3; i <= 3; i += 1) {
        ctx.fillRect(light.x + i * 12 - 4, light.y - ROAD_HALF - 12, 8, 10);
        ctx.fillRect(light.x + i * 12 - 4, light.y + ROAD_HALF + 2, 8, 10);
      }
    }
  }

  function drawClosures(game) {
    for (const c of game.city.closures) {
      if (c.kind === 'banjir') {
        ctx.fillStyle = 'rgba(58, 123, 213, 0.55)';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i += 1) {
          const y = c.y + 14 + i * (c.h / 5);
          ctx.beginPath();
          ctx.moveTo(c.x + 10, y);
          ctx.lineTo(c.x + c.w - 10, y);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = 'rgba(255, 71, 87, 0.35)';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = '#ff4757';
        ctx.font = `bold 16px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(c.kind === 'demo' ? 'DEMO' : 'KECELAKAAN', c.x + c.w / 2, c.y + c.h / 2 + 6);
      }
    }
  }

  function drawBuildings(game) {
    const camX = camera.x;
    const camY = camera.y;
    for (const b of game.city.buildings) {
      if (b.x > camX + FIELD.width + 60 || b.x + b.w < camX - 60 || b.y > camY + FIELD.height + 60 || b.y + b.h < camY - 60) continue;
      // Shadow, cast to the south-east by the afternoon sun.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(b.x + 10, b.y + b.height * 0.4, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, 10);
      // Windows.
      ctx.fillStyle = 'rgba(40, 50, 70, 0.55)';
      const cols = Math.max(1, Math.floor(b.w / 26));
      const rows = Math.max(1, Math.floor((b.h - 14) / 24));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          ctx.fillRect(b.x + 8 + i * 26, b.y + 16 + j * 24, 12, 12);
        }
      }
      if (b.type === 'mosque') {
        ctx.fillStyle = b.roof;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 26, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(b.x + b.w / 2 - 2, b.y + b.h / 2 - 34, 4, 10);
      }
      if (b.name) {
        // The name sits inside the building, so it can never collide with the
        // name of the building next door.
        ctx.font = `bold 12px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(20, 16, 10, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 4, b.w - 8);
        ctx.fillStyle = PALETTE.white;
        ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 4, b.w - 8);
      }
    }
  }

  function drawProps(game) {
    const camX = camera.x;
    const camY = camera.y;
    for (const tree of game.city.trees) {
      if (tree.x < camX - 30 || tree.x > camX + FIELD.width + 30 || tree.y < camY - 30 || tree.y > camY + FIELD.height + 30) continue;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.ellipse(tree.x + 6, tree.y + 8, tree.r, tree.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f6b4f';
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a8a63';
      ctx.beginPath();
      ctx.arc(tree.x - tree.r * 0.3, tree.y - tree.r * 0.3, tree.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const lamp of game.city.lamps) {
      if (lamp.x < camX - 10 || lamp.x > camX + FIELD.width + 10 || lamp.y < camY - 10 || lamp.y > camY + FIELD.height + 10) continue;
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
      if (game.day.night) {
        ctx.fillStyle = 'rgba(255, 217, 74, 0.25)';
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd94a';
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const board of game.city.billboards) {
      if (board.x < camX - 140 || board.x > camX + FIELD.width + 20 || board.y < camY - 60 || board.y > camY + FIELD.height + 20) continue;
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(board.x + board.w / 2 - 3, board.y + board.h, 6, 26);
      ctx.fillStyle = board.color;
      ctx.fillRect(board.x, board.y, board.w, board.h);
      ctx.fillStyle = PALETTE.white;
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(board.text, board.x + board.w / 2, board.y + board.h / 2 + 5, board.w - 8);
    }
    for (const cart of game.city.carts) {
      if (cart.x < camX - 30 || cart.x > camX + FIELD.width + 30 || cart.y < camY - 30 || cart.y > camY + FIELD.height + 30) continue;
      ctx.fillStyle = cart.color;
      ctx.fillRect(cart.x - 14, cart.y - 10, 28, 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(cart.x - 16, cart.y - 14, 32, 6);
    }
  }

  function drawTrafficLights(game) {
    for (const light of game.city.lights) {
      ctx.fillStyle = '#2a2724';
      ctx.fillRect(light.x - 6, light.y - ROAD_HALF - 22, 12, 22);
      const red = light.state === 'green' ? '#5a2a2a' : '#ff4757';
      const green = light.state === 'green' ? '#3ecf6e' : '#2a4a2a';
      ctx.fillStyle = red;
      ctx.beginPath();
      ctx.arc(light.x, light.y - ROAD_HALF - 16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light.state === 'yellow' ? '#ffd94a' : '#5a4a2a';
      ctx.beginPath();
      ctx.arc(light.x, light.y - ROAD_HALF - 9, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = green;
      ctx.beginPath();
      ctx.arc(light.x, light.y - ROAD_HALF - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVehicleShape(x, y, angle, kind, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (kind === 'bike') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-16, -6, 32, 12, 4);
      ctx.fill();
      ctx.fillStyle = '#2a2724';
      ctx.beginPath();
      ctx.arc(-10, 0, 5, 0, Math.PI * 2);
      ctx.arc(11, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'bajaj') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-14, -10, 28, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#2a2724';
      ctx.fillRect(-12, -8, 8, 16);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-22, -11, 44, 22, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(180, 210, 235, 0.9)';
      ctx.fillRect(-8, -8, 14, 16);
      ctx.fillStyle = '#2a2724';
      ctx.fillRect(-20, -13, 8, 4);
      ctx.fillRect(-20, 9, 8, 4);
      ctx.fillRect(12, -13, 8, 4);
      ctx.fillRect(12, 9, 8, 4);
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, color, waving, phase) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const bob = Math.sin(phase) * 1.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, bob, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(4, bob, 5, 0, Math.PI * 2);
    ctx.fill();
    if (waving) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, bob - 6);
      ctx.lineTo(-8, bob - 14 + Math.sin(phase * 3) * 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawActors(game) {
    for (const vehicle of game.vehicles.parked) {
      if (vehicle.taken) continue;
      drawVehicleShape(vehicle.x, vehicle.y, vehicle.angle, vehicle.kind, vehicle.color);
    }
    for (const car of game.traffic.cars) {
      const angle = car.vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
      drawVehicleShape(car.x, car.y, angle, car.kind, car.color);
    }
    for (const ped of game.traffic.pedestrians) {
      const angle = Math.atan2(ped.targetY - ped.y, ped.targetX - ped.x);
      drawPerson(ped.x, ped.y, angle, ped.color, ped.waving, ped.phase);
    }
    for (const enemy of game.combat.enemies) {
      const flashing = enemy.stunTicks > 0 && Math.floor(enemy.stunTicks / 2) % 2 === 0;
      drawPerson(enemy.x, enemy.y, enemy.angle, flashing ? '#ffffff' : (enemy.kind === 'begal' ? '#3a3a3a' : '#8a2e2e'), false, enemy.x * 0.1);
      // Health pips above the head.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(enemy.x - 14, enemy.y - 26, 28, 6);
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(enemy.x - 13, enemy.y - 25, 26 * (enemy.health / enemy.maxHealth), 4);
      if (enemy.state === 'attack') {
        ctx.strokeStyle = 'rgba(255, 71, 87, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 20 + (24 - enemy.windupTicks), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    for (const car of game.police.cars) {
      drawVehicleShape(car.x, car.y, car.angle, 'car', '#e8e8e8');
      ctx.fillStyle = Math.sin(car.siren) > 0 ? '#ff4757' : '#4aa8ff';
      ctx.beginPath();
      ctx.arc(car.x, car.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // The active order's pickup and destination markers.
    const order = game.orders.active;
    if (order) {
      const target = order.state === 'to-pickup' ? order.pickup : order.dest;
      const pulse = 1 + Math.sin(game.time * 4) * 0.15;
      ctx.strokeStyle = order.state === 'to-pickup' ? PALETTE.green : PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 26 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = order.state === 'to-pickup' ? PALETTE.green : PALETTE.gold;
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(order.state === 'to-pickup' ? 'JEMPUT' : 'ANTAR', target.x, target.y - 32);
    }
    // The player, with a soft ring so he is always findable at a glance.
    const player = game.player;
    const ringPulse = 1 + Math.sin(game.time * 3) * 0.08;
    ctx.strokeStyle = 'rgba(255, 176, 32, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 24 * ringPulse, 0, Math.PI * 2);
    ctx.stroke();
    if (player.onBike) {
      const color = player.borrowed ? player.borrowed.color : game.garage.currentDef.color;
      drawVehicleShape(player.x, player.y, player.angle, player.borrowed ? player.borrowed.kind : 'bike', color);
      ctx.fillStyle = '#ffb020';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 6, 0, Math.PI * 2);
      ctx.fill();
      if (game.orders.active && game.orders.active.state === 'to-dest' && game.orders.active.type !== 'paket') {
        ctx.fillStyle = '#e87ab0';
        ctx.beginPath();
        ctx.arc(player.x - Math.cos(player.angle) * 14, player.y - Math.sin(player.angle) * 14, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawPerson(player.x, player.y, player.angle, '#ffb020', false, game.time * 6);
      if (game.punch.phase === 'active') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 30, player.angle - 0.7, player.angle + 0.7);
        ctx.stroke();
      }
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = 'rgba(255, 176, 32, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
  }

  function drawHud(game) {
    const player = game.player;
    const rank = player.rank(game.orders.storyDone);
    // Top-left: money, rank, level, XP, rating.
    const leftW = 300;
    panel(SPACE.l, SPACE.l, leftW, 118);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = PALETTE.green;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(formatRupiah(player.money), SPACE.l + SPACE.m, SPACE.l + SPACE.s);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(rank.name, SPACE.l + SPACE.m, SPACE.l + 36);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`Level ${player.level}`, SPACE.l + SPACE.m + 150, SPACE.l + 37);
    // XP bar.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(SPACE.l + SPACE.m, SPACE.l + 60, leftW - SPACE.m * 2, 8);
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(SPACE.l + SPACE.m, SPACE.l + 60, (leftW - SPACE.m * 2) * Math.min(1, player.xp / player.xpNext), 8);
    // Rating, prominent: stars plus the number.
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 16px ${FONT}`;
    const ratingText = '★'.repeat(Math.round(player.rating)) + '☆'.repeat(5 - Math.round(player.rating));
    ctx.fillText(ratingText, SPACE.l + SPACE.m, SPACE.l + 76);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(player.rating.toFixed(1), SPACE.l + SPACE.m + 108, SPACE.l + 76);
    if (game.orders.streak > 1) {
      ctx.fillStyle = PALETTE.accent;
      ctx.font = `bold 13px ${FONT}`;
      ctx.fillText(`${game.orders.streak}x beruntun`, SPACE.l + SPACE.m + 150, SPACE.l + 78);
    }

    // Top-centre: clock, shift, weather.
    const clockText = `${formatClock(game.day.hour)}  ${game.day.shift.name}  ${game.day.weather.name}`;
    if (game.day.rush) ctx.fillStyle = PALETTE.red;
    ctx.font = `bold 15px ${FONT}`;
    const clockW = ctx.measureText(clockText).width + SPACE.xl;
    panel((FIELD.width - clockW) / 2, SPACE.l, clockW, 30);
    ctx.fillStyle = game.day.rush ? PALETTE.red : PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(clockText, FIELD.width / 2, SPACE.l + 7);

    // Wanted stars, under the clock.
    if (game.police.wanted > 0) {
      ctx.font = `bold 22px ${FONT}`;
      ctx.fillStyle = PALETTE.gold;
      ctx.textAlign = 'center';
      ctx.fillText('★'.repeat(game.police.wanted) + '☆'.repeat(5 - game.police.wanted), FIELD.width / 2, SPACE.l + 40);
      if (game.police.bustProgress > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(FIELD.width / 2 - 60, SPACE.l + 68, 120, 8);
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(FIELD.width / 2 - 60, SPACE.l + 68, 120 * game.police.bustProgress, 8);
      }
    }

    // Minimap, top-right.
    drawMinimap(ctx, FIELD.width - SPACE.l - MINIMAP.width, SPACE.l, game);

    // Bottom-left: health hearts and the controls hint.
    panel(SPACE.l, FIELD.height - SPACE.l - 52, 300, 52);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.red;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText('♥'.repeat(player.health) + '♡'.repeat(5 - player.health), SPACE.l + SPACE.m, FIELD.height - SPACE.l - 44);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(TEXT.controlsHint, SPACE.l + SPACE.m, FIELD.height - SPACE.l - 20);

    // Bottom-right: speed and fuel on a bike.
    if (player.onBike) {
      panel(FIELD.width - SPACE.l - 200, FIELD.height - SPACE.l - 52, 200, 52);
      const kmh = Math.round(Math.abs(player.speed) * 0.12);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${kmh} km/j`, FIELD.width - SPACE.l - SPACE.m, FIELD.height - SPACE.l - 42);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(FIELD.width - SPACE.l - 200 + SPACE.m, FIELD.height - SPACE.l - 18, 200 - SPACE.m * 2, 8);
      ctx.fillStyle = player.fuel < 20 ? PALETTE.red : PALETTE.green;
      ctx.fillRect(FIELD.width - SPACE.l - 200 + SPACE.m, FIELD.height - SPACE.l - 18, (200 - SPACE.m * 2) * (player.fuel / FUEL.max), 8);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(TEXT.fuel, FIELD.width - SPACE.l - 200 + SPACE.m, FIELD.height - SPACE.l - 34);
    }

    // Bottom-centre: the active order card.
    const order = game.orders.active;
    if (order) {
      const target = order.state === 'to-pickup' ? order.pickup : order.dest;
      const dist = Math.abs(player.x - target.x) + Math.abs(player.y - target.y);
      const label = order.state === 'to-pickup' ? `${TEXT.pickup}: ${order.pickupName}` : `${TEXT.deliver}: ${order.destName}`;
      const line2 = `${formatDistance(dist)}  •  ${formatRupiah(order.fare)}${order.timeLeft < 30 ? `  •  ${Math.max(0, Math.ceil(order.timeLeft))} detik` : ''}`;
      ctx.font = `bold 15px ${FONT}`;
      const w = Math.max(ctx.measureText(label).width, ctx.measureText(line2).width) + SPACE.xl * 2;
      const cardW = Math.min(w, 520);
      const cardX = (FIELD.width - cardW) / 2;
      const cardY = FIELD.height - SPACE.l - 76;
      panel(cardX, cardY, cardW, 60);
      ctx.fillStyle = PALETTE.text;
      ctx.textAlign = 'center';
      ctx.fillText(label, FIELD.width / 2, cardY + SPACE.s, cardW - SPACE.xl);
      ctx.fillStyle = order.timeLeft < 30 ? PALETTE.red : PALETTE.green;
      ctx.font = `13px ${FONT}`;
      ctx.fillText(line2, FIELD.width / 2, cardY + 32);
    }

    // Interaction prompt, above the player.
    if (game.prompt) {
      ctx.font = `bold 14px ${FONT}`;
      const text = `${TEXT.pressE} ${game.prompt}`;
      const w = ctx.measureText(text).width + SPACE.xl;
      panel((FIELD.width - w) / 2, FIELD.height - 170, w, 30);
      ctx.fillStyle = PALETTE.text;
      ctx.textAlign = 'center';
      ctx.fillText(text, FIELD.width / 2, FIELD.height - 163);
    }

    // Toasts, stacked under the clock.
    let toastY = SPACE.l + 100;
    ctx.textAlign = 'center';
    for (const toast of game.toasts) {
      ctx.font = `bold 14px ${FONT}`;
      const w = ctx.measureText(toast.text).width + SPACE.xl;
      ctx.globalAlpha = Math.min(1, toast.timeLeft);
      panel((FIELD.width - w) / 2, toastY, w, 30);
      ctx.fillStyle = toast.color || PALETTE.text;
      ctx.fillText(toast.text, FIELD.width / 2, toastY + 7);
      ctx.globalAlpha = 1;
      toastY += 38;
    }

    // Off-screen objective arrow.
    if (order) {
      const target = order.state === 'to-pickup' ? order.pickup : order.dest;
      const sx = target.x - camera.x;
      const sy = target.y - camera.y;
      if (sx < 0 || sx > FIELD.width || sy < 0 || sy > FIELD.height) {
        const cx = FIELD.width / 2;
        const cy = FIELD.height / 2;
        const angle = Math.atan2(sy - cy, sx - cx);
        const ax = cx + Math.cos(angle) * 260;
        const ay = cy + Math.sin(angle) * 170;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(angle);
        ctx.fillStyle = order.state === 'to-pickup' ? PALETTE.green : PALETTE.gold;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-8, -9);
        ctx.lineTo(-8, 9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawLighting(game) {
    const light = game.day.light;
    if (light >= 1) return;
    const darkness = (1 - light) * 0.5;
    ctx.fillStyle = `rgba(10, 14, 40, ${darkness})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (game.day.weather.id === 'mendung') {
      ctx.fillStyle = 'rgba(60, 70, 90, 0.12)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  return {
    get camera() { return camera; },
    render(game, dt) {
      updateCamera(game.player, dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PALETTE.ground;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      const shake = game.juice.shakeOffset;
      ctx.save();
      ctx.translate(-camera.x + shake.x, -camera.y + shake.y);
      drawGround(game);
      drawClosures(game);
      drawBuildings(game);
      drawProps(game);
      drawTrafficLights(game);
      drawActors(game);
      game.juice.drawWorld(ctx, camera.x, camera.y, FIELD.width, FIELD.height);
      ctx.restore();
      // Rain and speed lines live in screen space.
      ctx.save();
      ctx.translate(-camera.x, -camera.y);
      if (game.day.weather.id === 'hujan') game.juice.drawRain(ctx);
      ctx.restore();
      drawLighting(game);
      if (game.player.onBike) game.juice.drawSpeedLines(ctx, Math.abs(game.player.speed), FIELD.width, FIELD.height);
      // The title screen shows the city clean: no HUD under the menu.
      if (game.ui.screen !== 'title') drawHud(game);
    },
  };
}
