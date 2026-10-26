import { describe, expect, it } from "vitest";
import { ConcurrencyLimiter, DailyQuota, SlidingWindowLimiter } from "@/lib/rate-limit";

describe("SlidingWindowLimiter", () => {
  it("bloque au-delà de la limite puis libère après la fenêtre", () => {
    let now = 0;
    const limiter = new SlidingWindowLimiter(2, 60_000, () => now);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    expect(limiter.check("b").allowed).toBe(true);
    now = 60_001;
    expect(limiter.check("a").allowed).toBe(true);
  });
});

describe("DailyQuota", () => {
  it("compte des unités, rembourse et se réinitialise chaque jour UTC", () => {
    let now = Date.UTC(2026, 0, 1, 23, 0, 0);
    const quota = new DailyQuota(5, () => now);
    expect(quota.consume("a", 4).allowed).toBe(true);
    const denied = quota.consume("a", 2);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBe(3600);
    quota.refund("a", 3);
    expect(quota.remaining("a")).toBe(4);
    now = Date.UTC(2026, 0, 2, 0, 0, 1);
    expect(quota.remaining("a")).toBe(5);
  });
});

describe("ConcurrencyLimiter", () => {
  it("limite les tâches simultanées et libère une seule fois", () => {
    const limiter = new ConcurrencyLimiter(1);
    const release = limiter.acquire("a");
    expect(release).not.toBeNull();
    expect(limiter.acquire("a")).toBeNull();
    release!();
    release!();
    const again = limiter.acquire("a");
    expect(again).not.toBeNull();
    expect(limiter.acquire("a")).toBeNull();
  });
});
