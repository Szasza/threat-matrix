import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { GameSetupPanel } from "./GameSetupPanel";

const meta = {
  title: "Organisms/GameSetupPanel",
  component: GameSetupPanel,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    gameId: "decisions-and-disruptions",
    onStart: fn(),
  },
} satisfies Meta<typeof GameSetupPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NonHost: Story = {
  args: {
    isHost: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Waiting for the host to start the game..."),
    ).toBeVisible();
    expect(canvas.queryByRole("button")).not.toBeInTheDocument();
    expect(canvas.queryByRole("checkbox")).not.toBeInTheDocument();
  },
};

export const HostStartsWithoutNationState: Story = {
  args: {
    isHost: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Start Game" });
    await userEvent.click(button);
    await expect(args.onStart).toHaveBeenCalledWith({
      includeNationState: false,
    });
  },
};

export const HostStartsWithNationState: Story = {
  args: {
    isHost: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox", {
      name: "Include Nation State attacks",
    });
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();

    const button = canvas.getByRole("button", { name: "Start Game" });
    await userEvent.click(button);
    await expect(args.onStart).toHaveBeenCalledWith({
      includeNationState: true,
    });
  },
};

export const UnknownGame: Story = {
  args: {
    gameId: "does-not-exist",
    isHost: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Unknown game: does-not-exist"),
    ).toBeVisible();
    expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const Dd2HostStartsWithGuideTimer: Story = {
  args: {
    gameId: "decisions-and-disruptions-2",
    isHost: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox", {
      name: "Enforce round timer",
    });
    await expect(checkbox).not.toBeChecked();
    await expect(checkbox).toHaveAccessibleDescription(
      /ends automatically after 20 minutes/,
    );
    await userEvent.click(canvas.getByRole("button", { name: "Start Game" }));
    await expect(args.onStart).toHaveBeenCalledWith({
      enforceRoundTimer: false,
    });
  },
};

export const Dd2NonHost: Story = {
  args: {
    gameId: "decisions-and-disruptions-2",
    isHost: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Waiting for the host to start the game..."),
    ).toBeVisible();
    expect(canvas.queryByRole("checkbox")).not.toBeInTheDocument();
  },
};
