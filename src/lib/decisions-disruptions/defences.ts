import type { Defence, GameState } from "./types";

/**
 * The 15-defence catalog, transcribed from the reference `debrief.js`
 * (`defences` array). The 5 marked `hidden` are unlocked once "Asset audit"
 * has been bought (in any round) — see `unlockedDefences` in `engine.server.ts`.
 * Safe for client import: costs/categories/names are not secret.
 */
export const DEFENCES: readonly Defence[] = [
  {
    name: "Firewall office",
    cost: 30,
    category: "cyber_defence",
    hidden: false,
  },
  {
    name: "Firewall plant",
    cost: 30,
    category: "cyber_defence",
    hidden: false,
  },
  {
    name: "CCTV office",
    cost: 50,
    category: "physical_defence",
    hidden: false,
  },
  { name: "CCTV plant", cost: 50, category: "physical_defence", hidden: false },
  {
    name: "Monitoring office",
    cost: 50,
    category: "advanced_cyber_defence",
    hidden: false,
  },
  {
    name: "Monitoring plant",
    cost: 50,
    category: "advanced_cyber_defence",
    hidden: false,
  },
  { name: "Antivirus", cost: 30, category: "cyber_defence", hidden: false },
  {
    name: "Security training",
    cost: 30,
    category: "human_factors",
    hidden: false,
  },
  {
    name: "Asset audit",
    cost: 30,
    category: "intelligence_gathering",
    hidden: false,
  },
  {
    name: "Threat assessment",
    cost: 20,
    category: "intelligence_gathering",
    hidden: false,
  },
  { name: "Upgrade PC", cost: 30, category: "cyber_defence", hidden: true },
  {
    name: "Upgrade server & DB",
    cost: 30,
    category: "cyber_defence",
    hidden: true,
  },
  {
    name: "Upgrade controller",
    cost: 30,
    category: "cyber_defence",
    hidden: true,
  },
  { name: "Encryption DB", cost: 20, category: "data_defence", hidden: true },
  { name: "Encryption PC", cost: 20, category: "data_defence", hidden: true },
] as const;

export function getDefenceByName(name: string): Defence | undefined {
  return DEFENCES.find((defence) => defence.name === name);
}

/**
 * Visible defences given whether "Asset audit" has been bought — checks both
 * committed purchases and the in-progress cart, so the 5 hidden defences
 * become shoppable the moment Asset audit is added to the cart, in the same
 * round, rather than only after that round is committed. Lives in this
 * client-safe module (not `engine.server.ts`) because it only touches public
 * defence/purchase data, never attack narration, so shop UI can call it
 * directly instead of duplicating the rule; `engine.server.ts`'s
 * `unlockedDefences` delegates to this same function.
 */
export function visibleDefences(state: {
  ownedDefences: readonly GameState["ownedDefences"][number][];
  cart: readonly Defence[];
}): Defence[] {
  const assetAuditBought =
    state.ownedDefences.some((owned) => owned.defence.name === "Asset audit") ||
    state.cart.some((defence) => defence.name === "Asset audit");
  return DEFENCES.filter((defence) => !defence.hidden || assetAuditBought);
}
