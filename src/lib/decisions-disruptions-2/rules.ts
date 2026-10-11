/**
 * The game's fixed parameters (SPEC §4). Client-safe: the board shows most
 * of them (e.g. the saturation threshold next to the open-event count).
 */
export const TOTAL_ROUNDS = 5;

/** 10 CSIRT staff x 8 hours. */
export const HOURS_PER_ROUND = 80;

/** Thousands of pounds. */
export const STARTING_PROFIT = 500;

export const STARTING_SHARE_PRICE = 100;

export const EVENTS_PER_ROUND = 5;

/** This many concurrently open events ends the game ("event saturation"). */
export const MAX_OPEN_EVENTS = 10;

export const ROUND_DURATION_MS = 20 * 60 * 1000;

/** The implicit "ignore this round" choice every open event offers. */
export const IGNORE_CHOICE_ID = "ignore";
