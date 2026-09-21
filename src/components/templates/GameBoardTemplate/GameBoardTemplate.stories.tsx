import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";

import { getDefenceByName } from "@/lib/decisions-disruptions/defences";
import type { GameState, RevealEntry } from "@/lib/decisions-disruptions/types";
import { GameBoardTemplate } from "./GameBoardTemplate";

const meta = {
  title: "Templates/GameBoardTemplate",
  component: GameBoardTemplate,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    onAddToCart: fn(),
    onRemoveFromCart: fn(),
    onEndRound: fn(),
  },
} satisfies Meta<typeof GameBoardTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

// biome-ignore lint/style/noNonNullAssertion: name is hardcoded from the real catalog
const firewallOffice = getDefenceByName("Firewall office")!;

const round1Entries: RevealEntry[] = [
  {
    attackName: "Phishing email",
    stepName: "Initial access",
    countered: true,
    narrative: "Security training helped staff spot the phishing attempt.",
  },
];

const round2Entries: RevealEntry[] = [
  {
    attackName: "Ransomware",
    stepName: "Encryption",
    countered: false,
    narrative: "Files across the plant network were encrypted.",
  },
];

export const RoundOneNoHistory: Story = {
  args: {
    game: {
      phase: "round",
      round: 1,
      ownedDefences: [],
      cart: [],
      revealHistory: [],
    },
    isHost: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Round 1 / 4")).toBeVisible();
    expect(canvas.queryByText("Previous rounds")).not.toBeInTheDocument();
  },
};

export const RoundThreeWithHistory: Story = {
  args: {
    game: {
      phase: "round",
      round: 3,
      ownedDefences: [{ defence: firewallOffice, round: 1 }],
      cart: [],
      revealHistory: [round1Entries, round2Entries],
    } satisfies GameState,
    isHost: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Round 3 / 4")).toBeVisible();

    const headings = canvas.getAllByText(/^Round \d$/);
    // Most-recent-round-first: Round 2 before Round 1 in the reveal feed.
    expect(headings.map((el) => el.textContent)).toEqual([
      "Round 2",
      "Round 1",
    ]);
  },
};
