import { describe, expect, it } from "vitest";
import { EVENTS } from "./events.server";
import type { EventChoice, Outcome } from "./types";
import { getUpgrade } from "./upgrades.server";

const ids = new Set(EVENTS.map((event) => event.id));

function outcomesOf(choice: EventChoice): Outcome[] {
  return choice.check
    ? [choice.check.success, choice.check.failure]
    : [choice.outcome];
}

const allOutcomes: Outcome[] = EVENTS.flatMap((event) => [
  ...event.choices.flatMap(outcomesOf),
  ...(event.onIgnore ? [event.onIgnore] : []),
  ...(event.onDraw ? [event.onDraw] : []),
]);

/**
 * Content-integrity checks for the starter library: a typo in a trigger or
 * upgrade id would otherwise only surface as an event silently never
 * appearing mid-game.
 */
describe("EVENTS", () => {
  it("is a ~24-30 event starter set (SPEC §5) with unique ids", () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(24);
    expect(ids.size).toBe(EVENTS.length);
  });

  it("only triggers events that exist", () => {
    for (const outcome of allOutcomes) {
      for (const trigger of outcome.triggers ?? []) {
        expect(ids, `unknown trigger ${trigger}`).toContain(trigger);
      }
    }
  });

  it("only grants upgrades that exist", () => {
    for (const outcome of allOutcomes) {
      for (const upgradeId of outcome.grantUpgrades ?? []) {
        expect(getUpgrade(upgradeId), upgradeId).toBeDefined();
      }
    }
  });

  it("only references upgrades and events that exist in criteria", () => {
    for (const event of EVENTS) {
      const criteria = event.criteria ?? {};
      for (const upgradeId of [
        ...(criteria.requiresUpgrades ?? []),
        ...(criteria.excludesUpgrades ?? []),
      ]) {
        expect(getUpgrade(upgradeId), upgradeId).toBeDefined();
      }
      for (const eventId of [
        ...(criteria.requiresEvents ?? []),
        ...(criteria.excludesEvents ?? []),
      ]) {
        expect(ids).toContain(eventId);
      }
    }
  });

  it("can reach every trigger-only event from some other event", () => {
    const triggered = new Set(allOutcomes.flatMap((o) => o.triggers ?? []));
    for (const event of EVENTS.filter((e) => e.triggerOnly)) {
      expect(triggered, event.id).toContain(event.id);
    }
  });

  it("offers 1-3 choices (2-4 with ignore), or none for a pure on-draw event", () => {
    for (const event of EVENTS) {
      if (event.choices.length === 0) {
        expect(event.onDraw, event.id).toBeDefined();
        continue;
      }
      expect(event.choices.length, event.id).toBeLessThanOrEqual(3);
      const choiceIds = event.choices.map((choice) => choice.id);
      expect(new Set(choiceIds).size, event.id).toBe(choiceIds.length);
      expect(choiceIds, event.id).not.toContain("ignore");
    }
  });

  it("uses fixed probabilities between 1 and 99", () => {
    for (const event of EVENTS) {
      for (const choice of event.choices) {
        const against = choice.check?.against;
        if (against && "probability" in against) {
          expect(against.probability).toBeGreaterThan(0);
          expect(against.probability).toBeLessThan(100);
        }
      }
    }
  });

  it("keeps every cost within a day's hours and non-negative", () => {
    for (const event of EVENTS) {
      for (const choice of event.choices) {
        expect(choice.hoursCost).toBeGreaterThanOrEqual(0);
        expect(choice.hoursCost).toBeLessThanOrEqual(80);
        expect(choice.profitCost).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("has enough round-1 events for a full first draw", () => {
    const roundOne = EVENTS.filter(
      (e) => !e.triggerOnly && (e.criteria?.minRound ?? 1) === 1,
    );
    expect(roundOne.length).toBeGreaterThanOrEqual(5);
  });
});
