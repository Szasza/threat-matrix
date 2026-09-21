import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import type { RevealEntry } from "@/lib/decisions-disruptions/types";
import { RoundRevealPanel } from "./RoundRevealPanel";

const meta = {
  title: "Organisms/RoundRevealPanel",
  component: RoundRevealPanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RoundRevealPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const entries: RevealEntry[] = [
  {
    attackName: "Phishing email",
    stepName: "Initial access",
    countered: true,
    narrative: "Security training helped staff spot the phishing attempt.",
  },
  {
    attackName: "Ransomware",
    stepName: "Encryption",
    countered: false,
    narrative: "Files across the plant network were encrypted.",
  },
];

export const MixedOutcomes: Story = {
  args: {
    round: 1,
    entries,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Round 1")).toBeVisible();

    await expect(
      canvas.getByText(
        "Security training helped staff spot the phishing attempt.",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByText("Files across the plant network were encrypted."),
    ).toBeVisible();

    const counteredItem = canvas
      .getByText("Phishing email")
      .closest("[data-countered]");
    const notCounteredItem = canvas
      .getByText("Ransomware")
      .closest("[data-countered]");

    await expect(counteredItem).toHaveAttribute("data-countered", "true");
    await expect(notCounteredItem).toHaveAttribute("data-countered", "false");
    expect(counteredItem?.className).not.toEqual(notCounteredItem?.className);
  },
};

export const EmptyEntries: Story = {
  args: {
    round: 1,
    entries: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Round 1")).toBeVisible();
  },
};
