"use client";

import { type JSX, useEffect, useState } from "react";
import { GameSetupPanel } from "@/components/organisms/GameSetupPanel/GameSetupPanel";
import { JoinRoomPanel } from "@/components/organisms/JoinRoomPanel/JoinRoomPanel";
import { RoomLobby } from "@/components/organisms/RoomLobby/RoomLobby";
import "@/lib/games/bootstrap.client";
import type { ActionDispatchResult } from "@/lib/games/module";
import { getClientGameModule } from "@/lib/games/registry.client";
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
      /** Opaque — this game's own `ClientGameModule` knows its real shape. */
      initialGame: unknown;
      roomCode: string;
      currentParticipantId: string;
      shareUrl: string;
      onLeave: () => void;
      onRemoved: () => void;
      onStartGame: (settings: unknown) => void | Promise<void>;
      /**
       * Test-only override of the heartbeat interval. Defaults to the real
       * `HEARTBEAT_INTERVAL_MS` in production; stories inject a much shorter
       * value so play functions can exercise the real interval-based code
       * path without waiting on (or fighting fake timers around) a real 30s
       * timer.
       */
      heartbeatIntervalMs?: number;
    };

type RoomEventPayload = Room & { gameState: unknown };

async function dispatchGameAction(
  roomCode: string,
  action: string,
  payload?: unknown,
): Promise<ActionDispatchResult> {
  const response = await fetch(
    `/api/rooms/${roomCode}/game/actions/${action}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    },
  );
  if (response.ok) {
    return { ok: true };
  }
  const body = await response.json().catch(() => ({}));
  return { ok: false, error: body.error, message: body.message };
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

  const module = getClientGameModule(game.id);

  const [hostParticipantId, setHostParticipantId] = useState(
    initialRoom.hostParticipantId,
  );
  const [gameState, setGameState] = useState<unknown>(initialGame);

  useEffect(() => {
    const source = new EventSource(`/api/rooms/${roomCode}/events`);
    source.onmessage = (event) => {
      const payload: RoomEventPayload = JSON.parse(event.data);
      setHostParticipantId(payload.hostParticipantId);
      setGameState(payload.gameState);
    };
    return () => {
      source.close();
    };
  }, [roomCode]);

  const isHost = currentParticipantId === hostParticipantId;
  const isInSetupPhase =
    !module || gameState == null || module.isInSetup(gameState);

  // `RoomLobby` (rendered only during setup below) owns the heartbeat that
  // keeps this participant from being swept as stale — but it unmounts once
  // the game starts. Without a heartbeat continuing here, a participant
  // who's just been quietly reading the board for over `STALE_AFTER_MS`
  // (default 60s, easily exceeded by real group-consensus discussion) would
  // get dropped from `room.participants`, silently breaking every host-only
  // check for the rest of the game. This picks up heartbeating the moment
  // setup ends, so there's no gap.
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

  if (!module) {
    return <p className="text-sm text-rose-400">Unknown game: {game.id}</p>;
  }

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
        <GameSetupPanel
          gameId={game.id}
          isHost={isHost}
          onStart={onStartGame}
        />
      </div>
    );
  }

  const GameView = module.GameView;
  return (
    <GameView
      state={gameState}
      isHost={isHost}
      currentParticipantId={currentParticipantId}
      dispatch={(action, payload) =>
        dispatchGameAction(roomCode, action, payload)
      }
    />
  );
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
