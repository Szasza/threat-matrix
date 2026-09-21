import { cookies } from "next/headers";
import { gameStore } from "@/lib/decisions-disruptions/store";
import { roomStore } from "@/lib/rooms/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const cookieStore = await cookies();
  const participantId = cookieStore.get("dd_player_id")?.value;
  const room = roomStore.getRoom(code);
  if (!room) {
    return Response.json({ error: "not-found" }, { status: 404 });
  }
  if (!participantId || room.hostParticipantId !== participantId) {
    return Response.json(
      { error: "Only the host can end the round" },
      {
        status: 403,
      },
    );
  }

  const result = gameStore.endRound(code);
  if (!result.ok) {
    const status = result.reason === "not-found" ? 404 : 400;
    return Response.json(
      {
        error: result.reason,
        message: "error" in result ? result.error : undefined,
      },
      { status },
    );
  }

  return Response.json(
    { revealEntries: result.revealEntries },
    { status: 200 },
  );
}
