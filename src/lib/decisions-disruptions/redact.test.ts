import { describe, expect, it } from "vitest";
import { gameStateForViewer, redactGameStateForPlayer } from "./redact";
import type { GameState } from "./types";

const state: GameState = {
  phase: "round",
  round: 3,
  ownedDefences: [],
  cart: [],
  votes: {},
  revealHistory: [
    [
      {
        attackName: "DoSing Kiddie",
        stepName: "",
        countered: true,
        narrative: "This attack has not started yet.",
        visibleToPlayers: false,
      },
      {
        attackName: "Scanning Kiddie",
        stepName: "Scan offices",
        countered: true,
        narrative:
          "The office firewall intercepts a number of scanning attempts.",
        visibleToPlayers: true,
      },
    ],
    [
      {
        attackName: "Mafia APT PC Offices",
        stepName: "Infected USB offices",
        countered: false,
        narrative: "No visible effect.",
        visibleToPlayers: false,
      },
    ],
  ],
};

describe("redactGameStateForPlayer", () => {
  it("drops entries the players wouldn't have noticed, keeping round slots", () => {
    const redacted = redactGameStateForPlayer(state);

    expect(redacted.revealHistory).toHaveLength(2);
    expect(redacted.revealHistory[0]).toHaveLength(1);
    expect(redacted.revealHistory[1]).toEqual([]);
  });

  it("reduces every remaining entry to its effect, without attacker or step name", () => {
    const [entry] = redactGameStateForPlayer(state).revealHistory[0];

    expect(entry).toEqual({
      countered: true,
      narrative:
        "The office firewall intercepts a number of scanning attempts.",
      visibleToPlayers: true,
    });
    expect(entry).not.toHaveProperty("attackName");
    expect(entry).not.toHaveProperty("stepName");
    const payload = JSON.stringify(redactGameStateForPlayer(state));
    expect(payload).not.toContain("Kiddie");
    expect(payload).not.toContain("Scan offices");
  });

  it("leaves the rest of the state and the original untouched", () => {
    const redacted = redactGameStateForPlayer(state);

    expect(redacted.round).toBe(3);
    expect(state.revealHistory[0]).toHaveLength(2);
    expect(state.revealHistory[0][1].attackName).toBe("Scanning Kiddie");
  });
});

describe("gameStateForViewer", () => {
  it("gives the game master the full state", () => {
    expect(gameStateForViewer(state, true)).toBe(state);
  });

  it("gives players the redacted state", () => {
    expect(gameStateForViewer(state, false)).toEqual(
      redactGameStateForPlayer(state),
    );
  });
});
