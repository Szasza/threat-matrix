import { describe, expect, it, vi } from "vitest";
import { gameStore } from "@/lib/decisions-disruptions/store";
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
