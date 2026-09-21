export type Category =
  | "physical_defence"
  | "advanced_cyber_defence"
  | "cyber_defence"
  | "data_defence"
  | "intelligence_gathering"
  | "human_factors";

export interface Defence {
  name: string;
  cost: number;
  category: Category;
  /** Hidden from the shop until "Asset audit" has been bought. */
  hidden: boolean;
}

export type Round = 1 | 2 | 3 | 4;

export interface AttackStep {
  name: string;
  effect: string;
  /** Defence name -> narrative shown when that defence countered this step. */
  counters: Record<string, string>;
}

export type AttackTier = "script_kiddie" | "organised_crime" | "nation_state";

export interface Attack {
  name: string;
  tier: AttackTier;
  /** Exactly one step per round (steps[0] resolves in round 1, etc). */
  steps: [AttackStep, AttackStep, AttackStep, AttackStep];
}

export interface GameSettings {
  includeNationState: boolean;
}

export interface RevealEntry {
  attackName: string;
  stepName: string;
  countered: boolean;
  narrative: string;
}

export type GamePhase = "setup" | "round" | "finished";

export interface OwnedDefence {
  defence: Defence;
  round: Round;
}

export interface GameState {
  phase: GamePhase;
  round: Round;
  ownedDefences: OwnedDefence[];
  cart: Defence[];
  /** revealHistory[r - 1] holds the RevealEntry[] resolved at the end of round r. */
  revealHistory: RevealEntry[][];
}
