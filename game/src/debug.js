// OJEK! King of the Streets — debug hooks for play-testing: G.step advances the
// simulation frame by frame, G.press sends keys, G.state snapshots the
// game, ?god makes the player invulnerable with endless fuel, ?muted
// silences audio, and F3 shows a live panel. All in the game's own words.

export function createDebug(game) {
  const params = new URLSearchParams(window.location.search);
  const god = params.has('god');
  const muted = params.has('muted');
  const auto = params.has('auto');
  let stepping = false;
  let stepsLeft = 0;
  let panel = null;

  function snapshot() {
    const p = game.profile;
    return {
      mode: game.getMode ? game.getMode() : '?',
      money: p.money,
      xp: p.xp,
      rating: Number(p.rating.toFixed(2)),
      streak: p.streak,
      wanted: game.police.wanted,
      hour: Number(game.daycycle.hour.toFixed(2)),
      weather: game.daycycle.weather,
      riding: game.player.riding,
      speedKmh: Math.round(game.player.speedKmh),
      fuel: Math.round(game.player.fuel()),
      condition: Math.round(game.player.condition()),
      hp: Math.round(game.player.hp),
      pos: { x: Math.round(game.player.pos.x), z: Math.round(game.player.pos.z) },
      heading: Number(game.player.heading.toFixed(2)),
      activeOrder: game.orders.active ? game.orders.active.id : null,
      boardSize: game.orders.board.length,
      storyIndex: p.storyIndex,
      storyActive: !!game.story.active,
      enemies: game.combat.enemies.length,
      policeCars: game.police.cars.length,
      skillPoints: p.skillPoints || 0,
      skills: { ...p.skills },
      skillCd: game.skillCd ? { ...game.skillCd } : null,
      nitroActive: !!game.player.nitroActive,
      maxHp: game.player.maxHp,
      topSpeed: Math.round(game.player.effectiveSpec().topSpeed),
    };
  }

  function togglePanel() {
    if (panel) {
      panel.remove();
      panel = null;
      return;
    }
    panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = 'position:fixed;left:8px;top:8px;z-index:200;background:rgba(0,0,0,0.8);color:#7dffb0;font:12px monospace;padding:8px 10px;border-radius:8px;white-space:pre;pointer-events:none;';
    document.body.appendChild(panel);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'F3') {
      e.preventDefault();
      togglePanel();
    }
  });

  window.G = {
    step(n = 1) {
      stepping = true;
      stepsLeft = n;
    },
    resume() {
      stepping = false;
      stepsLeft = 0;
    },
    press(codes) {
      for (const code of codes) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
      }
    },
    hold(code) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    },
    release(code) {
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    },
    state: snapshot,
    setWanted(n) { game.police.setWanted(n); },
    giveMoney(n) { game.profile.money += n; },
    giveXp(n) { game.addXp(n); },
    giveSkillPoints(n) { game.profile.skillPoints = (game.profile.skillPoints || 0) + n; },
    teleport(x, z, heading) { game.player.teleport(x, z, heading); },
    setHour(h) { game.daycycle.setHour(h); },
    setWeather(w) { game.daycycle.setWeather(w); },
    acceptFirstOrder() {
      const first = game.orders.board[0];
      if (first) game.acceptOrder(first.id);
    },
    completeOrder() {
      const t = game.orders.targetInfo(game.player.pos);
      if (t) game.player.teleport(t.target.x, t.target.z, 0);
    },
  };

  return {
    god,
    muted,
    auto,
    get stepping() { return stepping; },
    consumeStep() {
      if (!stepping) return false;
      if (stepsLeft <= 0) return false;
      stepsLeft -= 1;
      return true;
    },
    updatePanel(fps) {
      if (!panel) return;
      const s = snapshot();
      panel.textContent = `fps ${fps}\n` + Object.entries(s).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');
    },
  };
}
