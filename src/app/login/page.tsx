import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/80">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
            Threat Matrix
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to continue to your workspace.
          </p>
        </div>

        <form className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Keep me signed in
            </label>
            <Link
              href="/"
              className="font-medium text-sky-600 hover:text-sky-500"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{" "}
          <Link
            href="/"
            className="font-semibold text-sky-600 hover:text-sky-500"
          >
            Return home
          </Link>
        </p>
      </div>
    </main>
  );
}
