import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { getDefenceByName } from "@/lib/decisions-disruptions/defences";
import type { GameState } from "@/lib/decisions-disruptions/types";
import { DefenceShop } from "./DefenceShop";

const meta = {
  title: "Organisms/DefenceShop",
  component: DefenceShop,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    onAddToCart: fn(),
    onRemoveFromCart: fn(),
    onEndRound: fn(),
  },
} satisfies Meta<typeof DefenceShop>;

export default meta;
type Story = StoryObj<typeof meta>;

// biome-ignore lint/style/noNonNullAssertion: names are hardcoded from the real catalog
const firewallOffice = getDefenceByName("Firewall office")!;
// biome-ignore lint/style/noNonNullAssertion: names are hardcoded from the real catalog
const cctvOffice = getDefenceByName("CCTV office")!;
// biome-ignore lint/style/noNonNullAssertion: names are hardcoded from the real catalog
const cctvPlant = getDefenceByName("CCTV plant")!;
// biome-ignore lint/style/noNonNullAssertion: names are hardcoded from the real catalog
const antivirus = getDefenceByName("Antivirus")!;
// biome-ignore lint/style/noNonNullAssertion: names are hardcoded from the real catalog
const assetAudit = getDefenceByName("Asset audit")!;

const midGameState: GameState = {
  phase: "round",
  round: 2,
  ownedDefences: [{ defence: firewallOffice, round: 1 }],
  cart: [cctvOffice],
  revealHistory: [[]],
};

export const MidGameHost: Story = {
  args: {
    game: midGameState,
    isHost: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Owned card has no interactive buttons.
    const ownedCard = canvas
      .getByText("Firewall office")
      .closest("[data-state]");
    expect(
      ownedCard ? within(ownedCard as HTMLElement).queryByRole("button") : null,
    ).not.toBeInTheDocument();

    // In-cart card can be removed.
    const removeButtons = canvas.getAllByRole("button", { name: "Remove" });
    await userEvent.click(removeButtons[0]);
    await expect(args.onRemoveFromCart).toHaveBeenCalledWith("CCTV office");

    // Available card can be added.
    const addButtons = canvas.getAllByRole("button", { name: "Add to cart" });
    await userEvent.click(addButtons[0]);
    await expect(args.onAddToCart).toHaveBeenCalled();

    await expect(
      canvas.getByRole("button", { name: "End Round" }),
    ).toBeVisible();
  },
};

export const NonHost: Story = {
  args: {
    game: midGameState,
    isHost: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.queryByRole("button", { name: "End Round" }),
    ).not.toBeInTheDocument();

    // Only the game master may edit the shared cart — a non-host viewer
    // sees the shop (including the "In cart" indicator) but no buy/unbuy
    // buttons at all.
    expect(
      canvas.queryByRole("button", { name: "Add to cart" }),
    ).not.toBeInTheDocument();
    expect(
      canvas.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByText("In cart")).toBeVisible();
  },
};

export const HostEndsRound: Story = {
  args: {
    game: midGameState,
    isHost: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "End Round" });
    await userEvent.click(button);
    await expect(args.onEndRound).toHaveBeenCalledTimes(1);
  },
};

export const EndRoundOverBudgetError: Story = {
  args: {
    game: midGameState,
    isHost: true,
    endRoundError: "Cart total (150k) exceeds available budget (100k).",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Cart total (150k) exceeds available budget (100k)."),
    ).toBeVisible();
  },
};

export const OverBudgetCart: Story = {
  args: {
    game: {
      phase: "round",
      round: 1,
      ownedDefences: [],
      cart: [cctvOffice, cctvPlant, antivirus], // 130k > the 100k round-1 budget
      revealHistory: [],
    },
    isHost: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const readout = canvas.getByText("130k / 100k");
    await expect(readout).toHaveClass("text-rose-400");
    const filled = canvasElement.querySelector(
      "[aria-hidden='true'] > div",
    ) as HTMLElement;
    await expect(filled).toHaveClass("bg-rose-500");
    await expect(canvas.getByText("Remaining after cart: -30k")).toBeVisible();
  },
};

export const AssetAuditNotBought: Story = {
  args: {
    game: {
      phase: "round",
      round: 1,
      ownedDefences: [],
      cart: [],
      revealHistory: [],
    },
    isHost: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Firewall office")).toBeVisible();
    expect(canvas.queryByText("Upgrade PC")).not.toBeInTheDocument();
  },
};

export const AssetAuditBought: Story = {
  args: {
    game: {
      phase: "round",
      round: 1,
      ownedDefences: [{ defence: assetAudit, round: 1 }],
      cart: [],
      revealHistory: [],
    },
    isHost: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Upgrade PC")).toBeVisible();
    await expect(canvas.getByText("Encryption PC")).toBeVisible();
  },
};
