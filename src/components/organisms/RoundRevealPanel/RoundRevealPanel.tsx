import type { JSX } from "react";
import type { RevealEntry } from "@/lib/decisions-disruptions/types";

export interface RoundRevealPanelProps {
  round: number;
  /**
   * The game master gets every entry, with attacker names; players get a
   * server-redacted list (see `redactGameStateForPlayer`): just the effects
   * they noticed, with no attacker or step names.
   */
  entries: RevealEntry[];
}

function entryClasses(entry: RevealEntry): string {
  // Only ever present in the game master's view.
  if (!entry.visibleToPlayers) {
    return "border-slate-700 bg-slate-950/40 text-slate-400";
  }
  return entry.countered
    ? "border-emerald-800 bg-emerald-950/40 text-emerald-200"
    : "border-rose-800 bg-rose-950/40 text-rose-200";
}

export function RoundRevealPanel({
  round,
  entries,
}: RoundRevealPanelProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Round {round}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">
          Nothing out of the ordinary was noticed this round.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li
              // Players' entries carry no attacker or step name, so position
              // is the only stable key.
              // biome-ignore lint/suspicious/noArrayIndexKey: entries are static once a round is resolved
              key={index}
              data-countered={entry.countered}
              data-visible-to-players={entry.visibleToPlayers}
              className={`rounded-lg border p-3 text-sm ${entryClasses(entry)}`}
            >
              {/* Names are only present in the game master's view. */}
              {entry.attackName && (
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{entry.attackName}</p>
                  {!entry.visibleToPlayers && (
                    <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                      Hidden from players
                    </span>
                  )}
                </div>
              )}
              {entry.stepName && (
                <p className="text-xs opacity-80">{entry.stepName}</p>
              )}
              <p>{entry.narrative}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
