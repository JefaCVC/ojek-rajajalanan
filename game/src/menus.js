// OJEK! King of the Streets — menus: title, pause, orders, dealer, garage, story,
// achievements, codex, settings, results and the first-run tutorial. Every
// menu is real DOM with working buttons; nothing here is decorative. Text
// sits in roomy boxes and wraps; prices and stats use tabular figures.

import { BIKES, UPGRADES, PAINTS, RANKS, bikeById, fmtRp, fmtKm, fmtClock, rankForXp } from './config.js';
import { ACHIEVEMENTS } from './achievements.js';
import { SKILL_BRANCHES, skillTier, canBuySkill } from './skills.js';
import { dailyChallenges, challengeProgress, isClaimed } from './challenges.js';
import { refuelCost, repairCost } from './economy.js';

function statBar(label, value, max) {
  const row = document.createElement('div');
  row.className = 'stat-row';
  const lab = document.createElement('span');
  lab.className = 'stat-label';
  lab.textContent = label;
  const bar = document.createElement('div');
  bar.className = 'stat-bar';
  const fill = document.createElement('div');
  fill.className = 'stat-fill';
  fill.style.width = `${Math.round((value / max) * 100)}%`;
  bar.appendChild(fill);
  const val = document.createElement('span');
  val.className = 'stat-value';
  val.textContent = String(value);
  row.append(lab, bar, val);
  return row;
}

