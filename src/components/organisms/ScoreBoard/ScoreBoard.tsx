import type { JSX } from "react";
import { ScoreBar } from "@/components/molecules/ScoreBar/ScoreBar";
import type { Category } from "@/lib/decisions-disruptions/types";

export interface ScoreBoardProps {
  scores: Record<Category, number>;
}

const CATEGORY_ORDER: Category[] = [
  "physical_defence",
  "advanced_cyber_defence",
  "cyber_defence",
  "data_defence",
  "intelligence_gathering",
  "human_factors",
];

const MAX_SCORES: Record<Category, number> = {
  physical_defence: 8,
  advanced_cyber_defence: 8,
  cyber_defence: 16,
  data_defence: 8,
  intelligence_gathering: 8,
  human_factors: 8,
};

export function ScoreBoard({ scores }: ScoreBoardProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {CATEGORY_ORDER.map((category) => (
        <ScoreBar
          key={category}
          category={category}
          score={scores[category]}
          maxScore={MAX_SCORES[category]}
        />
      ))}
    </div>
  );
}
