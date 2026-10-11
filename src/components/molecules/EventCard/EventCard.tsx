"use client";

import { type JSX, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { TacticBadge } from "@/components/atoms/TacticBadge/TacticBadge";
import { formatCost, kindLabels } from "@/lib/decisions-disruptions-2/format";
import { IGNORE_CHOICE_ID } from "@/lib/decisions-disruptions-2/rules";
import type { EventKind, OpenEvent } from "@/lib/decisions-disruptions-2/types";

export interface EventCardProps {
  event: OpenEvent;
  /** The current round, to flag events carried over from earlier days. */
  round: number;
  /** The host commits choices; everyone else casts advisory ballots. */
  isHost: boolean;
  hoursLeft: number;
  /** Participant id -> the choice id they favour for this event. */
  ballots: Record<string, string>;
  currentParticipantId: string;
  /** Host only: commit a choice, or "ignore" to set the event aside. */
  onChoose?: (choiceId: string) => void;
  /** Players only: cast (or move) this participant's ballot. */
  onVote?: (choiceId: string) => void;
}

const kindClasses: Record<EventKind, string> = {
  ticket: "border-l-sky-500",
  news: "border-l-amber-500",
  direct: "border-l-violet-500",
};

function formatVotes(votes: number): string {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`;
}

function Tally({
  votes,
  isPick,
}: {
  votes: number;
  isPick: boolean;
}): JSX.Element {
  return (
    <span
      data-testid="ballot-tally"
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isPick ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-300"
      }`}
    >
      {formatVotes(votes)}
    </span>
  );
}

interface Option {
  id: string;
  label: string;
  cost: string;
  uncertain: boolean;
  affordable: boolean;
}

/**
 * One open incident: its card text and the choices for dealing with it.
 * Choices are final once committed, so the host picks one and then
 * confirms it; "Ignore this round" just sets the event aside and needs no
 * confirmation. Players instead vote for the option they favour — one pick
 * each, moved by voting for another — and see the running tally.
 */
export function EventCard({
  event,
  round,
  isHost,
  hoursLeft,
  ballots,
  currentParticipantId,
  onChoose,
  onVote,
}: EventCardProps): JSX.Element {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const options: Option[] = [
    ...event.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      cost: formatCost(choice.hoursCost, choice.profitCost),
      uncertain: choice.uncertain,
      affordable: choice.hoursCost <= hoursLeft,
    })),
    {
      id: IGNORE_CHOICE_ID,
      label: "Ignore this round",
      cost: "Free",
      uncertain: false,
      affordable: true,
    },
  ];
  const tally = (choiceId: string) =>
    Object.values(ballots).filter((pick) => pick === choiceId).length;
  const myPick = ballots[currentParticipantId];
  const selectedOption = options.find((option) => option.id === selected);

  return (
    <article
      aria-label={event.title}
      data-ignored={event.ignored}
      className={`flex flex-col gap-3 rounded-xl border border-l-4 border-slate-700 bg-slate-900 p-4 ${kindClasses[event.kind]} ${
        event.ignored ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {kindLabels[event.kind]}
        </span>
        <TacticBadge tactic={event.tactic} />
        {event.roundDrawn < round && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            Open since day {event.roundDrawn}
          </span>
        )}
        {event.ignored && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            Ignored today
          </span>
        )}
      </div>

      <h4 className="font-medium text-slate-100">{event.title}</h4>
      {event.triggeredBy && (
        <p className="text-xs text-amber-300">
          Follow-up to: {event.triggeredBy}
        </p>
      )}
      <p className="text-sm text-slate-400">{event.description}</p>

      <ul className="flex flex-col gap-2">
        {options.map((option) => {
          const isIgnore = option.id === IGNORE_CHOICE_ID;
          const isPick = myPick === option.id;
          const votes = tally(option.id);
          const details = (
            <>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-slate-100">{option.label}</span>
                <span className="text-xs text-slate-400">
                  {option.cost}
                  {option.uncertain && " · Outcome uncertain"}
                  {isHost && !option.affordable && " · Not enough hours"}
                </span>
              </span>
              <Tally votes={votes} isPick={isPick} />
            </>
          );
          const rowClasses =
            "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition";

          if (isHost) {
            const disabled = !option.affordable || (isIgnore && event.ignored);
            return (
              <li key={option.id}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected === option.id}
                  onClick={() => {
                    if (isIgnore) {
                      setSelected(undefined);
                      onChoose?.(IGNORE_CHOICE_ID);
                    } else {
                      setSelected(option.id);
                    }
                  }}
                  className={`${rowClasses} disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected === option.id
                      ? "border-sky-500 bg-sky-500/10"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {details}
                </button>
              </li>
            );
          }

          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={isPick}
                onClick={() => onVote?.(option.id)}
                className={`${rowClasses} ${
                  isPick
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-slate-700 hover:border-slate-500"
                }`}
              >
                {details}
              </button>
            </li>
          );
        })}
      </ul>

      {isHost && selectedOption && (
        <div className="flex flex-col gap-2 rounded-lg bg-slate-950/60 p-3">
          <p className="text-sm text-slate-300">
            Commit to “{selectedOption.label}”? Choices are final.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setSelected(undefined);
                onChoose?.(selectedOption.id);
              }}
            >
              Confirm
            </Button>
            <Button variant="secondary" onClick={() => setSelected(undefined)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!isHost && (
        <p className="text-xs text-slate-500">
          {myPick
            ? "Your vote is in · vote again to change it"
            : "Vote for how to respond"}
        </p>
      )}
    </article>
  );
}
