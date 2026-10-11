import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";

import { RoundTimer } from "./RoundTimer";

const MINUTE = 60 * 1000;
const START = 1_000_000;

const meta = {
  title: "Atoms/RoundTimer",
  component: RoundTimer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    startedAt: START,
    durationMs: 20 * MINUTE,
    enforced: false,
  },
} satisfies Meta<typeof RoundTimer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JustStarted: Story = {
  args: { now: () => START },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timer = canvas.getByRole("timer", { name: "Time left today" });
    await expect(timer).toHaveTextContent("20:00");
    await expect(canvas.getByText("Guide time only")).toBeVisible();
  },
};

export const Enforced: Story = {
  args: { enforced: true, now: () => START + 5 * MINUTE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("15:00")).toBeVisible();
    await expect(
      canvas.getByText("Day ends automatically at 0:00"),
    ).toBeVisible();
  },
};

export const RunningLow: Story = {
  args: { now: () => START + 19 * MINUTE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1:00")).toHaveClass("text-rose-400");
  },
};

export const TimeUp: Story = {
  args: { now: () => START + 25 * MINUTE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("0:00")).toBeVisible();
    await expect(canvas.getByText("Time's up")).toBeVisible();
  },
};

export const TimeUpEnforced: Story = {
  args: { enforced: true, now: () => START + 25 * MINUTE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Time's up — ending the day")).toBeVisible();
  },
};

let tickingClock = START;
export const Ticks: Story = {
  args: {
    now: () => {
      tickingClock += 1000;
      return tickingClock;
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timer = canvas.getByRole("timer");
    const initial = timer.textContent;
    await waitFor(() => expect(timer.textContent).not.toBe(initial), {
      timeout: 3000,
    });
  },
};

export const RealClock: Story = {
  args: { startedAt: Date.now(), now: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("timer")).toHaveTextContent(
      /1[89]:\d\d|20:00/,
    );
  },
};
