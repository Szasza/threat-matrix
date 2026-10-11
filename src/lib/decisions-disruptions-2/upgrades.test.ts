import { describe, expect, it } from "vitest";
import { getUpgrade, isPurchasable } from "./upgrades.server";

const owned = (...ids: string[]) =>
  ids.map((upgradeId) => ({ upgradeId, round: 1 }));

describe("getUpgrade", () => {
  it("finds an upgrade by id across every asset", () => {
    expect(getUpgrade("vpn-mfa")?.tier).toBe(2);
    expect(getUpgrade("soc-triage")?.assetId).toBe("soc");
    expect(getUpgrade("bogus")).toBeUndefined();
  });
});

describe("isPurchasable", () => {
  it("only lets the next tier be bought", () => {
    expect(isPurchasable("vpn-patch", [])).toBe(true);
    expect(isPurchasable("vpn-mfa", [])).toBe(false);
    expect(isPurchasable("vpn-mfa", owned("vpn-patch"))).toBe(true);
    expect(isPurchasable("vpn-patch", owned("vpn-patch"))).toBe(false);
    expect(isPurchasable("bogus", [])).toBe(false);
  });
});
