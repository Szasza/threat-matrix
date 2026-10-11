import type { JSX } from "react";
import { getAsset } from "@/lib/decisions-disruptions-2/assets";
import { formatEffects } from "@/lib/decisions-disruptions-2/format";
import type {
  CheckResult,
  Effects,
  TimelineEntry,
} from "@/lib/decisions-disruptions-2/types";

export interface IncidentTimelineProps {
  entries: readonly TimelineEntry[];
  /** Board view lists the latest day first; the debrief reads in order. */
  newestFirst?: boolean;
}

const typeLabels: Record<TimelineEntry["type"], string> = {
  blocked: "Blocked",
  "on-draw": "Happened",
  choice: "Decision",
  ignored: "Left open",
  upgrade: "Upgrade",
};

function entryClasses(entry: TimelineEntry): string {
  switch (entry.type) {
    case "blocked":
      return "border-emerald-800 bg-emerald-950/40";
    case "ignored":
      return entry.narrative
        ? "border-rose-800 bg-rose-950/40"
        : "border-slate-700 bg-slate-950/40";
    case "choice":
      return entry.check && !entry.check.passed
        ? "border-amber-800 bg-amber-950/30"
        : "border-slate-700 bg-slate-900";
    case "upgrade":
      return "border-sky-800 bg-sky-950/30";
    case "on-draw":
      return "border-violet-800 bg-violet-950/30";
  }
}

function describeCheck(check: CheckResult): string {
  const odds = check.assetId
    ? `${getAsset(check.assetId).name} at ${check.chance}%`
    : `${check.chance}% chance`;
  return `${odds} · rolled ${check.roll} · ${check.passed ? "succeeded" : "failed"}`;
}

function EffectChips({ effects }: { effects: Effects }): JSX.Element | null {
  const labels = formatEffects(effects);
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            label.startsWith("+")
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-rose-500/20 text-rose-300"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function EntryBody({ entry }: { entry: TimelineEntry }): JSX.Element {
  switch (entry.type) {
    case "blocked":
      return (
        <p className="text-sm text-emerald-200">
          Stopped before it reached the team: {describeCheck(entry.check)}.
        </p>
      );
    case "on-draw":
      return (
        <>
          <p className="text-sm text-slate-300">{entry.narrative}</p>
          <EffectChips effects={entry.effects} />
        </>
      );
    case "choice":
      return (
        <>
          <p className="text-sm text-slate-200">Chose: {entry.choiceLabel}</p>
          {entry.check && (
            <p className="text-xs text-slate-400">
              {describeCheck(entry.check)}
            </p>
          )}
          <p className="text-sm text-slate-300">{entry.narrative}</p>
          <EffectChips effects={entry.effects} />
        </>
      );
    case "ignored":
      return (
        <>
          <p className="text-sm text-slate-300">
            {entry.narrative ?? "Carried over to the next day."}
          </p>
          <EffectChips effects={entry.effects} />
        </>
      );
    case "upgrade":
      return (
        <>
          <p className="text-sm text-slate-300">
            {entry.purchased ? "Bought by the team." : "Granted by events."}
          </p>
          <EffectChips effects={entry.effects} />
        </>
      );
  }
}

/** A day-by-day log of everything that happened: draws, decisions, neglect and upgrades. */
export function IncidentTimeline({
  entries,
  newestFirst = false,
}: IncidentTimelineProps): JSX.Element {
  const days = [...new Set(entries.map((entry) => entry.round))].sort((a, b) =>
    newestFirst ? b - a : a - b,
  );

  if (days.length === 0) {
    return <p className="text-sm text-slate-400">Nothing has happened yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <section
          key={day}
          aria-label={`Day ${day}`}
          className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4"
        >
          <h4 className="text-lg font-semibold text-slate-100">Day {day}</h4>
          <ol className="flex flex-col gap-2">
            {entries
              .filter((entry) => entry.round === day)
              .map((entry, index) => (
                <li
                  // Entries are append-only, so position within a day is stable.
                  // biome-ignore lint/suspicious/noArrayIndexKey: timeline entries never reorder
                  key={index}
                  data-type={entry.type}
                  className={`flex flex-col gap-1.5 rounded-lg border p-3 ${entryClasses(entry)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-100">{entry.title}</p>
                    <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                      {typeLabels[entry.type]}
                    </span>
                  </div>
                  <EntryBody entry={entry} />
                </li>
              ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
