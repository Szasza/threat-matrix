import { describe, expect, it, vi } from "vitest";
import { gameStore } from "@/lib/decisions-disruptions/store";
import { gameStore as dd2GameStore } from "@/lib/decisions-disruptions-2/store";
import { roomStore } from "@/lib/rooms/store";
// Importing the route also imports `bootstrap.server`, registering D&D1's
// server module as a side effect.
import { POST } from "./route";

let cookieValue: string | undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "dd_player_id" && cookieValue !== undefined
        ? { name, value: cookieValue }
        : undefined,
  }),
}));

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/rooms/test/game/actions/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function post(code: string, action: string, body: unknown = {}) {
  return POST(makeRequest(body), { params: Promise.resolve({ code, action }) });
}

function setupRoom(): string {
  const { room } = roomStore.createRoom({
    gameId: "decisions-and-disruptions",
    hostDisplayName: "Host",
    hostParticipantId: "host-1",
  });
  roomStore.joinRoom(room.code, {
    participantId: "player-1",
    displayName: "Player",
  });
  gameStore.createGame(room.code);
  gameStore.startGame(room.code, { includeNationState: false });
  return room.code;
}

describe("POST /api/rooms/[code]/game/actions/[action]", () => {
  it("404s for an unknown room", async () => {
    cookieValue = "host-1";
    const response = await post("NOPE12", "add-to-cart", {
      defenceName: "Firewall office",
    });
    expect(response.status).toBe(404);
  });

  it("404s for an unknown action", async () => {
    const code = setupRoom();
    cookieValue = "host-1";
    const response = await post(code, "does-not-exist");
    expect(response.status).toBe(404);
  });

  it("rejects a host-only action from a non-host participant with 403", async () => {
    const code = setupRoom();
    cookieValue = "player-1";
    const response = await post(code, "add-to-cart", {
      defenceName: "Firewall office",
    });
    expect(response.status).toBe(403);
  });

  it("rejects a host-only action with no participant cookie at all", async () => {
    const code = setupRoom();
    cookieValue = undefined;
    const response = await post(code, "end-round");
    expect(response.status).toBe(403);
  });

  it("allows the host to add to the cart and responds 204 with no body", async () => {
    const code = setupRoom();
    cookieValue = "host-1";
    const response = await post(code, "add-to-cart", {
      defenceName: "Firewall office",
    });
    expect(response.status).toBe(204);
    expect(gameStore.getGame(code)?.state.cart).toHaveLength(1);
  });

  it(
    "rejects the host from voting with 403 — the exact check this " +
      "generalization risks losing (D&D1's /game/vote route used to enforce " +
      "it inline)",
    async () => {
      const code = setupRoom();
      cookieValue = "host-1";
      const response = await post(code, "vote", {
        defenceName: "Firewall office",
      });
      expect(response.status).toBe(403);
    },
  );

  it("allows a non-host participant to vote and responds 204", async () => {
    const code = setupRoom();
    cookieValue = "player-1";
    const response = await post(code, "vote", {
      defenceName: "Firewall office",
    });
    expect(response.status).toBe(204);
    expect(gameStore.getGame(code)?.state.votes).toEqual({
      "Firewall office": ["player-1"],
    });
  });

  it("rejects a stranger with no room membership at all", async () => {
    const code = setupRoom();
    cookieValue = "not-in-this-room";
    const response = await post(code, "vote", {
      defenceName: "Firewall office",
    });
    expect(response.status).toBe(403);
  });

  it("maps a domain failure to 400 with the store's reason and message", async () => {
    const code = setupRoom();
    cookieValue = "host-1";
    await post(code, "add-to-cart", { defenceName: "CCTV office" });
    await post(code, "add-to-cart", { defenceName: "CCTV plant" });
    await post(code, "add-to-cart", { defenceName: "Firewall office" });

    const response = await post(code, "end-round");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("over-budget");
    expect(body.message).toMatch(/exceeds available budget/);
  });

  it("rejects an invalid payload with 400", async () => {
    const code = setupRoom();
    cookieValue = "host-1";
    const response = await post(code, "add-to-cart", {});
    expect(response.status).toBe(400);
  });
});

describe("POST /api/rooms/[code]/game/actions/[action] for D&D2", () => {
  function setupDd2Room(): { code: string; eventId: string } {
    const { room } = roomStore.createRoom({
      gameId: "decisions-and-disruptions-2",
      hostDisplayName: "Host",
      hostParticipantId: "host-1",
    });
    roomStore.joinRoom(room.code, {
      participantId: "player-1",
      displayName: "Player",
    });
    // Pin the game's seed so round 1 is known to have open events.
    vi.spyOn(Math, "random").mockReturnValueOnce(0.5);
    dd2GameStore.createGame(room.code);
    dd2GameStore.startGame(room.code, { enforceRoundTimer: false });
    const eventId =
      dd2GameStore.getGame(room.code)?.state.openEvents[0]?.id ?? "";
    return { code: room.code, eventId };
  }

  it("routes to D&D2's module and lets the host commit a choice", async () => {
    const { code, eventId } = setupDd2Room();
    cookieValue = "host-1";
    const response = await post(code, "resolve-choice", {
      eventId,
      choiceId: "ignore",
    });
    expect(response.status).toBe(204);
    expect(dd2GameStore.getGame(code)?.state.openEvents[0].ignored).toBe(true);
  });

  it("rejects a player committing a choice with 403", async () => {
    const { code, eventId } = setupDd2Room();
    cookieValue = "player-1";
    const response = await post(code, "resolve-choice", {
      eventId,
      choiceId: "ignore",
    });
    expect(response.status).toBe(403);
  });

  it("bars the host from casting an advisory ballot with 403", async () => {
    const { code, eventId } = setupDd2Room();
    cookieValue = "host-1";
    const response = await post(code, "cast-ballot", {
      eventId,
      choiceId: "ignore",
    });
    expect(response.status).toBe(403);
  });

  it("returns the engine's reason and message on a rejected action", async () => {
    const { code } = setupDd2Room();
    cookieValue = "host-1";
    const response = await post(code, "purchase-upgrade", {
      upgradeId: "vpn-mfa",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "locked",
      message: "Buy the previous tier for this asset first.",
    });
  });
});
