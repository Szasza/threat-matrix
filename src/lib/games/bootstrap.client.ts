/**
 * Side-effect-only import: each game's `module.tsx` calls
 * `registerClientGame` at module-evaluation time. Every client-side consumer
 * of the registry (`RoomTemplate`, `GameSetupPanel`) imports this one file
 * instead of importing each game's module directly, so adding a new game
 * only means adding a line here, not touching every consumer.
 */
import "@/lib/decisions-disruptions/module";
