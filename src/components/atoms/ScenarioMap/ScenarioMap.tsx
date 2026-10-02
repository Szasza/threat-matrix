import type { JSX } from "react";

/**
 * Top-down drawing of the D-D game board (after the booklet's "The Game
 * Board (Assets)" page): the plant on the left, the office on the right, each
 * wired to the Internet through its own router. Colours follow the board —
 * blue river, yellow plant network, white office network, red Internet links —
 * using the app's slate/sky/amber/rose palette.
 */

function Label({
  x,
  y,
  children,
  anchor = "middle",
}: {
  x: number;
  y: number;
  children: string;
  anchor?: "start" | "middle" | "end";
}): JSX.Element {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className="fill-slate-300 text-[11px] font-medium uppercase tracking-wide"
    >
      {children}
    </text>
  );
}

function Router({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g>
      <rect
        x={x - 15}
        y={y - 12}
        width={30}
        height={24}
        rx={4}
        className="fill-slate-800 stroke-rose-400"
        strokeWidth={2}
      />
      <circle cx={x - 6} cy={y} r={3} className="fill-emerald-400" />
      <circle cx={x + 6} cy={y} r={3} className="fill-rose-400" />
    </g>
  );
}

function Database({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g className="fill-slate-700 stroke-slate-400" strokeWidth={1.5}>
      <path
        d={`M ${x - 14} ${y - 12} v 24 a 14 5 0 0 0 28 0 v -24`}
        strokeLinejoin="round"
      />
      <ellipse cx={x} cy={y - 12} rx={14} ry={5} />
    </g>
  );
}

function Pc({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g>
      <rect
        x={x - 13}
        y={y - 10}
        width={26}
        height={18}
        rx={2}
        className="fill-slate-700 stroke-slate-400"
        strokeWidth={1.5}
      />
      <rect
        x={x - 9}
        y={y - 6}
        width={18}
        height={10}
        className="fill-sky-400/60"
      />
      <path d={`M ${x - 7} ${y + 13} h 14`} className="stroke-slate-400" />
      <path d={`M ${x} ${y + 8} v 5`} className="stroke-slate-400" />
    </g>
  );
}

function Turbine({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g>
      <rect
        x={x - 20}
        y={y - 16}
        width={40}
        height={32}
        rx={4}
        className="fill-slate-800 stroke-slate-500"
        strokeWidth={1.5}
      />
      <circle
        cx={x}
        cy={y}
        r={10}
        className="fill-none stroke-sky-300"
        strokeWidth={2}
      />
      <path
        d={`M ${x - 10} ${y} h 20 M ${x} ${y - 10} v 20`}
        className="stroke-sky-300"
        strokeWidth={1.5}
      />
    </g>
  );
}

