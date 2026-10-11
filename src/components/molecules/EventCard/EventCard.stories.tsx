import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import type { OpenEvent } from "@/lib/decisions-disruptions-2/types";
import { EventCard } from "./EventCard";

const phishing: OpenEvent = {
  id: "phishing-macro@1",
  definitionId: "phishing-macro",
  title: "Ticket #123: Spreadsheet with macros from 'Finance'",
  kind: "ticket",
  tactic: "initial-access",
  description:
    "Several staff received a spreadsheet asking them to enable macros.",
  choices: [
    {
      id: "quarantine",
      label: "Quarantine the email",
      hoursCost: 10,
      profitCost: 0,
      uncertain: false,
    },
    {
      id: "warn",
      label: "Send a staff-wide warning",
      hoursCost: 2,
      profitCost: 0,
      uncertain: true,
    },
  ],
  roundDrawn: 1,
  ignored: false,
};

const meta = {
  title: "Molecules/EventCard",
  component: EventCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    event: phishing,
    round: 1,
    isHost: true,
    hoursLeft: 80,
    ballots: {},
    currentParticipantId: "host",
    onChoose: fn(),
    onVote: fn(),
  },
} satisfies Meta<typeof EventCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HostConfirmsAChoice: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(phishing.title)).toBeVisible();
    await expect(canvas.getByText("Ticket")).toBeVisible();
    await expect(canvas.getByText("Initial Access")).toBeVisible();
    await expect(canvas.getByText("2h · Outcome uncertain")).toBeVisible();

    await userEvent.click(
      canvas.getByRole("button", { name: /Quarantine the email/ }),
    );
    // Choosing only selects: nothing is committed until confirmed.
    await expect(args.onChoose).not.toHaveBeenCalled();
    await expect(
      canvas.getByText("Commit to “Quarantine the email”? Choices are final."),
    ).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await expect(args.onChoose).toHaveBeenCalledWith("quarantine");
    expect(canvas.queryByRole("button", { name: "Confirm" })).toBeNull();
  },
};

export const HostCancelsAChoice: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const warn = canvas.getByRole("button", { name: /Send a staff-wide/ });
    await userEvent.click(warn);
    await expect(warn).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(warn).toHaveAttribute("aria-pressed", "false");
    await expect(args.onChoose).not.toHaveBeenCalled();
  },
};

export const HostIgnoresWithoutConfirming: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Quarantine the email/ }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: /Ignore this round/ }),
    );
    await expect(args.onChoose).toHaveBeenCalledWith("ignore");
    expect(canvas.queryByRole("button", { name: "Confirm" })).toBeNull();
  },
};

export const HostShortOfHours: Story = {
  args: { hoursLeft: 4 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /Quarantine the email/ }),
    ).toBeDisabled();
    await expect(canvas.getByText("10h · Not enough hours")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /Send a staff-wide/ }),
    ).toBeEnabled();
  },
};

export const IgnoredCarriedOverFollowUp: Story = {
  args: {
    round: 3,
    event: {
      ...phishing,
      roundDrawn: 2,
      ignored: true,
      triggeredBy: "Ticket #101: Scanning against the perimeter",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Open since day 2")).toBeVisible();
    await expect(canvas.getByText("Ignored today")).toBeVisible();
    await expect(
      canvas.getByText(
        "Follow-up to: Ticket #101: Scanning against the perimeter",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /Ignore this round/ }),
    ).toBeDisabled();
  },
};

export const HostSeesBallots: Story = {
  args: { ballots: { p1: "warn", p2: "warn", p3: "ignore" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tallies = canvas.getAllByTestId("ballot-tally");
    await expect(tallies.map((t) => t.textContent)).toEqual([
      "0 votes",
      "2 votes",
      "1 vote",
    ]);
    expect(canvas.queryByText(/Vote for how to respond/)).toBeNull();
  },
};

export const PlayerVotes: Story = {
  args: { isHost: false, currentParticipantId: "p1" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Vote for how to respond")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: /Send a staff-wide/ }),
    );
    await expect(args.onVote).toHaveBeenCalledWith("warn");
    expect(canvas.queryByText(/Not enough hours/)).toBeNull();
    expect(canvas.queryByRole("button", { name: "Confirm" })).toBeNull();
  },
};

export const PlayerHasVoted: Story = {
  args: {
    isHost: false,
    currentParticipantId: "p1",
    ballots: { p1: "ignore", p2: "quarantine" },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /Ignore this round/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.getByText("Your vote is in · vote again to change it"),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: /Quarantine the email/ }),
    );
    await expect(args.onVote).toHaveBeenCalledWith("quarantine");
  },
};

export const NewsKind: Story = {
  args: {
    isHost: false,
    event: { ...phishing, kind: "news", tactic: "impact" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("News")).toBeVisible();
    await expect(canvas.getByRole("article")).toHaveClass("border-l-amber-500");
  },
};
