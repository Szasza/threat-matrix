import { describe, expect, it } from "vitest";
import {
  castBallot,
  checkFailureConditions,
  drawRoundEvents,
  type EngineGame,
  type EngineResult,
  eligibleEvents,
  endRound,
  initialGameState,
  purchaseUpgrade,
  resolveChoice,
  setUpgradeVote,
  startGame,
} from "./engine.server";
import { EVENTS } from "./events.server";
import { createRng } from "./rng";
import { scriptedRng, testEvent } from "./testing";
import type { EventDefinition, GameState } from "./types";

const NOW = 1_000_000;

function roundState(overrides: Partial<GameState> = {}): GameState {
  return { ...initialGameState(), phase: "round", ...overrides };
}

function game(
  overrides: Partial<GameState> = {},
  queue: EngineGame["queue"] = [],
): EngineGame {
  return { state: roundState(overrides), queue };
}

function expectOk(result: EngineResult): EngineGame {
  if (!result.ok) {
    throw new Error(`expected ok, got ${result.reason}`);
  }
  return result.game;
}

/**
 * Draws every event in `library` (none resisted) into an otherwise empty
 * round, five at a time since that's the most a single draw takes.
 */
function openAll(
  library: readonly EventDefinition[],
  overrides: Partial<GameState> = {},
): EngineGame {
  let opened = game(overrides);
  for (let i = 0; i < library.length; i += 5) {
    const chunk = library.slice(i, i + 5);
    opened = drawRoundEvents(opened, scriptedRng(chunk.map(() => 0)), chunk);
  }
  return opened;
}

describe("initialGameState", () => {
  it("starts in setup with the paper's resources", () => {
    expect(initialGameState()).toEqual({
      phase: "setup",
      round: 1,
      totalRounds: 5,
      hours: 80,
      hoursPerRound: 80,
      profit: 500,
      sharePrice: 100,
      ownedUpgrades: [],
      openEvents: [],
      occurredEventIds: [],
      timeline: [],
      roundStartedAt: 0,
      roundDurationMs: 20 * 60 * 1000,
      roundTimerEnforced: false,
      lossReason: null,
      upgradeVotes: {},
      eventBallots: {},
    });
  });
});

describe("eligibleEvents", () => {
  it("excludes trigger-only events from the random pool", () => {
    const library = [testEvent("a"), testEvent("b", { triggerOnly: true })];
    expect(eligibleEvents(roundState(), library).map((d) => d.id)).toEqual([
      "a",
    ]);
  });

  it("excludes an event that is currently open, even if repeatable", () => {
    const library = [testEvent("a", { repeatable: true }), testEvent("b")];
    const opened = openAll([library[0]]);
    expect(eligibleEvents(opened.state, library).map((d) => d.id)).toEqual([
      "b",
    ]);
  });

  it("excludes non-repeatable events that already occurred, but not repeatable ones", () => {
    const library = [
      testEvent("once"),
      testEvent("again", { repeatable: true }),
    ];
    const state = roundState({ occurredEventIds: ["once", "again"] });
    expect(eligibleEvents(state, library).map((d) => d.id)).toEqual(["again"]);
  });

  it("gates on minRound", () => {
    const library = [testEvent("late", { criteria: { minRound: 3 } })];
    expect(eligibleEvents(roundState({ round: 2 }), library)).toEqual([]);
    expect(eligibleEvents(roundState({ round: 3 }), library)).toHaveLength(1);
  });

  it("gates on owned and unowned upgrades", () => {
    const library = [
      testEvent("needs-mfa", { criteria: { requiresUpgrades: ["email-mfa"] } }),
      testEvent("no-edr", {
        criteria: { excludesUpgrades: ["endpoints-edr"] },
      }),
    ];
    expect(eligibleEvents(roundState(), library).map((d) => d.id)).toEqual([
      "no-edr",
    ]);
    const owning = roundState({
      ownedUpgrades: [
        { upgradeId: "email-mfa", round: 1 },
        { upgradeId: "endpoints-edr", round: 1 },
      ],
    });
    expect(eligibleEvents(owning, library).map((d) => d.id)).toEqual([
      "needs-mfa",
    ]);
  });

  it("gates on prior events", () => {
    const library = [
      testEvent("after-x", { criteria: { requiresEvents: ["x"] } }),
      testEvent("unless-x", { criteria: { excludesEvents: ["x"] } }),
    ];
    expect(eligibleEvents(roundState(), library).map((d) => d.id)).toEqual([
      "unless-x",
    ]);
    expect(
      eligibleEvents(roundState({ occurredEventIds: ["x"] }), library).map(
        (d) => d.id,
      ),
    ).toEqual(["after-x"]);
  });

  it("uses the real library by default", () => {
    const pool = eligibleEvents(roundState());
    expect(pool.length).toBeGreaterThanOrEqual(5);
    expect(pool.every((d) => !d.triggerOnly)).toBe(true);
  });
});

