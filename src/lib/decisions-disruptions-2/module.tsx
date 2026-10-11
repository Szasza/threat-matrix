"use client";

import { type JSX, useId, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { IncidentBoardTemplate } from "@/components/templates/IncidentBoardTemplate/IncidentBoardTemplate";
import { IncidentDebriefTemplate } from "@/components/templates/IncidentDebriefTemplate/IncidentDebriefTemplate";
import type { ClientGameModule, DispatchAction } from "@/lib/games/module";
import { registerClientGame } from "@/lib/games/registry.client";
import { ROUND_DURATION_MS } from "./rules";
import type { GameSettings, GameState } from "./types";

function SetupOptions({
  isHost,
  onStart,
}: {
  isHost: boolean;
  onStart: (settings: GameSettings) => void | Promise<void>;
}): JSX.Element {
  const [enforceRoundTimer, setEnforceRoundTimer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkboxId = useId();
  const hintId = useId();

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
      await onStart({ enforceRoundTimer });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            id={checkboxId}
            type="checkbox"
            checked={enforceRoundTimer}
            aria-describedby={hintId}
            onChange={(event) => setEnforceRoundTimer(event.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800"
          />
          <label htmlFor={checkboxId} className="text-sm text-slate-200">
            Enforce round timer
          </label>
        </div>
        <p id={hintId} className="text-xs text-slate-400">
          Each day ends automatically after {ROUND_DURATION_MS / 60_000}{" "}
          minutes, with anything unresolved carried over. Unchecked, the timer
          is only a guide.
        </p>
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
  const [actionError, setActionError] = useState<string | undefined>(undefined);

  if (state.phase === "finished" || state.phase === "lost") {
    return <IncidentDebriefTemplate game={state} />;
  }

  const run = async (action: string, payload?: unknown) => {
    const result = await dispatch(action, payload);
    setActionError(
      result.ok
        ? undefined
        : (result.message ?? "That didn't work. Try again."),
    );
  };

  return (
    <IncidentBoardTemplate
      game={state}
      isHost={isHost}
      currentParticipantId={currentParticipantId}
      actionError={actionError}
      onResolveChoice={(eventId, choiceId) => {
        void run("resolve-choice", { eventId, choiceId });
      }}
      onCastBallot={(eventId, choiceId) => {
        void run("cast-ballot", { eventId, choiceId });
      }}
      onPurchaseUpgrade={(upgradeId) => {
        void run("purchase-upgrade", { upgradeId });
      }}
      onVoteUpgrade={(upgradeId) => {
        void run("vote-upgrade", { upgradeId });
      }}
      onUnvoteUpgrade={(upgradeId) => {
        void run("unvote-upgrade", { upgradeId });
      }}
      onEndRound={() => {
        void run("end-round");
      }}
    />
  );
}

export const decisionsAndDisruptions2ClientModule: ClientGameModule<
  GameState,
  GameSettings
> = {
  id: "decisions-and-disruptions-2",
  isInSetup: (state) => state.phase === "setup",
  SetupOptions,
  GameView,
};

registerClientGame(decisionsAndDisruptions2ClientModule);
