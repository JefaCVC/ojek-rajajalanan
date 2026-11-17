// Debug hooks, built in from day one (guizang method, written here in my own
// code): frame stepping, key simulation, URL flags, and an F3 panel. Conclusions
// come from numbers, screenshots only as backup.
//
// window.G.step(n)   — advance n frames, with rendering
// window.G.upd(n)    — advance n logic steps, no rendering (fast scans)
// window.G.press(...)— simulate key presses through the real input path
// window.G.state()   — the current state snapshot as plain numbers
// ?stage=dealer|chase|foot|cover — jump straight to a staged scene
// ?auto — skip the title screen into the game
// ?god  — invulnerable, full fuel, no wanted decay needed
// ?seed=N — fix the city seed
// F3 — toggle the debug panel (position, speed, fps, held keys, state)

import { STEP } from './config.js';

export function parseFlags() {
  const params = new URLSearchParams(window.location.search);
  return {
    stage: params.get('stage') || null,
    auto: params.has('auto'),
    god: params.has('god'),
    seed: params.has('seed') ? parseInt(params.get('seed'), 10) || 0 : null,
    shot: params.get('shot') || null,
    muted: params.has('muted'),
  };
}

export function createDebug(game, input) {
  let panelVisible = false;
  let fps = 0;
  let frameCount = 0;
  let fpsTimer = 0;

  window.addEventListener('keydown', (event) => {
    if (event.code === 'F3') {
      event.preventDefault();
      panelVisible = !panelVisible;
    }
  });

  const api = {
    step(n, dt) {
      const frames = n === undefined ? 60 : n;
      const stepDt = dt === undefined ? STEP : dt;
      for (let i = 0; i < frames; i += 1) game.stepFrame(stepDt);
      return api.state();
    },
    upd(n, dt) {
      const steps = n === undefined ? 30 : n;
      const stepDt = dt === undefined ? STEP : dt;
      for (let i = 0; i < steps; i += 1) game.updateOnly(stepDt);
      return api.state();
    },
    press(...codes) {
      for (const code of codes) input.simulatePress(code);
      return input.heldCodes;
    },
    release(...codes) {
      for (const code of codes) input.simulateRelease(code);
      return input.heldCodes;
    },
    state() { return game.snapshot(); },
    /** Spawns a rival or begal near the player, for combat verification. */
    spawn(kind) {
      const angle = Math.random() * Math.PI * 2;
      const x = game.player.x + Math.cos(angle) * 120;
      const y = game.player.y + Math.sin(angle) * 120;
      if (kind === 'begal') game.combat.spawnBegal(x, y);
      else game.combat.spawnRival(x, y);
      return game.combat.count;
    },
    /** Puts the player at a world position (scripted-scene override). */
    teleport(x, y) {
      game.player.setPosition(x, y);
      return api.state();
    },
    /** Gives the player money (scripted-scene override). */
    giveMoney(amount) {
      game.player.addMoney(amount);
      return game.player.money;
    },
    /** Adds wanted stars (scripted-scene override). */
    addWanted(amount) {
      game.police.addWanted(amount);
      return game.police.wanted;
    },
    get panelVisible() { return panelVisible; },
    togglePanel() { panelVisible = !panelVisible; },
  };
  window.G = api;

  return {
    api,
    get panelVisible() { return panelVisible; },
    /** Call once per rendered frame with the real delta to track fps. */
    tick(dt) {
      frameCount += 1;
      fpsTimer += dt;
      if (fpsTimer >= 0.5) {
        fps = Math.round(frameCount / fpsTimer);
        frameCount = 0;
        fpsTimer = 0;
      }
    },
    draw(ctx, width) {
      if (!panelVisible) return;
      const state = game.snapshot();
      const lines = [
        'DEBUG — F3 tutup',
        `fps ${fps}  tick ${state.tick}`,
        `pos ${Math.round(state.player.x)}, ${Math.round(state.player.y)}`,
        `speed ${Math.round(state.player.speed)}  sudut ${Math.round(state.player.angle * 57.3)}`,
        `motor ${state.player.onBike ? 'ya' : 'tidak'}  bensin ${Math.round(state.player.fuel)}`,
        `uang ${state.player.money}  level ${state.player.level}  xp ${state.player.xp}/${state.player.xpNext}`,
        `rating ${state.player.rating.toFixed(2)}  streak ${state.streak}  pangkat ${state.rank}`,
        `wanted ${state.wanted}  polisi ${state.policeCars}  musuh ${state.enemies}`,
        `order ${state.activeOrder ? state.activeOrder.id + ' ' + state.activeOrder.state : 'tidak ada'}`,
        `shift ${state.shift}  jam ${state.clock}  cuaca ${state.weather}`,
        `tombol: ${input.heldCodes.join(', ') || 'tidak ada'}`,
      ];
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(8, 8, 320, lines.length * 18 + 16);
      ctx.font = '13px monospace';
      ctx.fillStyle = '#7dff9a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      lines.forEach((line, i) => ctx.fillText(line, 16, 16 + i * 18));
      ctx.restore();
    },
  };
}
