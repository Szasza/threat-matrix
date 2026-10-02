import { EventEmitter } from "node:events";
import { generateRoomCode } from "@/lib/rooms/codes";
import {
  LEAVE_GRACE_MS,
  STALE_AFTER_MS,
  SWEEP_TICK_MS,
} from "@/lib/rooms/constants";
import type { Participant, Room } from "@/lib/rooms/types";

export interface CreateRoomInput {
  gameId: string;
  hostDisplayName: string;
  hostParticipantId: string;
}

export interface CreateRoomResult {
  room: Room;
  hostParticipant: Participant;
}

export interface JoinRoomInput {
  participantId: string;
  displayName: string;
}

export type JoinRoomResult =
  | { ok: true; room: Room; participant: Participant }
  | { ok: false; reason: "room-not-found" };

export interface RoomStore {
  createRoom(input: CreateRoomInput): CreateRoomResult;
  getRoom(code: string): Room | undefined;
  joinRoom(code: string, input: JoinRoomInput): JoinRoomResult;
  leaveRoom(code: string, participantId: string): void;
  /**
   * Soft leave for a page unload, which can't tell a closed tab from a
   * reload: the participant stays for `LEAVE_GRACE_MS` (regardless of the
   * heartbeat timeout), and is removed by the sweep only if nothing
   * (`touchParticipant`, `joinRoom`) re-confirms them.
   */
  markDeparting(code: string, participantId: string): void;
  touchParticipant(code: string, participantId: string): boolean;
  subscribe(code: string, listener: (room: Room) => void): () => void;
}

const MAX_DISPLAY_NAME_LENGTH = 40;

/**
 * Server-side guard: the client form already blocks empty submissions, but
 * these Server Actions are directly-invokable endpoints (not gated behind
 * `<form action>`), so a request can reach here with an empty, whitespace-only,
 * or arbitrarily long `displayName`. Reject/trim here rather than trusting the
 * client — an unbounded name would otherwise be broadcast verbatim to every
 * SSE subscriber on every roster change and bloat the room record forever.
 */
function sanitizeDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Display name is required");
  }
  return trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH);
}

function cloneParticipant(participant: Participant): Participant {
  return { ...participant };
}

function cloneRoom(room: Room): Room {
  return { ...room, participants: room.participants.map(cloneParticipant) };
}

/**
 * Reassigns `hostParticipantId` after a participant is removed from a room:
 * if the removed participant was the host, the next-remaining participant
 * (earliest `joinedAt`) becomes host; if the room is now empty, the host id
 * is cleared to "" since an empty room has no meaningful host.
 */
function reassignHostIfNeeded(room: Room, removedParticipantId: string): void {
  if (room.hostParticipantId !== removedParticipantId) {
    return;
  }
  if (room.participants.length === 0) {
    room.hostParticipantId = "";
    return;
  }
  const nextHost = [...room.participants].sort(
    (a, b) => a.joinedAt - b.joinedAt,
  )[0];
  room.hostParticipantId = nextHost.id;
}

function departingKey(code: string, participantId: string): string {
  return `${code}:${participantId}`;
}

