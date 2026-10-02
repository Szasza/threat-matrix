import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { ScenarioBriefing } from "./ScenarioBriefing";

const meta = {
  title: "Organisms/ScenarioBriefing",
  component: ScenarioBriefing,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScenarioBriefing>;

export default meta;
type Story = StoryObj<typeof meta>;

const TITLE = "Welcome from the Board of Directors";

export const OpenByDefault: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Your mission")).toBeVisible();
    await expect(
      canvas.getByText("The plant", { selector: "h3" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: /map of the plant and the office/i }),
    ).toBeVisible();
    await expect(canvas.getByText("Office network")).toBeVisible();

    // Collapsing hides the briefing but keeps the summary to reopen it.
    await userEvent.click(canvas.getByText(TITLE));
    await expect(canvas.getByText("Your mission")).not.toBeVisible();
    await expect(canvas.getByText(TITLE)).toBeVisible();
  },
};

export const Collapsed: Story = {
  args: { defaultOpen: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(TITLE)).toBeVisible();
    await expect(canvas.getByText("Your mission")).not.toBeVisible();

    await userEvent.click(canvas.getByText(TITLE));
    await expect(canvas.getByText("Your mission")).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: /map of the plant and the office/i }),
    ).toBeVisible();
  },
};
