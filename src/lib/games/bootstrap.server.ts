import "server-only";

/**
 * Side-effect-only import: each game's `module.server.ts` calls
 * `registerServerGame` at module-evaluation time. Every server-side consumer
 * of the registry (route handlers, server components, server actions)
 * imports this one file instead of importing each game's module directly,
 * so adding a new game only means adding a line here, not touching every
 * consumer.
 */
import "@/lib/decisions-disruptions/module.server";
