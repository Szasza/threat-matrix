import type { JSX } from "react";
import type { Category } from "@/lib/decisions-disruptions/types";

export interface CategoryBadgeProps {
  category: Category;
}

export const categoryLabels: Record<Category, string> = {
  physical_defence: "Physical Defence",
  advanced_cyber_defence: "Advanced Cyber Defence",
  cyber_defence: "Cyber Defence",
  data_defence: "Data Defence",
  intelligence_gathering: "Intelligence Gathering",
  human_factors: "Human Factors",
};

const categoryClasses: Record<Category, string> = {
  physical_defence: "bg-amber-500/20 text-amber-300",
  advanced_cyber_defence: "bg-fuchsia-500/20 text-fuchsia-300",
  cyber_defence: "bg-sky-500/20 text-sky-300",
  data_defence: "bg-emerald-500/20 text-emerald-300",
  intelligence_gathering: "bg-violet-500/20 text-violet-300",
  human_factors: "bg-rose-500/20 text-rose-300",
};

export function CategoryBadge({ category }: CategoryBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryClasses[category]}`}
    >
      {categoryLabels[category]}
    </span>
  );
}
