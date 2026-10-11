import "server-only";
import { currentResistance, ownsUpgrade } from "./assets";
import { EVENTS } from "./events.server";
import type { Rng } from "./rng";
import {
  EVENTS_PER_ROUND,
  HOURS_PER_ROUND,
  IGNORE_CHOICE_ID,
  MAX_OPEN_EVENTS,
  ROUND_DURATION_MS,
  STARTING_PROFIT,
  STARTING_SHARE_PRICE,
  TOTAL_ROUNDS,
} from "./rules";
import type {
  ChanceCheck,
  CheckResult,
  Effects,
  EventDefinition,
  GameSettings,
  GameState,
  LossReason,
  OpenEvent,
  Outcome,
} from "./types";
import { getUpgrade, isPurchasable } from "./upgrades.server";

/** An event a choice (or neglect) has queued for the start of the next round. */
export interface QueuedEvent {
  definitionId: string;
  /** Title of the event that caused it, shown on the new event's card. */
  triggeredBy: string;
}

/**
 * Everything the engine reads and writes. `queue` is kept apart from
 * `GameState` because the state is broadcast to every player, and which
 * events are coming next round is exactly what they mustn't know.
 */
export interface EngineGame {
  state: GameState;
  queue: QueuedEvent[];
}

export type EngineResult =
  | { ok: true; game: EngineGame }
  | { ok: false; reason: string; message: string };

type Library = readonly EventDefinition[];

export function initialGameState(): GameState {
  return {
    phase: "setup",
    round: 1,
    totalRounds: TOTAL_ROUNDS,
    hours: HOURS_PER_ROUND,
    hoursPerRound: HOURS_PER_ROUND,
    profit: STARTING_PROFIT,
    sharePrice: STARTING_SHARE_PRICE,
    ownedUpgrades: [],
    openEvents: [],
    occurredEventIds: [],
    timeline: [],
    roundStartedAt: 0,
    roundDurationMs: ROUND_DURATION_MS,
    roundTimerEnforced: false,
    lossReason: null,
    upgradeVotes: {},
    eventBallots: {},
  };
}

function fail(reason: string, message: string): EngineResult {
  return { ok: false, reason, message };
}

function meetsCriteria(definition: EventDefinition, state: GameState): boolean {
  const criteria = definition.criteria ?? {};
  const owns = (id: string) => ownsUpgrade(state.ownedUpgrades, id);
  const occurred = (id: string) => state.occurredEventIds.includes(id);
  return (
    state.round >= (criteria.minRound ?? 1) &&
    (criteria.requiresUpgrades ?? []).every(owns) &&
    !(criteria.excludesUpgrades ?? []).some(owns) &&
    (criteria.requiresEvents ?? []).every(occurred) &&
    !(criteria.excludesEvents ?? []).some(occurred)
  );
}

function isOpen(state: GameState, definitionId: string): boolean {
  return state.openEvents.some((event) => event.definitionId === definitionId);
}

/**
 * The random-draw pool for the current round: every event whose criteria
 * the attack surface currently meets, excluding trigger-only events, events
 * already open, and non-repeatable events that have already occurred.
 */
export function eligibleEvents(
  state: GameState,
  library: Library = EVENTS,
): EventDefinition[] {
  return library.filter(
    (definition) =>
      !definition.triggerOnly &&
      !isOpen(state, definition.id) &&
      (definition.repeatable ||
        !state.occurredEventIds.includes(definition.id)) &&
      meetsCriteria(definition, state),
  );
}

/** Picks up to `count` distinct items uniformly at random (partial Fisher-Yates). */
function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = rng.int(pool.length);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

function rollCheck(
  against: ChanceCheck["against"],
  state: GameState,
  rng: Rng,
): CheckResult {
  const roll = rng.int(100);
  if ("asset" in against) {
    const chance = currentResistance(against.asset, state.ownedUpgrades);
    return { assetId: against.asset, chance, roll, passed: roll < chance };
  }
  return {
    chance: against.probability,
    roll,
    passed: roll < against.probability,
  };
}

