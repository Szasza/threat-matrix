import { describe, expect, it } from "vitest";
import {
  ASSETS,
  currentResistance,
  getAsset,
  nextUpgrade,
  ownsUpgrade,
} from "./assets";

const owned = (...ids: string[]) =>
  ids.map((upgradeId) => ({ upgradeId, round: 1 }));

describe("ASSETS", () => {
  it("covers the paper's ten Enterprise Architecture assets", () => {
    expect(ASSETS.map((asset) => asset.id)).toEqual([
      "firewall",
      "vpn",
      "endpoints",
      "email",
      "core-banking",
      "digital-banking",
      "sanctions",
      "crm",
      "payment-handler",
      "soc",
    ]);
  });

  it("has unique upgrade ids, tiers in order and rising resistance", () => {
    const ids = ASSETS.flatMap((asset) => asset.upgrades.map((u) => u.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const asset of ASSETS) {
      let resistance = asset.baseResistance;
      asset.upgrades.forEach((upgrade, index) => {
        expect(upgrade.assetId).toBe(asset.id);
        expect(upgrade.tier).toBe(index + 1);
        expect(upgrade.resistance).toBeGreaterThan(resistance);
        expect(upgrade.resistance).toBeLessThan(100);
        resistance = upgrade.resistance;
      });
    }
  });
});

describe("lookups", () => {
  it("getAsset finds catalog entries", () => {
    expect(getAsset("crm").external).toBe(true);
  });

  it("ownsUpgrade checks the owned list", () => {
    expect(ownsUpgrade(owned("vpn-patch"), "vpn-patch")).toBe(true);
    expect(ownsUpgrade(owned("vpn-patch"), "vpn-mfa")).toBe(false);
  });
});

describe("currentResistance", () => {
  it("is the base value with nothing bought", () => {
    expect(currentResistance("firewall", [])).toBe(40);
  });

  it("is the highest owned tier's value", () => {
    expect(currentResistance("firewall", owned("firewall-rules"))).toBe(60);
    expect(
      currentResistance("firewall", owned("firewall-rules", "firewall-ids")),
    ).toBe(80);
  });

  it("ignores other assets' upgrades", () => {
    expect(currentResistance("vpn", owned("firewall-rules"))).toBe(40);
  });
});

describe("nextUpgrade", () => {
  it("offers tiers in order until the asset is maxed out", () => {
    expect(nextUpgrade("vpn", [])?.id).toBe("vpn-patch");
    expect(nextUpgrade("vpn", owned("vpn-patch"))?.id).toBe("vpn-mfa");
    expect(nextUpgrade("vpn", owned("vpn-patch", "vpn-mfa"))).toBeUndefined();
  });
});
