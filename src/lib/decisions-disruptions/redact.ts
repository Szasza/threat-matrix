import type { GameState, RevealEntry } from "./types";

/**
 * Narrows a game state to what a non-game-master player may know: reveal
 * entries they wouldn't have noticed (`visibleToPlayers: false`) are dropped,
 * and the rest are reduced to their effect — no attacker or step name. Applied server-side to
 * every non-host payload (SSE stream and initial page render), so the hidden
 * data never reaches a player's browser.
 */
export function redactGameStateForPlayer(state: GameState): GameState {
  return {
    ...state,
    revealHistory: state.revealHistory.map((entries) =>
      entries
        .filter((entry) => entry.visibleToPlayers)
        .map(
          ({ countered, narrative, visibleToPlayers }): RevealEntry => ({
            countered,
            narrative,
            visibleToPlayers,
          }),
        ),
    ),
  };
}

export function gameStateForViewer(
  state: GameState,
  isHost: boolean,
): GameState {
  return isHost ? state : redactGameStateForPlayer(state);
}
