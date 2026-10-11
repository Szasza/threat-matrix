import { describe, expect, it, vi } from "vitest";
import { createRng, randomSeed } from "./rng";

describe("createRng", () => {
  it("produces the same sequence from the same seed", () => {
    const a = createRng(123);
    const b = createRng(123);
    const first = Array.from({ length: 20 }, () => a.next());
    const second = Array.from({ length: 20 }, () => b.next());
    expect(first).toEqual(second);
  });

  it("produces a different sequence from a different seed", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("stays within [0, 1)", () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("int() covers its whole range, roughly evenly", () => {
    const rng = createRng(2024);
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 10_000; i++) {
      counts[rng.int(10)] += 1;
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(850);
      expect(count).toBeLessThan(1150);
    }
  });

  it("can resume from a saved state", () => {
    const rng = createRng(5);
    rng.next();
    const resumed = createRng(rng.getState());
    expect(resumed.next()).toBe(rng.next());
  });
});

describe("randomSeed", () => {
  it("returns a uint32 derived from Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.5);
    expect(randomSeed()).toBe(2147483648);
    vi.restoreAllMocks();
  });
});
