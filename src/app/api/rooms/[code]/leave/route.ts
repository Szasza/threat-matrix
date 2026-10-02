import { cookies } from "next/headers";
import { roomStore } from "@/lib/rooms/store";

/**
 * `?departing=1` is the page-unload beacon: it can't tell a closed tab from
 * a reload, so it only marks the participant as departing (see
 * `markDeparting`). Without it — the explicit "Leave room" button — the
 * participant is removed immediately.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const cookieStore = await cookies();
  const participantId = cookieStore.get("dd_player_id")?.value;
  if (participantId) {
    if (new URL(request.url).searchParams.has("departing")) {
      roomStore.markDeparting(code, participantId);
    } else {
      roomStore.leaveRoom(code, participantId);
    }
  }
  return new Response(null, { status: 204 });
}
