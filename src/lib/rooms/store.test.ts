import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HEARTBEAT_INTERVAL_MS,
  STALE_AFTER_MS,
  SWEEP_TICK_MS,
} from "@/lib/rooms/constants";
import { createRoomStore } from "@/lib/rooms/store";

describe("createRoomStore", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a room with the host as its sole participant", () => {
    const store = createRoomStore();
    const { room, hostParticipant } = store.createRoom({
      gameId: "decisions-and-disruptions",
      hostDisplayName: "Alice",
      hostParticipantId: "host-1",
    });

    expect(room.participants).toEqual([hostParticipant]);
    expect(room.hostParticipantId).toBe("host-1");

    const fetched = store.getRoom(room.code);
    expect(fetched).toEqual(room);
  });

  it("returns undefined for an unknown code", () => {
    const store = createRoomStore();
    expect(store.getRoom("NOPE12")).toBeUndefined();
  });

  it("returns a copy from getRoom, not the live object", () => {
    const store = createRoomStore();
    const { room } = store.createRoom({
      gameId: "decisions-and-disruptions",
      hostDisplayName: "Alice",
      hostParticipantId: "host-1",
    });

    const first = store.getRoom(room.code);
    first?.participants.push({
      id: "intruder",
      displayName: "Intruder",
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
    });

    const second = store.getRoom(room.code);
    expect(second?.participants).toHaveLength(1);
  });

  it("returns room-not-found when joining an unknown code", () => {
    const store = createRoomStore();
    const result = store.joinRoom("NOPE12", {
      participantId: "p1",
      displayName: "Bob",
    });
    expect(result).toEqual({ ok: false, reason: "room-not-found" });
  });

  it("adds a second participant on join with a new participantId", () => {
    const store = createRoomStore();
    const { room } = store.createRoom({
      gameId: "decisions-and-disruptions",
      hostDisplayName: "Alice",
      hostParticipantId: "host-1",
    });

    const result = store.joinRoom(room.code, {
      participantId: "p2",
      displayName: "Bob",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.room.participants).toHaveLength(2);
    }
  });

  it("does not duplicate a participant rejoining with the same participantId", () => {
    const store = createRoomStore();
    const { room } = store.createRoom({
      gameId: "decisions-and-disruptions",
      hostDisplayName: "Alice",
      hostParticipantId: "host-1",
    });
    store.joinRoom(room.code, { participantId: "p2", displayName: "Bob" });

    const before = store.getRoom(room.code);
    const beforeLastSeen = before?.participants.find(
      (p) => p.id === "p2",
    )?.lastSeenAt;

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 1_000);
    const result = store.joinRoom(room.code, {
      participantId: "p2",
      displayName: "Bob renamed",
    });
    vi.useRealTimers();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.room.participants).toHaveLength(2);
      const rejoined = result.room.participants.find((p) => p.id === "p2");
      expect(rejoined?.displayName).toBe("Bob renamed");
      expect(rejoined?.lastSeenAt).toBeGreaterThan(beforeLastSeen ?? 0);
    }
  });

  it("trims and caps an overlong displayName on createRoom", () => {
    const store = createRoomStore();
    const { hostParticipant } = store.createRoom({
      gameId: "decisions-and-disruptions",
      hostDisplayName: `  ${"a".repeat(100)}  `,
      hostParticipantId: "host-1",
    });

    expect(hostParticipant.displayName).toBe("a".repeat(40));
  });

  it("rejects an empty or whitespace-only displayName on createRoom", () => {
    const store = createRoomStore();
    expect(() =>
      store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "   ",
        hostParticipantId: "host-1",
      }),
    ).toThrow("Display name is required");
  });

  it("trims and rejects an invalid displayName on joinRoom", () => {
    const store = createRoomStore();
    const { room } = store.createRoom({
      gameId: "decisions-and-disruptions",
      hostDisplayName: "Alice",
      hostParticipantId: "host-1",
    });

    const result = store.joinRoom(room.code, {
      participantId: "p2",
      displayName: `  ${"b".repeat(100)}  `,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.participant.displayName).toBe("b".repeat(40));
    }

    expect(() =>
      store.joinRoom(room.code, { participantId: "p3", displayName: "" }),
    ).toThrow("Display name is required");
  });

  it("removes a participant on leave and reassigns host if needed", () => {
    const store = createRoomStore();
    const { room } = store.createRoom({
      gameId: "decisions-and-disruptions",
      hostDisplayName: "Alice",
      hostParticipantId: "host-1",
    });
    store.joinRoom(room.code, { participantId: "p2", displayName: "Bob" });

    store.leaveRoom(room.code, "host-1");

    const after = store.getRoom(room.code);
    expect(after?.participants).toHaveLength(1);
    expect(after?.participants[0].id).toBe("p2");
    expect(after?.hostParticipantId).toBe("p2");
  });

  describe("leaveRoom edge cases", () => {
    it("is a no-op for an unknown room code", () => {
      const store = createRoomStore();
      expect(() => store.leaveRoom("NOPE12", "p1")).not.toThrow();
    });

    it("is a no-op when the participant is not in the room", () => {
      const store = createRoomStore();
      const { room } = store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "Alice",
        hostParticipantId: "host-1",
      });

      store.leaveRoom(room.code, "not-a-participant");

      const after = store.getRoom(room.code);
      expect(after?.participants).toHaveLength(1);
      expect(after?.hostParticipantId).toBe("host-1");
    });

    it("leaves hostParticipantId unchanged when a non-host participant leaves", () => {
      const store = createRoomStore();
      const { room } = store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "Alice",
        hostParticipantId: "host-1",
      });
      store.joinRoom(room.code, { participantId: "p2", displayName: "Bob" });

      store.leaveRoom(room.code, "p2");

      const after = store.getRoom(room.code);
      expect(after?.participants.map((p) => p.id)).toEqual(["host-1"]);
      expect(after?.hostParticipantId).toBe("host-1");
    });

    it("reassigns the host to the earliest-joined remaining participant when multiple remain", () => {
      vi.useFakeTimers();
      const store = createRoomStore();
      const { room } = store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "Alice",
        hostParticipantId: "host-1",
      });

      // Distinct joinedAt timestamps so the reassignment's sort is
      // unambiguous, rather than relying on insertion-order tie-breaking.
      vi.setSystemTime(Date.now() + 1_000);
      store.joinRoom(room.code, { participantId: "p2", displayName: "Bob" });
      vi.setSystemTime(Date.now() + 1_000);
      store.joinRoom(room.code, { participantId: "p3", displayName: "Carla" });

      store.leaveRoom(room.code, "host-1");

      const after = store.getRoom(room.code);
      expect(after?.participants.map((p) => p.id)).toEqual(["p2", "p3"]);
      expect(after?.hostParticipantId).toBe("p2");
    });
  });

  describe("touchParticipant edge cases", () => {
    it("returns false for an unknown room code", () => {
      const store = createRoomStore();
      expect(store.touchParticipant("NOPE12", "p1")).toBe(false);
    });

    it("returns false when the participant is not in the room", () => {
      const store = createRoomStore();
      const { room } = store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "Alice",
        hostParticipantId: "host-1",
      });

      expect(store.touchParticipant(room.code, "not-a-participant")).toBe(
        false,
      );
    });
  });

  describe("subscribe", () => {
    it("notifies a subscriber with the updated room when it changes", () => {
      const store = createRoomStore();
      const { room } = store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "Alice",
        hostParticipantId: "host-1",
      });

      const listener = vi.fn();
      store.subscribe(room.code, listener);

      store.joinRoom(room.code, { participantId: "p2", displayName: "Bob" });

      expect(listener).toHaveBeenCalledTimes(1);
      const [notifiedRoom] = listener.mock.calls[0];
      expect(notifiedRoom.participants).toHaveLength(2);
    });

    it("stops notifying once unsubscribed", () => {
      const store = createRoomStore();
      const { room } = store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "Alice",
        hostParticipantId: "host-1",
      });

      const listener = vi.fn();
      const unsubscribe = store.subscribe(room.code, listener);
      unsubscribe();

      store.joinRoom(room.code, { participantId: "p2", displayName: "Bob" });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("heartbeat / TTL sweep", () => {
    it("keeps a participant present just under STALE_AFTER_MS", () => {
      vi.useFakeTimers();
      const store = createRoomStore();
      const { room } = store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "Alice",
        hostParticipantId: "host-1",
      });

      vi.advanceTimersByTime(STALE_AFTER_MS - 1_000);

      expect(store.getRoom(room.code)?.participants).toHaveLength(1);
    });

    it("removes a participant once STALE_AFTER_MS has elapsed and a sweep tick has run", () => {
      vi.useFakeTimers();
      const store = createRoomStore();
      const { room } = store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "Alice",
        hostParticipantId: "host-1",
      });

      vi.advanceTimersByTime(STALE_AFTER_MS + SWEEP_TICK_MS);

      expect(store.getRoom(room.code)?.participants).toHaveLength(0);
    });

    it("never removes a participant who keeps heartbeating", () => {
      vi.useFakeTimers();
      const store = createRoomStore();
      const { room } = store.createRoom({
        gameId: "decisions-and-disruptions",
        hostDisplayName: "Alice",
        hostParticipantId: "host-1",
      });

      const totalSteps = Math.ceil(
        (STALE_AFTER_MS * 3) / HEARTBEAT_INTERVAL_MS,
      );
      for (let i = 0; i < totalSteps; i++) {
        vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
        store.touchParticipant(room.code, "host-1");
      }

      expect(store.getRoom(room.code)?.participants).toHaveLength(1);
    });
  });
});

describe("roomStore singleton caching", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.__ddRoomStore = undefined;
    vi.resetModules();
  });

  it("shares one store across module evaluations in production", async () => {
    vi.resetModules();
    globalThis.__ddRoomStore = undefined;
    vi.stubEnv("NODE_ENV", "production");

    const { roomStore: first } = await import("@/lib/rooms/store");
    // Next.js evaluates this module separately for pages/Server Actions and
    // Route Handlers in a production build; a fresh evaluation must reuse
    // the same store, or the heartbeat route can't see rooms created by
    // `createRoomAction` and evicts every participant.
    vi.resetModules();
    const { roomStore: second } = await import("@/lib/rooms/store");

    expect(globalThis.__ddRoomStore).toBe(first);
    expect(second).toBe(first);
  });

  it("caches the store on globalThis outside production", async () => {
    vi.resetModules();
    globalThis.__ddRoomStore = undefined;
    vi.stubEnv("NODE_ENV", "test");

    const { roomStore } = await import("@/lib/rooms/store");

    expect(globalThis.__ddRoomStore).toBe(roomStore);
  });
});