function grantUpgrade(game: EngineGame, upgradeId: string): void {
  const { state } = game;
  const upgrade = getUpgrade(upgradeId);
  if (!upgrade || ownsUpgrade(state.ownedUpgrades, upgradeId)) {
    return;
  }
  state.ownedUpgrades.push({ upgradeId, round: state.round });
  delete state.upgradeVotes[upgradeId];
  state.timeline.push({
    type: "upgrade",
    round: state.round,
    title: upgrade.name,
    upgradeId,
    purchased: false,
    effects: { hours: 0, profit: 0, sharePrice: 0 },
  });
}

/** Applies an outcome's resource changes, queues its triggers and grants its upgrades. */
function applyOutcome(
  game: EngineGame,
  outcome: Outcome,
  sourceTitle: string,
): Effects {
  const { state } = game;
  const effects: Effects = {
    hours: outcome.hours ?? 0,
    profit: outcome.profit ?? 0,
    sharePrice: outcome.sharePrice ?? 0,
  };
  state.hours = Math.max(0, state.hours + effects.hours);
  state.profit += effects.profit;
  state.sharePrice += effects.sharePrice;

  for (const definitionId of outcome.triggers ?? []) {
    if (!game.queue.some((queued) => queued.definitionId === definitionId)) {
      game.queue.push({ definitionId, triggeredBy: sourceTitle });
    }
  }
  for (const upgradeId of outcome.grantUpgrades ?? []) {
    grantUpgrade(game, upgradeId);
  }
  return effects;
}

/**
 * Brings a drawn or triggered event onto the board: rolls its resistance
 * (a blocked attempt never opens), applies any on-draw effect, and opens it
 * if it offers choices.
 */
function introduceEvent(
  game: EngineGame,
  definition: EventDefinition,
  rng: Rng,
  triggeredBy?: string,
): void {
  const { state } = game;

  if (definition.resistedBy) {
    const check = rollCheck({ asset: definition.resistedBy }, state, rng);
    if (check.passed) {
      state.timeline.push({
        type: "blocked",
        round: state.round,
        title: definition.title,
        definitionId: definition.id,
        check,
      });
      return;
    }
  }

  if (!state.occurredEventIds.includes(definition.id)) {
    state.occurredEventIds.push(definition.id);
  }

  if (definition.onDraw) {
    const effects = applyOutcome(game, definition.onDraw, definition.title);
    state.timeline.push({
      type: "on-draw",
      round: state.round,
      title: definition.title,
      definitionId: definition.id,
      narrative: definition.onDraw.narrative,
      effects,
    });
  }

  if (definition.choices.length > 0) {
    const openEvent: OpenEvent = {
      id: `${definition.id}@${state.round}`,
      definitionId: definition.id,
      title: definition.title,
      kind: definition.kind,
      tactic: definition.tactic,
      description: definition.description,
      choices: definition.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        hoursCost: choice.hoursCost,
        profitCost: choice.profitCost,
        uncertain: !!choice.check,
      })),
      roundDrawn: state.round,
      ignored: false,
    };
    if (triggeredBy) {
      openEvent.triggeredBy = triggeredBy;
    }
    state.openEvents.push(openEvent);
  }
}

/**
 * Adds the round's events: every queued (triggered) event first, bypassing
 * criteria, then `EVENTS_PER_ROUND` drawn at random from the eligible pool.
 * Neither ever duplicates an event that is already open.
 */
export function drawRoundEvents(
  game: EngineGame,
  rng: Rng,
  library: Library = EVENTS,
): EngineGame {
  const next = structuredClone(game);
  const queue = next.queue;
  next.queue = [];

  const triggeredIds = new Set<string>();
  for (const queued of queue) {
    const definition = library.find((d) => d.id === queued.definitionId);
    if (!definition || isOpen(next.state, definition.id)) {
      continue;
    }
    triggeredIds.add(definition.id);
    introduceEvent(next, definition, rng, queued.triggeredBy);
  }

  const pool = eligibleEvents(next.state, library).filter(
    (definition) => !triggeredIds.has(definition.id),
  );
  for (const definition of sample(pool, EVENTS_PER_ROUND, rng)) {
    introduceEvent(next, definition, rng);
  }
  return next;
}

export function checkFailureConditions(state: GameState): LossReason | null {
  if (state.profit <= 0) return "profit";
  if (state.sharePrice <= 0) return "share-price";
  if (state.openEvents.length >= MAX_OPEN_EVENTS) return "saturation";
  return null;
}

