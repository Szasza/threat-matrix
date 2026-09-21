"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gameStore } from "@/lib/decisions-disruptions/store";
import { getGameById } from "@/lib/games/catalog";
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
  // Seeds a "setup"-phase GameState with default settings; the host adjusts
  // and commits the final GameSettings (the Nation State toggle) from
  // GameSetupPanel in the lobby when they click "Start Game".
  gameStore.createGame(room.code);
  redirect(`/room/${room.code}`);
}
