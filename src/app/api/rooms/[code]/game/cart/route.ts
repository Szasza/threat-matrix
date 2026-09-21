import { cookies } from "next/headers";
import { gameStore } from "@/lib/decisions-disruptions/store";
import { roomStore } from "@/lib/rooms/store";

interface CartRequestBody {
  defenceName?: unknown;
  action?: unknown;
}

export async function POST(
  request: Request,
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
      { error: "Only the host can edit the cart" },
      { status: 403 },
    );
  }

  const body: CartRequestBody = await request.json().catch(() => ({}));
  const { defenceName, action } = body;
  if (
    typeof defenceName !== "string" ||
    (action !== "add" && action !== "remove")
  ) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = gameStore.updateCart(code, defenceName, action);
  if (!result.ok) {
    const status = result.reason === "not-found" ? 404 : 400;
    return Response.json({ error: result.reason }, { status });
  }

  return new Response(null, { status: 204 });
}
