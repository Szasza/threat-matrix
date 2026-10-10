"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RoomTemplate } from "@/components/templates/RoomTemplate/RoomTemplate";
import type { Game } from "@/lib/games/types";
import type { Room } from "@/lib/rooms/types";
import { joinRoomAction, startGameAction } from "./actions";

export type RoomPageClientProps =
  | {
      code: string;
      game: Game;
      hasJoined: false;
    }
  | {
      code: string;
      game: Game;
      hasJoined: true;
      currentParticipantId: string;
      initialRoom: Room;
      /** Opaque — this game's own `ClientGameModule` knows its real shape. */
      initialGame: unknown;
      shareUrl: string;
    };

export function RoomPageClient(props: RoomPageClientProps) {
  const { code, game, hasJoined } = props;
  const router = useRouter();
  const [joinError, setJoinError] = useState<string | undefined>(undefined);

  // If the tab closes or reloads without an explicit "Leave room" click, this
  // fires a beacon marking the participant as departing: they're dropped once
  // `LEAVE_GRACE_MS` passes, unless the reloaded page's SSE reconnect
  // cancels it first (even a slow reload), keeping their
  // seat (and the game master role). A page kept in the back/forward cache
  // (`persisted`) may come back as-is, so it's left to the heartbeat sweep.
  useEffect(() => {
    if (!hasJoined) return;
    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      navigator.sendBeacon(`/api/rooms/${code}/leave?departing=1`);
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [hasJoined, code]);

  if (!hasJoined) {
    return (
      <RoomTemplate
        mode="join"
        game={game}
        error={joinError}
        action={async (displayName) => {
          try {
            await joinRoomAction(code, displayName);
            router.refresh();
          } catch {
            setJoinError("Couldn't join this room. Please try again.");
          }
        }}
      />
    );
  }

  return (
    <RoomTemplate
      mode="lobby"
      game={game}
      initialRoom={props.initialRoom}
      initialGame={props.initialGame}
      roomCode={code}
      currentParticipantId={props.currentParticipantId}
      shareUrl={props.shareUrl}
      onLeave={async () => {
        await fetch(`/api/rooms/${code}/leave`, { method: "POST" });
        router.push("/games");
      }}
      onRemoved={() => {
        router.push("/games?disconnected=1");
      }}
      onStartGame={async (settings) => {
        try {
          await startGameAction(code, settings);
        } catch {
          // Only the host can reach this action, and the setup panel already
          // gates the button on that; a failure here indicates a stale/edge
          // case (e.g. host reassigned mid-click) with no dedicated recovery
          // UI, so it's a best-effort no-op — the room's SSE stream is the
          // source of truth for what actually happened.
        }
      }}
    />
  );
}
