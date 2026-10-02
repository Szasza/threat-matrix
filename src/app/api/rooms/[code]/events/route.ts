export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { gameStateForViewer } from "@/lib/decisions-disruptions/redact";
import { gameStore } from "@/lib/decisions-disruptions/store";
import type { GameState } from "@/lib/decisions-disruptions/types";
import { SSE_KEEPALIVE_MS } from "@/lib/rooms/constants";
import { roomStore } from "@/lib/rooms/store";
import type { Room } from "@/lib/rooms/types";

/**
 * The room and its game state are broadcast together, on the same payload,
 * over the room's existing SSE stream (rather than opening a second
 * connection) — this is a superset of the plain `Room` shape, so
 * `RoomLobby`'s existing `setRoom(JSON.parse(event.data))` keeps working
 * unchanged (it just ignores the extra `game` key); only game-phase-aware
 * consumers read `.game`.
 *
 * `game` is tailored per connection: non-host viewers get the redacted
 * state (no attacker names, no unnoticed reveal entries). Whether this
 * viewer is the host is re-checked on every send, since the host can be
 * reassigned mid-game.
 */
type RoomEventPayload = Room & { game: GameState | null };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = roomStore.getRoom(code);
  if (!room) {
    return new Response("Room not found", { status: 404 });
  }
  const cookieStore = await cookies();
  const participantId = cookieStore.get("dd_player_id")?.value;
  // An open stream is proof of presence: connecting (e.g. right after a page
  // reload) and every keep-alive re-confirm the participant, which clears a
  // "departing" mark left by the unloading page's beacon.
  const touch = () => {
    if (participantId) roomStore.touchParticipant(code, participantId);
  };
  touch();

  const encoder = new TextEncoder();
  let unsubscribeRoom: (() => void) | undefined;
  let unsubscribeGame: (() => void) | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let latestRoom = room;
      let latestGame = gameStore.getGame(code)?.state ?? null;

      const send = () => {
        const isHost =
          !!participantId && latestRoom.hostParticipantId === participantId;
        const payload: RoomEventPayload = {
          ...latestRoom,
          game: latestGame && gameStateForViewer(latestGame, isHost),
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      send();
      unsubscribeRoom = roomStore.subscribe(code, (nextRoom) => {
        latestRoom = nextRoom;
        send();
      });
      unsubscribeGame = gameStore.subscribe(code, (nextGame) => {
        latestGame = nextGame;
        send();
      });
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
        touch();
      }, SSE_KEEPALIVE_MS);
    },
    cancel() {
      unsubscribeRoom?.();
      unsubscribeGame?.();
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  request.signal.addEventListener("abort", () => {
    unsubscribeRoom?.();
    unsubscribeGame?.();
    if (keepAlive) clearInterval(keepAlive);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
