import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { ScoreBar } from "./ScoreBar";

const meta = {
  title: "Molecules/ScoreBar",
  component: ScoreBar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScoreBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    category: "cyber_defence",
    score: 8,
    maxScore: 16,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const labels = canvas.getAllByText("Cyber Defence");
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      await expect(label).toBeVisible();
    }
    await expect(canvas.getByText("8 / 16")).toBeVisible();
  },
};

export const ZeroScore: Story = {
  args: {
    category: "human_factors",
    score: 0,
    maxScore: 16,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar", { name: "Human Factors" });
    await expect(bar).toHaveAttribute("aria-valuenow", "0");
  },
};

export const MaxScore: Story = {
  args: {
    category: "data_defence",
    score: 16,
    maxScore: 16,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar", { name: "Data Defence" });
    await expect(bar).toHaveAttribute("aria-valuenow", "16");
    await expect(canvas.getByText("16 / 16")).toBeVisible();
  },
};
