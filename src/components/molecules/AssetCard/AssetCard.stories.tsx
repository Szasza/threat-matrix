import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { getAsset } from "@/lib/decisions-disruptions-2/assets";
import { AssetCard } from "./AssetCard";

const meta = {
  title: "Molecules/AssetCard",
  component: AssetCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    asset: getAsset("firewall"),
    ownedUpgrades: [],
    isHost: true,
    hoursLeft: 80,
    votes: 0,
    hasVoted: false,
    onPurchase: fn(),
    onToggleVote: fn(),
  },
} satisfies Meta<typeof AssetCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HostBuysFirstTier: Story = {
  args: { votes: 2 },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("progressbar", { name: "Resistance" }),
    ).toHaveAttribute("aria-valuenow", "40");
    await expect(canvas.getByText("40%")).toBeVisible();
    await expect(canvas.getByText("Patch firewall rules")).toBeVisible();
    await expect(canvas.getByText("→ 60%")).toBeVisible();
    await expect(canvas.getByText("12h")).toBeVisible();
    await expect(canvas.getByText("2 votes")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Buy upgrade" }));
    await expect(args.onPurchase).toHaveBeenCalledWith("firewall-rules");
  },
};

export const SecondTierAfterFirst: Story = {
  args: {
    ownedUpgrades: [{ upgradeId: "firewall-rules", round: 1 }],
    votes: 1,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("60%")).toBeVisible();
    await expect(canvas.getByText("✓ Patch firewall rules")).toBeVisible();
    await expect(canvas.getByText("Enable IDS/IPS")).toBeVisible();
    await expect(canvas.getByText("16h · £40k")).toBeVisible();
    await expect(canvas.getByText("1 vote")).toBeVisible();
  },
};

export const HostShortOfHours: Story = {
  args: { hoursLeft: 5 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Buy upgrade" }),
    ).toBeDisabled();
    await expect(canvas.getByText("12h · Not enough hours")).toBeVisible();
  },
};

export const FullyUpgradedThirdParty: Story = {
  args: {
    asset: getAsset("sanctions"),
    ownedUpgrades: [{ upgradeId: "sanctions-automation", round: 2 }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Fully upgraded")).toBeVisible();
    await expect(canvas.getByText("80%")).toBeVisible();
    expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const ExternalAsset: Story = {
  args: { asset: getAsset("crm") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Third party")).toBeVisible();
  },
};

export const PlayerVotes: Story = {
  args: { isHost: false, votes: 1, hoursLeft: 0 },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const vote = canvas.getByRole("button", { name: "Vote · 1 vote" });
    await expect(vote).toHaveAttribute("aria-pressed", "false");
    expect(canvas.queryByText(/Not enough hours/)).toBeNull();
    await userEvent.click(vote);
    await expect(args.onToggleVote).toHaveBeenCalledWith("firewall-rules");
  },
};

export const PlayerHasVoted: Story = {
  args: { isHost: false, votes: 3, hasVoted: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Voted · 3 votes" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};
