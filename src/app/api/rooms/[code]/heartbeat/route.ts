import { cookies } from "next/headers";
import "@/lib/games/bootstrap.server";
import { getServerGameModule } from "@/lib/games/registry.server";
import { roomStore } from "@/lib/rooms/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const cookieStore = await cookies();
  const participantId = cookieStore.get("dd_player_id")?.value;
  const found = participantId
    ? roomStore.touchParticipant(code, participantId)
    : false;

  if (!found) {
    return Response.json({ removed: true }, { status: 410 });
  }

  // Every connected client polls this route, so it doubles as a periodic
  // trigger for a game's time-based rules (e.g. D&D2's round timer).
  const room = roomStore.getRoom(code);
  if (room) {
    getServerGameModule(room.gameId)?.onHeartbeat?.(code);
  }
  return new Response(null, { status: 204 });
}
