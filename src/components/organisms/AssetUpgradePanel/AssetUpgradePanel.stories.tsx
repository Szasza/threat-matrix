import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { AssetUpgradePanel } from "./AssetUpgradePanel";

const meta = {
  title: "Organisms/AssetUpgradePanel",
  component: AssetUpgradePanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    ownedUpgrades: [],
    upgradeVotes: {},
    isHost: true,
    hoursLeft: 80,
    currentParticipantId: "host",
    onPurchase: fn(),
    onVote: fn(),
    onUnvote: fn(),
  },
} satisfies Meta<typeof AssetUpgradePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HostShop: Story = {
  args: {
    ownedUpgrades: [
      { upgradeId: "sanctions-automation", round: 1 },
      { upgradeId: "vpn-patch", round: 1 },
    ],
    upgradeVotes: { "vpn-mfa": ["p1", "p2"] },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Enterprise Architecture" }),
    ).toBeVisible();
    // Ten assets; the maxed-out sanctions system has no buy button.
    await expect(canvas.getAllByRole("region")).toHaveLength(11);
    await expect(
      canvas.getAllByRole("button", { name: "Buy upgrade" }),
    ).toHaveLength(9);

    const vpn = within(canvas.getByRole("region", { name: "VPN" }));
    await expect(vpn.getByText("Enforce VPN MFA")).toBeVisible();
    await expect(vpn.getByText("2 votes")).toBeVisible();
    await userEvent.click(vpn.getByRole("button", { name: "Buy upgrade" }));
    await expect(args.onPurchase).toHaveBeenCalledWith("vpn-mfa");
  },
};

export const PlayerVotesAndUnvotes: Story = {
  args: {
    isHost: false,
    currentParticipantId: "p1",
    upgradeVotes: { "soc-triage": ["p1"] },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const soc = within(canvas.getByRole("region", { name: "SOC / SIEM" }));
    await userEvent.click(soc.getByRole("button", { name: "Voted · 1 vote" }));
    await expect(args.onUnvote).toHaveBeenCalledWith("soc-triage");

    const firewall = within(canvas.getByRole("region", { name: "Firewall" }));
    await userEvent.click(
      firewall.getByRole("button", { name: "Vote · 0 votes" }),
    );
    await expect(args.onVote).toHaveBeenCalledWith("firewall-rules");
  },
};
