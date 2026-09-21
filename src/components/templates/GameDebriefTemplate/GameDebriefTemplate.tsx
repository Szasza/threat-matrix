import type { JSX } from "react";
import { RoundRevealPanel } from "@/components/organisms/RoundRevealPanel/RoundRevealPanel";
import { ScoreBoard } from "@/components/organisms/ScoreBoard/ScoreBoard";
import type { Category, RevealEntry } from "@/lib/decisions-disruptions/types";

export interface GameDebriefTemplateProps {
  scores: Record<Category, number>;
  revealHistory: RevealEntry[][];
}

export function GameDebriefTemplate({
  scores,
  revealHistory,
}: GameDebriefTemplateProps): JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold text-slate-100">Game Over</h2>

      <ScoreBoard scores={scores} />

      <div className="flex flex-col gap-4">
        {revealHistory
          .map((entries, index) => ({ round: index + 1, entries }))
          .map(({ round, entries }) => (
            <RoundRevealPanel key={round} round={round} entries={entries} />
          ))}
      </div>

      <p className="text-xs text-slate-500">
        Decisions &amp; Disruptions is © Lancaster University, and this digital
        adaptation&apos;s debrief logic is ported from a companion tool by
        Sylvain Frey, University of Southampton — both CC-BY-NC 4.0. See{" "}
        <a
          href="https://www.decisions-disruptions.org"
          className="underline hover:text-slate-300"
        >
          https://www.decisions-disruptions.org
        </a>
        .
      </p>
    </div>
  );
}
