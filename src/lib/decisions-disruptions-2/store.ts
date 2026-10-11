import { EventEmitter } from "node:events";
import type { ActionResult, GameRecord, GameStore } from "@/lib/games/module";
import {
  castBallot,
  closeRound,
  type EngineGame,
  type EngineResult,
  endRound,
  initialGameState,
  purchaseUpgrade,
  type QueuedEvent,
  resolveChoice,
  setUpgradeVote,
  startGame,
} from "./engine.server";
import { EVENTS } from "./events.server";
import { createRng, type Rng, randomSeed } from "./rng";
import type { EventDefinition, GameSettings, GameState } from "./types";

/**
 * Server-only per-room record. `seed` and `rngState` make a playthrough
 * reproducible (replay the same actions from the same seed); `queue` holds
 * the events already triggered for next round, which players mustn't see.
 */
export interface Dd2GameRecord extends GameRecord<GameState, GameSettings> {
  seed: number;
  rngState: number;
  queue: QueuedEvent[];
}

export type Dd2ActionResult = ActionResult<GameState>;

export interface Dd2GameStore extends GameStore<GameState, GameSettings> {
  getGame(code: string): Dd2GameRecord | undefined;
  /** Host-only (enforced by the module's action declaration). */
  purchaseUpgrade(code: string, upgradeId: string): Dd2ActionResult;
  /** Host-only. `choiceId` "ignore" sets the event aside instead of resolving it. */
  resolveChoice(
    code: string,
    eventId: string,
    choiceId: string,
  ): Dd2ActionResult;
  /** Host-only. */
  endRound(code: string): Dd2ActionResult;
  /** Non-host only. Voting twice or unvoting without a vote is a no-op success. */
  updateUpgradeVote(
    code: string,
    participantId: string,
    upgradeId: string,
    vote: boolean,
  ): Dd2ActionResult;
  /** Non-host only. Replaces the participant's earlier pick for the same event. */
  castBallot(
    code: string,
    participantId: string,
    eventId: string,
    choiceId: string,
  ): Dd2ActionResult;
  /**
   * Force-ends the current round if the room enforces the round timer and
   * it has run out. Called before every action and from the room's
   * heartbeat, so an expired round is resolved even if nobody acts.
   * Returns whether a round was ended.
   */
  enforceRoundTimer(code: string): boolean;
}

export interface GameStoreOptions {
  now?: () => number;
  seed?: () => number;
  library?: readonly EventDefinition[];
}

function normalizeSettings(settings: unknown): GameSettings {
  const enforceRoundTimer =
    typeof settings === "object" &&
    settings !== null &&
    (settings as Record<string, unknown>).enforceRoundTimer === true;
  return { enforceRoundTimer };
}

export function createGameStore({
  now = Date.now,
  seed = randomSeed,
  library = EVENTS,
}: GameStoreOptions = {}): Dd2GameStore {
  const games = new Map<string, Dd2GameRecord>();
  const emitter = new EventEmitter();
  emitter.setMaxListeners(100);

  function emitUpdate(code: string, state: GameState): void {
    emitter.emit(code, structuredClone(state));
  }

  function commit(
    code: string,
    record: Dd2GameRecord,
    game: EngineGame,
    rng: Rng,
  ): void {
    record.state = game.state;
    record.queue = game.queue;
    record.rngState = rng.getState();
    emitUpdate(code, record.state);
  }

  function expireIfNeeded(code: string, record: Dd2GameRecord): boolean {
    const { state } = record;
    const expired =
      record.settings.enforceRoundTimer &&
      state.phase === "round" &&
      now() - state.roundStartedAt >= state.roundDurationMs;
    if (!expired) return false;

    const rng = createRng(record.rngState);
    const game = closeRound(
      { state, queue: record.queue },
      rng,
      now(),
      library,
    );
    commit(code, record, game, rng);
    return true;
  }

  function run(
    code: string,
    operation: (game: EngineGame, rng: Rng) => EngineResult,
  ): Dd2ActionResult {
    const record = games.get(code);
    if (!record) return { ok: false, reason: "not-found" };
    expireIfNeeded(code, record);

    const rng = createRng(record.rngState);
    const result = operation({ state: record.state, queue: record.queue }, rng);
    if (!result.ok) {
      return { ok: false, reason: result.reason, message: result.message };
    }
    commit(code, record, result.game, rng);
    return { ok: true, state: structuredClone(record.state) };
  }

  return {
    createGame(code, settings) {
      const gameSeed = seed() >>> 0;
      const state = initialGameState();
      games.set(code, {
        settings: normalizeSettings(settings),
        seed: gameSeed,
        rngState: gameSeed,
        queue: [],
        state,
      });
      return structuredClone(state);
    },

    getGame(code) {
      const record = games.get(code);
      return record ? structuredClone(record) : undefined;
    },

    startGame(code, settings) {
      const record = games.get(code);
      if (record?.state.phase !== "setup") return undefined;
      record.settings = normalizeSettings(settings);
      const rng = createRng(record.rngState);
      commit(
        code,
        record,
        startGame(record.settings, rng, now(), library),
        rng,
      );
      return structuredClone(record.state);
    },

    purchaseUpgrade(code, upgradeId) {
      return run(code, (game) => purchaseUpgrade(game, upgradeId));
    },

    resolveChoice(code, eventId, choiceId) {
      return run(code, (game, rng) =>
        resolveChoice(game, eventId, choiceId, rng, library),
      );
    },

    endRound(code) {
      return run(code, (game, rng) => endRound(game, rng, now(), library));
    },

    updateUpgradeVote(code, participantId, upgradeId, vote) {
      return run(code, (game) =>
        setUpgradeVote(game, participantId, upgradeId, vote),
      );
    },

    castBallot(code, participantId, eventId, choiceId) {
      return run(code, (game) =>
        castBallot(game, participantId, eventId, choiceId),
      );
    },

    enforceRoundTimer(code) {
      const record = games.get(code);
      return record ? expireIfNeeded(code, record) : false;
    },

    subscribe(code, listener) {
      emitter.on(code, listener);
      return () => {
        emitter.off(code, listener);
      };
    },
  };
}

// See the identical comment in `src/lib/rooms/store.ts`: this globalThis
// cache keeps one store per process — required in production so Server
// Actions, pages and Route Handlers share state — and is not a
// multi-process-safe design.
declare global {
  var __dd2GameStore: Dd2GameStore | undefined;
}

globalThis.__dd2GameStore ??= createGameStore();

export const gameStore = globalThis.__dd2GameStore;
