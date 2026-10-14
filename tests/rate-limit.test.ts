import { describe, expect, it } from "vitest";
import { RateLimiter } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  it("allows up to the limit inside the window, then blocks", () => {
    const rl = new RateLimiter(3, 60_000);
    const t0 = 1_000_000;
    expect(rl.check("ip", t0).ok).toBe(true);
    expect(rl.check("ip", t0 + 1).ok).toBe(true);
    expect(rl.check("ip", t0 + 2).ok).toBe(true);
    const blocked = rl.check("ip", t0 + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(60);
  });
  it("frees up as old hits leave the window", () => {
    const rl = new RateLimiter(2, 10_000);
    rl.check("ip", 0);
    rl.check("ip", 5_000);
    expect(rl.check("ip", 9_000).ok).toBe(false);
    expect(rl.check("ip", 10_001).ok).toBe(true);
  });
  it("tracks keys separately", () => {
    const rl = new RateLimiter(1, 10_000);
    expect(rl.check("a", 0).ok).toBe(true);
    expect(rl.check("b", 0).ok).toBe(true);
    expect(rl.check("a", 1).ok).toBe(false);
  });
});
