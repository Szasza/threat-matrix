import type { JSX } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { ProgressBar } from "@/components/atoms/ProgressBar/ProgressBar";
import {
  currentResistance,
  nextUpgrade,
  ownsUpgrade,
} from "@/lib/decisions-disruptions-2/assets";
import { formatCost } from "@/lib/decisions-disruptions-2/format";
import type { Asset, OwnedUpgrade } from "@/lib/decisions-disruptions-2/types";

export interface AssetCardProps {
  asset: Asset;
  ownedUpgrades: readonly OwnedUpgrade[];
  /** The host buys upgrades; everyone else votes for them. */
  isHost: boolean;
  hoursLeft: number;
  /** Votes for this asset's next upgrade this round. */
  votes: number;
  hasVoted: boolean;
  onPurchase?: (upgradeId: string) => void;
  onToggleVote?: (upgradeId: string) => void;
}

function formatVotes(votes: number): string {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`;
}

/**
 * One Enterprise Architecture asset: its current resistance, the tiers
 * already bought, and the next upgrade on offer.
 */
export function AssetCard({
  asset,
  ownedUpgrades,
  isHost,
  hoursLeft,
  votes,
  hasVoted,
  onPurchase,
  onToggleVote,
}: AssetCardProps): JSX.Element {
  const resistance = currentResistance(asset.id, ownedUpgrades);
  const next = nextUpgrade(asset.id, ownedUpgrades);
  const affordable = !!next && next.hoursCost <= hoursLeft;

  return (
    <section
      aria-label={asset.name}
      className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-slate-100">{asset.name}</h4>
        {asset.external && (
          <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            Third party
          </span>
        )}
      </div>
      <p className="text-sm text-slate-400">{asset.description}</p>

      <ProgressBar
        label="Resistance"
        value={resistance}
        max={100}
        formatValue={(value) => `${value}%`}
      />

      {asset.upgrades.some((upgrade) =>
        ownsUpgrade(ownedUpgrades, upgrade.id),
      ) && (
        <ul className="flex flex-col gap-1">
          {asset.upgrades
            .filter((upgrade) => ownsUpgrade(ownedUpgrades, upgrade.id))
            .map((upgrade) => (
              <li key={upgrade.id} className="text-xs text-emerald-300">
                ✓ {upgrade.name}
              </li>
            ))}
        </ul>
      )}

      {next ? (
        <div className="mt-auto flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-slate-200">
              {next.name}
            </span>
            <span className="shrink-0 text-xs text-slate-400">
              → {next.resistance}%
            </span>
          </div>
          <p className="text-xs text-slate-400">{next.description}</p>
          <p className="text-xs text-slate-300">
            {formatCost(next.hoursCost, next.profitCost)}
            {isHost && !affordable && " · Not enough hours"}
          </p>
          {isHost ? (
            <>
              <p className="text-xs font-medium text-slate-300">
                {formatVotes(votes)}
              </p>
              <Button
                disabled={!affordable}
                onClick={() => onPurchase?.(next.id)}
              >
                Buy upgrade
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              aria-pressed={hasVoted}
              onClick={() => onToggleVote?.(next.id)}
              className={hasVoted ? "border-sky-500 text-sky-300" : undefined}
            >
              {hasVoted ? "Voted" : "Vote"} · {formatVotes(votes)}
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-auto text-xs font-medium text-emerald-300">
          Fully upgraded
        </p>
      )}
    </section>
  );
}
