import type { JSX } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { EventCard } from "@/components/molecules/EventCard/EventCard";
import type { OpenEvent } from "@/lib/decisions-disruptions-2/types";

export interface IncidentQueueProps {
  events: readonly OpenEvent[];
  round: number;
  totalRounds: number;
  isHost: boolean;
  hoursLeft: number;
  /** Open event id -> participant id -> favoured choice id. */
  eventBallots: Record<string, Record<string, string>>;
  currentParticipantId: string;
  onChoose: (eventId: string, choiceId: string) => void;
  onVote: (eventId: string, choiceId: string) => void;
  onEndRound: () => void;
}

/** Today's open incidents, plus the host's "End day" control. */
export function IncidentQueue({
  events,
  round,
  totalRounds,
  isHost,
  hoursLeft,
  eventBallots,
  currentParticipantId,
  onChoose,
  onVote,
  onEndRound,
}: IncidentQueueProps): JSX.Element {
  const unresolved = events.length;
  return (
    <section
      aria-labelledby="incidents-heading"
      className="flex flex-col gap-4"
    >
      <h3
        id="incidents-heading"
        className="text-lg font-semibold text-slate-100"
      >
        Open incidents
      </h3>

      {events.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          No open incidents. Spare hours can go on upgrades.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              round={round}
              isHost={isHost}
              hoursLeft={hoursLeft}
              ballots={eventBallots[event.id] ?? {}}
              currentParticipantId={currentParticipantId}
              onChoose={(choiceId) => onChoose(event.id, choiceId)}
              onVote={(choiceId) => onVote(event.id, choiceId)}
            />
          ))}
        </div>
      )}

      {isHost && (
        <div className="flex flex-col gap-2">
          <Button onClick={onEndRound}>
            {round >= totalRounds ? "End the week" : `End day ${round}`}
          </Button>
          {unresolved > 0 && (
            <p className="text-sm text-slate-400">
              {unresolved === 1
                ? "1 unresolved incident carries over"
                : `${unresolved} unresolved incidents carry over`}
              , and neglected incidents can get worse overnight.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
