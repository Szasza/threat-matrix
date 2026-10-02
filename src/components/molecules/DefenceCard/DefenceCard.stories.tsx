import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { DefenceCard } from "./DefenceCard";

const meta = {
  title: "Molecules/DefenceCard",
  component: DefenceCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: { onAdd: fn(), onRemove: fn(), onToggleVote: fn() },
} satisfies Meta<typeof DefenceCard>;

export default meta;

const FIREWALL_DESCRIPTION =
  "A software and hardware solution that monitors and filters unauthorised traffic.";
type Story = StoryObj<typeof meta>;

export const Available: Story = {
  args: {
    defence: {
      name: "Firewall",
      cost: 20,
      category: "cyber_defence",
      description: FIREWALL_DESCRIPTION,
      hidden: false,
    },
    state: "available",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Add to cart" });
    await userEvent.click(button);
    await expect(args.onAdd).toHaveBeenCalledTimes(1);
    await expect(canvas.getByText(FIREWALL_DESCRIPTION)).toBeVisible();
    expect(canvas.queryByText("Remove")).not.toBeInTheDocument();
    expect(canvas.queryByText("Owned")).not.toBeInTheDocument();
  },
};

export const InCart: Story = {
  args: {
    defence: {
      name: "Firewall",
      cost: 20,
      category: "cyber_defence",
      description: FIREWALL_DESCRIPTION,
      hidden: false,
    },
    state: "in-cart",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("In cart")).toBeVisible();
    const button = canvas.getByRole("button", { name: "Remove" });
    await userEvent.click(button);
    await expect(args.onRemove).toHaveBeenCalledTimes(1);
  },
};

export const Owned: Story = {
  args: {
    defence: {
      name: "Firewall",
      cost: 20,
      category: "cyber_defence",
      description: FIREWALL_DESCRIPTION,
      hidden: false,
    },
    state: "owned",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Owned")).toBeVisible();
    await expect(canvas.getByText(FIREWALL_DESCRIPTION)).toBeVisible();
    await expect(canvas.queryAllByRole("button")).toHaveLength(0);
  },
};

export const AvailableReadOnly: Story = {
  args: {
    defence: {
      name: "Firewall",
      cost: 20,
      category: "cyber_defence",
      description: FIREWALL_DESCRIPTION,
      hidden: false,
    },
    state: "available",
    canEdit: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Firewall")).toBeVisible();
    await expect(canvas.getByText(FIREWALL_DESCRIPTION)).toBeVisible();
    expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const InCartReadOnly: Story = {
  args: {
    defence: {
      name: "Firewall",
      cost: 20,
      category: "cyber_defence",
      description: FIREWALL_DESCRIPTION,
      hidden: false,
    },
    state: "in-cart",
    canEdit: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("In cart")).toBeVisible();
    expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const HiddenDefenceStillRendersWhenPassedExplicitly: Story = {
  args: {
    defence: {
      name: "Upgrade PC",
      cost: 30,
      category: "cyber_defence",
      description:
        "A brand new, up-to-date OS and software suite for all Personal Computers.",
      hidden: true,
    },
    state: "available",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Upgrade PC")).toBeVisible();
  },
};

const firewall = {
  name: "Firewall",
  cost: 20,
  category: "cyber_defence",
  description: FIREWALL_DESCRIPTION,
  hidden: false,
} as const;

export const HostSeesVoteCount: Story = {
  args: { defence: firewall, state: "available", votes: 3 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const description = canvas.getByText(FIREWALL_DESCRIPTION);
    const votes = canvas.getByText("3 votes");
    const addButton = canvas.getByRole("button", { name: "Add to cart" });
    await expect(votes).toBeVisible();

    // Vote count sits between the description and the "Add to cart" button.
    expect(
      description.compareDocumentPosition(votes) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      votes.compareDocumentPosition(addButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // The game master can't vote: the only button is the cart control.
    await expect(canvas.getAllByRole("button")).toHaveLength(1);
  },
};

export const HostSeesSingularVote: Story = {
  args: { defence: firewall, state: "in-cart", votes: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1 vote")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Remove" })).toBeVisible();
  },
};

export const PlayerCanVote: Story = {
  args: {
    defence: firewall,
    state: "available",
    canEdit: false,
    canVote: true,
    votes: 2,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("button", {
      name: "Vote for Firewall, 2 votes",
    });
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await expect(canvas.getByTestId("vote-count")).toHaveTextContent("2");
    await expect(canvas.getByText("Click to vote")).toBeVisible();
    expect(canvas.queryByText("Add to cart")).not.toBeInTheDocument();

    await userEvent.click(card);
    await expect(args.onToggleVote).toHaveBeenCalledTimes(1);
  },
};

export const PlayerHasVoted: Story = {
  args: {
    defence: firewall,
    state: "available",
    canEdit: false,
    canVote: true,
    hasVoted: true,
    votes: 1,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("button", {
      name: "Vote for Firewall, 1 vote",
    });
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByText("Voted · click to unvote")).toBeVisible();

    await userEvent.click(card);
    await expect(args.onToggleVote).toHaveBeenCalledTimes(1);
  },
};

export const PlayerVotesOnInCartCard: Story = {
  args: {
    defence: firewall,
    state: "in-cart",
    canEdit: false,
    canVote: true,
    votes: 4,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("In cart")).toBeVisible();
    await expect(canvas.getByTestId("vote-count")).toHaveTextContent("4");
    await expect(
      canvas.getByRole("button", { name: "Vote for Firewall, 4 votes" }),
    ).toBeVisible();
  },
};

export const PlayerCannotVoteOnOwnedCard: Story = {
  args: {
    defence: firewall,
    state: "owned",
    canEdit: false,
    canVote: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Owned")).toBeVisible();
    expect(canvas.queryByRole("button")).not.toBeInTheDocument();
    expect(canvas.queryByTestId("vote-count")).not.toBeInTheDocument();
  },
};
