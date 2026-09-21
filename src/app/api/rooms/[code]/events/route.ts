export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { gameStore } from "@/lib/decisions-disruptions/store";
import type { GameState } from "@/lib/decisions-disruptions/types";
import { roomStore } from "@/lib/rooms/store";
import type { Room } from "@/lib/rooms/types";

/**
 * The room and its game state are broadcast together, on the same payload,
 * over the room's existing SSE stream (rather than opening a second
 * connection) — this is a superset of the plain `Room` shape, so
 * `RoomLobby`'s existing `setRoom(JSON.parse(event.data))` keeps working
 * unchanged (it just ignores the extra `game` key); only game-phase-aware
 * consumers read `.game`.
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

  const encoder = new TextEncoder();
  let unsubscribeRoom: (() => void) | undefined;
  let unsubscribeGame: (() => void) | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let latestRoom = room;
      let latestGame = gameStore.getGame(code)?.state ?? null;

      const send = () => {
        const payload: RoomEventPayload = { ...latestRoom, game: latestGame };
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
      }, 15_000);
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
