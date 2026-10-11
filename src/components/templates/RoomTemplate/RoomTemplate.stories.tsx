import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { getDefenceByName } from "@/lib/decisions-disruptions/defences";
import type { GameState } from "@/lib/decisions-disruptions/types";
import { sampleRoundState } from "@/lib/decisions-disruptions-2/fixtures";
import type { GameState as Dd2GameState } from "@/lib/decisions-disruptions-2/types";
import type { Game } from "@/lib/games/types";
import type { Room } from "@/lib/rooms/types";
import { RoomTemplate, type RoomTemplateProps } from "./RoomTemplate";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  close = fn();

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
}

const meta = {
  title: "Templates/RoomTemplate",
  component: RoomTemplate,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RoomTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleGame: Game = {
  id: "decisions-and-disruptions",
  name: "Decisions & Disruptions",
  description:
    "A tabletop cybersecurity decision-making game where players respond to unfolding incidents as a team.",
  minPlayers: 3,
  maxPlayers: 6,
  estimatedMinutes: 90,
};

const sampleRoom: Room = {
  code: "AB12CD",
  gameId: sampleGame.id,
  hostParticipantId: "participant-1",
  participants: [
    {
      id: "participant-1",
      displayName: "Ada",
      joinedAt: 1000,
      lastSeenAt: 1000,
    },
  ],
  status: "waiting",
  createdAt: 1000,
};

const setupGameState: GameState = {
  phase: "setup",
  round: 1,
  ownedDefences: [],
  cart: [],
  votes: {},
  revealHistory: [],
};

// biome-ignore lint/style/noNonNullAssertion: name is hardcoded from the real catalog
const firewallOffice = getDefenceByName("Firewall office")!;

const roundGameState: GameState = {
  phase: "round",
  round: 1,
  ownedDefences: [],
  cart: [],
  votes: {},
  revealHistory: [],
};

const roundGameStateWithCartItem: GameState = {
  phase: "round",
  round: 1,
  ownedDefences: [],
  cart: [firewallOffice],
  votes: {},
  revealHistory: [],
};

const finishedGameState: GameState = {
  phase: "finished",
  round: 4,
  ownedDefences: [{ defence: firewallOffice, round: 1 }],
  cart: [],
  votes: {},
  revealHistory: [[], [], [], []],
};

export const Join: Story = {
  args: {
    mode: "join",
    game: sampleGame,
    action: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Decisions & Disruptions")).toBeVisible();

    const input = canvas.getByLabelText("Display name");
    const button = canvas.getByRole("button", { name: "Join room" });

    await userEvent.type(input, "Ada");
    await userEvent.click(button);

    const joinArgs = args as Extract<RoomTemplateProps, { mode: "join" }>;
    await expect(joinArgs.action).toHaveBeenCalledWith("Ada");
  },
};

export const LobbySetupHost: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: setupGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({ status: 200 }) as never;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Ada")).toBeVisible();
    await expect(
      canvas.getByDisplayValue("https://example.com/room/AB12CD"),
    ).toBeVisible();

    const startButton = canvas.getByRole("button", { name: "Start Game" });
    await userEvent.click(startButton);

    const lobbyArgs = args as Extract<RoomTemplateProps, { mode: "lobby" }>;
    await expect(lobbyArgs.onStartGame).toHaveBeenCalledWith({
      includeNationState: false,
    });
  },
};

export const LobbySetupNonHost: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: setupGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-2",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({ status: 200 }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Waiting for the host to start the game..."),
    ).toBeVisible();
    expect(
      canvas.queryByRole("button", { name: "Start Game" }),
    ).not.toBeInTheDocument();
  },
};

export const LobbyRoundPhase: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: roundGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({
      status: 204,
      ok: true,
      json: async () => ({}),
    }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Round 1 / 4")).toBeVisible();

    const addButtons = canvas.getAllByRole("button", { name: "Add to cart" });
    await userEvent.click(addButtons[0]);

    await expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/rooms/${sampleRoom.code}/game/actions/add-to-cart`,
      expect.objectContaining({ method: "POST" }),
    );

    await expect(
      canvas.getByRole("button", { name: "End Round" }),
    ).toBeVisible();
  },
};

export const RoundPhaseRemoveFromCart: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: roundGameStateWithCartItem,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({
      status: 204,
      ok: true,
      json: async () => ({}),
    }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const removeButton = canvas.getByRole("button", { name: "Remove" });
    await userEvent.click(removeButton);

    await expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/rooms/${sampleRoom.code}/game/actions/remove-from-cart`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ defenceName: firewallOffice.name }),
      }),
    );
  },
};

