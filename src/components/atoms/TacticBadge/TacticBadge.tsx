import type { JSX } from "react";
import { tacticLabels } from "@/lib/decisions-disruptions-2/format";
import type { EventTactic } from "@/lib/decisions-disruptions-2/types";

export interface TacticBadgeProps {
  tactic: EventTactic;
}

const tacticClasses: Record<EventTactic, string> = {
  reconnaissance: "bg-slate-500/20 text-slate-300",
  "initial-access": "bg-amber-500/20 text-amber-300",
  execution: "bg-orange-500/20 text-orange-300",
  "credential-access": "bg-violet-500/20 text-violet-300",
  "lateral-movement": "bg-fuchsia-500/20 text-fuchsia-300",
  collection: "bg-sky-500/20 text-sky-300",
  exfiltration: "bg-pink-500/20 text-pink-300",
  impact: "bg-rose-500/20 text-rose-300",
  operations: "bg-emerald-500/20 text-emerald-300",
};

/** A MITRE ATT&CK-style tactic tag on a D&D2 event card. */
export function TacticBadge({ tactic }: TacticBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tacticClasses[tactic]}`}
    >
      {tacticLabels[tactic]}
    </span>
  );
}
