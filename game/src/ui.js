// Screens and menus, all drawn on the canvas: the title screen, pause, the
// order board, the dealer (bikes, upgrades, repairs), help, and the busted and
// knocked-out overlays. Every screen is a list of buttons with measured text;
// nothing is drawn outside its panel, and every click is tested against the same
// rectangles that were drawn. The rank ladder is shown on the title screen so
// the player always knows what the next rank unlocks.

import { FIELD, PALETTE, SPACE, FONT, BIKES, UPGRADES, RANKS } from './config.js';
import { TEXT, formatRupiah, formatDistance, ORDER_TYPES } from './text.js';

export function createUI() {
  let screen = 'title';
  let dealerTab = 'bikes';
  let selectedBike = null;
  const buttons = [];

  function addButton(id, x, y, w, h, label, enabled, action) {
    buttons.push({ id, x, y, w, h, label, enabled: enabled !== false, action });
  }

  function drawButton(ctx, button, mouse) {
    const hover = mouse.x >= button.x && mouse.x <= button.x + button.w && mouse.y >= button.y && mouse.y <= button.y + button.h;
    ctx.fillStyle = !button.enabled ? 'rgba(120, 110, 95, 0.7)' : hover ? '#ffb020' : 'rgba(255, 176, 32, 0.85)';
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.w, button.h, 6);
    ctx.fill();
    ctx.fillStyle = '#241d12';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.label, button.x + button.w / 2, button.y + button.h / 2 + 1, button.w - SPACE.m);
    ctx.textBaseline = 'top';
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
  }

  function title(ctx, game, mouse) {
    buttons.length = 0;
    const cx = FIELD.width / 2;
    ctx.fillStyle = 'rgba(20, 16, 10, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillText(TEXT.title, cx, 96);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillText(TEXT.subtitle, cx, 186);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText(TEXT.tagline, cx, 236);
    const bw = 280;
    const bx = cx - bw / 2;
    let by = 300;
    addButton('start', bx, by, bw, 46, game.hasSave ? TEXT.continue : TEXT.start, true, 'start');
    by += 58;
    addButton('howto', bx, by, bw, 46, TEXT.howTo, true, 'help');
    by += 58;
    addButton('sound', bx, by, bw, 46, game.audio.muted ? TEXT.soundOff : TEXT.soundOn, true, 'sound');
    for (const b of buttons) drawButton(ctx, b, mouse);
    // Rank ladder, so the goal is visible from the first screen.
    const rank = game.player.rank(game.orders.storyDone);
    const ladderY = 500;
    panel(ctx, cx - 340, ladderY, 680, 150);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${TEXT.rank}: ${rank.name}`, cx - 324, ladderY + SPACE.m);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(rank.blurb, cx - 324, ladderY + 36);
    const stepW = (680 - SPACE.xl * 2) / RANKS.length;
    RANKS.forEach((r, i) => {
      const x = cx - 340 + SPACE.l + i * stepW;
      const reached = RANKS.indexOf(rank) >= i;
      ctx.fillStyle = reached ? PALETTE.accent : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(x, ladderY + 66, stepW - SPACE.s, 10, 5);
      ctx.fill();
      ctx.fillStyle = reached ? PALETTE.text : PALETTE.muted;
      ctx.font = `11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(r.name, x + (stepW - SPACE.s) / 2, ladderY + 84, stepW - SPACE.s);
      ctx.fillText(`Lv ${r.level}`, x + (stepW - SPACE.s) / 2, ladderY + 102);
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT}`;
    ctx.fillText('Kota Sinar  •  ' + TEXT.controlsHint, cx, FIELD.height - 28);
  }

  function pause(ctx, game, mouse) {
    buttons.length = 0;
    ctx.fillStyle = 'rgba(10, 8, 6, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 420;
    const h = 330;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    panel(ctx, x, y, w, h);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(TEXT.pauseTitle, FIELD.width / 2, y + SPACE.xl);
    const bw = w - SPACE.xl * 2;
    let by = y + 70;
    addButton('resume', x + SPACE.xl, by, bw, 44, TEXT.resume, true, 'resume');
    by += 54;
    addButton('save', x + SPACE.xl, by, bw, 44, TEXT.saveGame, true, 'save');
    by += 54;
    addButton('help', x + SPACE.xl, by, bw, 44, TEXT.howTo, true, 'help');
    by += 54;
    addButton('menu', x + SPACE.xl, by, bw, 44, TEXT.mainMenu, true, 'menu');
    for (const b of buttons) drawButton(ctx, b, mouse);
  }

  function help(ctx, game, mouse) {
    buttons.length = 0;
    ctx.fillStyle = 'rgba(10, 8, 6, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 640;
    const h = 470;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    panel(ctx, x, y, w, h);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(TEXT.helpTitle, FIELD.width / 2, y + SPACE.xl);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `15px ${FONT}`;
    TEXT.helpLines.forEach((line, i) => {
      ctx.fillText(line, x + SPACE.xl, y + 70 + i * 30, w - SPACE.xl * 2);
    });
    addButton('back', x + SPACE.xl, y + h - 60, w - SPACE.xl * 2, 44, 'Kembali', true, 'back');
    for (const b of buttons) drawButton(ctx, b, mouse);
  }

  function orders(ctx, game, mouse) {
    buttons.length = 0;
    ctx.fillStyle = 'rgba(10, 8, 6, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 760;
    const h = 560;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    panel(ctx, x, y, w, h);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(TEXT.ordersTitle, x + SPACE.xl, y + SPACE.l);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(TEXT.ordersHint, x + SPACE.xl, y + 48);
    const board = game.orders.board;
    if (board.length === 0) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(TEXT.noOrders, FIELD.width / 2, y + h / 2);
    }
    const cardH = 64;
    const cardW = w - SPACE.xl * 2;
    board.slice(0, 6).forEach((order, i) => {
      const cy = y + 76 + i * (cardH + SPACE.s);
      const isStory = order.story;
      ctx.fillStyle = isStory ? 'rgba(255, 217, 74, 0.15)' : 'rgba(255, 255, 255, 0.06)';
      ctx.strokeStyle = isStory ? PALETTE.gold : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + SPACE.xl, cy, cardW, cardH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = isStory ? PALETTE.gold : PALETTE.text;
      ctx.font = `bold 16px ${FONT}`;
      const typeName = isStory ? TEXT.storyTitle : ORDER_TYPES[order.type].name;
      ctx.fillText(`${typeName} — ${order.name}`, x + SPACE.xl + SPACE.m, cy + SPACE.s, cardW - 170);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `13px ${FONT}`;
      ctx.fillText(`${TEXT.pickup}: ${order.pickupName}  →  ${order.destName}`, x + SPACE.xl + SPACE.m, cy + 28, cardW - 170);
      if (isStory) ctx.fillText(order.brief, x + SPACE.xl + SPACE.m, cy + 46, cardW - 170);
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText(formatDistance(order.distance), x + SPACE.xl + cardW - 130, cy + SPACE.s);
      ctx.fillStyle = PALETTE.green;
      ctx.fillText(formatRupiah(order.fare), x + SPACE.xl + cardW - 130, cy + 28);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `13px ${FONT}`;
      ctx.fillText(`★${order.rating}`, x + SPACE.xl + cardW - 130, cy + 46);
      addButton('order-' + order.id, x + SPACE.xl + cardW - 110, cy + 12, 96, 40, TEXT.accept, !game.orders.active, 'accept:' + order.id);
    });
    addButton('close', x + SPACE.xl, y + h - 56, w - SPACE.xl * 2, 40, 'Tutup (Q)', true, 'close');
    for (const b of buttons) drawButton(ctx, b, mouse);
  }

  function statBar(ctx, x, y, w, label, value, max) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + 80, y, w - 80, 8);
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(x + 80, y, (w - 80) * Math.min(1, value / max), 8);
  }

  function dealer(ctx, game, mouse) {
    buttons.length = 0;
    ctx.fillStyle = 'rgba(10, 8, 6, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 860;
    const h = 580;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    panel(ctx, x, y, w, h);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(TEXT.dealerTitle, x + SPACE.xl, y + SPACE.l);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(TEXT.dealerHint, x + SPACE.xl, y + 48);
    ctx.fillStyle = PALETTE.green;
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(game.player.money), x + w - SPACE.xl, y + SPACE.l + 4);

    // Tabs.
    const tabs = [['bikes', 'Motor'], ['upgrades', TEXT.upgradeTitle], ['repair', TEXT.repair]];
    tabs.forEach(([id, label], i) => {
      const tx = x + SPACE.xl + i * 150;
      ctx.fillStyle = dealerTab === id ? PALETTE.accent : 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(tx, y + 72, 138, 34, 6);
      ctx.fill();
      ctx.fillStyle = dealerTab === id ? '#241d12' : PALETTE.text;
      ctx.font = `bold 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, tx + 69, y + 90);
      ctx.textBaseline = 'top';
      addButton('tab-' + id, tx, y + 72, 138, 34, '', true, 'tab:' + id);
    });
    // Tab buttons keep their click rectangles; their labels are drawn by hand
    // above, and the draw loop below skips buttons with an empty label.

    if (dealerTab === 'bikes') {
      const cardW = (w - SPACE.xl * 2 - SPACE.m * 4) / 5;
      BIKES.forEach((bike, i) => {
        const cx = x + SPACE.xl + i * (cardW + SPACE.m);
        const cy = y + 122;
        const cardH = 380;
        const owned = game.garage.owns(bike.id);
        const current = game.garage.current === bike.id;
        const locked = game.player.level < bike.level;
        ctx.fillStyle = current ? 'rgba(255, 176, 32, 0.18)' : 'rgba(255, 255, 255, 0.06)';
        ctx.strokeStyle = current ? PALETTE.accent : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, cardH, 8);
        ctx.fill();
        ctx.stroke();
        // Bike swatch: the colour chip with a top-down bike silhouette.
        ctx.fillStyle = bike.color;
        ctx.beginPath();
        ctx.roundRect(cx + SPACE.m, cy + SPACE.m, cardW - SPACE.m * 2, 54, 6);
        ctx.fill();
        const midX = cx + cardW / 2;
        const midY = cy + SPACE.m + 27;
        ctx.fillStyle = '#2a2724';
        ctx.beginPath();
        ctx.arc(midX - 26, midY, 9, 0, Math.PI * 2);
        ctx.arc(midX + 26, midY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.roundRect(midX - 22, midY - 5, 44, 10, 4);
        ctx.fill();
        ctx.fillStyle = '#ffb020';
        ctx.beginPath();
        ctx.arc(midX - 6, midY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.white;
        ctx.font = `bold 14px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(bike.name, cx + cardW / 2, cy + 84, cardW - SPACE.m);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = `12px ${FONT}`;
        const words = bike.desc.split(' ');
        let line = '';
        let lineY = cy + 106;
        for (const word of words) {
          const test = line ? line + ' ' + word : word;
          if (ctx.measureText(test).width > cardW - SPACE.m * 2 && line) {
            ctx.fillText(line, cx + cardW / 2, lineY);
            line = word;
            lineY += 15;
          } else {
            line = test;
          }
        }
        ctx.fillText(line, cx + cardW / 2, lineY);
        const stats = game.garage.statsFor(bike.id);
        statBar(ctx, cx + SPACE.m, cy + 170, cardW - SPACE.m * 2, TEXT.speed, stats.topSpeed, 1000);
        statBar(ctx, cx + SPACE.m, cy + 192, cardW - SPACE.m * 2, TEXT.accel, stats.accel, 800);
        statBar(ctx, cx + SPACE.m, cy + 214, cardW - SPACE.m * 2, TEXT.handling, stats.handling, 5);
        statBar(ctx, cx + SPACE.m, cy + 236, cardW - SPACE.m * 2, TEXT.brakes, stats.braking, 900);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = `12px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText(`${TEXT.condition}: ${owned ? game.garage.condition(bike.id) + '%' : '-'}`, cx + SPACE.m, cy + 262);
        ctx.textAlign = 'center';
        ctx.fillStyle = PALETTE.green;
        ctx.font = `bold 16px ${FONT}`;
        ctx.fillText(bike.price === 0 ? TEXT.owned : formatRupiah(bike.price), cx + cardW / 2, cy + 286);
        if (locked) {
          ctx.fillStyle = PALETTE.red;
          ctx.font = `12px ${FONT}`;
          ctx.fillText(`${TEXT.locked} ${bike.level}`, cx + cardW / 2, cy + 310);
        }
        const label = current ? TEXT.owned : owned ? TEXT.use : TEXT.buy;
        const enabled = !current && !locked && (owned || game.player.money >= bike.price);
        const action = owned ? 'select:' + bike.id : 'buy:' + bike.id;
        addButton('bike-' + bike.id, cx + SPACE.m, cy + cardH - 52, cardW - SPACE.m * 2, 40, label, enabled, action);
      });
    } else if (dealerTab === 'upgrades') {
      const bikeId = selectedBike || game.garage.current;
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(`Motor: ${BIKES.find((b) => b.id === bikeId).name}`, x + SPACE.xl, y + 122);
      let rowY = y + 150;
      for (const upgrade of UPGRADES) {
        const level = game.garage.upgradeLevel(bikeId, upgrade.id);
        const maxed = level >= upgrade.levels.length;
        const next = maxed ? null : upgrade.levels[level];
        panel(ctx, x + SPACE.xl, rowY, w - SPACE.xl * 2, 84);
        ctx.fillStyle = PALETTE.text;
        ctx.font = `bold 16px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText(`${upgrade.name}  ${'●'.repeat(level)}${'○'.repeat(3 - level)}`, x + SPACE.xl + SPACE.m, rowY + SPACE.m);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = `13px ${FONT}`;
        ctx.fillText(upgrade.desc, x + SPACE.xl + SPACE.m, rowY + 36);
        if (maxed) {
          ctx.fillStyle = PALETTE.accent;
          ctx.font = `bold 14px ${FONT}`;
          ctx.textAlign = 'right';
          ctx.fillText('Maksimal', x + w - SPACE.xl - SPACE.m, rowY + 32);
        } else {
          ctx.fillStyle = PALETTE.green;
          ctx.font = `bold 15px ${FONT}`;
          ctx.textAlign = 'right';
          ctx.fillText(formatRupiah(next.price), x + w - SPACE.xl - 130, rowY + 32);
          addButton('up-' + upgrade.id, x + w - SPACE.xl - 110, rowY + 20, 96, 40, TEXT.buy, game.player.money >= next.price, 'upgrade:' + upgrade.id);
        }
        rowY += 96;
      }
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `13px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('Upgrade dipasang di motor yang sedang dipakai.', x + SPACE.xl, rowY + 8);
    } else {
      const bikeId = game.garage.current;
      const cost = game.garage.repairCost(bikeId);
      const condition = game.garage.condition(bikeId);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(`Motor: ${BIKES.find((b) => b.id === bikeId).name}`, x + SPACE.xl, y + 130);
      ctx.font = `15px ${FONT}`;
      ctx.fillText(`${TEXT.condition}: ${condition}%`, x + SPACE.xl, y + 160);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x + SPACE.xl, y + 182, 400, 10);
      ctx.fillStyle = condition < 30 ? PALETTE.red : condition < 60 ? PALETTE.accent : PALETTE.green;
      ctx.fillRect(x + SPACE.xl, y + 182, 400 * (condition / 100), 10);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.fillText('Tabrakan merusak motor. Motor rusak jadi pelan dan sering mogok.', x + SPACE.xl, y + 210);
      if (cost > 0) {
        ctx.fillStyle = PALETTE.green;
        ctx.font = `bold 18px ${FONT}`;
        ctx.fillText(`Biaya servis: ${formatRupiah(cost)}`, x + SPACE.xl, y + 250);
        addButton('repair', x + SPACE.xl, y + 280, 200, 44, TEXT.repair, game.player.money >= cost, 'repair');
      } else {
        ctx.fillStyle = PALETTE.text;
        ctx.font = `16px ${FONT}`;
        ctx.fillText('Motor dalam kondisi bagus. Tidak perlu servis.', x + SPACE.xl, y + 250);
      }
    }

    addButton('dealer-close', x + SPACE.xl, y + h - 56, w - SPACE.xl * 2, 40, 'Tutup (Esc)', true, 'close');
    for (const b of buttons) {
      if (b.label) drawButton(ctx, b, mouse);
    }
  }

  function overlay(ctx, game, mouse, titleText, bodyText, buttonLabel, action) {
    buttons.length = 0;
    ctx.fillStyle = 'rgba(10, 8, 6, 0.7)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 480;
    const h = 260;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    panel(ctx, x, y, w, h);
    ctx.fillStyle = PALETTE.red;
    ctx.font = `bold 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(titleText, FIELD.width / 2, y + SPACE.xl);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `15px ${FONT}`;
    const words = bodyText.split(' ');
    let line = '';
    let lineY = y + 80;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > w - SPACE.xl * 2 && line) {
        ctx.fillText(line, FIELD.width / 2, lineY);
        line = word;
        lineY += 22;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, FIELD.width / 2, lineY);
    addButton('overlay-ok', x + SPACE.xl, y + h - 64, w - SPACE.xl * 2, 44, buttonLabel, true, action);
    for (const b of buttons) drawButton(ctx, b, mouse);
  }

  return {
    get screen() { return screen; },
    setScreen(value) { screen = value; },
    get dealerTab() { return dealerTab; },
    setDealerTab(value) { dealerTab = value; },
    setSelectedBike(bikeId) { selectedBike = bikeId; },

    draw(ctx, game, mouse) {
      if (screen === 'title') title(ctx, game, mouse);
      else if (screen === 'paused') pause(ctx, game, mouse);
      else if (screen === 'help') help(ctx, game, mouse);
      else if (screen === 'orders') orders(ctx, game, mouse);
      else if (screen === 'dealer') dealer(ctx, game, mouse);
      else if (screen === 'busted') overlay(ctx, game, mouse, TEXT.busted, TEXT.bustedText, TEXT.resume, 'resume');
      else if (screen === 'knocked') overlay(ctx, game, mouse, TEXT.knockedOut, TEXT.knockedOutText, TEXT.resume, 'resume');
    },

    /** Tests a click against the buttons drawn last frame. Returns the action, or null. */
    click(x, y) {
      for (const button of buttons) {
        if (!button.enabled) continue;
        if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
          return button.action;
        }
      }
      return null;
    },
  };
}
