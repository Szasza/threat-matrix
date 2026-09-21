import type { JSX } from "react";

export type ProgressBarVariant = "default" | "danger";

export interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  formatValue?: (value: number, max: number) => string;
  /** "danger" reddens the fill and the value readout — e.g. spending over budget. */
  variant?: ProgressBarVariant;
}

const fillClasses: Record<ProgressBarVariant, string> = {
  default: "bg-sky-500",
  danger: "bg-rose-500",
};

const valueReadoutClasses: Record<ProgressBarVariant, string> = {
  default: "text-slate-400",
  danger: "font-medium text-rose-400",
};

export function ProgressBar({
  label,
  value,
  max,
  formatValue,
  variant = "default",
}: ProgressBarProps): JSX.Element {
  const ratio = max === 0 ? 0 : value / max;
  const percentage = Math.min(100, Math.max(0, ratio * 100));
  const valueReadout = formatValue
    ? formatValue(value, max)
    : `${value} / ${max}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-sm text-slate-300">
        <span>{label}</span>
        <span className={valueReadoutClasses[variant]}>{valueReadout}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
      >
        <div aria-hidden="true" className="h-full w-full">
          <div
            className={`h-full rounded-full transition-[width] ${fillClasses[variant]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
