import { cookies } from "next/headers";
import "@/lib/games/bootstrap.server";
import { authorizeAction } from "@/lib/games/module";
import { getServerGameModule } from "@/lib/games/registry";
import { roomStore } from "@/lib/rooms/store";

/**
 * Single generic endpoint for every game's actions, replacing the three
 * D&D1-specific routes (`game/cart`, `game/vote`, `game/end-round`) that
 * used to each duplicate their own host/participant authorization check.
 * The room is looked up, its game module resolved by `room.gameId`, the
 * named action's declared authorization mode is enforced generically, and
 * only then is its handler called — adding a new action for any game,
 * present or future, is a module change (see `module.server.ts` files), not
 * a new route file.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; action: string }> },
) {
  const { code, action } = await params;

  const room = roomStore.getRoom(code);
  if (!room) {
    return Response.json({ error: "not-found" }, { status: 404 });
  }

  const module = getServerGameModule(room.gameId);
  if (!module) {
    return Response.json({ error: "not-found" }, { status: 404 });
  }

  const gameAction = module.actions[action];
  if (!gameAction) {
    return Response.json({ error: "unknown-action" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const participantId = cookieStore.get("dd_player_id")?.value;

  const authorization = authorizeAction(
    gameAction.authorization,
    room,
    participantId,
  );
  if (!authorization.ok) {
    return Response.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const payload = await request.json().catch(() => ({}));
  // Every authorization mode requires `participantId` to match a real
  // participant to succeed, so it's guaranteed to be a non-empty string here.
  const result = gameAction.handler(code, participantId as string, payload);

  if (!result.ok) {
    const status = result.reason === "not-found" ? 404 : 400;
    return Response.json(
      { error: result.reason, message: result.message },
      { status },
    );
  }

  return new Response(null, { status: 204 });
}
