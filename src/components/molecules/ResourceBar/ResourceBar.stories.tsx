import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { ResourceBar } from "./ResourceBar";

const meta = {
  title: "Molecules/ResourceBar",
  component: ResourceBar,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    hours: 80,
    hoursPerRound: 80,
    profit: 500,
    sharePrice: 100,
    openEvents: 3,
  },
} satisfies Meta<typeof ResourceBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StartOfGame: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("£500k")).toBeVisible();
    await expect(canvas.getByText("£100")).toBeVisible();
    await expect(canvas.getByText("80h / 80h")).toBeVisible();
    await expect(canvas.getByText("3 / 10")).toBeVisible();
    await expect(
      canvas.getByRole("progressbar", { name: "Hours left today" }),
    ).toHaveAttribute("aria-valuenow", "80");
    await expect(canvas.getByText("£500k")).not.toHaveClass("text-rose-400");
  },
};

export const UnderPressure: Story = {
  args: { hours: 6, profit: 80, sharePrice: 15, openEvents: 8 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("£80k")).toHaveClass("text-rose-400");
    await expect(canvas.getByText("£15")).toHaveClass("text-rose-400");
    await expect(canvas.getByText("8 / 10")).toHaveClass("text-rose-400");
    await expect(canvas.getByText("6h / 80h")).toBeVisible();
  },
};

export const Bankrupt: Story = {
  args: { profit: -40 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("−£40k")).toBeVisible();
  },
};
