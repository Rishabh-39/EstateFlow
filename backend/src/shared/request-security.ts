/**
 * EstateFlow M6: dependency-free security contracts.
 * Memory limiter is deliberately scoped to a single NestJS process; production
 * with multiple processes should use a shared backing store (e.g. Redis).
 */
export type LimitedRoute = 'LOGIN' | 'REGISTER' | 'ENQUIRY' | 'ADVISORY';
export type RatePolicy = { limit: number; windowMs: number };
export type LimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export const RATE_POLICIES: Readonly<Record<LimitedRoute, RatePolicy>> = {
  LOGIN: { limit: 12, windowMs: 15 * 60_000 },
  REGISTER: { limit: 8, windowMs: 60 * 60_000 },
  ENQUIRY: { limit: 24, windowMs: 60 * 60_000 },
  ADVISORY: { limit: 60, windowMs: 60 * 60_000 },
};

/** Match only exact public write routes, never arbitrary URL prefixes. */
export function publicWriteRoute(method: string, originalUrl: string): LimitedRoute | null {
  if (method.toUpperCase() !== 'POST') return null;
  const path = originalUrl.split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/auth/login') return 'LOGIN';
  if (path === '/auth/register') return 'REGISTER';
  if (path === '/enquiries') return 'ENQUIRY';
  if (path === '/enquiries/chat/advisory') return 'ADVISORY';
  return null;
}

export function isPrivateResponsePath(originalUrl: string): boolean {
  const path = originalUrl.split('?')[0];
  return /^\/(?:auth|staff|bookings|booking-holds|payments|enquiries)(?:\/|$)/.test(path);
}

/** A simple fixed-window counter, intentionally bounded for local MVP deployment. */
export class RequestLimiter {
  private readonly store = new Map<string, { hits: number; resetAt: number }>();
  constructor(private readonly maxKeys = 10_000) {
    if (!Number.isSafeInteger(maxKeys) || maxKeys < 1) throw new Error('maxKeys must be positive');
  }
  take(key: string, policy: RatePolicy, now = Date.now()): LimitResult {
    if (!key || key.length > 512) throw new Error('Invalid rate-limit key');
    if (!Number.isSafeInteger(policy.limit) || policy.limit < 1 || !Number.isSafeInteger(policy.windowMs) || policy.windowMs < 1)
      throw new Error('Invalid rate-limit policy');
    if (!Number.isFinite(now) || now < 0) throw new Error('Invalid rate-limit timestamp');
    let entry = this.store.get(key);
    if (!entry || now >= entry.resetAt) {
      if (!entry && this.store.size >= this.maxKeys) this.cleanExpired(now);
      // Fail closed if there are still too many distinct clients, rather than allow unlimited requests.
      if (!entry && this.store.size >= this.maxKeys) return {allowed:false, remaining:0, retryAfterSeconds:60};
      entry = {hits: 0, resetAt: now + policy.windowMs};
      this.store.set(key, entry);
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    if (entry.hits >= policy.limit) return {allowed:false, remaining:0, retryAfterSeconds};
    entry.hits += 1;
    return {allowed:true, remaining:policy.limit - entry.hits, retryAfterSeconds:0};
  }
  cleanExpired(now = Date.now()): void {
    for (const [key, record] of this.store) if (now >= record.resetAt) this.store.delete(key);
  }
  get size(): number { return this.store.size; }
}
