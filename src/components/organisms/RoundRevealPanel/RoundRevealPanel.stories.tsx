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
    visibleToPlayers: true,
    attackName: "Phishing email",
    stepName: "Initial access",
    countered: true,
    narrative: "Security training helped staff spot the phishing attempt.",
  },
  {
    visibleToPlayers: true,
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

export const PlayerViewEffectOnly: Story = {
  args: {
    round: 2,
    entries: [
      {
        countered: false,
        narrative: "The office network is hit with traffic.",
        visibleToPlayers: true,
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const item = canvas.getByRole("listitem");
    // Only the effect: no attacker/step heading, no game-master tag.
    await expect(item).toHaveTextContent(
      /^The office network is hit with traffic\.$/,
    );
    await expect(item.querySelectorAll("p")).toHaveLength(1);
    await expect(item).toHaveAttribute("data-countered", "false");
    expect(canvas.queryByText("Hidden from players")).not.toBeInTheDocument();
  },
};

export const PlayerViewNothingNoticed: Story = {
  args: { round: 1, entries: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Nothing out of the ordinary was noticed this round."),
    ).toBeVisible();
    expect(canvas.queryByRole("listitem")).not.toBeInTheDocument();
  },
};

export const GameMasterSeesHiddenEntries: Story = {
  args: {
    round: 1,
    entries: [
      {
        attackName: "DoSing Kiddie",
        stepName: "",
        countered: true,
        narrative: "This attack has not started yet.",
        visibleToPlayers: false,
      },
      {
        attackName: "Scanning Kiddie",
        stepName: "Scan offices",
        countered: true,
        narrative:
          "The office firewall intercepts a number of scanning attempts.",
        visibleToPlayers: true,
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("DoSing Kiddie")).toBeVisible();
    await expect(canvas.getByText("Scanning Kiddie")).toBeVisible();
    await expect(canvas.getByText("Scan offices")).toBeVisible();

    const hiddenTags = canvas.getAllByText("Hidden from players");
    await expect(hiddenTags).toHaveLength(1);
    await expect(
      hiddenTags[0].closest("[data-visible-to-players]"),
    ).toHaveAttribute("data-visible-to-players", "false");
  },
};