/** Ends the game immediately if any failure condition holds. */
function settle(game: EngineGame): EngineGame {
  const lossReason = checkFailureConditions(game.state);
  if (lossReason) {
    game.state.phase = "lost";
    game.state.lossReason = lossReason;
    game.state.upgradeVotes = {};
    game.state.eventBallots = {};
  }
  return game;
}

function beginRound(
  game: EngineGame,
  round: number,
  rng: Rng,
  now: number,
  library: Library,
): EngineGame {
  const { state } = game;
  state.round = round;
  state.hours = state.hoursPerRound;
  state.roundStartedAt = now;
  state.upgradeVotes = {};
  state.eventBallots = {};
  for (const event of state.openEvents) {
    event.ignored = false;
  }
  return settle(drawRoundEvents(game, rng, library));
}

export function startGame(
  settings: GameSettings,
  rng: Rng,
  now: number,
  library: Library = EVENTS,
): EngineGame {
  const state = initialGameState();
  state.phase = "round";
  state.roundTimerEnforced = settings.enforceRoundTimer;
  return beginRound({ state, queue: [] }, 1, rng, now, library);
}

function requireRound(game: EngineGame): EngineResult | undefined {
  if (game.state.phase !== "round") {
    return fail("not-in-round", "The game is not in a round.");
  }
  return undefined;
}

function insufficientHours(needed: number, available: number): EngineResult {
  return fail(
    "insufficient-hours",
    `Needs ${needed}h, but only ${available}h are left today.`,
  );
}

/**
 * Commits the host's choice for an open event: pays its hours and profit,
 * rolls its check if it has one, applies the outcome and closes the event.
 * Choices are final — except "ignore", which only sets the event aside
 * for this round and can still be overridden by a real choice.
 */
export function resolveChoice(
  game: EngineGame,
  eventId: string,
  choiceId: string,
  rng: Rng,
  library: Library = EVENTS,
): EngineResult {
  const notInRound = requireRound(game);
  if (notInRound) return notInRound;

  const next = structuredClone(game);
  const { state } = next;
  const event = state.openEvents.find((open) => open.id === eventId);
  if (!event) {
    return fail("unknown-event", "That event is not open.");
  }

  if (choiceId === IGNORE_CHOICE_ID) {
    event.ignored = true;
    return { ok: true, game: next };
  }

  const definition = library.find((d) => d.id === event.definitionId);
  const choice = definition?.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return fail("unknown-choice", "That choice is not available.");
  }
  if (choice.hoursCost > state.hours) {
    return insufficientHours(choice.hoursCost, state.hours);
  }

  state.hours -= choice.hoursCost;
  state.profit -= choice.profitCost;

  let outcome: Outcome;
  let check: CheckResult | undefined;
  if (choice.check) {
    check = rollCheck(choice.check.against, state, rng);
    outcome = check.passed ? choice.check.success : choice.check.failure;
  } else {
    outcome = choice.outcome;
  }

  state.openEvents = state.openEvents.filter((open) => open.id !== eventId);
  delete state.eventBallots[eventId];

  const effects = applyOutcome(next, outcome, event.title);
  state.timeline.push({
    type: "choice",
    round: state.round,
    title: event.title,
    definitionId: event.definitionId,
    choiceLabel: choice.label,
    narrative: outcome.narrative,
    effects: {
      hours: effects.hours - choice.hoursCost,
      profit: effects.profit - choice.profitCost,
      sharePrice: effects.sharePrice,
    },
    ...(check ? { check } : {}),
  });

  return { ok: true, game: settle(next) };
}