export function ScenarioMap(): JSX.Element {
  return (
    <svg
      viewBox="0 0 760 360"
      role="img"
      aria-labelledby="scenario-map-title scenario-map-desc"
      className="h-auto w-full min-w-[640px]"
      strokeLinecap="round"
    >
      <title id="scenario-map-title">Map of the plant and the office</title>
      <desc id="scenario-map-desc">
        The plant has a river driving two turbines, a SCADA controller, a
        historian database and PCs on its local network. The office has PCs, a
        server and a database on its local network. Each site connects to the
        Internet through its own router.
      </desc>

      {/* Site boards */}
      <rect
        x={10}
        y={20}
        width={290}
        height={320}
        rx={14}
        className="fill-slate-950/60 stroke-slate-700"
        strokeWidth={1.5}
      />
      <rect
        x={460}
        y={20}
        width={290}
        height={320}
        rx={14}
        className="fill-slate-950/60 stroke-slate-700"
        strokeWidth={1.5}
      />
      <text
        x={155}
        y={46}
        textAnchor="middle"
        className="fill-slate-100 text-sm font-semibold"
      >
        The plant
      </text>
      <text
        x={605}
        y={46}
        textAnchor="middle"
        className="fill-slate-100 text-sm font-semibold"
      >
        The office
      </text>

      {/* Plant: river and turbines */}
      <rect
        x={30}
        y={64}
        width={22}
        height={260}
        rx={6}
        className="fill-sky-500/50"
      />
      <path
        d="M 52 112 H 80 M 52 172 H 80"
        className="stroke-sky-500/50"
        strokeWidth={12}
        strokeLinecap="butt"
      />
      <Turbine x={100} y={112} />
      <Turbine x={100} y={172} />
      <Label x={62} y={210} anchor="start">
        River &amp; turbines
      </Label>

      {/* Plant: controller wiring to turbines */}
      <path
        d="M 120 112 H 150 V 90 H 200 M 120 172 H 150 V 112"
        className="fill-none stroke-slate-500"
        strokeWidth={2}
      />

      {/* Plant: local network (yellow) */}
      <path
        d="M 225 102 V 270 M 85 270 H 260 M 225 190 H 268"
        className="fill-none stroke-amber-400"
        strokeWidth={4}
      />
      <path
        d="M 100 270 V 284 M 150 270 V 284"
        className="stroke-amber-400"
        strokeWidth={3}
      />

      {/* Plant: SCADA controller */}
      <rect
        x={200}
        y={78}
        width={50}
        height={24}
        rx={4}
        className="fill-slate-800 stroke-slate-400"
        strokeWidth={1.5}
      />
      <circle cx={213} cy={90} r={3} className="fill-emerald-400" />
      <circle cx={225} cy={90} r={3} className="fill-amber-400" />
      <circle cx={237} cy={90} r={3} className="fill-slate-400" />
      <Label x={225} y={68}>
        SCADA controller
      </Label>

      <Database x={270} y={270} />
      <Label x={292} y={308} anchor="end">
        Database
      </Label>

      <Pc x={100} y={296} />
      <Pc x={150} y={296} />
      <Label x={125} y={330}>
        PCs &amp; technicians
      </Label>
      <Label x={215} y={258} anchor="end">
        Local network
      </Label>

      <Router x={282} y={190} />

      {/* Internet */}
      <path
        d="M 297 190 H 360 M 400 190 H 453"
        className="stroke-rose-500"
        strokeWidth={5}
      />
      <circle
        cx={380}
        cy={190}
        r={26}
        className="fill-rose-500/15 stroke-rose-500"
        strokeWidth={2}
      />
      <path
        d="M 354 190 H 406 M 380 164 C 366 176 366 204 380 216 C 394 204 394 176 380 164"
        className="fill-none stroke-rose-400"
        strokeWidth={1.5}
      />
      <Label x={380} y={238}>
        Internet
      </Label>
      <Label x={282} y={170}>
        Router
      </Label>
      <Label x={478} y={170}>
        Router
      </Label>

      {/* Office: local network (white) */}
      <path
        d="M 493 190 H 610 M 610 92 V 290 M 610 145 H 668 M 540 250 H 610 M 540 250 V 264 M 580 250 V 264"
        className="fill-none stroke-slate-200"
        strokeWidth={4}
      />
      <Router x={478} y={190} />

      <Database x={610} y={84} />
      <Label x={640} y={78} anchor="start">
        Database
      </Label>

      {/* Office: server */}
      <rect
        x={668}
        y={122}
        width={34}
        height={48}
        rx={3}
        className="fill-slate-800 stroke-slate-400"
        strokeWidth={1.5}
      />
      <path
        d="M 675 134 H 695 M 675 146 H 695 M 675 158 H 695"
        className="stroke-slate-500"
        strokeWidth={2}
      />
      <circle cx={696} cy={164} r={2} className="fill-emerald-400" />
      <Label x={685} y={188}>
        Email &amp; web server
      </Label>

      <Pc x={540} y={276} />
      <Pc x={580} y={276} />
      <Label x={560} y={310}>
        PCs &amp; workers
      </Label>
      <Label x={600} y={212} anchor="end">
        Local network
      </Label>
    </svg>
  );
}
