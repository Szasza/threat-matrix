import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { categoryLabels } from "@/components/atoms/CategoryBadge/CategoryBadge";
import type { Category } from "@/lib/decisions-disruptions/types";
import { ScoreBoard } from "./ScoreBoard";

const meta = {
  title: "Organisms/ScoreBoard",
  component: ScoreBoard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScoreBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

const scores: Record<Category, number> = {
  physical_defence: 4,
  advanced_cyber_defence: 3,
  cyber_defence: 9,
  data_defence: 2,
  intelligence_gathering: 5,
  human_factors: 1,
};

export const RealisticMix: Story = {
  args: {
    scores,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const label of Object.values(categoryLabels)) {
      const matches = canvas.getAllByText(label);
      expect(matches.length).toBeGreaterThan(0);
    }
  },
};
