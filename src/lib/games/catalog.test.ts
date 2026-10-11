import { describe, expect, it } from "vitest";
import { GAMES, getGameById } from "@/lib/games/catalog";

describe("GAMES", () => {
  it("includes the Decisions & Disruptions entry with a complete shape", () => {
    const game = GAMES.find((g) => g.id === "decisions-and-disruptions");

    expect(game).toBeDefined();
    expect(game?.name).toBe("Decisions & Disruptions");
    expect(game?.description).toContain("decisions-disruptions.org");
    expect(game?.minPlayers).toBe(3);
    expect(game?.maxPlayers).toBe(5);
    expect(game?.estimatedMinutes).toBe(90);
  });

  it("includes the Decisions & Disruptions 2 entry", () => {
    const game = getGameById("decisions-and-disruptions-2");

    expect(game?.name).toBe("Decisions & Disruptions 2");
    expect(game?.minPlayers).toBe(3);
    expect(game?.maxPlayers).toBe(5);
  });

  it("has unique ids", () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is not empty, so the portal always has at least one game to show", () => {
    expect(GAMES.length).toBeGreaterThan(0);
  });
});

describe("getGameById", () => {
  it("returns the matching game for a known id", () => {
    const game = getGameById("decisions-and-disruptions");
    expect(game?.id).toBe("decisions-and-disruptions");
  });

  it("returns undefined for an unknown id", () => {
    expect(getGameById("not-a-real-game")).toBeUndefined();
  });
});
