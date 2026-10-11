import type { Effects, EventKind, EventTactic, LossReason } from "./types";

/** Thousands of pounds, e.g. 500 -> "£500k", -20 -> "−£20k". */
export function formatProfit(thousands: number): string {
  const sign = thousands < 0 ? "−" : "";
  return `${sign}£${Math.abs(thousands)}k`;
}

export function formatSharePrice(pounds: number): string {
  const sign = pounds < 0 ? "−" : "";
  return `${sign}£${Math.abs(pounds)}`;
}

/** A choice's up-front price, e.g. "12h · £30k" or "Free". */
export function formatCost(hoursCost: number, profitCost: number): string {
  const parts = [
    ...(hoursCost > 0 ? [`${hoursCost}h`] : []),
    ...(profitCost > 0 ? [`£${profitCost}k`] : []),
  ];
  return parts.length > 0 ? parts.join(" · ") : "Free";
}

function signed(value: number, format: (abs: number) => string): string {
  return `${value > 0 ? "+" : "−"}${format(Math.abs(value))}`;
}

/** Non-zero effects as short signed labels, e.g. ["−12h", "−£25k", "+3 share price"]. */
export function formatEffects(effects: Effects): string[] {
  return [
    ...(effects.hours !== 0 ? [signed(effects.hours, (v) => `${v}h`)] : []),
    ...(effects.profit !== 0 ? [signed(effects.profit, (v) => `£${v}k`)] : []),
    ...(effects.sharePrice !== 0
      ? [signed(effects.sharePrice, (v) => `£${v} share price`)]
      : []),
  ];
}

export const tacticLabels: Record<EventTactic, string> = {
  reconnaissance: "Reconnaissance",
  "initial-access": "Initial Access",
  execution: "Execution",
  "credential-access": "Credential Access",
  "lateral-movement": "Lateral Movement",
  collection: "Collection",
  exfiltration: "Exfiltration",
  impact: "Impact",
  operations: "Operations",
};

export const kindLabels: Record<EventKind, string> = {
  ticket: "Ticket",
  news: "News",
  direct: "Direct",
};

export const lossReasonLabels: Record<LossReason, string> = {
  profit: "Projected profit hit zero — the business can no longer operate.",
  "share-price": "The share price collapsed to zero.",
  saturation:
    "Event saturation: ten or more incidents were open at once, more than any team could recover from.",
};

/** "mm:ss", clamped at 0:00. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
