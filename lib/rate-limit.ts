/**
 * Limiteurs en mémoire, suffisants pour une instance unique.
 * Pour un déploiement multi-instances, remplacez-les par une implémentation
 * partagée (Redis, Upstash…) respectant les mêmes interfaces.
 */

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Fenêtre glissante : au plus `limit` événements par `windowMs` pour une clé. */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  check(key: string): RateLimitResult {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      const retryAfterMs = this.windowMs - (now - recent[0]!);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    this.prune(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private prune(now: number) {
    if (this.hits.size < 10_000) return;
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
  }
}

/** Quota journalier (jour UTC) exprimé en unités (ex. nombre d'images). */
export class DailyQuota {
  private day = "";
  private readonly used = new Map<string, number>();

  constructor(
    private readonly limit: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Réserve `amount` unités si le quota le permet. */
  consume(key: string, amount: number): RateLimitResult {
    this.rollover();
    const current = this.used.get(key) ?? 0;
    if (current + amount > this.limit) {
      return { allowed: false, retryAfterSeconds: this.secondsUntilReset() };
    }
    this.used.set(key, current + amount);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Restitue des unités réservées (ex. génération échouée côté fournisseur). */
  refund(key: string, amount: number) {
    this.rollover();
    const current = this.used.get(key) ?? 0;
    this.used.set(key, Math.max(0, current - amount));
  }

  remaining(key: string): number {
    this.rollover();
    return Math.max(0, this.limit - (this.used.get(key) ?? 0));
  }

  private rollover() {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.used.clear();
    }
  }

  private secondsUntilReset(): number {
    const now = new Date(this.now());
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
  }
}

/** Compte les générations en cours par clé pour limiter la concurrence. */
export class ConcurrencyLimiter {
  private readonly active = new Map<string, number>();

  constructor(private readonly limit: number) {}

  acquire(key: string): (() => void) | null {
    const current = this.active.get(key) ?? 0;
    if (current >= this.limit) return null;
    this.active.set(key, current + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const value = (this.active.get(key) ?? 1) - 1;
      if (value <= 0) this.active.delete(key);
      else this.active.set(key, value);
    };
  }
}
