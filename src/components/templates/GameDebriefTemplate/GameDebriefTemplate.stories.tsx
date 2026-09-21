import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import type { Category, RevealEntry } from "@/lib/decisions-disruptions/types";
import { GameDebriefTemplate } from "./GameDebriefTemplate";

const meta = {
  title: "Templates/GameDebriefTemplate",
  component: GameDebriefTemplate,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof GameDebriefTemplate>;

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

const revealHistory: RevealEntry[][] = [
  [
    {
      attackName: "Phishing email",
      stepName: "Initial access",
      countered: true,
      narrative: "Security training helped staff spot the phishing attempt.",
    },
  ],
  [
    {
      attackName: "Phishing email",
      stepName: "Lateral movement",
      countered: true,
      narrative: "Countered at an earlier stage.",
    },
  ],
  [
    {
      attackName: "Ransomware",
      stepName: "Encryption",
      countered: false,
      narrative: "Files across the plant network were encrypted.",
    },
  ],
  [
    {
      attackName: "Ransomware",
      stepName: "Exfiltration",
      countered: false,
      narrative: "Stolen data was leaked publicly.",
    },
  ],
];

export const FullDebrief: Story = {
  args: {
    scores,
    revealHistory,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Game Over")).toBeVisible();

    for (const round of [1, 2, 3, 4]) {
      await expect(canvas.getByText(`Round ${round}`)).toBeVisible();
    }

    const link = canvas.getByRole("link", {
      name: "https://www.decisions-disruptions.org",
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      "href",
      "https://www.decisions-disruptions.org",
    );
  },
};