export const RoundPhaseEndRoundSuccess: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: roundGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({ ok: true }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const endRoundButton = canvas.getByRole("button", { name: "End Round" });
    await userEvent.click(endRoundButton);

    await expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/rooms/${sampleRoom.code}/game/actions/end-round`,
      expect.objectContaining({ method: "POST" }),
    );
    await expect(
      canvas.queryByText(/exceeds available budget/),
    ).not.toBeInTheDocument();
  },
};

export const RoundPhaseEndRoundOverBudget: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: roundGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "over-budget",
        message: "Cart total (150k) exceeds available budget (100k).",
      }),
    }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const endRoundButton = canvas.getByRole("button", { name: "End Round" });
    await userEvent.click(endRoundButton);

    await expect(
      await canvas.findByText(
        "Cart total (150k) exceeds available budget (100k).",
      ),
    ).toBeVisible();
  },
};

export const RoundPhaseEndRoundOtherError: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: roundGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("not json");
      },
    }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const endRoundButton = canvas.getByRole("button", { name: "End Round" });
    await userEvent.click(endRoundButton);

    await expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/rooms/${sampleRoom.code}/game/actions/end-round`,
      expect.objectContaining({ method: "POST" }),
    );
    await expect(
      canvas.queryByText(/exceeds available budget/),
    ).not.toBeInTheDocument();
  },
};

export const ReceivesLiveGameUpdate: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: roundGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-2",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({ status: 200 }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Round 1 / 4")).toBeVisible();

    // participant-2 isn't the host yet, so "End Round" isn't shown.
    expect(
      canvas.queryByRole("button", { name: "End Round" }),
    ).not.toBeInTheDocument();

    const source =
      FakeEventSource.instances[FakeEventSource.instances.length - 1];
    source.onmessage?.({
      data: JSON.stringify({
        ...sampleRoom,
        hostParticipantId: "participant-2",
        gameState: finishedGameState,
      }),
    });

    // The live update reassigns the host to the viewer and advances the
    // game to "finished" — proving the SSE payload drives both host status
    // and game phase for every subscriber, with no action from the viewer.
    await expect(await canvas.findByText("Game Over")).toBeVisible();
  },
};

