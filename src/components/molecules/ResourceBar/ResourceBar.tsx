import type { JSX } from "react";
import { ProgressBar } from "@/components/atoms/ProgressBar/ProgressBar";
import {
  formatProfit,
  formatSharePrice,
} from "@/lib/decisions-disruptions-2/format";
import {
  MAX_OPEN_EVENTS,
  STARTING_PROFIT,
  STARTING_SHARE_PRICE,
} from "@/lib/decisions-disruptions-2/rules";

export interface ResourceBarProps {
  hours: number;
  hoursPerRound: number;
  /** Thousands of pounds. */
  profit: number;
  sharePrice: number;
  openEvents: number;
}

function Stat({
  label,
  value,
  change,
  danger,
}: {
  label: string;
  value: string;
  change: string;
  danger: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-slate-700 bg-slate-900 p-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span
        className={`text-xl font-semibold ${danger ? "text-rose-400" : "text-slate-100"}`}
      >
        {value}
      </span>
      <span className="text-xs text-slate-500">{change}</span>
    </div>
  );
}

/** The team's resources: today's hours, the business's health, and how close it is to event saturation. */
export function ResourceBar({
  hours,
  hoursPerRound,
  profit,
  sharePrice,
  openEvents,
}: ResourceBarProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Projected profit"
          value={formatProfit(profit)}
          change={`Started at ${formatProfit(STARTING_PROFIT)}`}
          danger={profit <= STARTING_PROFIT / 5}
        />
        <Stat
          label="Share price"
          value={formatSharePrice(sharePrice)}
          change={`Started at ${formatSharePrice(STARTING_SHARE_PRICE)}`}
          danger={sharePrice <= STARTING_SHARE_PRICE / 5}
        />
      </div>
      <ProgressBar
        label="Hours left today"
        value={hours}
        max={hoursPerRound}
        formatValue={(value, max) => `${value}h / ${max}h`}
      />
      <ProgressBar
        label="Open incidents"
        value={openEvents}
        max={MAX_OPEN_EVENTS}
        formatValue={(value, max) => `${value} / ${max}`}
        variant={openEvents >= MAX_OPEN_EVENTS - 3 ? "danger" : "default"}
      />
    </div>
  );
}
