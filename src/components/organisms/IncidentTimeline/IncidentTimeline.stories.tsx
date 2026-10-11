import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import type { TimelineEntry } from "@/lib/decisions-disruptions-2/types";
import { IncidentTimeline } from "./IncidentTimeline";

const NO_EFFECT = { hours: 0, profit: 0, sharePrice: 0 };

const entries: TimelineEntry[] = [
  {
    type: "on-draw",
    round: 1,
    title: "Direct #300: A CSIRT analyst is off sick",
    definitionId: "staff-sick",
    narrative: "An analyst is off sick: the team has 8 fewer hours today.",
    effects: { hours: -8, profit: 0, sharePrice: 0 },
  },
  {
    type: "blocked",
    round: 1,
    title: "Ticket #101: Scanning against the perimeter",
    definitionId: "port-scan",
    check: { assetId: "firewall", chance: 40, roll: 12, passed: true },
  },
  {
    type: "choice",
    round: 1,
    title: "Ticket #123: Spreadsheet with macros",
    definitionId: "phishing-macro",
    choiceLabel: "Send a staff-wide warning",
    narrative: "The macro had already run.",
    effects: { hours: -2, profit: 0, sharePrice: 0 },
    check: { assetId: "endpoints", chance: 30, roll: 77, passed: false },
  },
  {
    type: "upgrade",
    round: 1,
    title: "Patch firewall rules",
    upgradeId: "firewall-rules",
    purchased: true,
    effects: { hours: -12, profit: 0, sharePrice: 0 },
  },
  {
    type: "ignored",
    round: 1,
    title: "Direct #145: A USB stick found in the car park",
    definitionId: "usb-stick",
    narrative: "A curious colleague plugged the stick into a branch PC.",
    effects: NO_EFFECT,
  },
  {
    type: "ignored",
    round: 1,
    title: "Ticket #270: The SIEM is drowning",
    definitionId: "siem-noise",
    effects: NO_EFFECT,
  },
  {
    type: "choice",
    round: 2,
    title: "Ticket #106: Ransom note",
    definitionId: "ransomware",
    choiceLabel: "Pay the ransom",
    narrative: "The decryptor works.",
    effects: { hours: -4, profit: -150, sharePrice: -20 },
    check: { chance: 60, roll: 10, passed: true },
  },
  {
    type: "choice",
    round: 2,
    title: "Direct #205: Researcher reports a flaw",
    definitionId: "web-vuln",
    choiceLabel: "Patch it now",
    narrative: "The researcher praises your response.",
    effects: { hours: -16, profit: 0, sharePrice: 2 },
  },
  {
    type: "upgrade",
    round: 2,
    title: "Patch VPN appliance",
    upgradeId: "vpn-patch",
    purchased: false,
    effects: NO_EFFECT,
  },
];

const meta = {
  title: "Organisms/IncidentTimeline",
  component: IncidentTimeline,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: { entries },
} satisfies Meta<typeof IncidentTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Chronological: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const days = canvas.getAllByRole("region");
    await expect(days.map((day) => day.getAttribute("aria-label"))).toEqual([
      "Day 1",
      "Day 2",
    ]);

    const dayOne = within(days[0]);
    await expect(dayOne.getAllByRole("listitem")).toHaveLength(6);
    await expect(
      dayOne.getByText(
        "Stopped before it reached the team: Firewall at 40% · rolled 12 · succeeded.",
      ),
    ).toBeVisible();
    await expect(
      dayOne.getByText("PCs & Laptops at 30% · rolled 77 · failed"),
    ).toBeVisible();
    await expect(dayOne.getByText("−8h")).toBeVisible();
    await expect(dayOne.getByText("Bought by the team.")).toBeVisible();
    await expect(
      dayOne.getByText("Carried over to the next day."),
    ).toBeVisible();

    const dayTwo = within(days[1]);
    await expect(
      dayTwo.getByText("60% chance · rolled 10 · succeeded"),
    ).toBeVisible();
    await expect(dayTwo.getByText("−£150k")).toBeVisible();
    await expect(dayTwo.getByText("+£2 share price")).toHaveClass(
      "text-emerald-300",
    );
    await expect(dayTwo.getByText("Granted by events.")).toBeVisible();
  },
};

export const NewestFirst: Story = {
  args: { newestFirst: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const days = canvas.getAllByRole("region");
    await expect(days[0]).toHaveAccessibleName("Day 2");
  },
};

export const Empty: Story = {
  args: { entries: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nothing has happened yet.")).toBeVisible();
  },
};
