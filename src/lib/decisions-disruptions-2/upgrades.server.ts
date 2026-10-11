import "server-only";
import { ASSETS, nextUpgrade } from "./assets";
import type { AssetUpgrade, OwnedUpgrade } from "./types";

/*
 * Upgrade rules only the engine needs. Kept out of the client-safe
 * `assets.ts` (which the board components import) so that file is fully
 * exercised in both test environments: v8's coverage merging otherwise
 * counts functions only ever called server-side as uncovered — the same
 * artifact SPEC §7.2 describes for the game registry.
 */

const UPGRADES: readonly AssetUpgrade[] = ASSETS.flatMap(
  (asset) => asset.upgrades,
);

export function getUpgrade(id: string): AssetUpgrade | undefined {
  return UPGRADES.find((upgrade) => upgrade.id === id);
}

/** Whether `upgradeId` is the next tier for its asset — i.e. buyable now. */
export function isPurchasable(
  upgradeId: string,
  owned: readonly OwnedUpgrade[],
): boolean {
  const upgrade = getUpgrade(upgradeId);
  return !!upgrade && nextUpgrade(upgrade.assetId, owned)?.id === upgrade.id;
}
