import type { JSX } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { CategoryBadge } from "@/components/atoms/CategoryBadge/CategoryBadge";
import type { Defence } from "@/lib/decisions-disruptions/types";

export type DefenceCardState = "available" | "in-cart" | "owned";

export interface DefenceCardProps {
  defence: Defence;
  state: DefenceCardState;
  onAdd?: () => void;
  onRemove?: () => void;
  /**
   * Whether the buy/unbuy control renders at all. Only the game master may
   * edit the shared cart — a non-host viewer should still see cost/category/
   * cart-membership (e.g. the "In cart" indicator) but never a clickable
   * "Add to cart"/"Remove" button, so this defaults to `true` and callers
   * (namely `DefenceShop`) pass `isHost` through explicitly.
   */
  canEdit?: boolean;
}

export function DefenceCard({
  defence,
  state,
  onAdd,
  onRemove,
  canEdit = true,
}: DefenceCardProps): JSX.Element {
  const isOwned = state === "owned";

  return (
    <div
      data-state={state}
      className={`flex flex-col gap-3 rounded-xl border p-4 ${
        isOwned
          ? "border-slate-800 bg-slate-900/50 opacity-60"
          : "border-slate-700 bg-slate-900"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-100">{defence.name}</span>
        <span className="text-sm text-slate-400">{defence.cost}k</span>
      </div>
      <CategoryBadge category={defence.category} />
      {state === "available" && canEdit && (
        <Button onClick={onAdd}>Add to cart</Button>
      )}
      {state === "in-cart" && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-sky-400">In cart</span>
          {canEdit && (
            <Button variant="secondary" onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
      )}
      {isOwned && (
        <span className="text-xs font-medium text-slate-400">Owned</span>
      )}
    </div>
  );
}
