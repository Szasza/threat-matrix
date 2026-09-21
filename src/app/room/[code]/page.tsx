import { cookies, headers } from "next/headers";
import Link from "next/link";
import { gameStore } from "@/lib/decisions-disruptions/store";
import { getGameById } from "@/lib/games/catalog";
import { roomStore } from "@/lib/rooms/store";
import { RoomPageClient } from "./RoomPageClient";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const room = roomStore.getRoom(code);
  const game = room ? getGameById(room.gameId) : undefined;

  if (!room || !game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-50">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-lg font-medium text-slate-100">Room not found</p>
          <p className="mt-2 text-sm text-slate-400">
            This room may have ended or the link may be incorrect.
          </p>
          <Link
            href="/games"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-400"
          >
            Browse games
          </Link>
        </div>
      </main>
    );
  }

  const cookieStore = await cookies();
  const currentParticipantId = cookieStore.get("dd_player_id")?.value ?? "";
  const hasJoined = room.participants.some(
    (p) => p.id === currentParticipantId,
  );

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const shareUrl = `${protocol}://${host}/room/${code}`;
  const initialGame = gameStore.getGame(code)?.state ?? null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-50">
      <div className="mx-auto w-full max-w-3xl">
        {hasJoined ? (
          <RoomPageClient
            code={code}
            game={game}
            hasJoined
            currentParticipantId={currentParticipantId}
            initialRoom={room}
            initialGame={initialGame}
            shareUrl={shareUrl}
          />
        ) : (
          <RoomPageClient code={code} game={game} hasJoined={false} />
        )}
      </div>
    </main>
  );
}
