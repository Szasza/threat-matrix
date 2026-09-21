import type { JSX } from "react";
import type { RevealEntry } from "@/lib/decisions-disruptions/types";

export interface RoundRevealPanelProps {
  round: number;
  entries: RevealEntry[];
}

export function RoundRevealPanel({
  round,
  entries,
}: RoundRevealPanelProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Round {round}</h3>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li
            key={entry.attackName}
            data-countered={entry.countered}
            className={`rounded-lg border p-3 text-sm ${
              entry.countered
                ? "border-emerald-800 bg-emerald-950/40 text-emerald-200"
                : "border-rose-800 bg-rose-950/40 text-rose-200"
            }`}
          >
            <p className="font-medium">{entry.attackName}</p>
            {entry.stepName && (
              <p className="text-xs opacity-80">{entry.stepName}</p>
            )}
            <p>{entry.narrative}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
