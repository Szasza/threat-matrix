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
  /** Card text shown to players in the shop, from the printed game cards. */
  description: string;
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
  /**
   * The attacker, e.g. "Mafia APT PC Offices". Only the game master sees it:
   * `redactGameStateForPlayer` strips it from every non-host payload.
   */
  attackName?: string;
  /**
   * What the attacker did this round, e.g. "Scan offices". Game master only,
   * like `attackName` — players get just the effect (`narrative`).
   */
  stepName?: string;
  countered: boolean;
  narrative: string;
  /**
   * False when the players wouldn't notice anything this round — the attack
   * hasn't started yet, was already countered in an earlier round, or its
   * outcome has no visible effect. Such entries are dropped from non-host
   * payloads entirely; the game master still sees them, flagged.
   */
  visibleToPlayers: boolean;
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
  /**
   * Defence name -> ids of the (non-host) participants voting for it this
   * round. Stored per voter, not as a bare count, so vote/unvote is
   * idempotent and each client can tell whether it has voted; the shared
   * counter is the array's length. Reset when a round ends.
   */
  votes: Record<string, string[]>;
  /** revealHistory[r - 1] holds the RevealEntry[] resolved at the end of round r. */
  revealHistory: RevealEntry[][];
}
