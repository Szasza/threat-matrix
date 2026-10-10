import type { ServerGameModule } from "@/lib/games/module";

// See the identical comment in `src/lib/rooms/store.ts`: this globalThis
// cache keeps one registry per process — required in production so Server
// Actions, pages and Route Handlers share state — and survives Next.js
// dev-server HMR re-evaluation of this module (and of each per-game
// `module.server.ts` that calls `registerServerGame` at import time).
//
// A separate file from `registry.client.ts`, not just a separate map in one
// file: see `module.ts`'s comment on why the server/client halves of a
// `GameModule` are registered from different files. Splitting the registry
// itself the same way (rather than combining both maps in one `registry.ts`)
// also means each half is only ever loaded in the one environment that
// actually calls its functions — the browser bundle (`registry.client.ts`)
// never pulls this file in at all, instead of pulling it in but calling
// only half of it.
declare global {
  var __serverGameModuleRegistry:
    | Map<string, ServerGameModule<unknown, unknown>>
    | undefined;
}

globalThis.__serverGameModuleRegistry ??= new Map();
const modules = globalThis.__serverGameModuleRegistry;

/**
 * Modules register with their concrete `TState`/`TSettings`, but the
 * registry (and everything downstream of it) only ever needs to treat state
 * as opaque, so it's erased to `unknown` at this boundary. That's the one
 * place a cast is needed; every other file keeps full type safety against
 * its own concrete `GameState`.
 */
export function registerServerGame<TState, TSettings>(
  module: ServerGameModule<TState, TSettings>,
): void {
  modules.set(
    module.id,
    module as unknown as ServerGameModule<unknown, unknown>,
  );
}

export function getServerGameModule(
  id: string,
): ServerGameModule<unknown, unknown> | undefined {
  return modules.get(id);
}
