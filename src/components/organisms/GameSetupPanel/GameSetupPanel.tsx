"use client";

import { type JSX, useId, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import type { GameSettings } from "@/lib/decisions-disruptions/types";

export interface GameSetupPanelProps {
  isHost: boolean;
  onStart: (settings: GameSettings) => void | Promise<void>;
}

export function GameSetupPanel({
  isHost,
  onStart,
}: GameSetupPanelProps): JSX.Element {
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
