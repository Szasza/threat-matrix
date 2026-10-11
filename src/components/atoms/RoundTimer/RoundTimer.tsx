"use client";

import { type JSX, useEffect, useState } from "react";
import { formatCountdown } from "@/lib/decisions-disruptions-2/format";

export interface RoundTimerProps {
  /** Epoch ms the round began (server clock). */
  startedAt: number;
  durationMs: number;
  /** Whether the round is force-ended at 0:00, or the clock is only a guide. */
  enforced: boolean;
  /** Clock source, injectable so stories can render a fixed time. */
  now?: () => number;
}

/** A ticking countdown for the current D&D2 round. */
export function RoundTimer({
  startedAt,
  durationMs,
  enforced,
  now = Date.now,
}: RoundTimerProps): JSX.Element {
  const [currentTime, setCurrentTime] = useState(now);

  useEffect(() => {
    setCurrentTime(now());
    const interval = setInterval(() => setCurrentTime(now()), 1000);
    return () => clearInterval(interval);
  }, [now]);

  const remaining = startedAt + durationMs - currentTime;
  const isUp = remaining <= 0;
  const isLow = !isUp && remaining <= 2 * 60 * 1000;

  return (
    <div
      role="timer"
      aria-label="Time left today"
      className="flex flex-col items-end gap-0.5"
    >
      <span
        className={`font-mono text-2xl font-semibold tabular-nums ${
          isUp || isLow ? "text-rose-400" : "text-slate-100"
        }`}
      >
        {formatCountdown(remaining)}
      </span>
      <span className="text-xs text-slate-400">
        {isUp
          ? enforced
            ? "Time's up — ending the day"
            : "Time's up"
          : enforced
            ? "Day ends automatically at 0:00"
            : "Guide time only"}
      </span>
    </div>
  );
}
