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
  args: { onAdd: fn(), onRemove: fn() },
} satisfies Meta<typeof DefenceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {
  args: {
    defence: {
      name: "Firewall",
      cost: 20,
      category: "cyber_defence",
      hidden: false,
    },
    state: "available",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Add to cart" });
    await userEvent.click(button);
    await expect(args.onAdd).toHaveBeenCalledTimes(1);
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
      hidden: false,
    },
    state: "owned",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Owned")).toBeVisible();
    await expect(canvas.queryAllByRole("button")).toHaveLength(0);
  },
};

export const AvailableReadOnly: Story = {
  args: {
    defence: {
      name: "Firewall",
      cost: 20,
      category: "cyber_defence",
      hidden: false,
    },
    state: "available",
    canEdit: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Firewall")).toBeVisible();
    expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const InCartReadOnly: Story = {
  args: {
    defence: {
      name: "Firewall",
      cost: 20,
      category: "cyber_defence",
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
      hidden: true,
    },
    state: "available",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Upgrade PC")).toBeVisible();
  },
};
