import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { ScenarioMap } from "./ScenarioMap";

const meta = {
  title: "Atoms/ScenarioMap",
  component: ScenarioMap,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScenarioMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("img", { name: /map of the plant and the office/i }),
    ).toBeInTheDocument();
    await expect(canvas.getByText("The plant")).toBeInTheDocument();
    await expect(canvas.getByText("The office")).toBeInTheDocument();
    await expect(canvas.getByText("SCADA controller")).toBeInTheDocument();
    await expect(canvas.getByText("Email & web server")).toBeInTheDocument();
    await expect(canvas.getByText("Internet")).toBeInTheDocument();
    await expect(canvas.getAllByText("Router")).toHaveLength(2);
    await expect(canvas.getAllByText("Database")).toHaveLength(2);
  },
};
