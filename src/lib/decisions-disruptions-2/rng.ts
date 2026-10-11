/**
 * A small seeded PRNG (mulberry32), so every draw and roll in a game can be
 * reproduced from its seed — for debugging a reported playthrough and for
 * deterministic engine tests. Its whole state is one uint32, which the
 * store persists between actions (`getState`) rather than keeping a live
 * generator around.
 */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  getState(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    int: (maxExclusive) => Math.floor(next() * maxExclusive),
    getState: () => state,
  };
}

/** A fresh uint32 seed for a new game. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
