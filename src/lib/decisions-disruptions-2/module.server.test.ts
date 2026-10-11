import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServerGameModule } from "@/lib/games/registry.server";
import { decisionsAndDisruptions2ServerModule as module } from "./module.server";
import { gameStore } from "./store";

// Each test uses its own room code so tests never interfere with each
// other on the shared `gameStore` singleton (mirroring how distinct rooms
// never interfere with each other in the running app).
let nextCode = 0;
function freshRoomCode(): string {
  nextCode += 1;
  return `DD2T${nextCode}`;
}

// The shared store seeds each game from `Math.random`; pin it so every
// test's game draws the same (known) round-1 events.
beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function startedGame(code: string) {
  gameStore.createGame(code);
  gameStore.startGame(code, { enforceRoundTimer: false });
  // biome-ignore lint/style/noNonNullAssertion: the game was just created
  return gameStore.getGame(code)!.state;
}

function room(code: string) {
  return { code, hostParticipantId: "host-1" };
}

describe("decisionsAndDisruptions2ServerModule", () => {
  it("registers itself under the catalog id", () => {
    expect(getServerGameModule("decisions-and-disruptions-2")).toBe(module);
  });

  it("declares host-only state changes and non-host advisory votes", () => {
    expect(
      Object.fromEntries(
        Object.entries(module.actions).map(([name, action]) => [
          name,
          action.authorization,
        ]),
      ),
    ).toEqual({
      "purchase-upgrade": "host",
      "resolve-choice": "host",
      "end-round": "host",
      "vote-upgrade": "non-host-participant",
      "unvote-upgrade": "non-host-participant",
      "cast-ballot": "non-host-participant",
    });
  });

  describe('"purchase-upgrade"', () => {
    it("buys the named upgrade", () => {
      const code = freshRoomCode();
      startedGame(code);
      const result = module.actions["purchase-upgrade"].handler(
        code,
        "host-1",
        {
          upgradeId: "soc-triage",
        },
      );
      expect(result).toMatchObject({ ok: true });
      expect(gameStore.getGame(code)?.state.ownedUpgrades).toHaveLength(1);
    });

    it("rejects a payload missing upgradeId", () => {
      const result = module.actions["purchase-upgrade"].handler(
        freshRoomCode(),
        "host-1",
        {},
      );
      expect(result).toEqual({
        ok: false,
        reason: "invalid-payload",
        message: "upgradeId is required.",
      });
    });

    it("rejects a non-object payload", () => {
      const result = module.actions["purchase-upgrade"].handler(
        freshRoomCode(),
        "host-1",
        "nope",
      );
      expect(result).toMatchObject({ reason: "invalid-payload" });
    });
  });

  describe('"resolve-choice"', () => {
    it("passes the event and choice through to the store", () => {
      const code = freshRoomCode();
      const state = startedGame(code);
      const event = state.openEvents[0];
      const result = module.actions["resolve-choice"].handler(code, "host-1", {
        eventId: event.id,
        choiceId: "ignore",
      });
      expect(result).toMatchObject({ ok: true });
      expect(gameStore.getGame(code)?.state.openEvents[0].ignored).toBe(true);
    });

    it("rejects a payload missing a field, or with an empty one", () => {
      const handler = module.actions["resolve-choice"].handler;
      const expected = {
        ok: false,
        reason: "invalid-payload",
        message: "eventId and choiceId are required.",
      };
      expect(handler("X", "host-1", { eventId: "a@1" })).toEqual(expected);
      expect(handler("X", "host-1", { eventId: "", choiceId: "c" })).toEqual(
        expected,
      );
    });
  });

  describe('"end-round"', () => {
    it("advances the round", () => {
      const code = freshRoomCode();
      startedGame(code);
      expect(
        module.actions["end-round"].handler(code, "host-1", {}),
      ).toMatchObject({
        ok: true,
        state: { round: 2 },
      });
    });

    it("reports a game that hasn't started", () => {
      const code = freshRoomCode();
      gameStore.createGame(code);
      expect(
        module.actions["end-round"].handler(code, "host-1", {}),
      ).toMatchObject({
        ok: false,
        reason: "not-in-round",
      });
    });
  });

  describe("advisory votes", () => {
    it('"vote-upgrade" and "unvote-upgrade" toggle the voter', () => {
      const code = freshRoomCode();
      startedGame(code);
      module.actions["vote-upgrade"].handler(code, "p1", {
        upgradeId: "soc-triage",
      });
      expect(gameStore.getGame(code)?.state.upgradeVotes).toEqual({
        "soc-triage": ["p1"],
      });
      module.actions["unvote-upgrade"].handler(code, "p1", {
        upgradeId: "soc-triage",
      });
      expect(gameStore.getGame(code)?.state.upgradeVotes).toEqual({});
    });

    it('"cast-ballot" records the participant\'s pick', () => {
      const code = freshRoomCode();
      const event = startedGame(code).openEvents[0];
      module.actions["cast-ballot"].handler(code, "p1", {
        eventId: event.id,
        choiceId: "ignore",
      });
      expect(gameStore.getGame(code)?.state.eventBallots).toEqual({
        [event.id]: { p1: "ignore" },
      });
    });

    it('"cast-ballot" rejects a malformed payload', () => {
      expect(
        module.actions["cast-ballot"].handler("X", "p1", { eventId: 3 }),
      ).toMatchObject({ reason: "invalid-payload" });
    });
  });

  describe("getPublicState", () => {
    it("returns the same state to the host and to players", () => {
      const code = freshRoomCode();
      const state = startedGame(code);
      expect(module.getPublicState(room(code), "host-1")).toEqual(state);
      expect(module.getPublicState(room(code), "player-2")).toEqual(state);
    });

    it("never includes the server-only record fields", () => {
      const code = freshRoomCode();
      startedGame(code);
      const publicState = module.getPublicState(room(code), "host-1");
      expect(publicState).not.toHaveProperty("queue");
      expect(publicState).not.toHaveProperty("seed");
    });

    it("is null when no game exists", () => {
      expect(module.getPublicState(room("NOPE"), "host-1")).toBeNull();
    });
  });

  it("onHeartbeat enforces the round timer", () => {
    const code = freshRoomCode();
    gameStore.createGame(code);
    gameStore.startGame(code, { enforceRoundTimer: true });
    module.onHeartbeat?.(code);
    // Not expired yet: still round 1.
    expect(gameStore.getGame(code)?.state.round).toBe(1);
  });
});
