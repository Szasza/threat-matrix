import type { ComponentType } from "react";
import type { Room } from "@/lib/rooms/types";

/**
 * Split in two deliberately, not as one combined `GameModule`: a game's
 * server-side pieces (`store`/`actions`/`getPublicState`) transitively pull
 * in its engine and content (D&D1's do, via `server-only`-guarded
 * `attacks.server.ts`), while its client-side pieces (`SetupOptions`/
 * `GameView`) are plain React components rendered from `RoomTemplate.tsx`, a
 * client component. A single interface registered from one file would force
 * every client bundle importing it to also pull in the server-only chain —
 * ES module imports execute a file's entire top-level graph regardless of
 * which named export is actually used — so each half is registered from its
 * own file instead (see `decisions-disruptions/module.server.ts` vs.
 * `decisions-disruptions/module.tsx`, and `registry.server.ts` vs.
 * `registry.client.ts`).
 */

/**
 * Who may invoke a given `GameAction`. A single blanket "host-only" check
 * isn't enough: D&D1 already has a non-host-only action (voting — the host
 * is explicitly barred from it), so each action declares its own mode rather
 * than the route assuming one.
 */
export type ActionAuthorization =
  | "host"
  | "non-host-participant"
  | "participant";

export type ActionResult<TState> =
  | { ok: true; state: TState }
  | { ok: false; reason: string; message?: string };

export interface GameAction<TState> {
  authorization: ActionAuthorization;
  handler: (
    code: string,
    participantId: string,
    payload: unknown,
  ) => ActionResult<TState>;
}

export interface GameRecord<TState, TSettings> {
  settings: TSettings;
  state: TState;
}

export interface GameStore<TState, TSettings> {
  /** Seeds a "setup"-phase state for a freshly created room. */
  createGame(code: string, settings?: TSettings): TState;
  getGame(code: string): GameRecord<TState, TSettings> | undefined;
  /** Host-only transition: "setup" -> the game's first round, committing the final settings. */
  startGame(code: string, settings: TSettings): TState | undefined;
  subscribe(code: string, listener: (state: TState) => void): () => void;
}

export type DispatchAction = (
  action: string,
  payload?: unknown,
) => Promise<ActionDispatchResult>;

export type ActionDispatchResult =
  | { ok: true }
  | { ok: false; error?: string; message?: string };

/**
 * The server-side half of a per-game plugin: everything a Route Handler,
 * Server Component, or Server Action needs to run a game, without ever
 * inspecting its internal state shape (`TState`/`TSettings` are erased to
 * `unknown` once a module is registered — see `registry.ts`).
 */
export interface ServerGameModule<TState = unknown, TSettings = unknown> {
  /** Matches the `catalog.ts` entry and `Room.gameId`. */
  id: string;
  store: GameStore<TState, TSettings>;
  /** Keyed by action name, e.g. "add-to-cart", "end-round". */
  actions: Record<string, GameAction<TState>>;
  /** Redacts state for the given viewer; `null` if no game record exists yet. */
  getPublicState(
    room: Pick<Room, "code" | "hostParticipantId">,
    participantId: string,
  ): TState | null;
}

/**
 * The client-side half: plain React components rendered from
 * `RoomTemplate.tsx`. Kept free of any dependency on `store`/`actions`, so
 * importing this half never pulls a game's server-only engine/content into
 * the browser bundle.
 */
export interface ClientGameModule<TState = unknown, TSettings = unknown> {
  /** Matches the `catalog.ts` entry and `Room.gameId`. */
  id: string;
  /**
   * Whether `state` is still in its pre-round setup phase (the room lobby is
   * shown instead of `GameView`). The shared layer can't inspect `TState`
   * itself to answer this, since its shape is game-specific.
   */
  isInSetup(state: TState): boolean;
  SetupOptions: ComponentType<{
    isHost: boolean;
    onStart: (settings: TSettings) => void | Promise<void>;
  }>;
  /**
   * The game's entire in-room view once it's left setup — including deciding
   * internally whether to show the board or the debrief, since that's also a
   * game-specific notion the shared layer can't branch on from opaque state.
   */
  GameView: ComponentType<{
    state: TState;
    isHost: boolean;
    currentParticipantId: string;
    dispatch: DispatchAction;
  }>;
}

export interface AuthorizationFailure {
  ok: false;
  status: 403;
  message: string;
}

/**
 * Pure authorization check shared by every game's actions, extracted so it
 * can be unit-tested directly: this is exactly the logic that used to be
 * duplicated (and unverified by any test) inline in three separate route
 * files, including the one place a regression would be easy to miss — the
 * host being barred from voting.
 */
export function authorizeAction(
  authorization: ActionAuthorization,
  room: Pick<Room, "hostParticipantId" | "participants">,
  participantId: string | undefined,
): { ok: true } | AuthorizationFailure {
  const isHost = !!participantId && room.hostParticipantId === participantId;
  const isParticipant =
    !!participantId && room.participants.some((p) => p.id === participantId);

  switch (authorization) {
    case "host":
      if (!isHost) {
        return {
          ok: false,
          status: 403,
          message: "Only the host can perform this action.",
        };
      }
      return { ok: true };
    case "non-host-participant":
      if (!isParticipant) {
        return {
          ok: false,
          status: 403,
          message: "Only room participants can perform this action.",
        };
      }
      if (isHost) {
        return {
          ok: false,
          status: 403,
          message: "The game master cannot perform this action.",
        };
      }
      return { ok: true };
    case "participant":
      if (!isParticipant) {
        return {
          ok: false,
          status: 403,
          message: "Only room participants can perform this action.",
        };
      }
      return { ok: true };
  }
}