export function createRoomStore(): RoomStore {
  const rooms = new Map<string, Room>();
  // Removal deadlines for participants whose page unloaded (see
  // `markDeparting`), keyed by `departingKey`. Kept off `Participant` so it
  // isn't broadcast with the roster. While set, it replaces the stale check.
  const departingUntil = new Map<string, number>();
  const emitter = new EventEmitter();
  emitter.setMaxListeners(100);

  function emitUpdate(room: Room): void {
    emitter.emit(room.code, cloneRoom(room));
  }

  const store: RoomStore = {
    createRoom({ gameId, hostDisplayName, hostParticipantId }) {
      const code = generateRoomCode((candidate) => rooms.has(candidate));
      const now = Date.now();
      const hostParticipant: Participant = {
        id: hostParticipantId,
        displayName: sanitizeDisplayName(hostDisplayName),
        joinedAt: now,
        lastSeenAt: now,
      };
      const room: Room = {
        code,
        gameId,
        hostParticipantId: hostParticipant.id,
        participants: [hostParticipant],
        status: "waiting",
        createdAt: now,
      };
      rooms.set(code, room);
      return {
        room: cloneRoom(room),
        hostParticipant: cloneParticipant(hostParticipant),
      };
    },

    getRoom(code) {
      const room = rooms.get(code);
      return room ? cloneRoom(room) : undefined;
    },

    joinRoom(code, { participantId, displayName }) {
      const room = rooms.get(code);
      if (!room) {
        return { ok: false, reason: "room-not-found" };
      }

      const sanitizedDisplayName = sanitizeDisplayName(displayName);
      const now = Date.now();
      const existing = room.participants.find((p) => p.id === participantId);
      let participant: Participant;
      if (existing) {
        existing.displayName = sanitizedDisplayName;
        existing.lastSeenAt = now;
        departingUntil.delete(departingKey(code, participantId));
        participant = existing;
      } else {
        participant = {
          id: participantId,
          displayName: sanitizedDisplayName,
          joinedAt: now,
          lastSeenAt: now,
        };
        room.participants.push(participant);
      }

      emitUpdate(room);
      return {
        ok: true,
        room: cloneRoom(room),
        participant: cloneParticipant(participant),
      };
    },

    leaveRoom(code, participantId) {
      const room = rooms.get(code);
      if (!room) {
        return;
      }
      const index = room.participants.findIndex((p) => p.id === participantId);
      if (index === -1) {
        return;
      }
      room.participants.splice(index, 1);
      departingUntil.delete(departingKey(code, participantId));
      reassignHostIfNeeded(room, participantId);
      emitUpdate(room);
    },

    markDeparting(code, participantId) {
      const participant = rooms
        .get(code)
        ?.participants.find((p) => p.id === participantId);
      if (!participant) {
        return;
      }
      // The beacon itself is a sign of life, so the full grace period runs
      // from now — even past the usual `STALE_AFTER_MS` heartbeat timeout.
      departingUntil.set(
        departingKey(code, participantId),
        Date.now() + LEAVE_GRACE_MS,
      );
    },

    touchParticipant(code, participantId) {
      const room = rooms.get(code);
      if (!room) {
        return false;
      }
      const participant = room.participants.find((p) => p.id === participantId);
      if (!participant) {
        return false;
      }
      participant.lastSeenAt = Date.now();
      departingUntil.delete(departingKey(code, participantId));
      return true;
    },

    subscribe(code, listener) {
      emitter.on(code, listener);
      return () => {
        emitter.off(code, listener);
      };
    },
  };

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      const isGone = (p: Participant): boolean => {
        const deadline = departingUntil.get(departingKey(room.code, p.id));
        return deadline === undefined
          ? now - p.lastSeenAt > STALE_AFTER_MS
          : now > deadline;
      };
      const staleParticipants = room.participants.filter(isGone);
      if (staleParticipants.length === 0) {
        continue;
      }
      room.participants = room.participants.filter((p) => !isGone(p));
      for (const stale of staleParticipants) {
        departingUntil.delete(departingKey(room.code, stale.id));
        reassignHostIfNeeded(room, stale.id);
      }
      emitUpdate(room);
    }
  }, SWEEP_TICK_MS);
  sweep.unref();

  return store;
}

// The globalThis cache below is what makes this a single store per process.
// It is load-bearing in production, not just a dev convenience: Next.js
// bundles server code into separate module graphs (pages/Server Actions vs
// Route Handlers), so without it `/room/[code]` and `createRoomAction` would
// see one store while `/api/rooms/[code]/heartbeat` etc. see another, empty
// one — every heartbeat would 410 and evict the participant. It also survives
// dev-server HMR re-evaluation. It does NOT make this store safe across
// multiple processes/replicas — this store is explicitly an in-memory,
// single-process design, which is an accepted, deliberate limitation.
declare global {
  var __ddRoomStore: RoomStore | undefined;
}

globalThis.__ddRoomStore ??= createRoomStore();

export const roomStore = globalThis.__ddRoomStore;
