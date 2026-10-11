import type { JSX } from "react";
import { IncidentTimeline } from "@/components/organisms/IncidentTimeline/IncidentTimeline";
import { ASSETS, ownsUpgrade } from "@/lib/decisions-disruptions-2/assets";
import {
  formatProfit,
  formatSharePrice,
  lossReasonLabels,
} from "@/lib/decisions-disruptions-2/format";
import type { GameState } from "@/lib/decisions-disruptions-2/types";

export interface IncidentDebriefTemplateProps {
  game: GameState;
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-slate-700 bg-slate-900 p-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xl font-semibold text-slate-100">{value}</span>
    </div>
  );
}

/** The end of a D&D2 game: the outcome, final resources and the full decision timeline. */
export function IncidentDebriefTemplate({
  game,
}: IncidentDebriefTemplateProps): JSX.Element {
  const lost = game.phase === "lost";
  const count = (type: string) =>
    game.timeline.filter((entry) => entry.type === type).length;
  const upgrades = ASSETS.flatMap((asset) => asset.upgrades)
    .filter((upgrade) => ownsUpgrade(game.ownedUpgrades, upgrade.id))
    .map((upgrade) => upgrade.name);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-slate-100">
          {lost ? "Game over" : "You made it through the week"}
        </h2>
        <p
          className={`rounded-lg border p-3 text-sm ${
            lost
              ? "border-rose-800 bg-rose-950/40 text-rose-200"
              : "border-emerald-800 bg-emerald-950/40 text-emerald-200"
          }`}
        >
          {game.lossReason
            ? `Day ${game.round}: ${lossReasonLabels[game.lossReason]}`
            : `The business survived all ${game.totalRounds} days with ${game.openEvents.length} incident${game.openEvents.length === 1 ? "" : "s"} still open.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Projected profit" value={formatProfit(game.profit)} />
        <Summary
          label="Share price"
          value={formatSharePrice(game.sharePrice)}
        />
        <Summary label="Decisions made" value={String(count("choice"))} />
        <Summary label="Attacks blocked" value={String(count("blocked"))} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-slate-100">Upgrades</h3>
        {upgrades.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {upgrades.map((name) => (
              <li
                key={name}
                className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-300"
              >
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No upgrades were made.</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-slate-100">The week</h3>
        <IncidentTimeline entries={game.timeline} />
      </div>

      <p className="text-xs text-slate-500">
        Based on <em>Decisions &amp; Disruptions 2: Decide Harder</em> by
        Shreeve, Gardiner, Hallett, Humphries and Rashid (University of Bristol,
        SOUPS 2023), building on Decisions &amp; Disruptions © Lancaster
        University, CC-BY-NC 4.0. See{" "}
        <a
          href="https://www.decisions-disruptions.org"
          className="underline hover:text-slate-300"
        >
          https://www.decisions-disruptions.org
        </a>
        .
      </p>
    </div>
  );
}
