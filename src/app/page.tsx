import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-50">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/50 sm:p-12">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
          Threat Matrix
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn complex security challenges into gamified experiences.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          A digital hub for security, where you can explore, play, and learn from a variety of security-focused games.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/games"
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-400"
          >
            Browse games
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
