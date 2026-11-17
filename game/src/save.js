// Save and load, in localStorage. The save is one versioned JSON object: the
// player, the garage, the orders, the day, and the settings. Loading validates
// the shape and falls back to a fresh game on anything unexpected, so a corrupt
// or old save never blocks the game. A feature only counts as working when its
// state survives a restart (offline-game-revival verify discipline).

import { SAVE_KEY } from './config.js';

const SAVE_VERSION = 1;

export function saveGame(data) {
  try {
    const payload = { version: SAVE_VERSION, savedAt: Date.now(), ...data };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    if (!data.player || !data.garage) return null;
    return data;
  } catch (error) {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch (error) { /* ignore */ }
}