/** Buys the next tier of an asset; it takes effect on the next round's draw and every roll from now on. */
export function purchaseUpgrade(
  game: EngineGame,
  upgradeId: string,
): EngineResult {
  const notInRound = requireRound(game);
  if (notInRound) return notInRound;

  const upgrade = getUpgrade(upgradeId);
  if (!upgrade) {
    return fail("unknown-upgrade", "That upgrade does not exist.");
  }
  const { state } = game;
  if (ownsUpgrade(state.ownedUpgrades, upgradeId)) {
    return fail("owned", "That upgrade has already been bought.");
  }
  if (!isPurchasable(upgradeId, state.ownedUpgrades)) {
    return fail("locked", "Buy the previous tier for this asset first.");
  }
  if (upgrade.hoursCost > state.hours) {
    return insufficientHours(upgrade.hoursCost, state.hours);
  }

  const next = structuredClone(game);
  next.state.hours -= upgrade.hoursCost;
  next.state.profit -= upgrade.profitCost;
  next.state.ownedUpgrades.push({ upgradeId, round: state.round });
  delete next.state.upgradeVotes[upgradeId];
  next.state.timeline.push({
    type: "upgrade",
    round: state.round,
    title: upgrade.name,
    upgradeId,
    purchased: true,
    // `0 - cost` rather than `-cost`: a free upgrade must record 0, not -0.
    effects: {
      hours: 0 - upgrade.hoursCost,
      profit: 0 - upgrade.profitCost,
      sharePrice: 0,
    },
  });
  return { ok: true, game: settle(next) };
}

/**
 * Closes the round: every event still open is carried over and its
 * neglect penalty (if any) applied, then either the game finishes after the
 * final round or the next round begins with a fresh draw.
 */
export function endRound(
  game: EngineGame,
  rng: Rng,
  now: number,
  library: Library = EVENTS,
): EngineResult {
  const notInRound = requireRound(game);
  if (notInRound) return notInRound;
  return { ok: true, game: closeRound(game, rng, now, library) };
}

/**
 * `endRound` without the phase check, for callers that have already
 * established the game is mid-round (the store's round-timer expiry).
 */
export function closeRound(
  game: EngineGame,
  rng: Rng,
  now: number,
  library: Library = EVENTS,
): EngineGame {
  const next = structuredClone(game);
  const { state } = next;

  for (const event of state.openEvents) {
    const onIgnore = library.find((d) => d.id === event.definitionId)?.onIgnore;
    const effects = onIgnore
      ? applyOutcome(next, onIgnore, event.title)
      : { hours: 0, profit: 0, sharePrice: 0 };
    state.timeline.push({
      type: "ignored",
      round: state.round,
      title: event.title,
      definitionId: event.definitionId,
      ...(onIgnore ? { narrative: onIgnore.narrative } : {}),
      effects,
    });
  }

  settle(next);
  if (state.phase === "lost") {
    return next;
  }

  if (state.round >= state.totalRounds) {
    state.phase = "finished";
    state.upgradeVotes = {};
    state.eventBallots = {};
    return next;
  }

  return beginRound(next, state.round + 1, rng, now, library);
}

/** Non-host advisory vote for an upgrade, same semantics as D&D1's `updateVote`. */
export function setUpgradeVote(
  game: EngineGame,
  participantId: string,
  upgradeId: string,
  vote: boolean,
): EngineResult {
  const notInRound = requireRound(game);
  if (notInRound) return notInRound;
  if (!isPurchasable(upgradeId, game.state.ownedUpgrades)) {
    return fail("unknown-upgrade", "That upgrade can't be bought right now.");
  }

  const next = structuredClone(game);
  const votes = next.state.upgradeVotes;
  const voters = votes[upgradeId] ?? [];
  const hasVoted = voters.includes(participantId);
  if (vote && !hasVoted) {
    votes[upgradeId] = [...voters, participantId];
  } else if (!vote && hasVoted) {
    const remaining = voters.filter((id) => id !== participantId);
    if (remaining.length > 0) {
      votes[upgradeId] = remaining;
    } else {
      delete votes[upgradeId];
    }
  }
  return { ok: true, game: next };
}

/** Non-host advisory ballot: one pick per participant per event, replacing any earlier pick. */
export function castBallot(
  game: EngineGame,
  participantId: string,
  eventId: string,
  choiceId: string,
): EngineResult {
  const notInRound = requireRound(game);
  if (notInRound) return notInRound;

  const event = game.state.openEvents.find((open) => open.id === eventId);
  if (!event) {
    return fail("unknown-event", "That event is not open.");
  }
  if (
    choiceId !== IGNORE_CHOICE_ID &&
    !event.choices.some((choice) => choice.id === choiceId)
  ) {
    return fail("unknown-choice", "That choice is not available.");
  }

  const next = structuredClone(game);
  next.state.eventBallots[eventId] = {
    ...next.state.eventBallots[eventId],
    [participantId]: choiceId,
  };
  return { ok: true, game: next };
}
