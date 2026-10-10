"use client";

import type { JSX } from "react";
import "@/lib/games/bootstrap.client";
import { getClientGameModule } from "@/lib/games/registry";

export interface GameSetupPanelProps {
  gameId: string;
  isHost: boolean;
  onStart: (settings: unknown) => void | Promise<void>;
}

/**
 * Thin shell over whichever game is being set up: the actual options (e.g.
 * D&D1's "Include Nation State attacks" checkbox) live in that game's own
 * `ClientGameModule.SetupOptions`, registered via `bootstrap.client`.
 */
export function GameSetupPanel({
  gameId,
  isHost,
  onStart,
}: GameSetupPanelProps): JSX.Element {
  const module = getClientGameModule(gameId);
  if (!module) {
    return <p className="text-sm text-rose-400">Unknown game: {gameId}</p>;
  }

  const SetupOptions = module.SetupOptions;
  return <SetupOptions isHost={isHost} onStart={onStart} />;
}
