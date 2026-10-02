import type { JSX } from "react";
import { DefenceShop } from "@/components/organisms/DefenceShop/DefenceShop";
import { RoundRevealPanel } from "@/components/organisms/RoundRevealPanel/RoundRevealPanel";
import { ScenarioBriefing } from "@/components/organisms/ScenarioBriefing/ScenarioBriefing";
import type { GameState } from "@/lib/decisions-disruptions/types";

export interface GameBoardTemplateProps {
  game: GameState;
  isHost: boolean;
  currentParticipantId: string;
  onAddToCart: (defenceName: string) => void | Promise<void>;
  onRemoveFromCart: (defenceName: string) => void | Promise<void>;
  onEndRound: () => void | Promise<void>;
  onVote: (defenceName: string) => void | Promise<void>;
  onUnvote: (defenceName: string) => void | Promise<void>;
  endRoundError?: string;
}

export function GameBoardTemplate({
  game,
  isHost,
  currentParticipantId,
  onAddToCart,
  onRemoveFromCart,
  onEndRound,
  onVote,
  onUnvote,
  endRoundError,
}: GameBoardTemplateProps): JSX.Element {
  const pastRounds = game.revealHistory
    .map((entries, index) => ({ round: index + 1, entries }))
    .reverse();

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold text-slate-100">
        Round {game.round} / 4
      </h2>

      <ScenarioBriefing />

      <DefenceShop
        game={game}
        isHost={isHost}
        currentParticipantId={currentParticipantId}
        onAddToCart={onAddToCart}
        onRemoveFromCart={onRemoveFromCart}
        onEndRound={onEndRound}
        onVote={onVote}
        onUnvote={onUnvote}
        endRoundError={endRoundError}
      />

      {pastRounds.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Previous rounds
          </h3>
          {pastRounds.map(({ round, entries }) => (
            <RoundRevealPanel key={round} round={round} entries={entries} />
          ))}
        </div>
      )}
    </div>
  );
}
