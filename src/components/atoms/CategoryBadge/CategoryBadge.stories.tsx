import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { CategoryBadge } from "./CategoryBadge";

const meta = {
  title: "Atoms/CategoryBadge",
  component: CategoryBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CategoryBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PhysicalDefence: Story = {
  args: {
    category: "physical_defence",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Physical Defence")).toBeVisible();
  },
};

export const AdvancedCyberDefence: Story = {
  args: {
    category: "advanced_cyber_defence",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Advanced Cyber Defence")).toBeVisible();
  },
};

export const CyberDefence: Story = {
  args: {
    category: "cyber_defence",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Cyber Defence")).toBeVisible();
  },
};

export const DataDefence: Story = {
  args: {
    category: "data_defence",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Data Defence")).toBeVisible();
  },
};

export const IntelligenceGathering: Story = {
  args: {
    category: "intelligence_gathering",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Intelligence Gathering")).toBeVisible();
  },
};

export const HumanFactors: Story = {
  args: {
    category: "human_factors",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Human Factors")).toBeVisible();
  },
};
