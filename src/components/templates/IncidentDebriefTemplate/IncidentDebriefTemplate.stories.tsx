import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { sampleRoundState } from "@/lib/decisions-disruptions-2/fixtures";
import { IncidentDebriefTemplate } from "./IncidentDebriefTemplate";

const meta = {
  title: "Templates/IncidentDebriefTemplate",
  component: IncidentDebriefTemplate,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof IncidentDebriefTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Survived: Story = {
  args: {
    game: { ...sampleRoundState, phase: "finished", round: 5 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "You made it through the week" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "The business survived all 5 days with 2 incidents still open.",
      ),
    ).toBeVisible();
    await expect(canvas.getByText("£455k")).toBeVisible();
    await expect(canvas.getByText("£96")).toBeVisible();
    // One decision, nothing blocked in the sample timeline.
    await expect(canvas.getByText("1")).toBeVisible();
    await expect(canvas.getByText("0")).toBeVisible();
    await expect(
      canvas.getByText("Patch firewall rules", { selector: "li" }),
    ).toBeVisible();
    await expect(
      canvas.getAllByRole("region").map((r) => r.getAttribute("aria-label")),
    ).toEqual(["Day 1", "Day 2"]);
    await expect(canvas.getByText(/Shreeve, Gardiner/)).toBeVisible();
  },
};

export const SurvivedWithOneOpen: Story = {
  args: {
    game: {
      ...sampleRoundState,
      phase: "finished",
      round: 5,
      openEvents: sampleRoundState.openEvents.slice(0, 1),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(
        "The business survived all 5 days with 1 incident still open.",
      ),
    ).toBeVisible();
  },
};

export const LostToSaturation: Story = {
  args: {
    game: {
      ...sampleRoundState,
      phase: "lost",
      round: 4,
      lossReason: "saturation",
      ownedUpgrades: [],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Game over" }),
    ).toBeVisible();
    await expect(canvas.getByText(/^Day 4: Event saturation/)).toBeVisible();
    await expect(canvas.getByText("No upgrades were made.")).toBeVisible();
  },
};

export const Bankrupt: Story = {
  args: {
    game: {
      ...sampleRoundState,
      phase: "lost",
      round: 3,
      profit: -20,
      lossReason: "profit",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/^Day 3: Projected profit hit zero/),
    ).toBeVisible();
    await expect(canvas.getByText("−£20k")).toBeVisible();
  },
};
