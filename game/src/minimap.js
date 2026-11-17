// The minimap: a small live map of Kota Sinar in the top-right corner. Roads,
// district tint, the player arrow, the active order's pickup and destination,
// police cars, closures, and landmarks. Everything is drawn from the same state
// the game uses, so the map can never disagree with the world.

import { WORLD, PALETTE } from './config.js';

export const MINIMAP = { width: 200, height: 150 };

export function drawMinimap(ctx, x, y, game) {
  const { width, height } = MINIMAP;
  const sx = width / WORLD.width;
  const sy = height / WORLD.height;
  const city = game.city;

  ctx.save();
  ctx.fillStyle = 'rgba(20, 18, 16, 0.85)';
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, width - 4, height - 4, 6);
  ctx.clip();

  // District tint.
  ctx.fillStyle = '#7d8f57';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = 'rgba(217, 164, 65, 0.25)';
  ctx.fillRect(x, y, 1200 * sx, 1950 * sy);
  ctx.fillStyle = 'rgba(58, 123, 213, 0.22)';
  ctx.fillRect(x + 1200 * sx, y, 1200 * sx, 1950 * sy);
  ctx.fillStyle = 'rgba(46, 158, 107, 0.22)';
  ctx.fillRect(x + 2400 * sx, y, 1200 * sx, 1950 * sy);
  ctx.fillStyle = 'rgba(194, 46, 61, 0.22)';
  ctx.fillRect(x, y + 1950 * sy, width, height - 1950 * sy);

  // Roads.
  ctx.strokeStyle = '#5d5a55';
  ctx.lineWidth = 3;
  for (const rx of city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(x + rx * sx, y);
    ctx.lineTo(x + rx * sx, y + height);
    ctx.stroke();
  }
  for (const ry of city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(x, y + ry * sy);
    ctx.lineTo(x + width, y + ry * sy);
    ctx.stroke();
  }

  // Closures, in red.
  for (const c of city.closures) {
    ctx.fillStyle = 'rgba(255, 71, 87, 0.8)';
    ctx.fillRect(x + c.x * sx, y + c.y * sy, Math.max(4, c.w * sx), Math.max(4, c.h * sy));
  }

  // Landmarks.
  ctx.fillStyle = PALETTE.gold;
  for (const landmark of Object.values(city.landmarks)) {
    ctx.beginPath();
    ctx.arc(x + landmark.x * sx, y + landmark.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Police cars, blue.
  ctx.fillStyle = PALETTE.blue;
  for (const car of game.police.cars) {
    ctx.beginPath();
    ctx.arc(x + car.x * sx, y + car.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // The active order: green pickup, gold destination.
  const order = game.orders.active;
  if (order) {
    ctx.fillStyle = PALETTE.green;
    ctx.beginPath();
    ctx.arc(x + order.pickup.x * sx, y + order.pickup.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(x + order.dest.x * sx, y + order.dest.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // The player, a white arrow pointing the way he faces.
  const player = game.player;
  ctx.save();
  ctx.translate(x + player.x * sx, y + player.y * sy);
  ctx.rotate(player.angle);
  ctx.fillStyle = PALETTE.white;
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
