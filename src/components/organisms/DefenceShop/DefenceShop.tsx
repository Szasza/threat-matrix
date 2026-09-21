import type { JSX } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { ProgressBar } from "@/components/atoms/ProgressBar/ProgressBar";
import type { DefenceCardState } from "@/components/molecules/DefenceCard/DefenceCard";
import { DefenceCard } from "@/components/molecules/DefenceCard/DefenceCard";
import { visibleDefences } from "@/lib/decisions-disruptions/defences";
import type { GameState } from "@/lib/decisions-disruptions/types";

export interface DefenceShopProps {
  game: GameState;
  /** Gates both the cart's buy/unbuy controls and the "End Round" button — only the game master edits the shared cart or advances the round. */
  isHost: boolean;
  onAddToCart: (defenceName: string) => void | Promise<void>;
  onRemoveFromCart: (defenceName: string) => void | Promise<void>;
  onEndRound: () => void | Promise<void>;
  endRoundError?: string;
}

function cardStateFor(game: GameState, defenceName: string): DefenceCardState {
  if (game.ownedDefences.some((owned) => owned.defence.name === defenceName)) {
    return "owned";
  }
  if (game.cart.some((defence) => defence.name === defenceName)) {
    return "in-cart";
  }
  return "available";
}

export function DefenceShop({
  game,
  isHost,
  onAddToCart,
  onRemoveFromCart,
  onEndRound,
  endRoundError,
}: DefenceShopProps): JSX.Element {
  const visible = visibleDefences(game);
  const allowance = 100 * game.round;
  const spent = game.ownedDefences.reduce(
    (sum, owned) => sum + owned.defence.cost,
    0,
  );
  const cartTotal = game.cart.reduce((sum, defence) => sum + defence.cost, 0);
  const totalSpent = spent + cartTotal;
  const remainingAfterCart = allowance - totalSpent;
  const isOverBudget = totalSpent > allowance;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <ProgressBar
          label="Budget spent"
          value={totalSpent}
          max={allowance}
          formatValue={(value, max) => `${value}k / ${max}k`}
          variant={isOverBudget ? "danger" : "default"}
        />
        <p className="text-sm text-slate-400">
          Remaining after cart: {remainingAfterCart}k
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((defence) => (
          <DefenceCard
            key={defence.name}
            defence={defence}
            state={cardStateFor(game, defence.name)}
            canEdit={isHost}
            onAdd={() => onAddToCart(defence.name)}
            onRemove={() => onRemoveFromCart(defence.name)}
          />
        ))}
      </div>

      {isHost && (
        <div className="flex flex-col gap-2">
          <Button onClick={onEndRound}>End Round</Button>
          {endRoundError && (
            <p className="text-sm text-rose-400">{endRoundError}</p>
          )}
        </div>
      )}
    </div>
  );
}
