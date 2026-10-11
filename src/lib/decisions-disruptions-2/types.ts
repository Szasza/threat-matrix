export type AssetId =
  | "firewall"
  | "vpn"
  | "endpoints"
  | "email"
  | "core-banking"
  | "digital-banking"
  | "sanctions"
  | "crm"
  | "payment-handler"
  | "soc";

export interface AssetUpgrade {
  id: string;
  assetId: AssetId;
  /** 1-based; tier n can only be bought once tier n - 1 is owned. */
  tier: number;
  name: string;
  description: string;
  hoursCost: number;
  /** Thousands of pounds of projected profit reinvested into the upgrade. */
  profitCost: number;
  /** The asset's resistance (0-100) once this tier is owned. */
  resistance: number;
}

export interface Asset {
  id: AssetId;
  name: string;
  description: string;
  /** Run by a third party (SaaS or external provider) rather than in-house. */
  external: boolean;
  /** Resistance (0-100) before any upgrade is bought. */
  baseResistance: number;
  upgrades: AssetUpgrade[];
}

/** The paper's card taxonomy (Figure 3): helpdesk ticket, press story, or a direct message from a person. */
export type EventKind = "ticket" | "news" | "direct";

/** MITRE ATT&CK-flavoured tag, plus "operations" for non-attack events like staffing. */
export type EventTactic =
  | "reconnaissance"
  | "initial-access"
  | "execution"
  | "credential-access"
  | "lateral-movement"
  | "collection"
  | "exfiltration"
  | "impact"
  | "operations";

/** A change to the game's resources and attack surface, applied at once. */
export interface Outcome {
  narrative: string;
  hours?: number;
  /** Thousands of pounds. */
  profit?: number;
  sharePrice?: number;
  /** Event ids queued for the start of the next round, bypassing their criteria. */
  triggers?: string[];
  /** Upgrades bought for the team (e.g. a vendor patch pushed overnight). */
  grantUpgrades?: string[];
}

/**
 * A roll whose odds are either an asset's current resistance or a fixed
 * probability (0-100) — e.g. whether a ransom decryptor actually works.
 */
export interface ChanceCheck {
  against: { asset: AssetId } | { probability: number };
  success: Outcome;
  failure: Outcome;
}

interface EventChoiceBase {
  id: string;
  label: string;
  hoursCost: number;
  /** Thousands of pounds, paid up front when the choice is made. */
  profitCost: number;
}

export type EventChoice = EventChoiceBase &
  (
    | { outcome: Outcome; check?: never }
    | { check: ChanceCheck; outcome?: never }
  );

export interface EventCriteria {
  /** Earliest round the event can be drawn in, so opening rounds are gentler. */
  minRound?: number;
  /** Every listed upgrade must be owned. */
  requiresUpgrades?: string[];
  /** None of the listed upgrades may be owned. */
  excludesUpgrades?: string[];
  /** Every listed event must have occurred earlier in the game. */
  requiresEvents?: string[];
  /** None of the listed events may have occurred. */
  excludesEvents?: string[];
}

export interface EventDefinition {
  id: string;
  title: string;
  kind: EventKind;
  tactic: EventTactic;
  description: string;
  criteria?: EventCriteria;
  /** Only ever reaches the board as a consequence of another event, never in the random draw. */
  triggerOnly?: boolean;
  /** May be drawn again after it has occurred (never while still open). */
  repeatable?: boolean;
  /**
   * Rolled when the event is drawn or triggered: the attempt is blocked
   * outright with probability equal to this asset's current resistance.
   */
  resistedBy?: AssetId;
  /** Applied the moment the event is drawn, before the team acts. */
  onDraw?: Outcome;
  /**
   * Choices besides the implicit "ignore this round". An event with none
   * (an on-draw event) never joins the open list.
   */
  choices: EventChoice[];
  /** Applied at the end of every round the event is left open. */
  onIgnore?: Outcome;
}

export interface GameSettings {
  /** Whether a round is force-ended once its timer runs out. */
  enforceRoundTimer: boolean;
}

export type GamePhase = "setup" | "round" | "finished" | "lost";

export type LossReason = "profit" | "share-price" | "saturation";

/** What players see of a choice before making it: the price, not the consequence. */
export interface PublicChoice {
  id: string;
  label: string;
  hoursCost: number;
  profitCost: number;
  /** The outcome depends on a roll, so it isn't guaranteed. */
  uncertain: boolean;
}

/** A drawn-but-unresolved event on the team's board. */
export interface OpenEvent {
  /** Unique per instance: the same definition can recur in a later round. */
  id: string;
  definitionId: string;
  title: string;
  kind: EventKind;
  tactic: EventTactic;
  description: string;
  choices: PublicChoice[];
  roundDrawn: number;
  /** Title of the event whose choice (or neglect) caused this one. */
  triggeredBy?: string;
  /** The host set it aside this round; it carries over unless resolved. */
  ignored: boolean;
}

export interface Effects {
  hours: number;
  profit: number;
  sharePrice: number;
}

export interface CheckResult {
  /** Set when the odds came from an asset's resistance. */
  assetId?: AssetId;
  /** Chance of success, 0-100. */
  chance: number;
  /** 0-99; the check passes when `roll < chance`. */
  roll: number;
  passed: boolean;
}

interface TimelineEntryBase {
  round: number;
  title: string;
}

export type TimelineEntry =
  | (TimelineEntryBase & {
      type: "on-draw";
      definitionId: string;
      narrative: string;
      effects: Effects;
    })
  | (TimelineEntryBase & {
      type: "blocked";
      definitionId: string;
      check: CheckResult;
    })
  | (TimelineEntryBase & {
      type: "choice";
      definitionId: string;
      choiceLabel: string;
      narrative: string;
      effects: Effects;
      check?: CheckResult;
    })
  | (TimelineEntryBase & {
      type: "ignored";
      definitionId: string;
      narrative?: string;
      effects: Effects;
    })
  | (TimelineEntryBase & {
      type: "upgrade";
      upgradeId: string;
      /** False when an event granted the upgrade rather than the team buying it. */
      purchased: boolean;
      effects: Effects;
    });

export interface OwnedUpgrade {
  upgradeId: string;
  round: number;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  /** Hours left to spend this round. */
  hours: number;
  /** The team's normal daily capacity, before on-draw events adjust it. */
  hoursPerRound: number;
  /** Projected profit, thousands of pounds. */
  profit: number;
  sharePrice: number;
  ownedUpgrades: OwnedUpgrade[];
  openEvents: OpenEvent[];
  /** Definition ids of every event that has reached the board (blocked attempts excluded). */
  occurredEventIds: string[];
  timeline: TimelineEntry[];
  /** Epoch ms the current round began; 0 during setup. */
  roundStartedAt: number;
  roundDurationMs: number;
  /** A public copy of `GameSettings.enforceRoundTimer`, so the board can say so. */
  roundTimerEnforced: boolean;
  lossReason: LossReason | null;
  /**
   * Upgrade id -> ids of the (non-host) participants voting for it this
   * round. Same shape as D&D1's `votes`. Reset when a round ends.
   */
  upgradeVotes: Record<string, string[]>;
  /**
   * Open event id -> participant id -> the choice id (or "ignore") they
   * favour. One pick per participant per event; cleared when that event
   * resolves and at the end of every round.
   */
  eventBallots: Record<string, Record<string, string>>;
}
