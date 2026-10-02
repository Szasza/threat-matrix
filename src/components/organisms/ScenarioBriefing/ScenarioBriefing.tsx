import type { JSX } from "react";
import { ScenarioMap } from "@/components/atoms/ScenarioMap/ScenarioMap";
import { SCENARIO, SCENARIO_TITLE } from "@/lib/decisions-disruptions/scenario";

export interface ScenarioBriefingProps {
  /**
   * Whether the briefing starts expanded. It is a native `<details>`, so after
   * the first render players open/close it freely and React leaves it alone
   * until this prop itself changes.
   */
  defaultOpen?: boolean;
}

const legend = [
  { label: "Internet", className: "bg-rose-500" },
  { label: "Plant network", className: "bg-amber-400" },
  { label: "Office network", className: "bg-slate-200" },
  { label: "River", className: "bg-sky-500/50" },
];

export function ScenarioBriefing({
  defaultOpen = true,
}: ScenarioBriefingProps): JSX.Element {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-slate-700 bg-slate-900"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl p-4 font-semibold text-slate-100 hover:bg-slate-800/60 [&::-webkit-details-marker]:hidden">
        <span>{SCENARIO_TITLE}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="h-5 w-5 shrink-0 fill-slate-400 transition group-open:rotate-180"
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </summary>

      <div className="flex flex-col gap-5 border-t border-slate-800 p-4">
        {SCENARIO.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              {section.heading}
            </h3>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm text-slate-300">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <figure className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-lg bg-slate-950/40 p-2">
            <ScenarioMap />
          </div>
          <figcaption>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              {legend.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-4 rounded-full ${item.className}`}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </figcaption>
        </figure>
      </div>
    </details>
  );
}
