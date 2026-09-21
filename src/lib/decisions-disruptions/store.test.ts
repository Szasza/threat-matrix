import { afterEach, describe, expect, it, vi } from "vitest";
import { createGameStore } from "./store";

const CODE = "AB12CD";
const settings = { includeNationState: true };

describe("createGameStore", () => {
  it("seeds a 'setup'-phase game with no purchases yet", () => {
    const store = createGameStore();
    const state = store.createGame(CODE);

    expect(state).toEqual({
      phase: "setup",
      round: 1,
      ownedDefences: [],
      cart: [],
      revealHistory: [],
    });
  });

  it("getGame returns a copy, not the live record", () => {
    const store = createGameStore();
    store.createGame(CODE);

    const first = store.getGame(CODE);
    first?.state.cart.push({
      name: "Firewall office",
      cost: 30,
      category: "cyber_defence",
      hidden: false,
    });

    expect(store.getGame(CODE)?.state.cart).toHaveLength(0);
  });

  it("returns undefined for an unknown room code", () => {
    const store = createGameStore();
    expect(store.getGame("NOPE12")).toBeUndefined();
  });

  describe("startGame", () => {
    it("transitions phase 'setup' -> 'round' and commits the settings", () => {
      const store = createGameStore();
      store.createGame(CODE);

      const state = store.startGame(CODE, settings);

      expect(state?.phase).toBe("round");
      expect(state?.round).toBe(1);
      expect(store.getGame(CODE)?.settings).toEqual(settings);
    });

    it("returns undefined for an unknown room code", () => {
      const store = createGameStore();
      expect(store.startGame("NOPE12", settings)).toBeUndefined();
    });

    it("returns undefined if the game has already started", () => {
      const store = createGameStore();
      store.createGame(CODE);
      store.startGame(CODE, settings);

      expect(store.startGame(CODE, settings)).toBeUndefined();
    });
  });

  describe("updateCart", () => {
    function startedStore() {
      const store = createGameStore();
      store.createGame(CODE);
      store.startGame(CODE, settings);
      return store;
    }

    it("adds a visible defence to the cart", () => {
      const store = startedStore();
      const result = store.updateCart(CODE, "Firewall office", "add");

      expect(result).toEqual({
        ok: true,
        state: expect.objectContaining({
          cart: [expect.objectContaining({ name: "Firewall office" })],
        }),
      });
    });

    it("is idempotent when adding a defence already in the cart", () => {
      const store = startedStore();
      store.updateCart(CODE, "Firewall office", "add");
      const result = store.updateCart(CODE, "Firewall office", "add");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state.cart).toHaveLength(1);
      }
    });

    it("removes a defence from the cart", () => {
      const store = startedStore();
      store.updateCart(CODE, "Firewall office", "add");
      const result = store.updateCart(CODE, "Firewall office", "remove");

      expect(result).toEqual({
        ok: true,
        state: expect.objectContaining({ cart: [] }),
      });
    });

    it("is idempotent when removing a defence not in the cart", () => {
      const store = startedStore();
      const result = store.updateCart(CODE, "Firewall office", "remove");

      expect(result).toEqual({
        ok: true,
        state: expect.objectContaining({ cart: [] }),
      });
    });

    it("rejects a hidden defence before Asset audit has been bought", () => {
      const store = startedStore();
      const result = store.updateCart(CODE, "Upgrade PC", "add");

      expect(result).toEqual({ ok: false, reason: "unknown-defence" });
    });

    it("rejects an unrecognised defence name", () => {
      const store = startedStore();
      const result = store.updateCart(CODE, "Not a real defence", "add");

      expect(result).toEqual({ ok: false, reason: "unknown-defence" });
    });

    it("rejects cart edits before the game has started", () => {
      const store = createGameStore();
      store.createGame(CODE);

      const result = store.updateCart(CODE, "Firewall office", "add");

      expect(result).toEqual({ ok: false, reason: "not-in-round" });
    });

    it("rejects cart edits for an unknown room code", () => {
      const store = createGameStore();
      expect(store.updateCart("NOPE12", "Firewall office", "add")).toEqual({
        ok: false,
        reason: "not-found",
      });
    });

    it("drops a hidden defence from the cart once the Asset audit backing its eligibility is removed", () => {
      const store = startedStore();
      store.updateCart(CODE, "Asset audit", "add");
      store.updateCart(CODE, "Upgrade PC", "add");

      const result = store.updateCart(CODE, "Asset audit", "remove");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state.cart.map((d) => d.name)).toEqual([]);
      }
    });

    it("keeps a hidden defence in the cart if Asset audit is already owned from an earlier round", () => {
      const store = startedStore();
      store.updateCart(CODE, "Asset audit", "add");
      store.endRound(CODE); // commits Asset audit to ownedDefences, round 1 -> 2

      const result = store.updateCart(CODE, "Upgrade PC", "add");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state.cart.map((d) => d.name)).toEqual(["Upgrade PC"]);
      }
    });
  });

  describe("endRound", () => {
    function startedStore() {
      const store = createGameStore();
      store.createGame(CODE);
      store.startGame(CODE, settings);
      return store;
    }

    it("resolves the round, advances to round 2, and clears the cart", () => {
      const store = startedStore();
      store.updateCart(CODE, "Firewall office", "add");

      const result = store.endRound(CODE);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state.round).toBe(2);
        expect(result.state.phase).toBe("round");
        expect(result.state.cart).toEqual([]);
        expect(result.state.ownedDefences).toEqual([
          {
            defence: expect.objectContaining({ name: "Firewall office" }),
            round: 1,
          },
        ]);
        expect(result.revealEntries.length).toBeGreaterThan(0);
      }
    });

    it("moves to phase 'finished' after round 4", () => {
      const store = startedStore();
      for (let round = 1; round <= 4; round++) {
        const result = store.endRound(CODE);
        expect(result.ok).toBe(true);
      }
      expect(store.getGame(CODE)?.state.phase).toBe("finished");
    });

    it("rejects an over-budget cart without mutating state", () => {
      const store = startedStore();
      store.updateCart(CODE, "CCTV office", "add");
      store.updateCart(CODE, "CCTV plant", "add");
      store.updateCart(CODE, "Antivirus", "add"); // 130k > the 100k round-1 budget

      const before = store.getGame(CODE);
      const result = store.endRound(CODE);

      expect(result).toEqual({
        ok: false,
        reason: "over-budget",
        error: expect.stringContaining("exceeds available budget"),
      });
      expect(store.getGame(CODE)).toEqual(before);
    });

    it("rejects ending a round that hasn't started", () => {
      const store = createGameStore();
      store.createGame(CODE);

      expect(store.endRound(CODE)).toEqual({
        ok: false,
        reason: "not-in-round",
      });
    });

    it("rejects an unknown room code", () => {
      const store = createGameStore();
      expect(store.endRound("NOPE12")).toEqual({
        ok: false,
        reason: "not-found",
      });
    });
  });

  describe("subscribe", () => {
    it("notifies a subscriber on cart changes and round resolution", () => {
      const store = createGameStore();
      store.createGame(CODE);
      store.startGame(CODE, settings);

      const listener = vi.fn();
      store.subscribe(CODE, listener);

      store.updateCart(CODE, "Firewall office", "add");
      expect(listener).toHaveBeenCalledTimes(1);

      store.endRound(CODE);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("stops notifying once unsubscribed", () => {
      const store = createGameStore();
      store.createGame(CODE);
      store.startGame(CODE, settings);

      const listener = vi.fn();
      const unsubscribe = store.subscribe(CODE, listener);
      unsubscribe();

      store.updateCart(CODE, "Firewall office", "add");
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe("gameStore singleton caching", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.__ddGameStore = undefined;
    vi.resetModules();
  });

  it("caches the store on globalThis outside production", async () => {
    vi.resetModules();
    globalThis.__ddGameStore = undefined;
    vi.stubEnv("NODE_ENV", "test");

    const { gameStore } = await import("./store");

    expect(globalThis.__ddGameStore).toBe(gameStore);
  });

  it("does not cache the store on globalThis in production", async () => {
    vi.resetModules();
    globalThis.__ddGameStore = undefined;
    vi.stubEnv("NODE_ENV", "production");

    await import("./store");

    expect(globalThis.__ddGameStore).toBeUndefined();
  });
});
