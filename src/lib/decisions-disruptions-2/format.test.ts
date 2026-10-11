import { describe, expect, it } from "vitest";
import {
  formatCost,
  formatCountdown,
  formatEffects,
  formatProfit,
  formatSharePrice,
} from "./format";

describe("formatProfit / formatSharePrice", () => {
  it("formats positive, zero and negative amounts", () => {
    expect(formatProfit(500)).toBe("£500k");
    expect(formatProfit(0)).toBe("£0k");
    expect(formatProfit(-20)).toBe("−£20k");
    expect(formatSharePrice(100)).toBe("£100");
    expect(formatSharePrice(-3)).toBe("−£3");
  });
});

describe("formatCost", () => {
  it("lists hours and profit, or says it's free", () => {
    expect(formatCost(12, 30)).toBe("12h · £30k");
    expect(formatCost(4, 0)).toBe("4h");
    expect(formatCost(0, 150)).toBe("£150k");
    expect(formatCost(0, 0)).toBe("Free");
  });
});

describe("formatEffects", () => {
  it("lists only non-zero effects, signed", () => {
    expect(formatEffects({ hours: -12, profit: -25, sharePrice: 3 })).toEqual([
      "−12h",
      "−£25k",
      "+£3 share price",
    ]);
    expect(formatEffects({ hours: 8, profit: 0, sharePrice: 0 })).toEqual([
      "+8h",
    ]);
    expect(formatEffects({ hours: 0, profit: 0, sharePrice: 0 })).toEqual([]);
  });
});

describe("formatCountdown", () => {
  it("formats minutes and seconds, rounding up and clamping at zero", () => {
    expect(formatCountdown(20 * 60 * 1000)).toBe("20:00");
    expect(formatCountdown(61_500)).toBe("1:02");
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-5000)).toBe("0:00");
  });
});
