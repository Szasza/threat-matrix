"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RoomTemplate } from "@/components/templates/RoomTemplate/RoomTemplate";
import type { GameState } from "@/lib/decisions-disruptions/types";
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
      initialGame: GameState | null;
      shareUrl: string;
    };

export function RoomPageClient(props: RoomPageClientProps) {
  const { code, game, hasJoined } = props;
  const router = useRouter();
  const [joinError, setJoinError] = useState<string | undefined>(undefined);

  // Best-effort: if the tab closes without an explicit "Leave room" click,
  // this fires a beacon so the participant is removed immediately rather
  // than waiting on the ~60-75s heartbeat/TTL sweep as the sole fallback.
  useEffect(() => {
    if (!hasJoined) return;
    const handlePageHide = () => {
      navigator.sendBeacon(`/api/rooms/${code}/leave`);
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
