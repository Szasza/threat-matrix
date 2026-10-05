# Threat Matrix

Threat Matrix is a web portal for playing security-focused games together in the browser. One person creates a room, shares its link, and everyone plays in real time.

## Games

### Decisions & Disruptions

A digital adaptation of [Decisions & Disruptions](https://www.decisions-disruptions.org), a tabletop game about cybersecurity decision-making. A team of 3–5 players runs security for a small utility company that has an office and a plant.

- The person who creates the room is the **game master**. They read the scenario briefing, manage the shared cart and end each round.
- Over **4 rounds**, the other players vote on which defences to buy from a shop. The defences include firewalls, CCTV, antivirus, security training and encryption, and each round has a limited budget.
- At the end of each round, the attackers act and the defences are tested against them. Players see only what the company would notice. The game master also sees which attacker did what.
- The host can include optional *Nation State* attackers when setting up the game.
- A debrief after round 4 shows the full history of the game.

A second game, *Decisions & Disruptions 2*, is planned. See [`specs/SPEC.md`](specs/SPEC.md).

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) with React 19 and the React Compiler
- TypeScript and Tailwind CSS 4
- Live room updates over Server-Sent Events
- [Storybook](https://storybook.js.org) 10 for components, with [Vitest](https://vitest.dev) for unit tests and browser-based story tests
- [Biome](https://biomejs.dev) for linting and formatting
- Conventional Commits, enforced by commitlint, and releases by semantic-release

## Running it locally

### Prerequisites

- **Node.js 24 or later**, as set in the `engines` field of `package.json`. CI uses Node 24.
- **npm**. The repo pins npm 12.0.2 through the `packageManager` field in `package.json`.

### 1. Install dependencies

```bash
git clone git@github.com:Szasza/threat-matrix.git
cd threat-matrix
npm install
```

`npm install` also sets up the Husky Git hooks. The hooks check that commit messages follow the [Conventional Commits](https://www.conventionalcommits.org) format.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

The defaults in `.env.example` work for local development:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | The app's base URL, `http://localhost:3000` by default |
| `STORYBOOK_DISABLE_TELEMETRY` | Turns off Storybook's usage telemetry |

### 3. Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000>, choose a display name on the games page and create a room.

### Playing with several players on one machine

Each browser identifies its player with a cookie. To play several players on one machine, open the room link in separate browser profiles, private windows or different browsers. Two tabs in the same window count as the same player.

Rooms and games are held in the server's memory, so restarting the dev server clears them all.

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Next.js dev server on port 3000 |
| `npm run build` / `npm start` | Builds the app for production / serves that build |
| `npm run storybook` | Starts Storybook on <http://localhost:6006> |
| `npm test` | Runs all Vitest tests: unit tests and story tests |
| `npm run lint` | Checks linting, formatting and import order with Biome |
| `npm run format` | Formats the code with Biome |

### Tests

There are two Vitest projects, both defined in [`vitest.config.ts`](vitest.config.ts):

- **`unit`**: tests for the game engine, room store and helpers, run in Node (`src/**/*.test.ts`).
- **`storybook`**: runs each story and its `play` interaction tests in headless Chromium, using Playwright.

Before you run the story tests for the first time, install Chromium:

```bash
npx playwright install chromium
```

To run a single project:

```bash
npx vitest run --project unit
npx vitest run --project storybook
```

### Project layout

```text
src/
  app/                    Routes, server actions and API routes (rooms, game, SSE events)
  components/             UI components, organised by Atomic Design
    atoms/ molecules/ organisms/ templates/
  lib/
    rooms/                Room lifecycle, participants, heartbeats (works for any game)
    games/                Catalogue of the available games
    decisions-disruptions/  Game engine, defences, attacks and scenario for D&D
  proxy.ts                Assigns each browser its anonymous player-ID cookie
specs/                    Plans for upcoming features
```

Each component has its own folder with a `.stories.tsx` file, and the stories include `play` interaction tests. See [`.claude/rules/component-development.md`](.claude/rules/component-development.md) for the conventions.

### Contributing

- Commit messages must follow the Conventional Commits format, such as `feat: …` or `fix: …`. The commit hook rejects anything else.
- Each pull request must pass CI: lint, an audit of production dependencies, and the full test suite.
- When a pull request is merged to `main`, semantic-release creates a release automatically and updates [`CHANGELOG.md`](CHANGELOG.md).

## License

[Creative Commons Attribution-NonCommercial 4.0 International](LICENSE.md). *Decisions & Disruptions* is an existing game, and this project is a digital adaptation of it. See <https://www.decisions-disruptions.org> for the original.
