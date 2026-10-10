import type { ClientGameModule, ServerGameModule } from "@/lib/games/module";

// See the identical comment in `src/lib/rooms/store.ts`: this globalThis
// cache keeps one registry per process — required in production so Server
// Actions, pages and Route Handlers share state — and survives Next.js
// dev-server HMR re-evaluation of this module (and of each per-game module
// file that calls `registerServerGame`/`registerClientGame` at import time).
//
// Two separate maps, not one: see `module.ts`'s comment on why the
// server/client halves of a `GameModule` are registered from different
// files. Keeping two registries (instead of one map of combined objects)
// means a client bundle only ever needs to import `registry.ts` plus each
// game's `module.tsx` — never a game's `module.server.ts`.
declare global {
  var __serverGameModuleRegistry:
    | Map<string, ServerGameModule<unknown, unknown>>
    | undefined;
  var __clientGameModuleRegistry:
    | Map<string, ClientGameModule<unknown, unknown>>
    | undefined;
}

globalThis.__serverGameModuleRegistry ??= new Map();
globalThis.__clientGameModuleRegistry ??= new Map();
const serverModules = globalThis.__serverGameModuleRegistry;
const clientModules = globalThis.__clientGameModuleRegistry;

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
  serverModules.set(
    module.id,
    module as unknown as ServerGameModule<unknown, unknown>,
  );
}

export function getServerGameModule(
  id: string,
): ServerGameModule<unknown, unknown> | undefined {
  return serverModules.get(id);
}

export function registerClientGame<TState, TSettings>(
  module: ClientGameModule<TState, TSettings>,
): void {
  clientModules.set(
    module.id,
    module as unknown as ClientGameModule<unknown, unknown>,
  );
}

export function getClientGameModule(
  id: string,
): ClientGameModule<unknown, unknown> | undefined {
  return clientModules.get(id);
}
