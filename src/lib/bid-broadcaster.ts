/**
 * bid-broadcaster.ts
 *
 * In-process Node.js EventEmitter used to broadcast live bid events to SSE
 * subscribers.  One emitter instance is shared across all requests via the
 * global singleton pattern (safe with Next.js hot-reload).
 *
 * Designed for Railway / any persistent Node.js server where a single process
 * serves all requests.  For multi-instance deployments, replace with a Redis
 * Pub/Sub adapter.
 */

import { EventEmitter } from "events";

export interface BidEvent {
  type: "bid";
  id: string;
  bidderName: string;
  amount: number;
  timestamp: string;
}

export interface ClosedEvent {
  type: "closed";
  result: "sold" | "unsold";
  winningBid?: number;
  winner?: string;
}

export type LiveEvent = BidEvent | ClosedEvent | { type: "ping" };

// ── Singleton ─────────────────────────────────────────────────────────────────

const globalRef = global as unknown as { _paikariEmitter: EventEmitter };

const emitter: EventEmitter = globalRef._paikariEmitter ?? new EventEmitter();
emitter.setMaxListeners(25_000); // 15 K bidders × safety buffer

if (!globalRef._paikariEmitter) globalRef._paikariEmitter = emitter;

// ── Public API ────────────────────────────────────────────────────────────────

/** Broadcast an event to all SSE subscribers for `lotCode`. */
export function emitLotEvent(lotCode: string, event: LiveEvent): void {
  emitter.emit(`lot:${lotCode.toUpperCase()}`, event);
}

/**
 * Subscribe to live events for `lotCode`.
 * Returns an unsubscribe function — call it on cleanup to free the listener.
 */
export function subscribeLot(
  lotCode: string,
  handler: (event: LiveEvent) => void,
): () => void {
  const channel = `lot:${lotCode.toUpperCase()}`;
  emitter.on(channel, handler);
  return () => emitter.off(channel, handler);
}
