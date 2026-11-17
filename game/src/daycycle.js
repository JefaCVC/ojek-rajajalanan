// The day: a clock that runs one full day in six real minutes, four shifts with
// different order types and traffic, rush hours that push prices up, and weather
// that changes the fare and the grip. The render layer reads the light level and
// the weather to paint the city; gameplay reads the shift and the multipliers.

import { DAY, WEATHER } from './config.js';

export function createDayCycle(random) {
  let hour = DAY.startHour;
  let weatherIndex = 0;
  let weatherTimer = WEATHER.cycleSeconds * 0.5;

  function shiftFor(h) {
    const wrapped = ((h % 24) + 24) % 24;
    for (const shift of DAY.shifts) {
      const from = shift.from;
      const to = shift.to;
      if (to <= 24) {
        if (wrapped >= from && wrapped < to) return shift;
      } else if (wrapped >= from || wrapped < to - 24) {
        return shift;
      }
    }
    return DAY.shifts[3];
  }

  function isRush(h) {
    const wrapped = ((h % 24) + 24) % 24;
    return DAY.rushHours.some(([from, to]) => wrapped >= from && wrapped < to);
  }

  function pickWeather() {
    const roll = random();
    let acc = 0;
    for (let i = 0; i < WEATHER.types.length; i += 1) {
      acc += WEATHER.types[i].weight;
      if (roll <= acc) return i;
    }
    return 0;
  }

  /** Light level 0..1: full sun at midday, dusk at 18:00, dark at night. */
  function lightLevel(h) {
    const wrapped = ((h % 24) + 24) % 24;
    if (wrapped >= 6 && wrapped < 17) return 1;
    if (wrapped >= 17 && wrapped < 19) return 1 - (wrapped - 17) / 2 * 0.55;
    if (wrapped >= 19 || wrapped < 5) return 0.42;
    if (wrapped >= 5 && wrapped < 6) return 0.42 + (wrapped - 5) * 0.58;
    return 1;
  }

  return {
    /** Advances the clock and the weather. Returns events that happened this step. */
    update(dt) {
      const events = [];
      const previousShift = shiftFor(hour).id;
      const previousRush = isRush(hour);
      hour += dt / DAY.secondsPerGameHour;
      if (hour >= 30) hour -= 24;
      const shift = shiftFor(hour);
      if (shift.id !== previousShift) events.push({ type: 'shift', shift });
      const rush = isRush(hour);
      if (rush && !previousRush) events.push({ type: 'rush-start' });
      if (!rush && previousRush) events.push({ type: 'rush-end' });
      weatherTimer -= dt;
      if (weatherTimer <= 0) {
        weatherTimer = WEATHER.cycleSeconds;
        const next = pickWeather();
        if (next !== weatherIndex) {
          weatherIndex = next;
          events.push({ type: 'weather', weather: WEATHER.types[weatherIndex] });
        }
      }
      return events;
    },
    get hour() { return hour; },
    get shift() { return shiftFor(hour); },
    get weather() { return WEATHER.types[weatherIndex]; },
    get rush() { return isRush(hour); },
    get light() { return lightLevel(hour); },
    get night() { return shiftFor(hour).id === 'malam'; },
    /** Combined fare multiplier from the shift, the rush hour, and the weather. */
    get fareMultiplier() {
      const shift = shiftFor(hour);
      let mult = shift.surge * WEATHER.types[weatherIndex].fare;
      if (isRush(hour)) mult *= 1.25;
      return mult;
    },
    get gripMultiplier() { return WEATHER.types[weatherIndex].grip; },
    get trafficMultiplier() { return shiftFor(hour).traffic; },
    setHour(value) { hour = value; },
    setWeather(id) {
      const index = WEATHER.types.findIndex((w) => w.id === id);
      if (index >= 0) weatherIndex = index;
    },
    serialize() { return { hour, weatherIndex, weatherTimer }; },
    restore(data) {
      if (!data) return;
      hour = typeof data.hour === 'number' ? data.hour : DAY.startHour;
      weatherIndex = data.weatherIndex || 0;
      weatherTimer = data.weatherTimer || WEATHER.cycleSeconds;
    },
  };
}
