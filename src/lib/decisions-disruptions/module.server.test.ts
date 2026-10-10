import { describe, expect, it } from "vitest";
import { decisionsAndDisruptionsServerModule as module } from "./module.server";
import { gameStore } from "./store";

// Each test uses its own room code so tests never interfere with each
// other on the shared `gameStore` singleton `module.server.ts` registers
// against (mirroring how distinct rooms never interfere with each other in
// the running app).
let nextCode = 0;
function freshRoomCode(): string {
  nextCode += 1;
  return `TEST${nextCode}`;
}

function startedGame(code: string) {
  gameStore.createGame(code);
  gameStore.startGame(code, { includeNationState: false });
}

describe("decisionsAndDisruptionsServerModule.actions", () => {
  describe('"add-to-cart"', () => {
    it("adds the named defence to the cart", () => {
      const code = freshRoomCode();
      startedGame(code);

      const result = module.actions["add-to-cart"].handler(code, "host-1", {
        defenceName: "Firewall office",
      });

      expect(result).toMatchObject({ ok: true });
      expect(gameStore.getGame(code)?.state.cart).toHaveLength(1);
    });

    it("rejects a payload missing defenceName", () => {
      const code = freshRoomCode();
      startedGame(code);

      const result = module.actions["add-to-cart"].handler(code, "host-1", {});

      expect(result).toEqual({
        ok: false,
        reason: "invalid-payload",
        message: "defenceName is required.",
      });
    });

    it('is declared "host" authorization', () => {
      expect(module.actions["add-to-cart"].authorization).toBe("host");
    });
  });

  describe('"remove-from-cart"', () => {
    it("removes the named defence from the cart", () => {
      const code = freshRoomCode();
      startedGame(code);
      module.actions["add-to-cart"].handler(code, "host-1", {
        defenceName: "Firewall office",
      });

      const result = module.actions["remove-from-cart"].handler(
        code,
        "host-1",
        { defenceName: "Firewall office" },
      );

      expect(result).toMatchObject({ ok: true });
      expect(gameStore.getGame(code)?.state.cart).toHaveLength(0);
    });
  });

  describe('"vote" / "unvote"', () => {
    it("records a vote from a non-host participant", () => {
      const code = freshRoomCode();
      startedGame(code);

      const result = module.actions.vote.handler(code, "player-1", {
        defenceName: "Firewall office",
      });

      expect(result).toMatchObject({ ok: true });
      expect(gameStore.getGame(code)?.state.votes).toEqual({
        "Firewall office": ["player-1"],
      });
    });

    it("removes a vote on unvote", () => {
      const code = freshRoomCode();
      startedGame(code);
      module.actions.vote.handler(code, "player-1", {
        defenceName: "Firewall office",
      });

      module.actions.unvote.handler(code, "player-1", {
        defenceName: "Firewall office",
      });

      expect(gameStore.getGame(code)?.state.votes).toEqual({});
    });

    it('are declared "non-host-participant" authorization — this is the check that bars the game master from voting', () => {
      expect(module.actions.vote.authorization).toBe("non-host-participant");
      expect(module.actions.unvote.authorization).toBe("non-host-participant");
    });
  });

  describe('"end-round"', () => {
    it("advances the round on success", () => {
      const code = freshRoomCode();
      startedGame(code);

      const result = module.actions["end-round"].handler(code, "host-1", {});

      expect(result).toMatchObject({ ok: true, state: { round: 2 } });
    });

    it("maps the store's over-budget `error` string to the generic `message` field", () => {
      const code = freshRoomCode();
      startedGame(code);
      // Round 1's allowance is 100k; 50k + 50k + 30k busts the budget.
      module.actions["add-to-cart"].handler(code, "host-1", {
        defenceName: "CCTV office",
      });
      module.actions["add-to-cart"].handler(code, "host-1", {
        defenceName: "CCTV plant",
      });
      module.actions["add-to-cart"].handler(code, "host-1", {
        defenceName: "Firewall office",
      });

      const result = module.actions["end-round"].handler(code, "host-1", {});

      expect(result).toEqual({
        ok: false,
        reason: "over-budget",
        message: expect.stringContaining("exceeds available budget"),
      });
    });

    it('is declared "host" authorization', () => {
      expect(module.actions["end-round"].authorization).toBe("host");
    });
  });
});

describe("decisionsAndDisruptionsServerModule.getPublicState", () => {
  it("returns null when no game record exists for the room", () => {
    const code = freshRoomCode();
    expect(
      module.getPublicState({ code, hostParticipantId: "host-1" }, "host-1"),
    ).toBeNull();
  });

  it("gives the host the unredacted state", () => {
    const code = freshRoomCode();
    startedGame(code);

    const state = module.getPublicState(
      { code, hostParticipantId: "host-1" },
      "host-1",
    );

    expect(state?.revealHistory).toBeDefined();
  });
});
