"use client";

import { type JSX, useId, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { GameBoardTemplate } from "@/components/templates/GameBoardTemplate/GameBoardTemplate";
import { GameDebriefTemplate } from "@/components/templates/GameDebriefTemplate/GameDebriefTemplate";
import type { ClientGameModule, DispatchAction } from "@/lib/games/module";
import { registerClientGame } from "@/lib/games/registry.client";
import type { Category, GameSettings, GameState, OwnedDefence } from "./types";

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

function SetupOptions({
  isHost,
  onStart,
}: {
  isHost: boolean;
  onStart: (settings: GameSettings) => void | Promise<void>;
}): JSX.Element {
  const [includeNationState, setIncludeNationState] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkboxId = useId();

  if (!isHost) {
    return (
      <p className="text-sm text-slate-400">
        Waiting for the host to start the game...
      </p>
    );
  }

  const handleStart = async () => {
    setIsSubmitting(true);
    try {
      await onStart({ includeNationState });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <input
          id={checkboxId}
          type="checkbox"
          checked={includeNationState}
          onChange={(event) => setIncludeNationState(event.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800"
        />
        <label htmlFor={checkboxId} className="text-sm text-slate-200">
          Include Nation State attacks
        </label>
      </div>
      <Button onClick={handleStart} loading={isSubmitting}>
        Start Game
      </Button>
    </div>
  );
}

function GameView({
  state,
  isHost,
  currentParticipantId,
  dispatch,
}: {
  state: GameState;
  isHost: boolean;
  currentParticipantId: string;
  dispatch: DispatchAction;
}): JSX.Element {
  const [endRoundError, setEndRoundError] = useState<string | undefined>(
    undefined,
  );

  if (state.phase === "finished") {
    return (
      <GameDebriefTemplate
        scores={computeScores(state.ownedDefences)}
        revealHistory={state.revealHistory}
      />
    );
  }

  return (
    <GameBoardTemplate
      game={state}
      isHost={isHost}
      currentParticipantId={currentParticipantId}
      onAddToCart={(defenceName) => {
        void dispatch("add-to-cart", { defenceName });
      }}
      onRemoveFromCart={(defenceName) => {
        void dispatch("remove-from-cart", { defenceName });
      }}
      onEndRound={async () => {
        const result = await dispatch("end-round");
        if (result.ok) {
          setEndRoundError(undefined);
          return;
        }
        if (result.error === "over-budget") {
          setEndRoundError(result.message);
        }
      }}
      onVote={(defenceName) => {
        void dispatch("vote", { defenceName });
      }}
      onUnvote={(defenceName) => {
        void dispatch("unvote", { defenceName });
      }}
      endRoundError={endRoundError}
    />
  );
}

export const decisionsAndDisruptionsClientModule: ClientGameModule<
  GameState,
  GameSettings
> = {
  id: "decisions-and-disruptions",
  isInSetup: (state) => state.phase === "setup",
  SetupOptions,
  GameView,
};

registerClientGame(decisionsAndDisruptionsClientModule);