describe("drawRoundEvents", () => {
  const six = ["a", "b", "c", "d", "e", "f"].map((id) => testEvent(id));

  it("draws five events at random when the pool is larger", () => {
    // Index 5 of [a..f] = f, then index 0 of the remaining five each time.
    const drawn = drawRoundEvents(game(), scriptedRng([5, 0, 0, 0, 0]), six);
    expect(drawn.state.openEvents.map((e) => e.definitionId)).toEqual([
      "f",
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(drawn.state.occurredEventIds).toEqual(["f", "a", "b", "c", "d"]);
  });

  it("draws the whole pool when it has fewer than five events", () => {
    const drawn = drawRoundEvents(game(), scriptedRng([0, 0]), six.slice(0, 2));
    expect(drawn.state.openEvents).toHaveLength(2);
  });

  it("builds open events with public choice prices but no consequences", () => {
    const library = [
      testEvent("a", {
        choices: [
          {
            id: "safe",
            label: "Safe",
            hoursCost: 4,
            profitCost: 0,
            outcome: { narrative: "secret" },
          },
          {
            id: "risky",
            label: "Risky",
            hoursCost: 1,
            profitCost: 2,
            check: {
              against: { probability: 50 },
              success: { narrative: "secret" },
              failure: { narrative: "secret" },
            },
          },
        ],
      }),
    ];
    const drawn = drawRoundEvents(
      game({ round: 2 }),
      scriptedRng([0]),
      library,
    );
    expect(drawn.state.openEvents).toEqual([
      {
        id: "a@2",
        definitionId: "a",
        title: "Event a",
        kind: "ticket",
        tactic: "initial-access",
        description: "Description of a",
        choices: [
          {
            id: "safe",
            label: "Safe",
            hoursCost: 4,
            profitCost: 0,
            uncertain: false,
          },
          {
            id: "risky",
            label: "Risky",
            hoursCost: 1,
            profitCost: 2,
            uncertain: true,
          },
        ],
        roundDrawn: 2,
        ignored: false,
      },
    ]);
    expect(JSON.stringify(drawn.state)).not.toContain("secret");
  });

  it("adds queued triggered events first, bypassing criteria, with their cause", () => {
    const library = [
      testEvent("chained", { triggerOnly: true, criteria: { minRound: 5 } }),
      testEvent("random"),
    ];
    const drawn = drawRoundEvents(
      game({}, [{ definitionId: "chained", triggeredBy: "Event x" }]),
      scriptedRng([0]),
      library,
    );
    expect(drawn.queue).toEqual([]);
    expect(
      drawn.state.openEvents.map((e) => [e.definitionId, e.triggeredBy]),
    ).toEqual([
      ["chained", "Event x"],
      ["random", undefined],
    ]);
  });

  it("never draws a triggered event a second time at random in the same round", () => {
    const library = [testEvent("a", { repeatable: true })];
    const drawn = drawRoundEvents(
      game({}, [{ definitionId: "a", triggeredBy: "Event x" }]),
      scriptedRng([]),
      library,
    );
    expect(drawn.state.openEvents).toHaveLength(1);
  });

  it("skips queued events that are already open or not in the library", () => {
    const library = [testEvent("a")];
    const opened = openAll(library);
    const drawn = drawRoundEvents(
      {
        ...opened,
        queue: [
          { definitionId: "a", triggeredBy: "Event x" },
          { definitionId: "missing", triggeredBy: "Event x" },
        ],
      },
      scriptedRng([]),
      library,
    );
    expect(drawn.state.openEvents).toHaveLength(1);
    expect(drawn.queue).toEqual([]);
  });

  it("blocks an attack when the resistance roll succeeds", () => {
    // Firewall base resistance is 40: a roll of 39 is blocked.
    const library = [testEvent("scan", { resistedBy: "firewall" })];
    const drawn = drawRoundEvents(game(), scriptedRng([0, 39]), library);
    expect(drawn.state.openEvents).toEqual([]);
    expect(drawn.state.occurredEventIds).toEqual([]);
    expect(drawn.state.timeline).toEqual([
      {
        type: "blocked",
        round: 1,
        title: "Event scan",
        definitionId: "scan",
        check: { assetId: "firewall", chance: 40, roll: 39, passed: true },
      },
    ]);
  });

  it("lets an attack through when the resistance roll fails", () => {
    const library = [testEvent("scan", { resistedBy: "firewall" })];
    const drawn = drawRoundEvents(game(), scriptedRng([0, 40]), library);
    expect(drawn.state.openEvents).toHaveLength(1);
    expect(drawn.state.timeline).toEqual([]);
  });

  it("uses upgraded resistance for the roll", () => {
    const library = [testEvent("scan", { resistedBy: "firewall" })];
    const drawn = drawRoundEvents(
      game({ ownedUpgrades: [{ upgradeId: "firewall-rules", round: 1 }] }),
      scriptedRng([0, 59]),
      library,
    );
    expect(drawn.state.openEvents).toEqual([]);
  });

  it("rolls resistance for triggered events too", () => {
    const library = [
      testEvent("chained", { triggerOnly: true, resistedBy: "email" }),
    ];
    const drawn = drawRoundEvents(
      game({}, [{ definitionId: "chained", triggeredBy: "Event x" }]),
      scriptedRng([0]),
      library,
    );
    expect(drawn.state.timeline[0]).toMatchObject({ type: "blocked" });
  });

  it("applies an on-draw event's effect at once, without opening it", () => {
    const library = [
      testEvent("sick", {
        choices: [],
        onDraw: { narrative: "Off sick", hours: -8, sharePrice: 1, profit: -2 },
      }),
    ];
    const drawn = drawRoundEvents(game(), scriptedRng([0]), library);
    expect(drawn.state.openEvents).toEqual([]);
    expect(drawn.state.hours).toBe(72);
    expect(drawn.state.sharePrice).toBe(101);
    expect(drawn.state.profit).toBe(498);
    expect(drawn.state.occurredEventIds).toEqual(["sick"]);
    expect(drawn.state.timeline).toEqual([
      {
        type: "on-draw",
        round: 1,
        title: "Event sick",
        definitionId: "sick",
        narrative: "Off sick",
        effects: { hours: -8, profit: -2, sharePrice: 1 },
      },
    ]);
  });

  it("opens an on-draw event that also offers choices", () => {
    const library = [testEvent("both", { onDraw: { narrative: "Now" } })];
    const drawn = drawRoundEvents(game(), scriptedRng([0]), library);
    expect(drawn.state.timeline).toHaveLength(1);
    expect(drawn.state.openEvents).toHaveLength(1);
  });

  it("does not mutate its input", () => {
    const input = game();
    drawRoundEvents(input, scriptedRng([0]), [testEvent("a")]);
    expect(input).toEqual(game());
  });

  it("is reproducible from a seed against the real library", () => {
    const first = drawRoundEvents(game(), createRng(42));
    const second = drawRoundEvents(game(), createRng(42));
    expect(first).toEqual(second);
    expect(first.state.openEvents.length + first.state.timeline.length).toBe(5);
  });
});

describe("startGame", () => {
  it("begins round 1 with a fresh draw and stamps the round start", () => {
    const library = [testEvent("a")];
    const started = startGame(
      { enforceRoundTimer: true },
      scriptedRng([0]),
      NOW,
      library,
    );
    expect(started.state).toMatchObject({
      phase: "round",
      round: 1,
      hours: 80,
      roundStartedAt: NOW,
      roundTimerEnforced: true,
    });
    expect(started.state.openEvents).toHaveLength(1);
  });

  it("uses the real library by default", () => {
    const started = startGame({ enforceRoundTimer: false }, createRng(7), NOW);
    expect(started.state.phase).toBe("round");
  });
});

describe("resolveChoice", () => {
  const library = [
    testEvent("a", {
      choices: [
        {
          id: "fix",
          label: "Fix it",
          hoursCost: 10,
          profitCost: 5,
          outcome: {
            narrative: "Fixed",
            profit: -20,
            sharePrice: 3,
            hours: -2,
            triggers: ["follow-up"],
          },
        },
        {
          id: "patch",
          label: "Patch",
          hoursCost: 1,
          profitCost: 0,
          outcome: { narrative: "Patched", grantUpgrades: ["vpn-patch"] },
        },
        {
          id: "gamble",
          label: "Gamble",
          hoursCost: 2,
          profitCost: 0,
          check: {
            against: { asset: "soc" },
            success: { narrative: "Won" },
            failure: { narrative: "Lost", triggers: ["follow-up"] },
          },
        },
        {
          id: "coin",
          label: "Coin toss",
          hoursCost: 0,
          profitCost: 0,
          check: {
            against: { probability: 50 },
            success: { narrative: "Heads" },
            failure: { narrative: "Tails" },
          },
        },
        {
          id: "ruin",
          label: "Ruin",
          hoursCost: 0,
          profitCost: 500,
          outcome: { narrative: "Bankrupt" },
        },
        {
          id: "scandal",
          label: "Scandal",
          hoursCost: 0,
          profitCost: 0,
          outcome: { narrative: "Crash", sharePrice: -100 },
        },
        {
          id: "burnout",
          label: "Burnout",
          hoursCost: 0,
          profitCost: 0,
          outcome: { narrative: "Exhausted", hours: -500 },
        },
      ],
    }),
    testEvent("follow-up", { triggerOnly: true }),
  ];
  const opened = () => openAll([library[0]]);

  it("rejects outside a round", () => {
    const result = resolveChoice(
      { state: initialGameState(), queue: [] },
      "a@1",
      "fix",
      scriptedRng([]),
      library,
    );
    expect(result).toMatchObject({ ok: false, reason: "not-in-round" });
  });

  it("rejects an event that is not open", () => {
    const result = resolveChoice(
      opened(),
      "zzz@1",
      "fix",
      scriptedRng([]),
      library,
    );
    expect(result).toMatchObject({ ok: false, reason: "unknown-event" });
  });

  it("rejects an unknown choice", () => {
    const result = resolveChoice(
      opened(),
      "a@1",
      "nope",
      scriptedRng([]),
      library,
    );
    expect(result).toMatchObject({ ok: false, reason: "unknown-choice" });
  });

  it("rejects a choice whose definition is no longer in the library", () => {
    const result = resolveChoice(opened(), "a@1", "fix", scriptedRng([]), []);
    expect(result).toMatchObject({ ok: false, reason: "unknown-choice" });
  });

  it("rejects a choice the team doesn't have the hours for", () => {
    const start = opened();
    start.state.hours = 9;
    const result = resolveChoice(start, "a@1", "fix", scriptedRng([]), library);
    expect(result).toEqual({
      ok: false,
      reason: "insufficient-hours",
      message: "Needs 10h, but only 9h are left today.",
    });
  });

  it('marks the event ignored for "ignore", leaving it open', () => {
    const next = expectOk(
      resolveChoice(opened(), "a@1", "ignore", scriptedRng([]), library),
    );
    expect(next.state.openEvents[0].ignored).toBe(true);
    expect(next.state.hours).toBe(80);
  });

  it("pays the choice's cost, applies its outcome and closes the event", () => {
    const start = opened();
    start.state.eventBallots = { "a@1": { p1: "fix" }, "b@1": { p1: "x" } };
    const next = expectOk(
      resolveChoice(start, "a@1", "fix", scriptedRng([]), library),
    );
    expect(next.state).toMatchObject({
      hours: 68,
      profit: 475,
      sharePrice: 103,
      openEvents: [],
      eventBallots: { "b@1": { p1: "x" } },
    });
    expect(next.queue).toEqual([
      { definitionId: "follow-up", triggeredBy: "Event a" },
    ]);
    expect(next.state.timeline).toEqual([
      {
        type: "choice",
        round: 1,
        title: "Event a",
        definitionId: "a",
        choiceLabel: "Fix it",
        narrative: "Fixed",
        effects: { hours: -12, profit: -25, sharePrice: 3 },
      },
    ]);
  });

  it("does not queue the same triggered event twice", () => {
    const start = opened();
    start.queue = [{ definitionId: "follow-up", triggeredBy: "Earlier" }];
    const next = expectOk(
      resolveChoice(start, "a@1", "fix", scriptedRng([]), library),
    );
    expect(next.queue).toEqual([
      { definitionId: "follow-up", triggeredBy: "Earlier" },
    ]);
  });

  it("grants upgrades an outcome hands the team", () => {
    const start = opened();
    start.state.upgradeVotes = { "vpn-patch": ["p1"] };
    const next = expectOk(
      resolveChoice(start, "a@1", "patch", scriptedRng([]), library),
    );
    expect(next.state.ownedUpgrades).toEqual([
      { upgradeId: "vpn-patch", round: 1 },
    ]);
    expect(next.state.upgradeVotes).toEqual({});
    expect(next.state.timeline[0]).toEqual({
      type: "upgrade",
      round: 1,
      title: "Patch VPN appliance",
      upgradeId: "vpn-patch",
      purchased: false,
      effects: { hours: 0, profit: 0, sharePrice: 0 },
    });
  });

  it("doesn't grant an upgrade that is already owned or doesn't exist", () => {
    const grantLibrary = [
      testEvent("g", {
        choices: [
          {
            id: "go",
            label: "Go",
            hoursCost: 0,
            profitCost: 0,
            outcome: { narrative: "ok", grantUpgrades: ["vpn-patch", "bogus"] },
          },
        ],
      }),
    ];
    const start = openAll(grantLibrary, {
      ownedUpgrades: [{ upgradeId: "vpn-patch", round: 1 }],
    });
    const next = expectOk(
      resolveChoice(start, "g@1", "go", scriptedRng([]), grantLibrary),
    );
    expect(next.state.ownedUpgrades).toHaveLength(1);
    expect(next.state.timeline.map((e) => e.type)).toEqual(["choice"]);
  });

  it("rolls an asset check: success below the resistance", () => {
    // SOC base resistance is 30.
    const next = expectOk(
      resolveChoice(opened(), "a@1", "gamble", scriptedRng([29]), library),
    );
    expect(next.queue).toEqual([]);
    expect(next.state.timeline[0]).toMatchObject({
      narrative: "Won",
      check: { assetId: "soc", chance: 30, roll: 29, passed: true },
    });
  });

  it("rolls an asset check: failure at or above the resistance", () => {
    const next = expectOk(
      resolveChoice(opened(), "a@1", "gamble", scriptedRng([30]), library),
    );
    expect(next.queue).toHaveLength(1);
    expect(next.state.timeline[0]).toMatchObject({
      narrative: "Lost",
      check: { passed: false },
    });
  });

  it("rolls a fixed-probability check", () => {
    const heads = expectOk(
      resolveChoice(opened(), "a@1", "coin", scriptedRng([49]), library),
    );
    expect(heads.state.timeline[0]).toMatchObject({
      narrative: "Heads",
      check: { chance: 50, roll: 49, passed: true },
    });
    const tails = expectOk(
      resolveChoice(opened(), "a@1", "coin", scriptedRng([50]), library),
    );
    expect(tails.state.timeline[0]).toMatchObject({ narrative: "Tails" });
  });

  it("never takes hours below zero", () => {
    const next = expectOk(
      resolveChoice(opened(), "a@1", "burnout", scriptedRng([]), library),
    );
    expect(next.state.hours).toBe(0);
  });

  it("ends the game at once when profit reaches zero", () => {
    const next = expectOk(
      resolveChoice(opened(), "a@1", "ruin", scriptedRng([]), library),
    );
    expect(next.state).toMatchObject({ phase: "lost", lossReason: "profit" });
  });

  it("ends the game at once when the share price reaches zero", () => {
    const next = expectOk(
      resolveChoice(opened(), "a@1", "scandal", scriptedRng([]), library),
    );
    expect(next.state).toMatchObject({
      phase: "lost",
      lossReason: "share-price",
    });
  });

  it("does not mutate its input", () => {
    const start = opened();
    const snapshot = structuredClone(start);
    resolveChoice(start, "a@1", "fix", scriptedRng([]), library);
    resolveChoice(start, "a@1", "ignore", scriptedRng([]), library);
    expect(start).toEqual(snapshot);
  });

  it("uses the real library by default", () => {
    const start = drawRoundEvents(
      game(),
      scriptedRng([0]),
      EVENTS.filter((d) => d.id === "usb-stick"),
    );
    const next = expectOk(
      resolveChoice(start, "usb-stick@1", "destroy", scriptedRng([])),
    );
    expect(next.state.hours).toBe(79);
  });
});

describe("purchaseUpgrade", () => {
  it("rejects outside a round", () => {
    const result = purchaseUpgrade(
      { state: initialGameState(), queue: [] },
      "vpn-patch",
    );
    expect(result).toMatchObject({ ok: false, reason: "not-in-round" });
  });

  it("rejects an unknown upgrade", () => {
    expect(purchaseUpgrade(game(), "bogus")).toMatchObject({
      ok: false,
      reason: "unknown-upgrade",
    });
  });

  it("rejects an upgrade already owned", () => {
    const owning = game({
      ownedUpgrades: [{ upgradeId: "vpn-patch", round: 1 }],
    });
    expect(purchaseUpgrade(owning, "vpn-patch")).toMatchObject({
      ok: false,
      reason: "owned",
    });
  });

  it("rejects a tier whose previous tier isn't owned", () => {
    expect(purchaseUpgrade(game(), "vpn-mfa")).toMatchObject({
      ok: false,
      reason: "locked",
    });
  });

  it("rejects an upgrade the team doesn't have the hours for", () => {
    expect(purchaseUpgrade(game({ hours: 7 }), "vpn-patch")).toEqual({
      ok: false,
      reason: "insufficient-hours",
      message: "Needs 8h, but only 7h are left today.",
    });
  });

  it("pays for the upgrade, records it and clears its votes", () => {
    const start = game({
      round: 2,
      upgradeVotes: { "firewall-rules": ["p1"], "vpn-patch": ["p2"] },
    });
    const next = expectOk(purchaseUpgrade(start, "firewall-rules"));
    expect(next.state).toMatchObject({
      hours: 68,
      profit: 500,
      ownedUpgrades: [{ upgradeId: "firewall-rules", round: 2 }],
      upgradeVotes: { "vpn-patch": ["p2"] },
    });
    expect(next.state.timeline).toEqual([
      {
        type: "upgrade",
        round: 2,
        title: "Patch firewall rules",
        upgradeId: "firewall-rules",
        purchased: true,
        effects: { hours: -12, profit: 0, sharePrice: 0 },
      },
    ]);
    expect(start.state.ownedUpgrades).toEqual([]);
  });

  it("ends the game if the upgrade's price wipes out the profit", () => {
    const next = expectOk(
      purchaseUpgrade(game({ profit: 25 }), "endpoints-av"),
    );
    expect(next.state).toMatchObject({ phase: "lost", lossReason: "profit" });
  });
});

describe("endRound", () => {
  const library = [
    testEvent("neglected", {
      onIgnore: {
        narrative: "It got worse",
        profit: -10,
        triggers: ["escalation"],
      },
    }),
    testEvent("harmless"),
    testEvent("escalation", { triggerOnly: true }),
    testEvent("fatal", {
      onIgnore: { narrative: "Collapse", sharePrice: -100 },
    }),
  ];

  it("rejects outside a round", () => {
    const result = endRound(
      { state: initialGameState(), queue: [] },
      scriptedRng([]),
      NOW,
      library,
    );
    expect(result).toMatchObject({ ok: false, reason: "not-in-round" });
  });

  it("applies neglect penalties, carries events over and starts the next round", () => {
    const start = openAll(library.slice(0, 2));
    start.state.hours = 3;
    start.state.openEvents[0].ignored = true;
    start.state.upgradeVotes = { "vpn-patch": ["p1"] };
    start.state.eventBallots = { "neglected@1": { p1: "fix" } };

    // Round 2's random draw has an empty pool (both events are open and
    // "escalation" is trigger-only), so only the triggered event arrives.
    const next = expectOk(
      endRound(start, scriptedRng([]), NOW + 5, library.slice(0, 3)),
    );

    expect(next.state).toMatchObject({
      phase: "round",
      round: 2,
      hours: 80,
      profit: 490,
      roundStartedAt: NOW + 5,
      upgradeVotes: {},
      eventBallots: {},
    });
    expect(
      next.state.openEvents.map((e) => [e.id, e.ignored, e.triggeredBy]),
    ).toEqual([
      ["neglected@1", false, undefined],
      ["harmless@1", false, undefined],
      ["escalation@2", false, "Event neglected"],
    ]);
    expect(next.state.timeline).toEqual([
      {
        type: "ignored",
        round: 1,
        title: "Event neglected",
        definitionId: "neglected",
        narrative: "It got worse",
        effects: { hours: 0, profit: -10, sharePrice: 0 },
      },
      {
        type: "ignored",
        round: 1,
        title: "Event harmless",
        definitionId: "harmless",
        effects: { hours: 0, profit: 0, sharePrice: 0 },
      },
    ]);
  });

  it("finishes the game after the final round", () => {
    const start = game({ round: 5, eventBallots: { x: { p: "y" } } });
    const next = expectOk(endRound(start, scriptedRng([]), NOW, library));
    expect(next.state).toMatchObject({
      phase: "finished",
      round: 5,
      lossReason: null,
      eventBallots: {},
    });
  });

  it("ends the game if a neglect penalty is fatal, without drawing", () => {
    const start = openAll([library[3]]);
    const next = expectOk(endRound(start, scriptedRng([]), NOW, library));
    expect(next.state).toMatchObject({
      phase: "lost",
      lossReason: "share-price",
      round: 1,
    });
  });

  it("ends the game on event saturation after the next draw", () => {
    const many = Array.from({ length: 12 }, (_, i) => testEvent(`e${i}`));
    const start = openAll(many.slice(0, 7));
    const next = expectOk(
      endRound(start, scriptedRng([0, 0, 0, 0, 0]), NOW, many),
    );
    expect(next.state.openEvents).toHaveLength(12);
    expect(next.state).toMatchObject({
      phase: "lost",
      lossReason: "saturation",
    });
  });

  it("uses the real library by default", () => {
    const next = expectOk(endRound(game(), createRng(1), NOW));
    expect(next.state.round).toBe(2);
  });
});

describe("checkFailureConditions", () => {
  it("is null while every resource holds", () => {
    expect(checkFailureConditions(roundState())).toBeNull();
  });

  it("flags profit, share price and saturation in that order", () => {
    expect(
      checkFailureConditions(roundState({ profit: 0, sharePrice: 0 })),
    ).toBe("profit");
    expect(checkFailureConditions(roundState({ sharePrice: -1 }))).toBe(
      "share-price",
    );
    const saturated = openAll(
      Array.from({ length: 10 }, (_, i) => testEvent(`e${i}`)),
    );
    expect(checkFailureConditions(saturated.state)).toBe("saturation");
  });
});

describe("setUpgradeVote", () => {
  it("rejects outside a round", () => {
    expect(
      setUpgradeVote(
        { state: initialGameState(), queue: [] },
        "p1",
        "vpn-patch",
        true,
      ),
    ).toMatchObject({ ok: false, reason: "not-in-round" });
  });

  it("rejects an upgrade that can't be bought right now", () => {
    expect(setUpgradeVote(game(), "p1", "vpn-mfa", true)).toMatchObject({
      ok: false,
      reason: "unknown-upgrade",
    });
  });

  it("adds a vote once, however many times it's cast", () => {
    const once = expectOk(setUpgradeVote(game(), "p1", "vpn-patch", true));
    const twice = expectOk(setUpgradeVote(once, "p1", "vpn-patch", true));
    expect(twice.state.upgradeVotes).toEqual({ "vpn-patch": ["p1"] });
  });

  it("removes a vote, dropping the entry once nobody votes", () => {
    const voted = expectOk(setUpgradeVote(game(), "p1", "vpn-patch", true));
    const both = expectOk(setUpgradeVote(voted, "p2", "vpn-patch", true));
    const one = expectOk(setUpgradeVote(both, "p1", "vpn-patch", false));
    expect(one.state.upgradeVotes).toEqual({ "vpn-patch": ["p2"] });
    const none = expectOk(setUpgradeVote(one, "p2", "vpn-patch", false));
    expect(none.state.upgradeVotes).toEqual({});
  });

  it("treats unvoting without a vote as a no-op", () => {
    const next = expectOk(setUpgradeVote(game(), "p1", "vpn-patch", false));
    expect(next.state.upgradeVotes).toEqual({});
  });
});

describe("castBallot", () => {
  const opened = () => openAll([testEvent("a")]);

  it("rejects outside a round", () => {
    expect(
      castBallot({ state: initialGameState(), queue: [] }, "p1", "a@1", "fix"),
    ).toMatchObject({ ok: false, reason: "not-in-round" });
  });

  it("rejects an event that isn't open", () => {
    expect(castBallot(opened(), "p1", "b@1", "fix")).toMatchObject({
      ok: false,
      reason: "unknown-event",
    });
  });

  it("rejects a choice the event doesn't offer", () => {
    expect(castBallot(opened(), "p1", "a@1", "nope")).toMatchObject({
      ok: false,
      reason: "unknown-choice",
    });
  });

  it("records one pick per participant, replacing an earlier one", () => {
    const first = expectOk(castBallot(opened(), "p1", "a@1", "fix"));
    const second = expectOk(castBallot(first, "p2", "a@1", "fix"));
    const changed = expectOk(castBallot(second, "p1", "a@1", "ignore"));
    expect(changed.state.eventBallots).toEqual({
      "a@1": { p1: "ignore", p2: "fix" },
    });
  });
});

describe("full playthroughs against the real library", () => {
  /** Resolves each open event with its first affordable choice, then ends the day. */
  function playDiligently(seed: number): EngineGame {
    const rng = createRng(seed);
    let current = startGame({ enforceRoundTimer: false }, rng, NOW);
    while (current.state.phase === "round") {
      for (const event of current.state.openEvents) {
        const choice = event.choices.find(
          (c) => c.hoursCost <= current.state.hours,
        );
        if (choice && current.state.phase === "round") {
          current = expectOk(resolveChoice(current, event.id, choice.id, rng));
        }
      }
      expect(current.state.hours).toBeGreaterThanOrEqual(0);
      if (current.state.phase === "round") {
        current = expectOk(endRound(current, rng, NOW));
      }
    }
    return current;
  }

  it("always reaches an end state with consistent bookkeeping", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { state } = playDiligently(seed);
      expect(["finished", "lost"]).toContain(state.phase);
      expect(state.phase === "lost").toBe(state.lossReason !== null);
      const rounds = state.timeline.map((entry) => entry.round);
      expect(rounds).toEqual([...rounds].sort((a, b) => a - b));
      const openIds = state.openEvents.map((event) => event.id);
      expect(new Set(openIds).size).toBe(openIds.length);
    }
  });

  it("is won by a team that handles every incident properly", () => {
    for (let seed = 1; seed <= 25; seed++) {
      expect(playDiligently(seed).state.phase).toBe("finished");
    }
  });

  it("is lost by a team that ignores everything", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = createRng(seed);
      let current = startGame({ enforceRoundTimer: false }, rng, NOW);
      while (current.state.phase === "round") {
        current = expectOk(endRound(current, rng, NOW));
      }
      expect(current.state.phase).toBe("lost");
    }
  });
});
