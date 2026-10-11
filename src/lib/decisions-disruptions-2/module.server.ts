import "server-only";
import type { ActionResult, ServerGameModule } from "@/lib/games/module";
import { registerServerGame } from "@/lib/games/registry.server";
import { gameStore } from "./store";
import type { GameSettings, GameState } from "./types";

function getStringFields<K extends string>(
  payload: unknown,
  keys: readonly K[],
): Record<K, string> | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }
  const fields = {} as Record<K, string>;
  for (const key of keys) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value !== "string" || value === "") {
      return undefined;
    }
    fields[key] = value;
  }
  return fields;
}

function invalidPayload(keys: readonly string[]): ActionResult<GameState> {
  return {
    ok: false,
    reason: "invalid-payload",
    message: `${keys.join(" and ")} ${keys.length > 1 ? "are" : "is"} required.`,
  };
}

/**
 * Validates the payload's string fields before handing them to `run`, so
 * every handler rejects a malformed request body the same way.
 */
function withFields<K extends string>(
  keys: readonly K[],
  run: (
    code: string,
    participantId: string,
    fields: Record<K, string>,
  ) => ActionResult<GameState>,
) {
  return (
    code: string,
    participantId: string,
    payload: unknown,
  ): ActionResult<GameState> => {
    const fields = getStringFields(payload, keys);
    return fields ? run(code, participantId, fields) : invalidPayload(keys);
  };
}

function upgradeVoteAction(vote: boolean) {
  return {
    authorization: "non-host-participant" as const,
    handler: withFields(["upgradeId"], (code, participantId, { upgradeId }) =>
      gameStore.updateUpgradeVote(code, participantId, upgradeId, vote),
    ),
  };
}

export const decisionsAndDisruptions2ServerModule: ServerGameModule<
  GameState,
  GameSettings
> = {
  id: "decisions-and-disruptions-2",
  store: gameStore,
  actions: {
    "purchase-upgrade": {
      authorization: "host",
      handler: withFields(
        ["upgradeId"],
        (code, _participantId, { upgradeId }) =>
          gameStore.purchaseUpgrade(code, upgradeId),
      ),
    },
    "resolve-choice": {
      authorization: "host",
      handler: withFields(
        ["eventId", "choiceId"],
        (code, _participantId, { eventId, choiceId }) =>
          gameStore.resolveChoice(code, eventId, choiceId),
      ),
    },
    "end-round": {
      authorization: "host",
      handler: (code) => gameStore.endRound(code),
    },
    "vote-upgrade": upgradeVoteAction(true),
    "unvote-upgrade": upgradeVoteAction(false),
    "cast-ballot": {
      authorization: "non-host-participant",
      handler: withFields(
        ["eventId", "choiceId"],
        (code, participantId, { eventId, choiceId }) =>
          gameStore.castBallot(code, participantId, eventId, choiceId),
      ),
    },
  },
  // Every viewer — host included — sees the same state: unlike D&D1 there is
  // no game-master-only information on it. What players mustn't see (the
  // event library, next round's triggered events, the RNG state) never
  // leaves the server-side `Dd2GameRecord` in the first place.
  getPublicState(room) {
    return gameStore.getGame(room.code)?.state ?? null;
  },
  onHeartbeat(code) {
    gameStore.enforceRoundTimer(code);
  },
};

registerServerGame(decisionsAndDisruptions2ServerModule);
