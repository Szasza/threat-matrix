export const HEARTBEAT_INTERVAL_MS = 30_000;
export const STALE_AFTER_MS = HEARTBEAT_INTERVAL_MS * 2; // 2 missed heartbeats
export const SWEEP_TICK_MS = 15_000;
/** How often an open SSE stream pings — and re-confirms its participant. */
export const SSE_KEEPALIVE_MS = 15_000;
/**
 * How long a participant whose page unloaded (tab closed *or* reloaded) is
 * kept before the sweep removes them — overriding `STALE_AFTER_MS`, so even a
 * slow reload keeps its seat (and the game master role). The trade-off: a
 * closed tab lingers in the roster for 2-2.25 minutes.
 * Must exceed `SSE_KEEPALIVE_MS`, so an open stream always re-confirms its
 * participant before a stray "departing" mark can expire.
 */
export const LEAVE_GRACE_MS = 120_000;
