import { describe, expect, it } from "vitest";
import { getDefenceByName } from "./defences";
import {
  computeAvailableBudget,
  computeScores,
  resolveRound,
  unlockedDefences,
} from "./engine.server";
import type {
  Defence,
  GameSettings,
  GameState,
  RevealEntry,
  Round,
} from "./types";

function d(name: string): Defence {
  const defence = getDefenceByName(name);
  if (!defence) throw new Error(`Unknown defence: ${name}`);
  return defence;
}

function emptyState(round: Round = 1): GameState {
  return {
    phase: "round",
    round,
    ownedDefences: [],
    cart: [],
    revealHistory: [],
  };
}

const settings: GameSettings = { includeNationState: true };

function findEntry(entries: RevealEntry[], attackName: string): RevealEntry {
  const entry = entries.find((e) => e.attackName === attackName);
  if (!entry) throw new Error(`No reveal entry for ${attackName}`);
  return entry;
}

describe("computeAvailableBudget", () => {
  it("is 100 * round for a fresh game", () => {
    expect(computeAvailableBudget(emptyState(1))).toBe(100);
    expect(computeAvailableBudget(emptyState(4))).toBe(400);
  });

  it("subtracts cumulative spend across all rounds, not just the current one", () => {
    const state = emptyState(3);
    state.ownedDefences = [
      { defence: d("Firewall office"), round: 1 },
      { defence: d("CCTV office"), round: 2 },
    ];
    // 300 allowance - (30 + 50) spent so far = 220
    expect(computeAvailableBudget(state)).toBe(220);
  });

  it("does not count the in-progress cart as already spent", () => {
    const state = emptyState(1);
    state.cart = [d("Firewall office")];
    expect(computeAvailableBudget(state)).toBe(100);
  });
});

describe("unlockedDefences", () => {
  it("hides the 5 Asset-Audit-gated defences by default", () => {
    const visible = unlockedDefences(emptyState(1));
    expect(visible).toHaveLength(10);
    expect(visible.every((defence) => !defence.hidden)).toBe(true);
  });

  it("unlocks all 15 defences once Asset audit has been bought in an earlier round", () => {
    const state = emptyState(2);
    state.ownedDefences = [{ defence: d("Asset audit"), round: 1 }];
    expect(unlockedDefences(state)).toHaveLength(15);
  });

  it("unlocks hidden defences the moment Asset audit is only sitting in the cart", () => {
    const state = emptyState(1);
    state.cart = [d("Asset audit")];
    expect(unlockedDefences(state)).toHaveLength(15);
  });
});

describe("resolveRound cart eligibility enforcement", () => {
  it("drops a hidden defence from the cart if Asset audit isn't also owned or in the same cart", () => {
    const state = emptyState(1);
    // Never actually buys Asset audit — "Upgrade PC" should not be eligible.
    const cart = [d("Upgrade PC")];
    const result = resolveRound(state, cart, settings);

    expect(result.error).toBeUndefined();
    expect(result.nextState.ownedDefences).toEqual([]);
  });

  it("still allows a hidden defence bought in the same cart as Asset audit", () => {
    const state = emptyState(1);
    const cart = [d("Asset audit"), d("Upgrade PC")];
    const result = resolveRound(state, cart, settings);

    expect(result.error).toBeUndefined();
    expect(
      result.nextState.ownedDefences.map((o) => o.defence.name).sort(),
    ).toEqual(["Asset audit", "Upgrade PC"].sort());
  });
});

describe("resolveRound budget enforcement", () => {
  it("rejects a cart that exceeds the available budget without mutating state", () => {
    const state = emptyState(1);
    const cart = [d("CCTV office"), d("CCTV plant"), d("Antivirus")]; // 130k > 100k
    const result = resolveRound(state, cart, settings);

    expect(result.error).toBeDefined();
    expect(result.nextState).toBe(state);
    expect(result.revealEntries).toEqual([]);
  });

  it("accepts a cart that exactly matches the available budget", () => {
    const state = emptyState(1);
    const cart = [d("CCTV office"), d("CCTV plant")]; // 100k
    const result = resolveRound(state, cart, settings);

    expect(result.error).toBeUndefined();
    expect(result.nextState.ownedDefences).toHaveLength(2);
    expect(result.nextState.phase).toBe("round");
    expect(result.nextState.round).toBe(2);
  });

  it("moves to phase 'finished' once round 4 resolves", () => {
    let state = emptyState(1);
    for (let round = 1; round <= 4; round++) {
      const result = resolveRound(state, [], settings);
      expect(result.error).toBeUndefined();
      state = result.nextState;
    }
    expect(state.phase).toBe("finished");
    expect(state.round).toBe(4);
  });
});