export function createMenus(deps) {
  const { onAction, getState } = deps;
  const root = document.getElementById('menus');
  let current = null;

  function button(label, action, payload, cls = 'btn') {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = label;
    b.addEventListener('click', () => onAction(action, payload));
    return b;
  }

  function panel(title, sub) {
    const wrap = document.createElement('div');
    wrap.className = 'menu-wrap';
    const box = document.createElement('div');
    box.className = 'menu-box';
    const h = document.createElement('h2');
    h.textContent = title;
    box.appendChild(h);
    if (sub) {
      const p = document.createElement('p');
      p.className = 'menu-sub';
      p.textContent = sub;
      box.appendChild(p);
    }
    wrap.appendChild(box);
    return { wrap, box };
  }

  function show(screen, data) {
    current = screen;
    document.body.classList.add('menu-open');
    root.innerHTML = '';
    root.style.display = 'flex';
    const s = getState();
    if (screen === 'title') renderTitle(s, data);
    else if (screen === 'pause') renderPause(s);
    else if (screen === 'phone') renderPhone(s, data);
    else if (screen === 'orders') renderOrders(s);
    else if (screen === 'dealer') renderDealer(s);
    else if (screen === 'garage') renderGarage(s);
    else if (screen === 'story') renderStory(s);
    else if (screen === 'achievements') renderAchievements(s);
    else if (screen === 'codex') renderCodex(s);
    else if (screen === 'settings') renderSettings(s);
    else if (screen === 'results') renderResults(s, data);
    else if (screen === 'tutorial') renderTutorial(s, data);
  }

  function hide() {
    current = null;
    document.body.classList.remove('menu-open');
    root.innerHTML = '';
    root.style.display = 'none';
  }

  function renderTitle(s, data) {
    const { wrap, box } = panel('', null);
    box.classList.add('title-box');
    const logo = document.createElement('div');
    logo.className = 'logo';
    logo.textContent = 'OJEK!';
    const tag = document.createElement('div');
    tag.className = 'tagline';
    tag.textContent = 'King of the Streets';
    const desc = document.createElement('p');
    desc.className = 'title-desc';
    desc.textContent = 'Ride as an ojek driver in a living city. Pick up passengers, deliver parcels, take on Geng Macan, and climb from Rookie Rider to King of the Streets.';
    box.append(logo, tag, desc);
    if (s.profileExisted) {
      const saved = document.createElement('p');
      saved.className = 'save-line';
      saved.textContent = `Saved game: ${RANKS[s.rank].name}, ${fmtRp(s.profile.money)}, ${s.profile.stats.ordersDone} orders done.`;
      box.appendChild(saved);
    }
    const row = document.createElement('div');
    row.className = 'menu-buttons';
    row.append(
      button(s.profileExisted ? 'Continue Riding' : 'Start Riding', 'start-game', null, 'btn primary big'),
      button('How to Play', 'open-menu', 'tutorial', 'btn big'),
      button('Settings', 'open-menu', 'settings', 'btn big'),
    );
    box.appendChild(row);
    const keys = document.createElement('div');
    keys.className = 'keys-line';
    keys.textContent = 'WASD drive and ride  |  E mount and dismount  |  Q phone  |  F punch  |  Space dodge  |  H horn  |  Esc pause';
    box.appendChild(keys);
    wrap.appendChild(box);
    root.appendChild(wrap);
  }

  function renderPause(s) {
    const { wrap, box } = panel('Paused', 'The game is paused. Progress saves automatically when an order is done.');
    const row = document.createElement('div');
    row.className = 'menu-buttons col';
    row.append(
      button('Resume', 'close-menu', null, 'btn primary'),
      button('Orders', 'open-menu', 'orders'),
      button('Skills', 'open-phone-tab', 'skills'),
      button('Bike Dealer', 'open-menu', 'dealer'),
      button('Garage', 'open-menu', 'garage'),
      button('Geng Macan Missions', 'open-menu', 'story'),
      button('Achievements', 'open-menu', 'achievements'),
      button('Codex', 'open-menu', 'codex'),
      button('Settings', 'open-menu', 'settings'),
      button('Save Now', 'save-now'),
      button('Back to Title', 'to-title'),
    );
    box.appendChild(row);
    const chTitle = document.createElement('div');
    chTitle.className = 'section-title';
    chTitle.textContent = 'Daily Challenges';
    box.appendChild(chTitle);
    buildChallengesList(box, s);
    root.appendChild(wrap);
  }

  function buildOrdersContent(box, s) {
    if (s.activeOrder) {
      const active = document.createElement('div');
      active.className = 'order-active';
      const o = s.activeOrder;
      active.innerHTML = '';
      const t = document.createElement('div');
      t.className = 'order-title';
      t.textContent = `Active: ${o.label} (${o.detail})`;
      const d = document.createElement('div');
      d.className = 'order-detail';
      d.textContent = `${o.pickupDistrict} to ${o.destDistrict} - ${fmtKm(o.distance)} - ${fmtRp(o.fare)}`;
      active.append(t, d, button('Cancel Order', 'cancel-order'));
      box.appendChild(active);
    }
    const list = document.createElement('div');
    list.className = 'order-list';
    if (s.board.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-line';
      empty.textContent = 'No orders yet. Hang on, new orders keep coming in.';
      list.appendChild(empty);
    }
    for (const o of s.board) {
      const row = document.createElement('div');
      row.className = 'order-row';
      const left = document.createElement('div');
      left.className = 'order-left';
      const t = document.createElement('div');
      t.className = 'order-title';
      t.textContent = `${o.label} (${o.detail})`;
      const d = document.createElement('div');
      d.className = 'order-detail';
      d.textContent = `${o.pickupDistrict} to ${o.destDistrict} - ${fmtKm(o.distance)}`;
      left.append(t, d);
      if (o.timeLeft != null) {
        const timer = document.createElement('div');
        timer.className = 'order-timer';
        timer.textContent = `${Math.ceil(o.timeLeft)}s left`;
        left.appendChild(timer);
      }
      const right = document.createElement('div');
      right.className = 'order-right';
      const fare = document.createElement('div');
      fare.className = 'order-fare';
      fare.textContent = fmtRp(o.fare);
      const take = button('Take', 'accept-order', o.id, 'btn primary small');
      if (s.activeOrder) take.disabled = true;
      right.append(fare, take);
      row.append(left, right);
      list.appendChild(row);
    }
    box.appendChild(list);
  }

  function renderOrders(s) {
    const { wrap, box } = panel('Orders', 'Pick your order. Prices already include rush-hour and weather rates.');
    buildOrdersContent(box, s);
    box.appendChild(button('Close', 'close-menu'));
    root.appendChild(wrap);
  }

  function renderDealer(s) {
    const { wrap, box } = panel('Sinar Jaya Dealer', `Your money: ${fmtRp(s.profile.money)}. New bikes are rank-locked. Buy a bike to move up a class.`);
    const list = document.createElement('div');
    list.className = 'dealer-list';
    for (const b of BIKES) {
      const owned = s.profile.ownedBikes.some((o) => o.id === b.id);
      const locked = s.rank < b.rank;
      const row = document.createElement('div');
      row.className = 'bike-row';
      const left = document.createElement('div');
      left.className = 'bike-left';
      const t = document.createElement('div');
      t.className = 'bike-name';
      t.textContent = b.name;
      const d = document.createElement('div');
      d.className = 'bike-desc';
      d.textContent = b.desc;
      left.append(t, d);
      left.append(statBar('Top speed', b.topSpeed, 230));
      left.append(statBar('Acceleration', Math.round(b.accel * 100), 130));
      left.append(statBar('Handling', Math.round(b.handling * 100), 110));
      left.append(statBar('Brakes', Math.round(b.brake * 100), 110));
      const right = document.createElement('div');
      right.className = 'bike-right';
      const price = document.createElement('div');
      price.className = 'bike-price';
      price.textContent = owned ? 'Owned' : fmtRp(b.price);
      right.appendChild(price);
      if (locked) {
        const lock = document.createElement('div');
        lock.className = 'bike-lock';
        lock.textContent = `Needs rank ${RANKS[b.rank].name}`;
        right.appendChild(lock);
      } else if (!owned) {
        const buy = button('Buy', 'buy-bike', b.id, 'btn primary small');
        if (s.profile.money < b.price) buy.disabled = true;
        right.appendChild(buy);
      }
      row.append(left, right);
      list.appendChild(row);
    }
    box.appendChild(list);
    box.appendChild(button('Close', 'close-menu'));
    root.appendChild(wrap);
  }

  function buildGarageContent(box, s) {
    const entry = s.profile.ownedBikes[s.profile.activeBike];
    const bike = bikeById(entry.id);
    const owned = document.createElement('div');
    owned.className = 'garage-owned';
    const ownedTitle = document.createElement('div');
    ownedTitle.className = 'section-title';
    ownedTitle.textContent = 'Your Bikes';
    owned.appendChild(ownedTitle);
    s.profile.ownedBikes.forEach((o, i) => {
      const b = bikeById(o.id);
      const row = document.createElement('div');
      row.className = 'garage-row';
      const name = document.createElement('span');
      name.textContent = b.name + (i === s.profile.activeBike ? ' (active)' : '');
      const sw = button(i === s.profile.activeBike ? 'In Use' : 'Use', 'switch-bike', i, 'btn small');
      if (i === s.profile.activeBike) sw.disabled = true;
      row.append(name, sw);
      owned.appendChild(row);
    });
    box.appendChild(owned);
    const upTitle = document.createElement('div');
    upTitle.className = 'section-title';
    upTitle.textContent = 'Upgrades';
    box.appendChild(upTitle);
    for (const u of UPGRADES) {
      const level = entry.upgrades[u.id] || 0;
      const row = document.createElement('div');
      row.className = 'garage-row';
      const left = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'up-name';
      name.textContent = `${u.name} - level ${level}/3`;
      const desc = document.createElement('div');
      desc.className = 'up-desc';
      desc.textContent = u.desc;
      left.append(name, desc);
      const buy = level >= 3
        ? (() => { const sp = document.createElement('span'); sp.textContent = 'Maxed'; return sp; })()
        : button(`Upgrade (${fmtRp(u.prices[level])})`, 'buy-upgrade', u.id, 'btn small');
      if (buy instanceof HTMLButtonElement && s.profile.money < u.prices[level]) buy.disabled = true;
      row.append(left, buy);
      box.appendChild(row);
    }
    const paintTitle = document.createElement('div');
    paintTitle.className = 'section-title';
    paintTitle.textContent = 'Bike Paint';
    box.appendChild(paintTitle);
    const paints = document.createElement('div');
    paints.className = 'paint-row';
    PAINTS.forEach((p, i) => {
      const sw = document.createElement('button');
      sw.className = 'paint-swatch';
      sw.style.backgroundColor = `#${p.color.toString(16).padStart(6, '0')}`;
      sw.title = `${p.name} - ${fmtRp(p.price)}`;
      sw.addEventListener('click', () => onAction('paint-bike', i));
      paints.appendChild(sw);
    });
    box.appendChild(paints);
    const care = document.createElement('div');
    care.className = 'menu-buttons';
    care.append(
      button(`Refuel (${fmtRp(refuelCost(entry))})`, 'refuel', null, 'btn'),
      button(`Service (${fmtRp(repairCost(entry))})`, 'repair', null, 'btn'),
    );
    box.append(care);
  }

  function renderGarage(s) {
    const entry = s.profile.ownedBikes[s.profile.activeBike];
    const bike = bikeById(entry.id);
    const { wrap, box } = panel('Garage', `Active bike: ${bike.name}. Upgrades, paint, service and fuel are all here.`);
    buildGarageContent(box, s);
    box.appendChild(button('Close', 'close-menu'));
    root.appendChild(wrap);
  }

  function renderStory(s) {
    const { wrap, box } = panel('Geng Macan Missions', 'Seven missions against the rival gang. Finish them all to become a city legend.');
    const idx = s.profile.storyIndex;
    if (idx < 7) {
      const m = s.storyMissions[idx];
      const card = document.createElement('div');
      card.className = 'story-card';
      const t = document.createElement('div');
      t.className = 'story-title';
      t.textContent = `Mission ${idx + 1}: ${m.title}`;
      const b = document.createElement('p');
      b.textContent = m.brief;
      const r = document.createElement('div');
      r.className = 'story-reward';
      r.textContent = `Reward: ${fmtRp(m.reward)} and ${m.xp} XP`;
      card.append(t, b, r);
      if (s.rank < m.minRank) {
        const lock = document.createElement('div');
        lock.className = 'bike-lock';
        lock.textContent = `Needs rank ${RANKS[m.minRank].name}`;
        card.appendChild(lock);
      } else if (s.storyActive) {
        const doing = document.createElement('div');
        doing.className = 'story-reward';
        doing.textContent = 'Mission in progress. Finish it out on the streets.';
        card.appendChild(doing);
        card.appendChild(button('Cancel Mission', 'cancel-story'));
      } else {
        card.appendChild(button('Start Mission', 'start-story', null, 'btn primary'));
      }
      box.appendChild(card);
    } else {
      const done = document.createElement('p');
      done.className = 'empty-line';
      done.textContent = 'All missions done. Geng Macan is finished. This city is yours.';
      box.appendChild(done);
    }
    if (s.profile.storyDone.length > 0) {
      const doneTitle = document.createElement('div');
      doneTitle.className = 'section-title';
      doneTitle.textContent = 'Missions done';
      box.appendChild(doneTitle);
      for (const id of s.profile.storyDone) {
        const m = s.storyMissions.find((x) => x.id === id);
        if (!m) continue;
        const row = document.createElement('div');
        row.className = 'garage-row';
        const name = document.createElement('span');
        name.textContent = m.title;
        const mark = document.createElement('span');
        mark.className = 'good';
        mark.textContent = 'Done';
        row.append(name, mark);
        box.appendChild(row);
      }
    }
    box.appendChild(button('Close', 'close-menu'));
    root.appendChild(wrap);
  }

  function buildAchievementsContent(box, s) {
    const list = document.createElement('div');
    list.className = 'ach-list';
    for (const a of ACHIEVEMENTS) {
      const got = s.profile.achievements.includes(a.id);
      const row = document.createElement('div');
      row.className = 'ach-row' + (got ? '' : ' locked');
      const name = document.createElement('div');
      name.className = 'ach-name';
      name.textContent = got ? a.name : '???';
      const desc = document.createElement('div');
      desc.className = 'ach-desc';
      desc.textContent = a.desc;
      row.append(name, desc);
      list.appendChild(row);
    }
    box.appendChild(list);
  }

  function renderAchievements(s) {
    const { wrap, box } = panel('Achievements', `${s.profile.achievements.length} of ${ACHIEVEMENTS.length} achievements earned.`);
    buildAchievementsContent(box, s);
    box.appendChild(button('Close', 'close-menu'));
    root.appendChild(wrap);
  }

  function buildChallengesList(box, s) {
    for (const def of dailyChallenges(s.profile)) {
      const prog = challengeProgress(s.profile, def);
      const done = prog >= def.target;
      const claimed = isClaimed(s.profile, def.id);
      const row = document.createElement('div');
      row.className = 'challenge-row' + (done ? ' done' : '');
      const top = document.createElement('div');
      top.className = 'challenge-top';
      const text = document.createElement('span');
      text.className = 'challenge-text';
      text.textContent = def.text;
      const reward = document.createElement('span');
      reward.className = 'challenge-reward';
      reward.textContent = claimed ? 'Claimed' : `${fmtRp(def.rewardMoney)} + ${def.rewardXp} XP`;
      top.append(text, reward);
      const track = document.createElement('div');
      track.className = 'challenge-track';
      const fill = document.createElement('div');
      fill.className = 'challenge-fill';
      fill.style.width = `${Math.min(100, (prog / def.target) * 100).toFixed(0)}%`;
      track.appendChild(fill);
      const pct = document.createElement('div');
      pct.className = 'challenge-progress';
      pct.textContent = def.metric === 'earned'
        ? `${fmtRp(prog)} / ${fmtRp(def.target)}`
        : def.metric === 'distance'
          ? `${prog.toFixed(1)} / ${def.target} km`
          : def.metric === 'maxSpeed'
            ? `${prog} / ${def.target} km/h`
            : `${prog} / ${def.target}`;
      row.append(top, track, pct);
      box.appendChild(row);
    }
  }

  function buildSkillsContent(box, s) {
    const points = document.createElement('div');
    points.className = 'skill-points';
    points.textContent = `Skill Points: ${s.profile.skillPoints || 0}  —  earn 1 per rank-up and 1 per story mission.`;
    box.appendChild(points);
    const tree = document.createElement('div');
    tree.className = 'skill-tree';
    for (const branch of SKILL_BRANCHES) {
      const col = document.createElement('div');
      col.className = 'skill-branch';
      const head = document.createElement('div');
      head.className = 'skill-branch-head';
      const name = document.createElement('div');
      name.className = 'skill-branch-name';
      name.textContent = branch.name;
      const tag = document.createElement('div');
      tag.className = 'skill-branch-tag';
      tag.textContent = branch.tagline;
      head.append(name, tag);
      col.appendChild(head);
      const owned = skillTier(s.profile, branch.id);
      branch.tiers.forEach((tier, i) => {
        const tierNo = i + 1;
        if (i > 0) {
          const conn = document.createElement('div');
          conn.className = 'skill-connector' + (owned >= tierNo - 1 ? ' lit' : '');
          col.appendChild(conn);
        }
        const node = document.createElement('div');
        const isOwned = owned >= tierNo;
        const check = canBuySkill(s.profile, branch.id, tierNo);
        node.className = 'skill-node' + (isOwned ? ' owned' : check.ok ? ' available' : ' locked');
        const nName = document.createElement('div');
        nName.className = 'skill-node-name';
        nName.textContent = `Tier ${tierNo}: ${tier.name}`;
        const nDesc = document.createElement('div');
        nDesc.className = 'skill-node-desc';
        nDesc.textContent = tier.desc;
        node.append(nName, nDesc);
        if (isOwned) {
          const st = document.createElement('div');
          st.className = 'skill-node-state';
          st.textContent = 'Unlocked';
          node.appendChild(st);
        } else if (check.ok) {
          node.appendChild(button(`Unlock (1 pt)`, 'buy-skill', { branch: branch.id, tier: tierNo }, 'btn primary small'));
        } else {
          const st = document.createElement('div');
          st.className = 'skill-node-state';
          st.style.color = '#ff8a5a';
          st.textContent = check.reason;
          node.appendChild(st);
        }
        col.appendChild(node);
      });
      tree.appendChild(col);
    }
    box.appendChild(tree);
  }

  function buildStatsContent(box, s) {
    const st = s.profile.stats;
    const rows = [
      ['Orders done', String(st.ordersDone)],
      ['Total earnings', fmtRp(st.earned)],
      ['Distance ridden', `${st.distanceKm.toFixed(1)} km`],
      ['Best streak', `${s.profile.bestStreak} orders`],
      ['Rating', `${s.profile.rating.toFixed(1)} out of 5`],
      ['Top speed', `${Math.round(st.maxSpeedKmh || 0)} km/h`],
      ['Food deliveries', String(st.foodDone || 0)],
      ['Night deliveries', String(st.nightDeliveries || 0)],
      ['Races won', String(st.racesWon)],
      ['Escapes from police', String(st.escapes || 0)],
      ['Times busted', String(st.busted)],
      ['Skill points', String(s.profile.skillPoints || 0)],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'result-row';
      const l = document.createElement('span');
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'result-value';
      v.textContent = value;
      row.append(l, v);
      box.appendChild(row);
    }
    const logTitle = document.createElement('div');
    logTitle.className = 'section-title';
    logTitle.textContent = 'Earnings Log';
    box.appendChild(logTitle);
    const log = document.createElement('div');
    log.className = 'log-list';
    const entries = (s.profile.earningsLog || []).slice(-15).reverse();
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-line';
      empty.textContent = 'No earnings yet. Finish an order or a mission to see it here.';
      log.appendChild(empty);
    }
    for (const e of entries) {
      const row = document.createElement('div');
      row.className = 'log-row';
      const label = document.createElement('span');
      label.className = 'log-label';
      label.textContent = e.label;
      const time = document.createElement('span');
      time.className = 'log-time';
      time.textContent = fmtClock(e.hour);
      const amt = document.createElement('span');
      amt.className = 'log-amount';
      amt.textContent = `+${fmtRp(e.amount)}`;
      row.append(label, time, amt);
      log.appendChild(row);
    }
    box.appendChild(log);
    const chTitle = document.createElement('div');
    chTitle.className = 'section-title';
    chTitle.textContent = 'Daily Challenges';
    box.appendChild(chTitle);
    buildChallengesList(box, s);
  }

  function buildMapContent(box, s) {
    const canvas = document.createElement('canvas');
    canvas.className = 'map-canvas';
    canvas.width = 480;
    canvas.height = 480;
    box.appendChild(canvas);
    if (s.drawMap) s.drawMap(canvas);
    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.textContent = 'D dealer  ·  G garage  ·  S gas station  ·  green: order target  ·  red: mission  ·  blue: police  ·  orange: road event  ·  gold ring: surge zone (Surge Sense)';
    box.appendChild(legend);
  }

  function buildRadioContent(box, s) {
    const stations = s.stations || [];
    stations.forEach((stn, i) => {
      const row = document.createElement('div');
      row.className = 'station-row' + (i === s.stationIndex ? ' playing' : '');
      const left = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'station-name';
      name.textContent = stn.name;
      const desc = document.createElement('div');
      desc.className = 'station-desc';
      desc.textContent = stn.desc;
      left.append(name, desc);
      if (i === s.stationIndex) {
        const live = document.createElement('span');
        live.className = 'station-live';
        live.textContent = s.radioOn ? 'Now Playing' : 'Paused';
        row.append(left, live);
      } else {
        row.append(left, button('Play', 'set-station', i, 'btn small'));
      }
      box.appendChild(row);
    });
    const row = document.createElement('div');
    row.className = 'menu-buttons';
    row.append(button(s.radioOn ? 'Turn Radio Off' : 'Turn Radio On', 'toggle-radio'));
    box.appendChild(row);
  }

  const PHONE_TABS = [
    { id: 'orders', label: 'Orders' },
    { id: 'skills', label: 'Skills' },
    { id: 'garage', label: 'Garage' },
    { id: 'stats', label: 'Stats' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'map', label: 'Map' },
    { id: 'radio', label: 'Radio' },
  ];

  function renderPhone(s, data) {
    const tab = (data && data.tab) || 'orders';
    const { wrap, box } = panel('Phone', 'Your driver phone. Orders, skills, garage, stats and more.');
    const bar = document.createElement('div');
    bar.className = 'tab-bar';
    for (const t of PHONE_TABS) {
      const b = document.createElement('button');
      b.className = 'tab-btn' + (t.id === tab ? ' active' : '');
      b.textContent = t.label;
      b.addEventListener('click', () => show('phone', { tab: t.id }));
      bar.appendChild(b);
    }
    box.appendChild(bar);
    if (tab === 'orders') buildOrdersContent(box, s);
    else if (tab === 'skills') buildSkillsContent(box, s);
    else if (tab === 'garage') buildGarageContent(box, s);
    else if (tab === 'stats') buildStatsContent(box, s);
    else if (tab === 'achievements') buildAchievementsContent(box, s);
    else if (tab === 'map') buildMapContent(box, s);
    else if (tab === 'radio') buildRadioContent(box, s);
    box.appendChild(button('Close', 'close-menu'));
    root.appendChild(wrap);
  }

  function renderCodex(s) {
    const { wrap, box } = panel('Codex', 'Everything you need to know about this city.');
    const entries = [
      ['Controls', 'WASD to walk and ride. E to mount and dismount. Q opens the phone. F punches. Space dodges on foot and handbrakes on the bike. H honks. R switches radio station. M mutes. Esc pauses. Drag the mouse to orbit the camera.'],
      ['Orders', 'Open the phone (Q) and pick what you like. Prices already include rush-hour and weather rates. Deliver on time for tips and a good rating. Food and rush orders have a time limit.'],
      ['Fuel and Service', 'Fuel runs out if you ride far. Fill up at a gas station (S on the map) or in the garage. Crashes damage the bike; service it in the garage before the condition gets bad.'],
      ['Police', 'Stealing vehicles, hitting people or cars, and ramming police raise your wanted stars. Police chase, set up roadblocks, and at 5 stars there is a helicopter. Hide until the heat dies down, or get caught and pay a fine.'],
      ['Rating and Streak', 'Deliver fast and smooth to raise your rating. A streak boosts earnings up to double. One late order breaks the streak.'],
      ['Tips', 'Rain raises fares 30 percent but the roads get slippery. The evening rush has the most orders. A new bike is faster and saves time. Save up for the engine upgrade first.'],
    ];
    for (const [title, text] of entries) {
      const t = document.createElement('div');
      t.className = 'section-title';
      t.textContent = title;
      const p = document.createElement('p');
      p.className = 'codex-text';
      p.textContent = text;
      box.append(t, p);
    }
    box.appendChild(button('Close', 'close-menu'));
    root.appendChild(wrap);
  }

  function renderSettings(s) {
    const { wrap, box } = panel('Settings', 'Sound and save options.');
    const row = document.createElement('div');
    row.className = 'menu-buttons col';
    row.append(
      button(s.muted ? 'Turn Sound On' : 'Turn Sound Off', 'toggle-mute'),
      button(s.radioOn ? 'Turn Radio Off' : 'Turn Radio On', 'toggle-radio'),
      button('Erase Save and Start Over', 'reset-save'),
      button('Close', 'close-menu'),
    );
    box.appendChild(row);
    root.appendChild(wrap);
  }

  function renderResults(s, data) {
    const { wrap, box } = panel(data.title || 'Results', data.sub || '');
    box.classList.add('results-box');
    const stats = data.stats || [];
    for (const [label, value] of stats) {
      const row = document.createElement('div');
      row.className = 'result-row';
      const l = document.createElement('span');
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'result-value';
      v.textContent = value;
      row.append(l, v);
      box.appendChild(row);
    }
    const row = document.createElement('div');
    row.className = 'menu-buttons';
    row.append(
      button('Keep Riding', 'close-menu', null, 'btn primary big'),
      button('Back to Title', 'to-title', null, 'btn big'),
    );
    box.appendChild(row);
    root.appendChild(wrap);
  }

  const TUTORIAL_STEPS = [
    ['Welcome to Kota Sinar', 'You are a new ojek driver. Your old cub bike is waiting on the street. Move with WASD, drag the mouse to orbit the camera.'],
    ['Mount the bike', 'Walk up to your bike and press E to mount. W is throttle, S is brake, A and D steer. Space is the handbrake at speed.'],
    ['Take an order', 'Press Q to open the phone. Pick what you like: distance and price are all shown. Follow the green marker to the pickup, then the yellow one to the destination.'],
    ['Get paid and rank up', 'Finish a delivery and you get paid, plus a tip if you are fast. XP raises your rank, and rank unlocks districts, VIP orders and new bikes.'],
    ['Stay safe out there', 'Running out of fuel mid-trip is bad luck. Fill up at a gas station. Crashes damage the bike and draw police. When your wanted stars rise, hide until they cool down.'],
  ];

  function renderTutorial(s, data) {
    const step = (data && data.step) || 0;
    const [title, text] = TUTORIAL_STEPS[step];
    const { wrap, box } = panel(title, `Step ${step + 1} of ${TUTORIAL_STEPS.length}`);
    const p = document.createElement('p');
    p.className = 'codex-text';
    p.textContent = text;
    box.appendChild(p);
    const row = document.createElement('div');
    row.className = 'menu-buttons';
    if (step < TUTORIAL_STEPS.length - 1) {
      row.append(button('Next', 'tutorial-next', step + 1, 'btn primary'));
    } else {
      row.append(button('Ready to Ride', 'tutorial-done', null, 'btn primary'));
    }
    row.append(button('Skip', 'tutorial-done'));
    box.appendChild(row);
    root.appendChild(wrap);
  }

  return { show, hide, get current() { return current; } };
}
