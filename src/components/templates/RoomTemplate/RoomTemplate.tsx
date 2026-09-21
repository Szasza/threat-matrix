"use client";

import { type JSX, useEffect, useState } from "react";
import { GameSetupPanel } from "@/components/organisms/GameSetupPanel/GameSetupPanel";
import { JoinRoomPanel } from "@/components/organisms/JoinRoomPanel/JoinRoomPanel";
import { RoomLobby } from "@/components/organisms/RoomLobby/RoomLobby";
import { GameBoardTemplate } from "@/components/templates/GameBoardTemplate/GameBoardTemplate";
import { GameDebriefTemplate } from "@/components/templates/GameDebriefTemplate/GameDebriefTemplate";
import type {
  Category,
  GameSettings,
  GameState,
  OwnedDefence,
} from "@/lib/decisions-disruptions/types";
import type { Game } from "@/lib/games/types";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/rooms/constants";
import type { Room } from "@/lib/rooms/types";

export type RoomTemplateProps =
  | {
      mode: "join";
      game: Game;
      action: (displayName: string) => void | Promise<void>;
      error?: string;
    }
  | {
      mode: "lobby";
      game: Game;
      initialRoom: Room;
      initialGame: GameState | null;
      roomCode: string;
      currentParticipantId: string;
      shareUrl: string;
      onLeave: () => void;
      onRemoved: () => void;
      onStartGame: (settings: GameSettings) => void | Promise<void>;
      /**
       * Test-only override of the heartbeat interval. Defaults to the real
       * `HEARTBEAT_INTERVAL_MS` in production; stories inject a much shorter
       * value so play functions can exercise the real interval-based code
       * path without waiting on (or fighting fake timers around) a real 30s
       * timer.
       */
      heartbeatIntervalMs?: number;
    };

type RoomEventPayload = Room & { game: GameState | null };

const EMPTY_SCORES: Record<Category, number> = {
  physical_defence: 0,
  advanced_cyber_defence: 0,
  cyber_defence: 0,
  data_defence: 0,
  intelligence_gathering: 0,
  human_factors: 0,
};

/**
 * A defence purchased in round r contributes `5 - r` points to its
 * category's score. This mirrors `computeScores` in the server-only
 * `engine.server.ts`, but is re-derived here (rather than imported) because
 * that module is guarded with `server-only` and importing it would break
 * this client component's bundle; the arithmetic itself is public and safe
 * to duplicate client-side.
 */
function computeScores(
  ownedDefences: readonly OwnedDefence[],
): Record<Category, number> {
  const scores = { ...EMPTY_SCORES };
  for (const owned of ownedDefences) {
    scores[owned.defence.category] += 5 - owned.round;
  }
  return scores;
}

function GamePhaseView({
  game,
  isHost,
  roomCode,
}: {
  game: GameState;
  isHost: boolean;
  roomCode: string;
}): JSX.Element {
  const [endRoundError, setEndRoundError] = useState<string | undefined>(
    undefined,
  );

  const handleAddToCart = async (defenceName: string) => {
    await fetch(`/api/rooms/${roomCode}/game/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defenceName, action: "add" }),
    });
  };

  const handleRemoveFromCart = async (defenceName: string) => {
    await fetch(`/api/rooms/${roomCode}/game/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defenceName, action: "remove" }),
    });
  };

  const handleEndRound = async () => {
    const response = await fetch(`/api/rooms/${roomCode}/game/end-round`, {
      method: "POST",
    });
    if (response.ok) {
      setEndRoundError(undefined);
      return;
    }
    const body = await response.json().catch(() => ({}));
    if (body.error === "over-budget") {
      setEndRoundError(body.message);
    }
  };

  if (game.phase === "finished") {
    return (
      <GameDebriefTemplate
        scores={computeScores(game.ownedDefences)}
        revealHistory={game.revealHistory}
      />
    );
  }

  return (
    <GameBoardTemplate
      game={game}
      isHost={isHost}
      onAddToCart={handleAddToCart}
      onRemoveFromCart={handleRemoveFromCart}
      onEndRound={handleEndRound}
      endRoundError={endRoundError}
    />
  );
}

function RoomGameRouter(
  props: Extract<RoomTemplateProps, { mode: "lobby" }>,
): JSX.Element {
  const {
    game,
    initialRoom,
    initialGame,
    roomCode,
    currentParticipantId,
    shareUrl,
    onLeave,
    onRemoved,
    onStartGame,
    heartbeatIntervalMs = HEARTBEAT_INTERVAL_MS,
  } = props;

  const [hostParticipantId, setHostParticipantId] = useState(
    initialRoom.hostParticipantId,
  );
  const [gameState, setGameState] = useState<GameState | null>(initialGame);

  useEffect(() => {
    const source = new EventSource(`/api/rooms/${roomCode}/events`);
    source.onmessage = (event) => {
      const payload: RoomEventPayload = JSON.parse(event.data);
      setHostParticipantId(payload.hostParticipantId);
      setGameState(payload.game);
    };
    return () => {
      source.close();
    };
  }, [roomCode]);

  const isHost = currentParticipantId === hostParticipantId;
  const isInSetupPhase = !gameState || gameState.phase === "setup";

  // `RoomLobby` (rendered only during the "setup" phase below) owns the
  // heartbeat that keeps this participant from being swept as stale — but it
  // unmounts once the game starts. Without a heartbeat continuing here, a
  // participant who's just been quietly reading the shop/reveal screens for
  // over `STALE_AFTER_MS` (default 60s, easily exceeded by real
  // group-consensus discussion) would get dropped from `room.participants`,
  // silently breaking every host-only check for the rest of the game. This
  // picks up heartbeating the moment "setup" ends, so there's no gap.
  useEffect(() => {
    if (isInSetupPhase) return;
    let removed = false;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/rooms/${roomCode}/heartbeat`, {
        method: "POST",
      });
      if (res.status === 410 && !removed) {
        removed = true;
        clearInterval(interval);
        onRemoved();
      }
    }, heartbeatIntervalMs);
    return () => {
      removed = true;
      clearInterval(interval);
    };
  }, [isInSetupPhase, roomCode, onRemoved, heartbeatIntervalMs]);

  if (isInSetupPhase) {
    return (
      <div className="flex flex-col gap-6">
        <RoomLobby
          initialRoom={initialRoom}
          roomCode={roomCode}
          currentParticipantId={currentParticipantId}
          game={game}
          shareUrl={shareUrl}
          onLeave={onLeave}
          onRemoved={onRemoved}
        />
        <GameSetupPanel isHost={isHost} onStart={onStartGame} />
      </div>
    );
  }

  return <GamePhaseView game={gameState} isHost={isHost} roomCode={roomCode} />;
}

export function RoomTemplate(props: RoomTemplateProps): JSX.Element {
  if (props.mode === "join") {
    return (
      <JoinRoomPanel
        game={props.game}
        action={props.action}
        error={props.error}
      />
    );
  }

  return <RoomGameRouter {...props} />;
}
