import type { Rng } from "./rng";
import type { EventDefinition } from "./types";

/**
 * Test helpers shared by the D&D2 unit tests. Not imported by any app code.
 */

/**
 * An Rng that returns scripted integers from `int()` in order (each must be
 * below the requested bound), so a test can force a specific draw or roll.
 */
export function scriptedRng(ints: number[]): Rng {
  const queue = [...ints];
  let calls = 0;
  return {
    next: () => {
      throw new Error("scriptedRng only scripts int()");
    },
    int: (maxExclusive) => {
      const value = queue.shift();
      if (value === undefined) {
        throw new Error(`scriptedRng ran out of values after ${calls} calls`);
      }
      if (value >= maxExclusive) {
        throw new Error(`scripted ${value} is not below ${maxExclusive}`);
      }
      calls += 1;
      return value;
    },
    getState: () => calls,
  };
}

/** A minimal one-choice event, overridable per test. */
export function testEvent(
  id: string,
  overrides: Partial<EventDefinition> = {},
): EventDefinition {
  return {
    id,
    title: `Event ${id}`,
    kind: "ticket",
    tactic: "initial-access",
    description: `Description of ${id}`,
    choices: [
      {
        id: "fix",
        label: "Fix it",
        hoursCost: 10,
        profitCost: 5,
        outcome: { narrative: `${id} fixed` },
      },
    ],
    ...overrides,
  };
}
