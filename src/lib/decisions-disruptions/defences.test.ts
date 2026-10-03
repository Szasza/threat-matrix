import { describe, expect, it } from "vitest";
import { getDefenceByName, shopDefences } from "./defences";
import type { Defence, OwnedDefence, Round } from "./types";

function d(name: string): Defence {
  const defence = getDefenceByName(name);
  if (!defence) throw new Error(`Unknown defence: ${name}`);
  return defence;
}

function owned(name: string, round: Round = 1): OwnedDefence {
  return { defence: d(name), round };
}

function names(defences: Defence[]): string[] {
  return defences.map((defence) => defence.name);
}

describe("shopDefences", () => {
  it("keeps catalog order when nothing has been bought", () => {
    const ordered = names(shopDefences({ ownedDefences: [], cart: [] }));
    expect(ordered[0]).toBe("Firewall office");
    expect(ordered.at(-1)).toBe("Threat assessment");
  });

  it("moves bought defences after the unbought ones", () => {
    const ordered = names(
      shopDefences({
        ownedDefences: [owned("Firewall office"), owned("Antivirus")],
        cart: [],
      }),
    );
    expect(ordered).toHaveLength(10);
    expect(ordered.slice(-2)).toEqual(["Firewall office", "Antivirus"]);
    expect(ordered[0]).toBe("Firewall plant");
  });

  it("does not move cart items, since they are not bought yet", () => {
    const ordered = names(
      shopDefences({ ownedDefences: [], cart: [d("Firewall office")] }),
    );
    expect(ordered[0]).toBe("Firewall office");
  });

  it("places unlocked defences after the unbought ones but before bought ones", () => {
    const ordered = names(
      shopDefences({
        ownedDefences: [owned("CCTV office")],
        cart: [d("Asset audit")],
      }),
    );
    expect(ordered).toHaveLength(15);
    expect(ordered.slice(-6)).toEqual([
      "Upgrade PC",
      "Upgrade server & DB",
      "Upgrade controller",
      "Encryption DB",
      "Encryption PC",
      "CCTV office",
    ]);
    expect(ordered.indexOf("Asset audit")).toBeLessThan(
      ordered.indexOf("Upgrade PC"),
    );
  });

  it("keeps unbought unlocked defences ahead of a bought Asset audit", () => {
    const ordered = names(
      shopDefences({ ownedDefences: [owned("Asset audit")], cart: [] }),
    );
    expect(ordered.at(-1)).toBe("Asset audit");
    expect(ordered.at(-2)).toBe("Encryption PC");
  });
});
