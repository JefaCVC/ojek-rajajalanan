// OJEK! King of the Streets — the HUD: money, rating, streak and rank on the
// left, clock, shift, weather and wanted stars on the right, speed and
// gauges at the bottom, the current objective up top, plus toasts, banners
// and dialogs. All text lives in DOM boxes with room to wrap; nothing is
// drawn on canvas, so nothing can spill out of its box.

import { RANKS, fmtRp, fmtKm, fmtClock } from './config.js';

function stars(n, max = 5) {
  let out = '';
  for (let i = 1; i <= max; i += 1) out += i <= Math.round(n) ? '★' : '☆';
  return out;
}

export function createUI(deps) {
  const { onAction } = deps;
  const el = (id) => document.getElementById(id);
  const hud = {
    money: el('hud-money'),
    rating: el('hud-rating'),
    streak: el('hud-streak'),
    rank: el('hud-rank'),
    xpBar: el('hud-xpbar'),
    xpText: el('hud-xptext'),
    clock: el('hud-clock'),
    shift: el('hud-shift'),
    weather: el('hud-weather'),
    wanted: el('hud-wanted'),
    objective: el('hud-objective'),
    hint: el('hud-hint'),
    speed: el('hud-speed'),
    fuel: el('hud-fuel'),
    fuelBar: el('hud-fuelbar'),
    cond: el('hud-cond'),
    condBar: el('hud-condbar'),
    hp: el('hud-hp'),
    hpBar: el('hud-hpbar'),
    radio: el('hud-radio'),
    bust: el('hud-bust'),
    bustBar: el('hud-bustbar'),
  };
  const toastsEl = el('toasts');
  const dialogEl = el('dialog');
  const bannerEl = el('banner');
  let bannerTimer = null;

  // Skill buttons (bottom centre): Nitro, Quick Fix, Lay Low + the phone.
  // Built once here; updateHUD refreshes locked/cooldown state every frame.
  const skillBar = el('skill-buttons');
  const skillBtns = {};
  const SKILL_BUTTONS = [
    { id: 'nitro', label: 'NITRO', key: '1', action: 'use-skill' },
    { id: 'fix', label: 'FIX', key: '2', action: 'use-skill' },
    { id: 'laylow', label: 'LAY LOW', key: '3', action: 'use-skill' },
    { id: 'phone', label: 'PHONE', key: 'Q', action: 'open-phone' },
  ];
  for (const def of SKILL_BUTTONS) {
    const b = document.createElement('button');
    b.className = 'skill-btn';
    b.dataset.skill = def.id;
    const key = document.createElement('span');
    key.className = 'skill-key';
    key.textContent = def.key;
    const name = document.createElement('span');
    name.className = 'skill-name';
    name.textContent = def.label;
    const cd = document.createElement('span');
    cd.className = 'skill-cd';
    const sweep = document.createElement('div');
    sweep.className = 'skill-sweep';
    b.append(sweep, key, name, cd);
    b.addEventListener('click', () => onAction(def.action, def.id === 'phone' ? null : def.id));
    skillBar.appendChild(b);
    skillBtns[def.id] = { btn: b, cd, sweep };
  }

  function updateSkillButtons(skills) {
    if (!skills) return;
    for (const s of skills) {
      const entry = skillBtns[s.id];
      if (!entry) continue;
      entry.btn.classList.toggle('locked', !!s.locked);
      entry.btn.classList.toggle('cooling', s.cd > 0);
      entry.btn.classList.toggle('active', !!s.active);
      entry.btn.disabled = !!s.locked;
      entry.sweep.style.height = s.cd > 0 ? `${Math.min(100, (s.cd / s.cdMax) * 100).toFixed(0)}%` : '0%';
      entry.cd.textContent = s.cd > 0 ? `${Math.ceil(s.cd)}s` : s.locked ? 'LOCKED' : '';
    }
  }

  function updateHUD(s) {
    hud.money.textContent = fmtRp(s.money);
    hud.rating.textContent = `${stars(s.rating)} ${s.rating.toFixed(1)}`;
    hud.rating.className = s.rating >= 4.5 ? 'good' : s.rating < 3.5 ? 'bad' : '';
    hud.streak.textContent = s.streak > 1 ? `Streak x${Math.min(2, 1 + (s.streak - 1) * 0.1).toFixed(1)} (${s.streak})` : 'Streak -';
    const rank = RANKS[s.rank];
    hud.rank.textContent = rank.name;
    const next = RANKS[s.rank + 1];
    const xpInto = s.xp - rank.xp;
    const xpNeed = next ? next.xp - rank.xp : 1;
    hud.xpBar.style.width = `${Math.min(100, (xpInto / xpNeed) * 100).toFixed(0)}%`;
    hud.xpText.textContent = next ? `${xpInto}/${xpNeed} XP` : 'Max rank';
    hud.clock.textContent = fmtClock(s.hour);
    hud.shift.textContent = s.shift;
    hud.weather.textContent = s.weather;
    hud.wanted.textContent = s.wanted > 0 ? stars(s.wanted) : '';
    hud.wanted.style.display = s.wanted > 0 ? 'block' : 'none';
    if (s.objective) {
      hud.objective.style.display = 'block';
      hud.objective.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'obj-title';
      title.textContent = s.objective.title;
      const sub = document.createElement('div');
      sub.className = 'obj-sub';
      sub.textContent = s.objective.sub;
      hud.objective.append(title, sub);
      if (s.objective.timer != null) {
        const timer = document.createElement('div');
        timer.className = 'obj-timer' + (s.objective.timer < 30 ? ' urgent' : '');
        timer.textContent = `${Math.ceil(s.objective.timer)}s left`;
        hud.objective.append(timer);
      }
    } else {
      hud.objective.style.display = 'none';
    }
    hud.hint.textContent = s.hint || '';
    hud.hint.style.display = s.hint ? 'block' : 'none';
    hud.speed.textContent = `${Math.round(s.speedKmh)} km/h`;
    hud.fuel.textContent = `Fuel ${Math.round(s.fuel)}%`;
    hud.fuelBar.style.width = `${Math.max(0, s.fuel).toFixed(0)}%`;
    hud.fuelBar.className = 'bar-fill' + (s.fuel < 25 ? ' low' : '');
    hud.cond.textContent = `Condition ${Math.round(s.condition)}%`;
    hud.condBar.style.width = `${Math.max(0, s.condition).toFixed(0)}%`;
    hud.condBar.className = 'bar-fill' + (s.condition < 30 ? ' low' : '');
    hud.hp.textContent = `Health ${Math.round(s.hp)}`;
    hud.hpBar.style.width = `${Math.max(0, s.hp).toFixed(0)}%`;
    hud.hpBar.className = 'bar-fill' + (s.hp < 30 ? ' low' : '');
    hud.radio.textContent = s.muted ? 'Muted (M)' : `${s.radioStation} (R switch)`;
    if (s.bustProgress > 0) {
      hud.bust.style.display = 'block';
      hud.bustBar.style.width = `${(s.bustProgress * 100).toFixed(0)}%`;
    } else {
      hud.bust.style.display = 'none';
    }
    updateSkillButtons(s.skills);
    document.getElementById('speed-lines').style.opacity = s.speedKmh > 110 ? String(Math.min(0.7, (s.speedKmh - 110) / 120)) : '0';
  }

  function toast(text, kind = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = text;
    toastsEl.appendChild(t);
    window.setTimeout(() => {
      t.classList.add('fade');
      window.setTimeout(() => t.remove(), 400);
    }, 3200);
    while (toastsEl.children.length > 4) toastsEl.firstChild.remove();
  }

  function banner(title, sub, ms = 2600) {
    bannerEl.innerHTML = '';
    const t = document.createElement('div');
    t.className = 'banner-title';
    t.textContent = title;
    bannerEl.appendChild(t);
    if (sub) {
      const s = document.createElement('div');
      s.className = 'banner-sub';
      s.textContent = sub;
      bannerEl.appendChild(s);
    }
    bannerEl.style.display = 'block';
    if (bannerTimer) window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => { bannerEl.style.display = 'none'; }, ms);
  }

  function showDialog({ title, body, buttons }) {
    dialogEl.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'dialog-box';
    const h = document.createElement('h2');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = body;
    box.append(h, p);
    const row = document.createElement('div');
    row.className = 'dialog-buttons';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className = b.primary ? 'btn primary' : 'btn';
      btn.textContent = b.label;
      btn.addEventListener('click', () => {
        hideDialog();
        onAction(b.action, b.payload);
      });
      row.appendChild(btn);
    }
    box.appendChild(row);
    dialogEl.appendChild(box);
    dialogEl.style.display = 'flex';
  }

  function hideDialog() {
    dialogEl.style.display = 'none';
    dialogEl.innerHTML = '';
  }

  function objectiveText(targetInfo, story) {
    if (story && story.active) {
      const m = story.active.mission;
      if (m.kind === 'race' || (m.kind === 'finale' && story.active.phase === 'go')) {
        return { title: `Mission: ${m.title}`, sub: 'Race to the red marker. Do not lose.' };
      }
      if (m.kind === 'chase') {
        return { title: `Mission: ${m.title}`, sub: `Run that thief down. ${Math.ceil(story.active.data.timeLeft || 0)}s left.` };
      }
      if (m.kind === 'fight') {
        return { title: `Mission: ${m.title}`, sub: 'Chase the Geng Macan members out of the market.' };
      }
      if (m.kind === 'finale' && story.active.phase === 'fight') {
        return { title: 'Boss Macan Duel', sub: 'Beat Boss Macan. Dodge with Space.' };
      }
    }
    if (!targetInfo) return null;
    const o = targetInfo.order;
    const stage = targetInfo.stage === 'pickup' ? 'Pick up' : 'Deliver to';
    const place = targetInfo.stage === 'pickup' ? o.pickupDistrict : o.destDistrict;
    return {
      title: `${stage}: ${o.label} (${o.detail})`,
      sub: `${place} - ${fmtKm(targetInfo.distance)} - ${fmtRp(o.fare)}`,
      timer: o.timeLeft,
    };
  }

  return { updateHUD, toast, banner, showDialog, hideDialog, objectiveText };
}
