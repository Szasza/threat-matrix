import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import type { OpenEvent } from "@/lib/decisions-disruptions-2/types";
import { IncidentQueue } from "./IncidentQueue";

function openEvent(id: string, title: string): OpenEvent {
  return {
    id,
    definitionId: id.split("@")[0],
    title,
    kind: "ticket",
    tactic: "impact",
    description: `What happened: ${title}`,
    choices: [
      {
        id: "fix",
        label: "Fix it",
        hoursCost: 8,
        profitCost: 0,
        uncertain: false,
      },
    ],
    roundDrawn: 1,
    ignored: false,
  };
}

const ddos = openEvent("ddos@1", "Ticket #201: DDoS against online banking");
const usb = openEvent("usb-stick@1", "Direct #145: A USB stick found");

const meta = {
  title: "Organisms/IncidentQueue",
  component: IncidentQueue,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    events: [ddos, usb],
    round: 1,
    totalRounds: 5,
    isHost: true,
    hoursLeft: 80,
    eventBallots: {},
    currentParticipantId: "host",
    onChoose: fn(),
    onVote: fn(),
    onEndRound: fn(),
  },
} satisfies Meta<typeof IncidentQueue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HostResolvesAndEndsDay: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("article")).toHaveLength(2);
    await expect(
      canvas.getByText(
        "2 unresolved incidents carry over, and neglected incidents can get worse overnight.",
      ),
    ).toBeVisible();

    const card = within(canvas.getByRole("article", { name: usb.title }));
    await userEvent.click(card.getByRole("button", { name: /Fix it/ }));
    await userEvent.click(card.getByRole("button", { name: "Confirm" }));
    await expect(args.onChoose).toHaveBeenCalledWith("usb-stick@1", "fix");

    await userEvent.click(canvas.getByRole("button", { name: "End day 1" }));
    await expect(args.onEndRound).toHaveBeenCalledTimes(1);
  },
};

export const SingleIncidentOnFinalDay: Story = {
  args: { events: [ddos], round: 5 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "End the week" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(/^1 unresolved incident carries over/),
    ).toBeVisible();
  },
};

export const NothingOpen: Story = {
  args: { events: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("No open incidents. Spare hours can go on upgrades."),
    ).toBeVisible();
    expect(canvas.queryByText(/carr(y|ies) over/)).toBeNull();
  },
};

export const PlayerBallots: Story = {
  args: {
    isHost: false,
    currentParticipantId: "p1",
    eventBallots: { "ddos@1": { p2: "fix" } },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByRole("button", { name: /End day/ })).toBeNull();
    const card = within(canvas.getByRole("article", { name: ddos.title }));
    await expect(card.getAllByTestId("ballot-tally")[0]).toHaveTextContent(
      "1 vote",
    );
    await userEvent.click(card.getByRole("button", { name: /Ignore/ }));
    await expect(args.onVote).toHaveBeenCalledWith("ddos@1", "ignore");
  },
};
