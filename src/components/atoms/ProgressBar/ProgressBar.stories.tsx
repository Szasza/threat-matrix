import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { ProgressBar } from "./ProgressBar";

const meta = {
  title: "Atoms/ProgressBar",
  component: ProgressBar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Budget remaining",
    value: 50,
    max: 100,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar", { name: "Budget remaining" });
    await expect(bar).toHaveAttribute("aria-valuenow", "50");
    await expect(canvas.getByText("50 / 100")).toBeVisible();
  },
};

export const NearEmpty: Story = {
  args: {
    label: "Budget remaining",
    value: 5,
    max: 100,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar", { name: "Budget remaining" });
    await expect(bar).toHaveAttribute("aria-valuenow", "5");
    await expect(canvas.getByText("5 / 100")).toBeVisible();
  },
};

export const AtOrOverMax: Story = {
  args: {
    label: "Budget remaining",
    value: 120,
    max: 100,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar", { name: "Budget remaining" });
    await expect(bar).toHaveAttribute("aria-valuenow", "120");
    const filled = canvasElement.querySelector(
      "[aria-hidden='true'] > div",
    ) as HTMLElement;
    await expect(filled.style.width).toBe("100%");
  },
};

export const ZeroMax: Story = {
  args: {
    label: "Budget remaining",
    value: 0,
    max: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar", { name: "Budget remaining" });
    await expect(bar).toHaveAttribute("aria-valuenow", "0");
    const filled = canvasElement.querySelector(
      "[aria-hidden='true'] > div",
    ) as HTMLElement;
    await expect(filled.style.width).toBe("0%");
  },
};

export const WithCustomFormat: Story = {
  args: {
    label: "Score",
    value: 8,
    max: 16,
    formatValue: (value, max) => `${value}k / ${max}k`,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("8k / 16k")).toBeVisible();
  },
};

export const Danger: Story = {
  args: {
    label: "Budget spent",
    value: 130,
    max: 100,
    formatValue: (value, max) => `${value}k / ${max}k`,
    variant: "danger",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const readout = canvas.getByText("130k / 100k");
    await expect(readout).toHaveClass("text-rose-400");
    const filled = canvasElement.querySelector(
      "[aria-hidden='true'] > div",
    ) as HTMLElement;
    await expect(filled).toHaveClass("bg-rose-500");
  },
};
