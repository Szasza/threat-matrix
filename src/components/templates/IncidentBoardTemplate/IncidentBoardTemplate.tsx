import type { JSX } from "react";
import { RoundTimer } from "@/components/atoms/RoundTimer/RoundTimer";
import { ResourceBar } from "@/components/molecules/ResourceBar/ResourceBar";
import { AssetUpgradePanel } from "@/components/organisms/AssetUpgradePanel/AssetUpgradePanel";
import { IncidentQueue } from "@/components/organisms/IncidentQueue/IncidentQueue";
import { IncidentTimeline } from "@/components/organisms/IncidentTimeline/IncidentTimeline";
import type { GameState } from "@/lib/decisions-disruptions-2/types";

export interface IncidentBoardTemplateProps {
  game: GameState;
  isHost: boolean;
  currentParticipantId: string;
  onResolveChoice: (eventId: string, choiceId: string) => void;
  onCastBallot: (eventId: string, choiceId: string) => void;
  onPurchaseUpgrade: (upgradeId: string) => void;
  onVoteUpgrade: (upgradeId: string) => void;
  onUnvoteUpgrade: (upgradeId: string) => void;
  onEndRound: () => void;
  /** The last rejected action's message, e.g. not enough hours. */
  actionError?: string;
  /** Clock source for the round timer, injectable for stories. */
  now?: () => number;
}

/** The D&D2 in-round board: resources, today's incidents, the EA shop and the week so far. */
export function IncidentBoardTemplate({
  game,
  isHost,
  currentParticipantId,
  onResolveChoice,
  onCastBallot,
  onPurchaseUpgrade,
  onVoteUpgrade,
  onUnvoteUpgrade,
  onEndRound,
  actionError,
  now,
}: IncidentBoardTemplateProps): JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-slate-100">
            Day {game.round} / {game.totalRounds}
          </h2>
          <p className="text-sm text-slate-400">
            {isHost
              ? "You are the CISO: commit the team's responses and buy upgrades. Your team's votes are advice."
              : "Vote for how the team should respond. The CISO (the host) makes the final call."}
          </p>
        </div>
        <RoundTimer
          startedAt={game.roundStartedAt}
          durationMs={game.roundDurationMs}
          enforced={game.roundTimerEnforced}
          now={now}
        />
      </div>

      <ResourceBar
        hours={game.hours}
        hoursPerRound={game.hoursPerRound}
        profit={game.profit}
        sharePrice={game.sharePrice}
        openEvents={game.openEvents.length}
      />

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200"
        >
          {actionError}
        </p>
      )}

      <IncidentQueue
        events={game.openEvents}
        round={game.round}
        totalRounds={game.totalRounds}
        isHost={isHost}
        hoursLeft={game.hours}
        eventBallots={game.eventBallots}
        currentParticipantId={currentParticipantId}
        onChoose={onResolveChoice}
        onVote={onCastBallot}
        onEndRound={onEndRound}
      />

      <AssetUpgradePanel
        ownedUpgrades={game.ownedUpgrades}
        upgradeVotes={game.upgradeVotes}
        isHost={isHost}
        hoursLeft={game.hours}
        currentParticipantId={currentParticipantId}
        onPurchase={onPurchaseUpgrade}
        onVote={onVoteUpgrade}
        onUnvote={onUnvoteUpgrade}
      />

      {game.timeline.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            This week so far
          </h3>
          <IncidentTimeline entries={game.timeline} newestFirst />
        </div>
      )}
    </div>
  );
}
