import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { TacticBadge } from "./TacticBadge";

const meta = {
  title: "Atoms/TacticBadge",
  component: TacticBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TacticBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InitialAccess: Story = {
  args: { tactic: "initial-access" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Initial Access")).toBeVisible();
  },
};

export const Impact: Story = {
  args: { tactic: "impact" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Impact")).toBeVisible();
  },
};

export const Operations: Story = {
  args: { tactic: "operations" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Operations")).toBeVisible();
  },
};
