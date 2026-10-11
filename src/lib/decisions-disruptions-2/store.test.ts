import { describe, expect, it, vi } from "vitest";
import { createGameStore } from "./store";
import { testEvent } from "./testing";

const CODE = "AB12CD";
const ROUND_MS = 20 * 60 * 1000;

const library = [
  testEvent("a", {
    choices: [
      {
        id: "fix",
        label: "Fix it",
        hoursCost: 10,
        profitCost: 5,
        outcome: { narrative: "Fixed", triggers: ["follow-up"] },
      },
    ],
  }),
  testEvent("follow-up", { triggerOnly: true }),
];

function setup({ enforceRoundTimer = false } = {}) {
  let clock = 1_000;
  const store = createGameStore({
    now: () => clock,
    seed: () => 42,
    library,
  });
  store.createGame(CODE);
  store.startGame(CODE, { enforceRoundTimer });
  return {
    store,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe("createGameStore", () => {
  it("seeds a setup-phase game and records its RNG seed", () => {
    const store = createGameStore({ seed: () => 7, library });
    const state = store.createGame(CODE);
    expect(state.phase).toBe("setup");
    expect(store.getGame(CODE)).toMatchObject({
      settings: { enforceRoundTimer: false },
      seed: 7,
      rngState: 7,
      queue: [],
    });
  });

  it("works with its defaults", () => {
    const store = createGameStore();
    store.createGame(CODE);
    const state = store.startGame(CODE, { enforceRoundTimer: false });
    expect(state?.phase).toBe("round");
  });

  it("getGame returns a copy, not the live record", () => {
    const { store } = setup();
    const copy = store.getGame(CODE);
    copy?.state.openEvents.pop();
    expect(store.getGame(CODE)?.state.openEvents).toHaveLength(1);
  });

  it("returns undefined for an unknown room", () => {
    expect(createGameStore().getGame("NOPE12")).toBeUndefined();
  });

  describe("startGame", () => {
    it("starts round 1 with the committed settings", () => {
      const { store } = setup({ enforceRoundTimer: true });
      const record = store.getGame(CODE);
      expect(record?.settings).toEqual({ enforceRoundTimer: true });
      expect(record?.state).toMatchObject({
        phase: "round",
        round: 1,
        roundStartedAt: 1_000,
        roundTimerEnforced: true,
      });
      expect(record?.rngState).not.toBe(42);
    });

    it("normalizes untrusted settings from the client", () => {
      const store = createGameStore({ library });
      store.createGame("A", "nonsense" as never);
      store.startGame("A", { enforceRoundTimer: "yes" } as never);
      store.createGame("B");
      store.startGame("B", null as never);
      expect(store.getGame("A")?.settings).toEqual({
        enforceRoundTimer: false,
      });
      expect(store.getGame("B")?.settings).toEqual({
        enforceRoundTimer: false,
      });
    });

    it("refuses to start twice or for an unknown room", () => {
      const { store } = setup();
      expect(
        store.startGame(CODE, { enforceRoundTimer: false }),
      ).toBeUndefined();
      expect(
        store.startGame("NOPE12", { enforceRoundTimer: false }),
      ).toBeUndefined();
    });

    it("notifies subscribers", () => {
      const store = createGameStore({ library });
      store.createGame(CODE);
      const listener = vi.fn();
      store.subscribe(CODE, listener);
      store.startGame(CODE, { enforceRoundTimer: false });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ phase: "round" }),
      );
    });
  });

  describe("actions", () => {
    it("report not-found for an unknown room", () => {
      const store = createGameStore({ library });
      expect(store.endRound("NOPE12")).toEqual({
        ok: false,
        reason: "not-found",
      });
    });

    it("resolveChoice applies the choice, keeping the triggered event server-side", () => {
      const { store } = setup();
      const result = store.resolveChoice(CODE, "a@1", "fix");
      expect(result).toMatchObject({ ok: true, state: { hours: 70 } });
      expect(JSON.stringify(result)).not.toContain("follow-up");
      expect(store.getGame(CODE)?.queue).toEqual([
        { definitionId: "follow-up", triggeredBy: "Event a" },
      ]);
    });

    it("passes engine failures through without changing or broadcasting state", () => {
      const { store } = setup();
      const listener = vi.fn();
      store.subscribe(CODE, listener);
      const before = store.getGame(CODE);

      const result = store.purchaseUpgrade(CODE, "vpn-mfa");

      expect(result).toEqual({
        ok: false,
        reason: "locked",
        message: "Buy the previous tier for this asset first.",
      });
      expect(store.getGame(CODE)).toEqual(before);
      expect(listener).not.toHaveBeenCalled();
    });

    it("purchaseUpgrade buys and broadcasts", () => {
      const { store } = setup();
      const listener = vi.fn();
      store.subscribe(CODE, listener);
      expect(store.purchaseUpgrade(CODE, "vpn-patch")).toMatchObject({
        ok: true,
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("endRound moves to the next round, delivering triggered events", () => {
      const { store } = setup();
      store.resolveChoice(CODE, "a@1", "fix");
      const result = store.endRound(CODE);
      expect(result).toMatchObject({ ok: true, state: { round: 2 } });
      const record = store.getGame(CODE);
      expect(record?.queue).toEqual([]);
      expect(record?.state.openEvents.map((e) => e.id)).toEqual([
        "follow-up@2",
      ]);
    });

    it("updateUpgradeVote and castBallot record advisory votes", () => {
      const { store } = setup();
      store.updateUpgradeVote(CODE, "p1", "vpn-patch", true);
      store.castBallot(CODE, "p1", "a@1", "fix");
      store.updateUpgradeVote(CODE, "p2", "vpn-patch", true);
      store.updateUpgradeVote(CODE, "p2", "vpn-patch", false);
      expect(store.getGame(CODE)?.state).toMatchObject({
        upgradeVotes: { "vpn-patch": ["p1"] },
        eventBallots: { "a@1": { p1: "fix" } },
      });
    });

    it("is reproducible: the same seed and actions give the same game", () => {
      const first = setup().store;
      const second = setup().store;
      for (const store of [first, second]) {
        store.resolveChoice(CODE, "a@1", "fix");
        store.endRound(CODE);
      }
      expect(first.getGame(CODE)).toEqual(second.getGame(CODE));
    });
  });

  describe("enforceRoundTimer", () => {
    it("is a no-op for an unknown room", () => {
      expect(createGameStore().enforceRoundTimer("NOPE12")).toBe(false);
    });

    it("never ends a round when the room doesn't enforce the timer", () => {
      const { store, advance } = setup({ enforceRoundTimer: false });
      advance(ROUND_MS * 2);
      expect(store.enforceRoundTimer(CODE)).toBe(false);
      expect(store.getGame(CODE)?.state.round).toBe(1);
    });

    it("leaves a round alone until its time is up", () => {
      const { store, advance } = setup({ enforceRoundTimer: true });
      advance(ROUND_MS - 1);
      expect(store.enforceRoundTimer(CODE)).toBe(false);
    });

    it("ends an expired round, carrying open events over as ignored", () => {
      const { store, advance } = setup({ enforceRoundTimer: true });
      const listener = vi.fn();
      store.subscribe(CODE, listener);
      advance(ROUND_MS);

      expect(store.enforceRoundTimer(CODE)).toBe(true);

      const state = store.getGame(CODE)?.state;
      expect(state).toMatchObject({
        round: 2,
        roundStartedAt: 1_000 + ROUND_MS,
      });
      expect(state?.timeline).toEqual([
        expect.objectContaining({ type: "ignored", definitionId: "a" }),
      ]);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does nothing once the game is over", () => {
      let clock = 0;
      const crash = testEvent("crash", {
        choices: [],
        onDraw: { narrative: "Crash", sharePrice: -100 },
      });
      const store = createGameStore({ now: () => clock, library: [crash] });
      store.createGame(CODE);
      store.startGame(CODE, { enforceRoundTimer: true });
      clock += ROUND_MS * 2;
      expect(store.enforceRoundTimer(CODE)).toBe(false);
      expect(store.getGame(CODE)?.state.phase).toBe("lost");
    });

    it("runs before any action, which then applies to the new round", () => {
      const { store, advance } = setup({ enforceRoundTimer: true });
      advance(ROUND_MS + 1);
      const result = store.purchaseUpgrade(CODE, "vpn-patch");
      expect(result).toMatchObject({
        ok: true,
        state: {
          round: 2,
          ownedUpgrades: [{ upgradeId: "vpn-patch", round: 2 }],
        },
      });
    });
  });

  it("unsubscribe stops further notifications", () => {
    const { store } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(CODE, listener);
    unsubscribe();
    store.purchaseUpgrade(CODE, "vpn-patch");
    expect(listener).not.toHaveBeenCalled();
  });
});