export const HeartbeatKeepsParticipant: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: roundGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
    heartbeatIntervalMs: 50,
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({ status: 200 }) as never;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Round 1 / 4")).toBeVisible();

    await new Promise((resolve) => setTimeout(resolve, 200));

    await expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/rooms/${sampleRoom.code}/heartbeat`,
      expect.objectContaining({ method: "POST" }),
    );
    const lobbyArgs = args as Extract<RoomTemplateProps, { mode: "lobby" }>;
    await expect(lobbyArgs.onRemoved).not.toHaveBeenCalled();
  },
};

export const HeartbeatRemovesParticipant: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: roundGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
    heartbeatIntervalMs: 50,
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({ status: 410 }) as never;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Round 1 / 4")).toBeVisible();

    await new Promise((resolve) => setTimeout(resolve, 200));

    const lobbyArgs = args as Extract<RoomTemplateProps, { mode: "lobby" }>;
    await expect(lobbyArgs.onRemoved).toHaveBeenCalled();
  },
};

export const LobbyFinishedPhase: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: sampleRoom,
    initialGame: finishedGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({ status: 200 }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Game Over")).toBeVisible();
    // Firewall office bought round 1 -> 4 points in cyber_defence.
    await expect(canvas.getByText("4 / 16")).toBeVisible();
  },
};

export const RoundPhasePlayerVotes: Story = {
  args: {
    mode: "lobby",
    game: sampleGame,
    initialRoom: {
      ...sampleRoom,
      participants: [
        ...sampleRoom.participants,
        {
          id: "participant-2",
          displayName: "Grace",
          joinedAt: 2000,
          lastSeenAt: 2000,
        },
      ],
    },
    initialGame: { ...roundGameState, votes: { Antivirus: ["participant-2"] } },
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-2",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({
      status: 204,
      ok: true,
      json: async () => ({}),
    }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole("button", { name: /^Vote for Firewall office/ }),
    );
    await expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/rooms/${sampleRoom.code}/game/actions/vote`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ defenceName: firewallOffice.name }),
      }),
    );

    await userEvent.click(
      canvas.getByRole("button", { name: /^Vote for Antivirus/ }),
    );
    await expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/rooms/${sampleRoom.code}/game/actions/unvote`,
      expect.objectContaining({
        body: JSON.stringify({ defenceName: "Antivirus" }),
      }),
    );
  },
};

export const UnknownGame: Story = {
  args: {
    mode: "lobby",
    game: { ...sampleGame, id: "does-not-exist" },
    initialRoom: { ...sampleRoom, gameId: "does-not-exist" },
    initialGame: roundGameState,
    roomCode: sampleRoom.code,
    currentParticipantId: "participant-1",
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  },
  beforeEach: () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue({ status: 200 }) as never;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Unknown game: does-not-exist"),
    ).toBeVisible();
  },
};

// --- Decisions & Disruptions 2 -------------------------------------------
// The same room shell driving the second registered game module: these
// exercise D&D2's `SetupOptions` and `GameView` through the real registry.

const dd2Game: Game = {
  id: "decisions-and-disruptions-2",
  name: "Decisions & Disruptions 2",
  description: "Run the incident response team of a financial organisation.",
  minPlayers: 3,
  maxPlayers: 5,
  estimatedMinutes: 90,
};

const dd2Room: Room = { ...sampleRoom, gameId: dd2Game.id };

const dd2SetupState: Dd2GameState = {
  ...sampleRoundState,
  phase: "setup",
  round: 1,
  openEvents: [],
  timeline: [],
};

function dd2LobbyArgs(
  initialGame: Dd2GameState,
  currentParticipantId = "participant-1",
) {
  return {
    mode: "lobby" as const,
    game: dd2Game,
    initialRoom: dd2Room,
    initialGame,
    roomCode: dd2Room.code,
    currentParticipantId,
    shareUrl: "https://example.com/room/AB12CD",
    onLeave: fn(),
    onRemoved: fn(),
    onStartGame: fn(),
  };
}

function installFakes(response: unknown) {
  return () => {
    FakeEventSource.instances = [];
    globalThis.EventSource =
      FakeEventSource as unknown as typeof globalThis.EventSource;
    globalThis.fetch = fn().mockResolvedValue(response) as never;
  };
}

const okResponse = { status: 204, ok: true, json: async () => ({}) };

function expectAction(action: string, payload: unknown) {
  return expect(globalThis.fetch).toHaveBeenCalledWith(
    `/api/rooms/${dd2Room.code}/game/actions/${action}`,
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export const Dd2LobbySetupHost: Story = {
  args: dd2LobbyArgs(dd2SetupState),
  beforeEach: installFakes({ status: 200 }),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Enforce round timer" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Start Game" }));
    const lobbyArgs = args as Extract<RoomTemplateProps, { mode: "lobby" }>;
    await expect(lobbyArgs.onStartGame).toHaveBeenCalledWith({
      enforceRoundTimer: true,
    });
  },
};

export const Dd2HostPlaysADay: Story = {
  args: dd2LobbyArgs(sampleRoundState),
  beforeEach: installFakes(okResponse),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Day 2 / 5" }),
    ).toBeVisible();

    const usb = within(
      canvas.getByRole("article", {
        name: "Direct #145: A USB stick found in the car park",
      }),
    );
    await userEvent.click(usb.getByRole("button", { name: /Destroy it/ }));
    await userEvent.click(usb.getByRole("button", { name: "Confirm" }));
    await expectAction("resolve-choice", {
      eventId: "usb-stick@1",
      choiceId: "destroy",
    });

    const vpn = within(canvas.getByRole("region", { name: "VPN" }));
    await userEvent.click(vpn.getByRole("button", { name: "Buy upgrade" }));
    await expectAction("purchase-upgrade", { upgradeId: "vpn-patch" });

    await userEvent.click(canvas.getByRole("button", { name: "End day 2" }));
    await expectAction("end-round", {});
    expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

export const Dd2PlayerVotes: Story = {
  args: dd2LobbyArgs(sampleRoundState, "p2"),
  beforeEach: installFakes(okResponse),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const creds = within(
      canvas.getByRole("article", {
        name: "Ticket #131: Impossible-travel logins on finance mailboxes",
      }),
    );
    await userEvent.click(
      creds.getByRole("button", { name: /Disable the affected/ }),
    );
    await expectAction("cast-ballot", {
      eventId: "credential-harvest@2",
      choiceId: "disable",
    });

    const email = within(
      canvas.getByRole("region", { name: "Email & Productivity" }),
    );
    await userEvent.click(email.getByRole("button", { name: /Voted/ }));
    await expectAction("unvote-upgrade", { upgradeId: "email-training" });

    const soc = within(canvas.getByRole("region", { name: "SOC / SIEM" }));
    await userEvent.click(soc.getByRole("button", { name: /^Vote/ }));
    await expectAction("vote-upgrade", { upgradeId: "soc-triage" });
  },
};

export const Dd2ActionRejected: Story = {
  args: dd2LobbyArgs(sampleRoundState),
  beforeEach: installFakes({
    ok: false,
    json: async () => ({
      error: "insufficient-hours",
      message: "Needs 20h, but only 4h are left today.",
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "End day 2" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Needs 20h, but only 4h are left today.",
    );
  },
};

export const Dd2ActionFailsWithoutMessage: Story = {
  args: dd2LobbyArgs(sampleRoundState),
  beforeEach: installFakes({
    ok: false,
    json: async () => {
      throw new Error("not json");
    },
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "End day 2" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "That didn't work. Try again.",
    );
  },
};

export const Dd2Debrief: Story = {
  args: dd2LobbyArgs({ ...sampleRoundState, phase: "finished", round: 5 }),
  beforeEach: installFakes({ status: 200 }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "You made it through the week" }),
    ).toBeVisible();
  },
};

export const Dd2LostDebrief: Story = {
  args: dd2LobbyArgs({
    ...sampleRoundState,
    phase: "lost",
    lossReason: "share-price",
  }),
  beforeEach: installFakes({ status: 200 }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Game over" }),
    ).toBeVisible();
  },
};
