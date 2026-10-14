/**
 * Sliding-window rate limiter (in memory, per server instance).
 * Good enough to stop one phone from spamming the join form; for a multi-instance deployment
 * this would move to Redis or a Postgres table.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records a hit for `key` and returns whether it is allowed. */
  check(key: string, now: number = Date.now()): { ok: boolean; retryAfterSec: number } {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { ok: false, retryAfterSec: Math.ceil((recent[0] + this.windowMs - now) / 1000) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(since);
    return { ok: true, retryAfterSec: 0 };
  }

  private prune(since: number) {
    for (const [key, times] of this.hits) {
      if (times.every((t) => t <= since)) this.hits.delete(key);
    }
  }
}
