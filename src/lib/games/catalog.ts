import type { Game } from "@/lib/games/types";

export const GAMES: readonly Game[] = [
  {
    id: "decisions-and-disruptions",
    name: "Decisions & Disruptions",
    description:
      "A tabletop cybersecurity decision-making game where players respond to unfolding incidents as a team. See https://www.decisions-disruptions.org for the original physical edition.",
    minPlayers: 3,
    maxPlayers: 5,
    estimatedMinutes: 90,
  },
  {
    id: "decisions-and-disruptions-2",
    name: "Decisions & Disruptions 2",
    description:
      "Run the incident response team of a financial organisation through a very bad week: share out your team's hours between unfolding cyber incidents and upgrades to your systems, while protecting profit and share price.",
    minPlayers: 3,
    maxPlayers: 5,
    estimatedMinutes: 90,
  },
];

export function getGameById(id: string): Game | undefined {
  return GAMES.find((game) => game.id === id);
}
