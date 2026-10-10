"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import "@/lib/games/bootstrap.server";
import { getGameById } from "@/lib/games/catalog";
import { getServerGameModule } from "@/lib/games/registry.server";
import { roomStore } from "@/lib/rooms/store";

export async function createRoomAction(
  gameId: string,
  hostDisplayName: string,
): Promise<void> {
  const game = getGameById(gameId);
  if (!game) {
    throw new Error(`Unknown game: ${gameId}`);
  }

  const cookieStore = await cookies();
  const hostParticipantId = cookieStore.get("dd_player_id")?.value;
  if (!hostParticipantId) {
    throw new Error("Missing player identity cookie");
  }

  const { room } = roomStore.createRoom({
    gameId,
    hostDisplayName,
    hostParticipantId,
  });

  const module = getServerGameModule(gameId);
  if (!module) {
    throw new Error(`Unknown game: ${gameId}`);
  }
  // Seeds a "setup"-phase game state with default settings; the host adjusts
  // and commits the final settings from the module's SetupOptions in the
  // lobby when they click "Start Game".
  module.store.createGame(room.code);
  redirect(`/room/${room.code}`);
}
