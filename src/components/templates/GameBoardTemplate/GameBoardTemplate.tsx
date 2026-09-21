import type { JSX } from "react";
import { DefenceShop } from "@/components/organisms/DefenceShop/DefenceShop";
import { RoundRevealPanel } from "@/components/organisms/RoundRevealPanel/RoundRevealPanel";
import type { GameState } from "@/lib/decisions-disruptions/types";

export interface GameBoardTemplateProps {
  game: GameState;
  isHost: boolean;
  onAddToCart: (defenceName: string) => void | Promise<void>;
  onRemoveFromCart: (defenceName: string) => void | Promise<void>;
  onEndRound: () => void | Promise<void>;
  endRoundError?: string;
}

export function GameBoardTemplate({
  game,
  isHost,
  onAddToCart,
  onRemoveFromCart,
  onEndRound,
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

      <DefenceShop
        game={game}
        isHost={isHost}
        onAddToCart={onAddToCart}
        onRemoveFromCart={onRemoveFromCart}
        onEndRound={onEndRound}
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
