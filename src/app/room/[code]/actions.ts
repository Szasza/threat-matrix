"use server";

import { cookies } from "next/headers";
import "@/lib/games/bootstrap.server";
import { getServerGameModule } from "@/lib/games/registry";
import { roomStore } from "@/lib/rooms/store";

export async function joinRoomAction(
  code: string,
  displayName: string,
): Promise<void> {
  const cookieStore = await cookies();
  const participantId = cookieStore.get("dd_player_id")?.value;
  if (!participantId) {
    throw new Error("Missing player identity cookie");
  }

  const result = roomStore.joinRoom(code, { participantId, displayName });
  if (!result.ok) {
    throw new Error(`Room not found: ${code}`);
  }
}

export async function startGameAction(
  code: string,
  settings: unknown,
): Promise<void> {
  const cookieStore = await cookies();
  const participantId = cookieStore.get("dd_player_id")?.value;
  if (!participantId) {
    throw new Error("Missing player identity cookie");
  }

  const room = roomStore.getRoom(code);
  if (!room) {
    throw new Error(`Room not found: ${code}`);
  }
  if (room.hostParticipantId !== participantId) {
    throw new Error("Only the host can start the game");
  }

  const module = getServerGameModule(room.gameId);
  if (!module) {
    throw new Error(`Unknown game: ${room.gameId}`);
  }

  const state = module.store.startGame(code, settings);
  if (!state) {
    throw new Error(`Game not found or already started: ${code}`);
  }
}
