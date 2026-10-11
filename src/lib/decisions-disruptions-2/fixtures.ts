import type { GameState } from "./types";

/**
 * Sample mid-game state for Storybook stories (board, debrief and room
 * templates). Not used by app code.
 */
export const sampleRoundState: GameState = {
  phase: "round",
  round: 2,
  totalRounds: 5,
  hours: 52,
  hoursPerRound: 80,
  profit: 455,
  sharePrice: 96,
  ownedUpgrades: [{ upgradeId: "firewall-rules", round: 1 }],
  openEvents: [
    {
      id: "credential-harvest@2",
      definitionId: "credential-harvest",
      title: "Ticket #131: Impossible-travel logins on finance mailboxes",
      kind: "ticket",
      tactic: "credential-access",
      description:
        "Three finance mailboxes signed in from London and Lagos within ten minutes of each other.",
      choices: [
        {
          id: "reset-all",
          label: "Force an organisation-wide password reset",
          hoursCost: 20,
          profitCost: 0,
          uncertain: false,
        },
        {
          id: "disable",
          label: "Disable the affected accounts and investigate",
          hoursCost: 8,
          profitCost: 0,
          uncertain: true,
        },
      ],
      roundDrawn: 2,
      triggeredBy: "Ticket #123: Spreadsheet with macros from 'Finance'",
      ignored: false,
    },
    {
      id: "usb-stick@1",
      definitionId: "usb-stick",
      title: "Direct #145: A USB stick found in the car park",
      kind: "direct",
      tactic: "initial-access",
      description: "A branch manager hands in a USB stick labelled 'Payroll'.",
      choices: [
        {
          id: "destroy",
          label: "Destroy it",
          hoursCost: 1,
          profitCost: 0,
          uncertain: false,
        },
      ],
      roundDrawn: 1,
      ignored: false,
    },
  ],
  occurredEventIds: ["phishing-macro", "usb-stick", "credential-harvest"],
  timeline: [
    {
      type: "choice",
      round: 1,
      title: "Ticket #123: Spreadsheet with macros from 'Finance'",
      definitionId: "phishing-macro",
      choiceLabel: "Send a staff-wide warning",
      narrative:
        "The warning goes out, but the macro had already run and harvested the user's saved passwords.",
      effects: { hours: -2, profit: 0, sharePrice: 0 },
      check: { assetId: "endpoints", chance: 30, roll: 64, passed: false },
    },
    {
      type: "upgrade",
      round: 1,
      title: "Patch firewall rules",
      upgradeId: "firewall-rules",
      purchased: true,
      effects: { hours: -12, profit: 0, sharePrice: 0 },
    },
    {
      type: "on-draw",
      round: 2,
      title: "Direct #300: A CSIRT analyst is off sick",
      definitionId: "staff-sick",
      narrative: "An analyst is off sick: the team has 8 fewer hours today.",
      effects: { hours: -8, profit: 0, sharePrice: 0 },
    },
  ],
  roundStartedAt: 1_000_000,
  roundDurationMs: 20 * 60 * 1000,
  roundTimerEnforced: false,
  lossReason: null,
  upgradeVotes: { "email-training": ["p2"] },
  eventBallots: { "credential-harvest@2": { p2: "reset-all" } },
};
