// W8 Fase 0 — per-user cost guard (PRD §9). LLM calls are billable, so each user gets a
// fixed-window quota. In-memory (single-process dev server; a shared store is a W10 prod
// concern). The clock is injectable so tests are deterministic without faking timers.

export interface RateLimitOptions {
  max?: number; // calls allowed per window
  windowMs?: number; // window length
  now?: () => number; // injectable clock (tests)
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec?: number;
}

const DEFAULT_MAX = 20;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Consume one unit of `userId`'s quota. Returns ok:false when the window is exhausted. */
export function rateLimit(userId: string, opts: RateLimitOptions = {}): RateLimitResult {
  const max = opts.max ?? DEFAULT_MAX;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const now = (opts.now ?? Date.now)();

  const b = buckets.get(userId);
  if (!b || now >= b.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (b.count >= max) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, remaining: max - b.count };
}

/** Test/maintenance helper — clear all quota state. */
export function resetRateLimits(): void {
  buckets.clear();
}
