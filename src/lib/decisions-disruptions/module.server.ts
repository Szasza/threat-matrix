import "server-only";
import type { ActionResult, ServerGameModule } from "@/lib/games/module";
import { registerServerGame } from "@/lib/games/registry.server";
import { gameStateForViewer } from "./redact";
import { gameStore } from "./store";
import type { GameSettings, GameState } from "./types";

function getStringField(payload: unknown, key: string): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function cartAction(action: "add" | "remove") {
  return {
    authorization: "host" as const,
    handler: (
      code: string,
      _participantId: string,
      payload: unknown,
    ): ActionResult<GameState> => {
      const defenceName = getStringField(payload, "defenceName");
      if (!defenceName) {
        return {
          ok: false,
          reason: "invalid-payload",
          message: "defenceName is required.",
        };
      }
      return gameStore.updateCart(code, defenceName, action);
    },
  };
}

function voteAction(action: "vote" | "unvote") {
  return {
    authorization: "non-host-participant" as const,
    handler: (
      code: string,
      participantId: string,
      payload: unknown,
    ): ActionResult<GameState> => {
      const defenceName = getStringField(payload, "defenceName");
      if (!defenceName) {
        return {
          ok: false,
          reason: "invalid-payload",
          message: "defenceName is required.",
        };
      }
      return gameStore.updateVote(code, participantId, defenceName, action);
    },
  };
}

export const decisionsAndDisruptionsServerModule: ServerGameModule<
  GameState,
  GameSettings
> = {
  id: "decisions-and-disruptions",
  store: gameStore,
  actions: {
    "add-to-cart": cartAction("add"),
    "remove-from-cart": cartAction("remove"),
    vote: voteAction("vote"),
    unvote: voteAction("unvote"),
    "end-round": {
      authorization: "host",
      handler: (code): ActionResult<GameState> => {
        const result = gameStore.endRound(code);
        if (!result.ok) {
          return {
            ok: false,
            reason: result.reason,
            message: "error" in result ? result.error : undefined,
          };
        }
        return { ok: true, state: result.state };
      },
    },
  },
  getPublicState(room, participantId) {
    const state = gameStore.getGame(room.code)?.state;
    if (!state) {
      return null;
    }
    return gameStateForViewer(state, room.hostParticipantId === participantId);
  },
};

registerServerGame(decisionsAndDisruptionsServerModule);
