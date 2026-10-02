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
  /** Shared vote counter for this defence in the current round. */
  votes?: number;
  /**
   * Whether the whole card acts as a vote toggle. Only non-host players vote
   * (the game master decides by buying), and owned cards are never votable.
   */
  canVote?: boolean;
  /** Whether the current player has voted for this card. */
  hasVoted?: boolean;
  onToggleVote?: () => void;
}

function formatVotes(votes: number): string {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`;
}

function VoteCount({
  votes,
  hasVoted,
}: {
  votes: number;
  hasVoted: boolean;
}): JSX.Element {
  return (
    <span
      data-testid="vote-count"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        hasVoted ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-300"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="h-3.5 w-3.5 fill-current"
      >
        <path d="M2 9.5A1.5 1.5 0 0 1 3.5 8h1A1.5 1.5 0 0 1 6 9.5v7A1.5 1.5 0 0 1 4.5 18h-1A1.5 1.5 0 0 1 2 16.5v-7Zm5-.1V16a2 2 0 0 0 1.1 1.8l.1.05A4 4 0 0 0 10 18.3h5.4a2 2 0 0 0 2-1.6l1-5A2 2 0 0 0 16.4 9.3H13V5a2 2 0 0 0-2-2 1 1 0 0 0-1 1v.7a4 4 0 0 1-.8 2.4L7.6 8.8A2 2 0 0 0 7 9.4Z" />
      </svg>
      <span className="sr-only">{formatVotes(votes)}</span>
      <span aria-hidden="true">{votes}</span>
    </span>
  );
}

export function DefenceCard({
  defence,
  state,
  onAdd,
  onRemove,
  canEdit = true,
  votes = 0,
  canVote = false,
  hasVoted = false,
  onToggleVote,
}: DefenceCardProps): JSX.Element {
  const isOwned = state === "owned";
  const isVotable = canVote && !isOwned;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-100">{defence.name}</span>
        <span className="text-sm text-slate-400">{defence.cost}k</span>
      </div>
      <CategoryBadge category={defence.category} />
      <p className="text-sm text-slate-400">{defence.description}</p>
    </>
  );

  // Game master: votes sit between the description and the cart controls.
  if (canEdit) {
    return (
      <div
        data-state={state}
        className={`flex flex-col gap-3 rounded-xl border p-4 ${
          isOwned
            ? "border-slate-800 bg-slate-900/50 opacity-60"
            : "border-slate-700 bg-slate-900"
        }`}
      >
        {body}
        {!isOwned && (
          <p className="text-xs font-medium text-slate-300">
            {formatVotes(votes)}
          </p>
        )}
        {state === "available" && <Button onClick={onAdd}>Add to cart</Button>}
        {state === "in-cart" && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-sky-400">In cart</span>
            <Button variant="secondary" onClick={onRemove}>
              Remove
            </Button>
          </div>
        )}
        {isOwned && (
          <span className="text-xs font-medium text-slate-400">Owned</span>
        )}
      </div>
    );
  }

  // Players: status on the lower left, vote count on the lower right.
  const footer = (
    <div className="mt-auto flex items-center justify-between gap-2">
      {state === "in-cart" && (
        <span className="text-xs font-medium text-sky-400">In cart</span>
      )}
      {isOwned && (
        <span className="text-xs font-medium text-slate-400">Owned</span>
      )}
      {state === "available" && isVotable && (
        <span className="text-xs text-slate-500">
          {hasVoted ? "Voted · click to unvote" : "Click to vote"}
        </span>
      )}
      {!isOwned && (
        <span className="ml-auto">
          <VoteCount votes={votes} hasVoted={hasVoted} />
        </span>
      )}
    </div>
  );

  if (isVotable) {
    return (
      <button
        type="button"
        data-state={state}
        aria-pressed={hasVoted}
        aria-label={`Vote for ${defence.name}, ${formatVotes(votes)}`}
        onClick={onToggleVote}
        className={`flex w-full cursor-pointer flex-col gap-3 rounded-xl border bg-slate-900 p-4 text-left transition hover:bg-slate-800/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
          hasVoted
            ? "border-sky-500 ring-1 ring-sky-500/40"
            : "border-slate-700 hover:border-slate-500"
        }`}
      >
        {body}
        {footer}
      </button>
    );
  }

  return (
    <div
      data-state={state}
      className={`flex flex-col gap-3 rounded-xl border p-4 ${
        isOwned
          ? "border-slate-800 bg-slate-900/50 opacity-60"
          : "border-slate-700 bg-slate-900"
      }`}
    >
      {body}
      {footer}
    </div>
  );
}
