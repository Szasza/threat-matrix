import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { sampleRoundState } from "@/lib/decisions-disruptions-2/fixtures";
import { IncidentBoardTemplate } from "./IncidentBoardTemplate";

const meta = {
  title: "Templates/IncidentBoardTemplate",
  component: IncidentBoardTemplate,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    game: sampleRoundState,
    isHost: true,
    currentParticipantId: "host",
    onResolveChoice: fn(),
    onCastBallot: fn(),
    onPurchaseUpgrade: fn(),
    onVoteUpgrade: fn(),
    onUnvoteUpgrade: fn(),
    onEndRound: fn(),
    now: () => sampleRoundState.roundStartedAt + 5 * 60 * 1000,
  },
} satisfies Meta<typeof IncidentBoardTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Host: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Day 2 / 5" }),
    ).toBeVisible();
    await expect(canvas.getByText(/You are the CISO/)).toBeVisible();
    await expect(canvas.getByRole("timer")).toHaveTextContent("15:00");
    await expect(canvas.getByText("52h / 80h")).toBeVisible();
    await expect(canvas.getByText("2 / 10")).toBeVisible();
    await expect(canvas.getByText("This week so far")).toBeVisible();
    expect(canvas.queryByRole("alert")).toBeNull();

    const usb = within(
      canvas.getByRole("article", {
        name: "Direct #145: A USB stick found in the car park",
      }),
    );
    await expect(usb.getByText("Open since day 1")).toBeVisible();
    await userEvent.click(usb.getByRole("button", { name: /Destroy it/ }));
    await userEvent.click(usb.getByRole("button", { name: "Confirm" }));
    await expect(args.onResolveChoice).toHaveBeenCalledWith(
      "usb-stick@1",
      "destroy",
    );

    const firewall = within(canvas.getByRole("region", { name: "Firewall" }));
    await userEvent.click(
      firewall.getByRole("button", { name: "Buy upgrade" }),
    );
    await expect(args.onPurchaseUpgrade).toHaveBeenCalledWith("firewall-ids");

    await userEvent.click(canvas.getByRole("button", { name: "End day 2" }));
    await expect(args.onEndRound).toHaveBeenCalledTimes(1);
  },
};

export const Player: Story = {
  args: { isHost: false, currentParticipantId: "p2" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/The CISO \(the host\)/)).toBeVisible();
    expect(canvas.queryByRole("button", { name: /End day/ })).toBeNull();

    const creds = within(
      canvas.getByRole("article", {
        name: "Ticket #131: Impossible-travel logins on finance mailboxes",
      }),
    );
    await expect(
      creds.getByRole("button", { name: /Force an organisation-wide/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(
      creds.getByRole("button", { name: /Disable the affected/ }),
    );
    await expect(args.onCastBallot).toHaveBeenCalledWith(
      "credential-harvest@2",
      "disable",
    );

    const email = within(
      canvas.getByRole("region", { name: "Email & Productivity" }),
    );
    await userEvent.click(email.getByRole("button", { name: /Voted/ }));
    await expect(args.onUnvoteUpgrade).toHaveBeenCalledWith("email-training");
    const vpn = within(canvas.getByRole("region", { name: "VPN" }));
    await userEvent.click(vpn.getByRole("button", { name: /^Vote/ }));
    await expect(args.onVoteUpgrade).toHaveBeenCalledWith("vpn-patch");
  },
};

export const WithActionError: Story = {
  args: { actionError: "Needs 20h, but only 4h are left today." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Needs 20h, but only 4h are left today.",
    );
  },
};

export const FirstMorning: Story = {
  args: {
    game: {
      ...sampleRoundState,
      round: 1,
      timeline: [],
      roundTimerEnforced: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByText("This week so far")).toBeNull();
    await expect(
      canvas.getByText("Day ends automatically at 0:00"),
    ).toBeVisible();
  },
};
