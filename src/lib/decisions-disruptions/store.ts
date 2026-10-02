import { EventEmitter } from "node:events";
import { DEFENCES } from "./defences";
import { resolveRound, unlockedDefences } from "./engine.server";
import type { Defence, GameSettings, GameState, RevealEntry } from "./types";

export interface GameRecord {
  settings: GameSettings;
  state: GameState;
}

export type CartAction = "add" | "remove";

export type VoteAction = "vote" | "unvote";

export type UpdateCartResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: "not-found" | "not-in-round" | "unknown-defence" };

export type UpdateVoteResult =
  | { ok: true; state: GameState }
  | {
      ok: false;
      reason: "not-found" | "not-in-round" | "unknown-defence" | "owned";
    };

export type EndRoundResult =
  | { ok: true; state: GameState; revealEntries: RevealEntry[] }
  | { ok: false; reason: "not-found" | "not-in-round" }
  | { ok: false; reason: "over-budget"; error: string };

export interface GameStore {
  /** Seeds a "setup"-phase GameState for a freshly created room. */
  createGame(code: string, settings?: GameSettings): GameState;
  getGame(code: string): GameRecord | undefined;
  /** Host-only transition: "setup" -> "round" 1, committing the final GameSettings. */
  startGame(code: string, settings: GameSettings): GameState | undefined;
  /**
   * Host-only (enforced by the caller, e.g. the `/game/cart` route). Adding
   * an already-present defence, or removing an absent one, is a no-op
   * success rather than an error — this keeps things safe against a
   * double-click or a retried request settling on the same end state
   * instead of surfacing a spurious failure.
   */
  updateCart(
    code: string,
    defenceName: string,
    action: CartAction,
  ): UpdateCartResult;
  /**
   * Non-host only (enforced by the caller, e.g. the `/game/vote` route).
   * Like `updateCart`, voting twice or unvoting without a vote is a no-op
   * success, so a double-click can't inflate the shared counter.
   */
  updateVote(
    code: string,
    participantId: string,
    defenceName: string,
    action: VoteAction,
  ): UpdateVoteResult;
  endRound(code: string): EndRoundResult;
  subscribe(code: string, listener: (state: GameState) => void): () => void;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    ownedDefences: state.ownedDefences.map((owned) => ({
      defence: { ...owned.defence },
      round: owned.round,
    })),
    cart: state.cart.map((defence) => ({ ...defence })),
    votes: Object.fromEntries(
      Object.entries(state.votes).map(([name, voters]) => [name, [...voters]]),
    ),
    revealHistory: state.revealHistory.map((round) =>
      round.map((entry) => ({ ...entry })),
    ),
  };
}

function initialGameState(): GameState {
  return {
    phase: "setup",
    round: 1,
    ownedDefences: [],
    cart: [],
    votes: {},
    revealHistory: [],
  };
}

export function createGameStore(): GameStore {
  const games = new Map<string, GameRecord>();
  const emitter = new EventEmitter();
  emitter.setMaxListeners(100);

  function emitUpdate(code: string, state: GameState): void {
    emitter.emit(code, cloneState(state));
  }

  return {
    createGame(code, settings = { includeNationState: false }) {
      const state = initialGameState();
      games.set(code, { settings, state });
      return cloneState(state);
    },

    getGame(code) {
      const record = games.get(code);
      if (!record) return undefined;
      return {
        settings: { ...record.settings },
        state: cloneState(record.state),
      };
    },

    startGame(code, settings) {
      const record = games.get(code);
      if (record?.state.phase !== "setup") return undefined;
      record.settings = settings;
      record.state = { ...record.state, phase: "round" };
      emitUpdate(code, record.state);
      return cloneState(record.state);
    },

    updateCart(code, defenceName, action) {
      const record = games.get(code);
      if (!record) return { ok: false, reason: "not-found" };
      if (record.state.phase !== "round") {
        return { ok: false, reason: "not-in-round" };
      }

      const defence: Defence | undefined = DEFENCES.find(
        (d) => d.name === defenceName,
      );
      const isUnlocked =
        !!defence &&
        unlockedDefences(record.state).some((d) => d.name === defenceName);
      if (!defence || !isUnlocked) {
        return { ok: false, reason: "unknown-defence" };
      }

      const indexInCart = record.state.cart.findIndex(
        (d) => d.name === defenceName,
      );
      if (action === "add" && indexInCart === -1) {
        record.state.cart.push(defence);
      } else if (action === "remove" && indexInCart !== -1) {
        record.state.cart.splice(indexInCart, 1);
      }

      // Removing "Asset audit" from the cart can strand a hidden defence
      // that was only eligible because Asset audit was (still) in the cart
      // — drop it here too, so the cart shown to players never contains
      // something `resolveRound` would silently refuse to purchase later.
      const stillEligible = unlockedDefences(record.state);
      record.state.cart = record.state.cart.filter((d) =>
        stillEligible.some((eligible) => eligible.name === d.name),
      );
      // Same for votes: a re-hidden defence's card disappears from the shop,
      // so its votes would otherwise linger invisibly until the round ends.
      record.state.votes = Object.fromEntries(
        Object.entries(record.state.votes).filter(([name]) =>
          stillEligible.some((eligible) => eligible.name === name),
        ),
      );

      emitUpdate(code, record.state);
      return { ok: true, state: cloneState(record.state) };
    },

    updateVote(code, participantId, defenceName, action) {
      const record = games.get(code);
      if (!record) return { ok: false, reason: "not-found" };
      if (record.state.phase !== "round") {
        return { ok: false, reason: "not-in-round" };
      }
      if (!unlockedDefences(record.state).some((d) => d.name === defenceName)) {
        return { ok: false, reason: "unknown-defence" };
      }
      if (
        record.state.ownedDefences.some(
          (owned) => owned.defence.name === defenceName,
        )
      ) {
        return { ok: false, reason: "owned" };
      }

      const voters = record.state.votes[defenceName] ?? [];
      const hasVoted = voters.includes(participantId);
      if (action === "vote" && !hasVoted) {
        record.state.votes[defenceName] = [...voters, participantId];
      } else if (action === "unvote" && hasVoted) {
        const remaining = voters.filter((id) => id !== participantId);
        if (remaining.length > 0) {
          record.state.votes[defenceName] = remaining;
        } else {
          delete record.state.votes[defenceName];
        }
      }

      emitUpdate(code, record.state);
      return { ok: true, state: cloneState(record.state) };
    },

    endRound(code) {
      const record = games.get(code);
      if (!record) return { ok: false, reason: "not-found" };
      if (record.state.phase !== "round") {
        return { ok: false, reason: "not-in-round" };
      }

      const result = resolveRound(
        record.state,
        record.state.cart,
        record.settings,
      );
      if (result.error) {
        return { ok: false, reason: "over-budget", error: result.error };
      }

      record.state = result.nextState;
      emitUpdate(code, record.state);
      return {
        ok: true,
        state: cloneState(record.state),
        revealEntries: result.revealEntries,
      };
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
  var __ddGameStore: GameStore | undefined;
}

globalThis.__ddGameStore ??= createGameStore();

export const gameStore = globalThis.__ddGameStore;
