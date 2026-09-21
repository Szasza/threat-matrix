import "server-only";
import { ATTACKS } from "./attacks.server";
import { visibleDefences } from "./defences";
import type {
  Attack,
  AttackStep,
  Category,
  Defence,
  GameSettings,
  GameState,
  OwnedDefence,
  RevealEntry,
  Round,
} from "./types";

/**
 * Cumulative allowance minus cumulative spend. Total allowance through round
 * r is `100 * r` (thousands of credits); unspent funds always roll forward
 * automatically, so this is simply allowance minus everything committed to
 * `ownedDefences` so far (the in-progress `cart` is deliberately excluded —
 * callers compare a candidate cart's total against this to see whether it
 * fits, see `resolveRound`).
 */
export function computeAvailableBudget(state: GameState): number {
  const allowance = 100 * state.round;
  const spent = state.ownedDefences.reduce(
    (sum, owned) => sum + owned.defence.cost,
    0,
  );
  return allowance - spent;
}

/**
 * Visible defences given whether "Asset audit" has been bought. Delegates to
 * the client-safe `visibleDefences` in `defences.ts` — see that function's
 * doc comment for why the rule lives there instead of here.
 */
export function unlockedDefences(state: GameState): Defence[] {
  return visibleDefences(state);
}

/**
 * A defence purchased in round r contributes `5 - r` points to its
 * category's score (round 1 -> 4pts, ..., round 4 -> 1pt, never bought -> 0).
 */
export function computeScores(state: GameState): Record<Category, number> {
  const scores: Record<Category, number> = {
    physical_defence: 0,
    advanced_cyber_defence: 0,
    cyber_defence: 0,
    data_defence: 0,
    intelligence_gathering: 0,
    human_factors: 0,
  };
  for (const owned of state.ownedDefences) {
    scores[owned.defence.category] += 5 - owned.round;
  }
  return scores;
}

/**
 * Resolves a single attack's step for `uptoRound`, replaying the full
 * "once countered, always countered" propagation from round 1 — ported from
 * `debrief.js`'s `counter_attacks`. Deployed defences are checked in
 * purchase order without short-circuiting on the first match, so when a
 * step lists multiple valid counters and more than one has been bought, the
 * later-purchased one's narrative wins — this mirrors the reference
 * implementation exactly rather than "improving" on it.
 */
function resolveAttackStepAtRound(
  attack: Attack,
  ownedDefences: readonly OwnedDefence[],
  uptoRound: Round,
): RevealEntry {
  const deployedSoFar: string[] = [];
  let alreadyCountered = false;
  let countered = false;
  let counteredBy = "";
  let step: AttackStep = attack.steps[0];

  for (let stepRound = 1; stepRound <= uptoRound; stepRound++) {
    step = attack.steps[stepRound - 1];

    for (const owned of ownedDefences) {
      if (owned.round === stepRound) {
        deployedSoFar.push(owned.defence.name);
      }
    }

    const hasNoCounters = Object.keys(step.counters).length === 0;
    if (hasNoCounters || alreadyCountered) {
      countered = true;
      counteredBy = alreadyCountered ? "earlier counter" : "";
    } else {
      countered = false;
      counteredBy = "";
      for (const name of deployedSoFar) {
        if (name in step.counters) {
          countered = true;
          counteredBy = name;
          alreadyCountered = true;
        }
      }
    }
  }

  const narrative = (() => {
    if (!countered) {
      return step.effect;
    }
    if (counteredBy === "earlier counter") {
      return "This attack was countered at an earlier stage.";
    }
    if (Object.keys(step.counters).length === 0) {
      return "This attack has not started yet.";
    }
    return step.counters[counteredBy];
  })();

  return { attackName: attack.name, stepName: step.name, countered, narrative };
}

export interface ResolveRoundResult {
  nextState: GameState;
  revealEntries: RevealEntry[];
  error?: string;
}

/**
 * Validates the cart total against the available budget, applies the
 * purchases, re-runs the counter-attack propagation for the round being
 * resolved, and returns the next `GameState` plus this round's narration.
 * On a budget-cap failure, returns the *unmodified* `state` as `nextState`
 * and an `error` instead of mutating anything — callers must not persist
 * `nextState` when `error` is set.
 *
 * `settings` (the Nation State toggle) lives on the room record rather than
 * on `GameState` itself, so it's passed in explicitly here.
 *
 * Cart items are re-validated against `visibleDefences` here, not just
 * trusted from the caller: a hidden defence added to the cart while "Asset
 * audit" was also in the cart stays eligible only as long as "Asset audit"
 * (owned or still in-cart) backs it — remove "Asset audit" from the cart
 * before ending the round and any hidden item riding along with it is
 * dropped rather than silently purchased for free of the unlock rule.
 */
export function resolveRound(
  state: GameState,
  cart: readonly Defence[],
  settings: GameSettings,
): ResolveRoundResult {
  const eligibleNames = new Set(
    visibleDefences({ ownedDefences: state.ownedDefences, cart }).map(
      (defence) => defence.name,
    ),
  );
  const eligibleCart = cart.filter((defence) =>
    eligibleNames.has(defence.name),
  );

  const availableBudget = computeAvailableBudget(state);
  const cartTotal = eligibleCart.reduce(
    (sum, defence) => sum + defence.cost,
    0,
  );

  if (cartTotal > availableBudget) {
    return {
      nextState: state,
      revealEntries: [],
      error: `Cart total (${cartTotal}k) exceeds available budget (${availableBudget}k).`,
    };
  }

  const ownedDefences: OwnedDefence[] = [
    ...state.ownedDefences,
    ...eligibleCart.map((defence) => ({ defence, round: state.round })),
  ];

  const activeAttacks = ATTACKS.filter(
    (attack) => attack.tier !== "nation_state" || settings.includeNationState,
  );
  const revealEntries = activeAttacks.map((attack) =>
    resolveAttackStepAtRound(attack, ownedDefences, state.round),
  );

  const isFinalRound = state.round === 4;
  const nextState: GameState = {
    phase: isFinalRound ? "finished" : "round",
    round: isFinalRound ? state.round : ((state.round + 1) as Round),
    ownedDefences,
    cart: [],
    revealHistory: [...state.revealHistory, revealEntries],
  };

  return { nextState, revealEntries };
}
