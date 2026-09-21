import type { JSX } from "react";
import {
  CategoryBadge,
  categoryLabels,
} from "@/components/atoms/CategoryBadge/CategoryBadge";
import { ProgressBar } from "@/components/atoms/ProgressBar/ProgressBar";
import type { Category } from "@/lib/decisions-disruptions/types";

export interface ScoreBarProps {
  category: Category;
  score: number;
  maxScore: number;
}

export function ScoreBar({
  category,
  score,
  maxScore,
}: ScoreBarProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <CategoryBadge category={category} />
      <ProgressBar
        label={categoryLabels[category]}
        value={score}
        max={maxScore}
      />
    </div>
  );
}
