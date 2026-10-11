import type { JSX } from "react";
import { AssetCard } from "@/components/molecules/AssetCard/AssetCard";
import { ASSETS, nextUpgrade } from "@/lib/decisions-disruptions-2/assets";
import type { OwnedUpgrade } from "@/lib/decisions-disruptions-2/types";

export interface AssetUpgradePanelProps {
  ownedUpgrades: readonly OwnedUpgrade[];
  /** Upgrade id -> ids of the participants voting for it. */
  upgradeVotes: Record<string, string[]>;
  isHost: boolean;
  hoursLeft: number;
  currentParticipantId: string;
  onPurchase: (upgradeId: string) => void;
  onVote: (upgradeId: string) => void;
  onUnvote: (upgradeId: string) => void;
}

/** The Enterprise Architecture shop: every asset, its resistance and its next upgrade. */
export function AssetUpgradePanel({
  ownedUpgrades,
  upgradeVotes,
  isHost,
  hoursLeft,
  currentParticipantId,
  onPurchase,
  onVote,
  onUnvote,
}: AssetUpgradePanelProps): JSX.Element {
  return (
    <section aria-labelledby="ea-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id="ea-heading" className="text-lg font-semibold text-slate-100">
          Enterprise Architecture
        </h3>
        <p className="text-sm text-slate-400">
          Upgrades cost hours today and raise an asset&apos;s resistance — the
          chance it stops an attack — from tomorrow&apos;s events onwards.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ASSETS.map((asset) => {
          const next = nextUpgrade(asset.id, ownedUpgrades);
          const voters = next ? (upgradeVotes[next.id] ?? []) : [];
          const hasVoted = voters.includes(currentParticipantId);
          return (
            <AssetCard
              key={asset.id}
              asset={asset}
              ownedUpgrades={ownedUpgrades}
              isHost={isHost}
              hoursLeft={hoursLeft}
              votes={voters.length}
              hasVoted={hasVoted}
              onPurchase={onPurchase}
              onToggleVote={(upgradeId) =>
                hasVoted ? onUnvote(upgradeId) : onVote(upgradeId)
              }
            />
          );
        })}
      </div>
    </section>
  );
}