describe("once countered, always countered propagation", () => {
  it("keeps an attack countered via 'earlier counter' in every later round, without further purchases", () => {
    let state = emptyState(1);
    let result = resolveRound(state, [d("Firewall office")], settings);
    state = result.nextState;
    expect(findEntry(result.revealEntries, "Scanning Kiddie").countered).toBe(
      true,
    );

    for (let round = 2; round <= 4; round++) {
      result = resolveRound(state, [], settings);
      state = result.nextState;
      const entry = findEntry(result.revealEntries, "Scanning Kiddie");
      expect(entry.countered).toBe(true);
      expect(entry.narrative).toBe(
        "This attack was countered at an earlier stage.",
      );
    }
  });

  it("leaves an attack uncountered through round 4 if its counter is never bought", () => {
    let state = emptyState(1);
    let lastEntries: RevealEntry[] = [];
    for (let round = 1; round <= 4; round++) {
      const result = resolveRound(state, [], settings);
      state = result.nextState;
      lastEntries = result.revealEntries;
    }
    const entry = findEntry(lastEntries, "Mafia Disruption Controller");
    expect(entry.countered).toBe(false);
    expect(entry.narrative).toBe(
      "One day, the turbines start accelerating out of control and finally blow up. Several employees are injured. The company, having lost one of its core assets, is forced to shut down.",
    );
  });
});

describe("the Perfect Game walkthrough (BETA_D-D_Game_Master_Cheat_Sheet.pdf)", () => {
  const rounds: { round: Round; buys: string[] }[] = [
    { round: 1, buys: ["Asset audit", "Security training", "Firewall office"] },
    {
      round: 2,
      buys: [
        "Firewall plant",
        "Upgrade server & DB",
        "Encryption DB",
        "Antivirus",
      ],
    },
    {
      round: 3,
      buys: ["Encryption PC", "Upgrade controller", "Monitoring office"],
    },
    { round: 4, buys: ["Upgrade PC", "Monitoring plant"] },
  ];

  function playPerfectGame() {
    let state = emptyState(1);
    const history: RevealEntry[][] = [];
    for (const { buys } of rounds) {
      const result = resolveRound(state, buys.map(d), settings);
      expect(result.error).toBeUndefined();
      state = result.nextState;
      history.push(result.revealEntries);
    }
    return { finalState: state, history };
  }

  it("never exceeds the available budget in any round", () => {
    const { finalState } = playPerfectGame();
    expect(finalState.phase).toBe("finished");
  });

  it("countering Script Kiddie and Organised Crime attacks by round 2, except Mafia Disruption Controller which only counters from round 2 onward", () => {
    const { history } = playPerfectGame();
    const [round1, round2] = history;

    expect(findEntry(round1, "Scanning Kiddie").countered).toBe(true);
    expect(findEntry(round1, "DoSing Kiddie")).toMatchObject({
      countered: true,
      narrative: "This attack has not started yet.",
    });
    expect(findEntry(round1, "Hacking Kiddie")).toMatchObject({
      countered: true,
      narrative: "This attack has not started yet.",
    });
    expect(findEntry(round1, "Phishing Kiddie").countered).toBe(true);
    expect(findEntry(round1, "Mafia APT PC Offices").countered).toBe(true);
    expect(findEntry(round1, "Mafia APT Server Offices").countered).toBe(true);
    expect(findEntry(round1, "Mafia APT Server Plant").countered).toBe(true);

    // Mafia Disruption Controller counters on "Firewall plant", bought only in round 2.
    expect(findEntry(round1, "Mafia Disruption Controller")).toMatchObject({
      countered: false,
      narrative: "No visible effect.",
    });
    expect(findEntry(round2, "Mafia Disruption Controller").countered).toBe(
      true,
    );
  });

  it("leaves both Nation State attacks uncountered until round 4, and only Nation State Intelligence is stopped then", () => {
    const { history } = playPerfectGame();
    const [round1, round2, round3, round4] = history;

    for (const round of [round1, round2, round3]) {
      expect(findEntry(round, "Nation State Intelligence")).toMatchObject({
        countered: false,
        narrative: "No visible effect.",
      });
      expect(findEntry(round, "Nation State Disruption")).toMatchObject({
        countered: false,
        narrative: "No visible effect.",
      });
    }

    // Round 4: "Monitoring plant" finally counters Nation State Intelligence.
    expect(findEntry(round4, "Nation State Intelligence")).toMatchObject({
      countered: true,
      narrative:
        "One day, the office's network administrator comes to talk to you: they have detected a suspicious data stream originating from the historian database and going to an unknown address on the Internet, located in a foreign country. Upon closer investigation, it was a data exfiltration attack: the administrator makes sure that the link to the attacker's machine is shut down and any malware on the infected historian is removed.",
    });

    // Nation State Disruption only counters on "None" (unobtainable) or an
    // earlier-round CCTV plant counter, neither of which the Perfect Game
    // buys — it succeeds catastrophically at round 4.
    expect(findEntry(round4, "Nation State Disruption")).toMatchObject({
      countered: false,
      narrative:
        "Optional description: one day, the turbines start accelerating out of control and finally blow up. Several employees are injured. The company, having lost one of its core assets, is forced to shut down.",
    });
  });

  it("produces the exact category scores from the cheat sheet's purchase list", () => {
    const { finalState } = playPerfectGame();
    expect(computeScores(finalState)).toEqual({
      physical_defence: 0,
      advanced_cyber_defence: 3,
      cyber_defence: 16,
      data_defence: 5,
      intelligence_gathering: 4,
      human_factors: 4,
    });
  });
});
