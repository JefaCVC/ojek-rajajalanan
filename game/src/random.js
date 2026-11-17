// A small seeded random generator (mulberry32), so the city, the orders, and the
// screenshot scenes come out the same for the same seed.

export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer from min to max, inclusive, from the given random function. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One item from an array, picked by the given random function. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
