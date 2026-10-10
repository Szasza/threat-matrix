import type { ClientGameModule } from "@/lib/games/module";

// See the identical comment in `src/lib/rooms/store.ts`: this globalThis
// cache keeps one registry per process and survives Next.js dev-server HMR
// re-evaluation of this module (and of each per-game `module.tsx` that calls
// `registerClientGame` at import time). "Per process" matters less here than
// for the server registry — a browser tab has its own process anyway — but
// it's the same HMR-survival trick, kept for consistency with
// `registry.server.ts`.
//
// A separate file from `registry.server.ts`: see that file's comment for why.
declare global {
  var __clientGameModuleRegistry:
    | Map<string, ClientGameModule<unknown, unknown>>
    | undefined;
}

globalThis.__clientGameModuleRegistry ??= new Map();
const modules = globalThis.__clientGameModuleRegistry;

/**
 * Modules register with their concrete `TState`/`TSettings`, but the
 * registry (and everything downstream of it) only ever needs to treat state
 * as opaque, so it's erased to `unknown` at this boundary. That's the one
 * place a cast is needed; every other file keeps full type safety against
 * its own concrete `GameState`.
 */
export function registerClientGame<TState, TSettings>(
  module: ClientGameModule<TState, TSettings>,
): void {
  modules.set(
    module.id,
    module as unknown as ClientGameModule<unknown, unknown>,
  );
}

export function getClientGameModule(
  id: string,
): ClientGameModule<unknown, unknown> | undefined {
  return modules.get(id);
}
