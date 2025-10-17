type Store = {
  incr(key: string, expireSeconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    expireSeconds?: number,
  ): Promise<'OK' | null>;
};

class InMemoryStore implements Store {
  private cache = new Map<
    string,
    { value: string; expiresAt?: number; counter?: number }
  >();

  private now() {
    return Date.now();
  }

  async incr(key: string, expireSeconds: number) {
    const current = this.cache.get(key);
    const expiresAt = this.now() + expireSeconds * 1000;

    if (!current || (current.expiresAt && current.expiresAt <= this.now())) {
      this.cache.set(key, { value: '1', expiresAt, counter: 1 });
      return 1;
    }

    const counter = (current.counter ?? Number(current.value) ?? 0) + 1;
    this.cache.set(key, { value: counter.toString(), expiresAt, counter });
    return counter;
  }

  async get(key: string) {
    const current = this.cache.get(key);
    if (!current) return null;

    if (current.expiresAt && current.expiresAt <= this.now()) {
      this.cache.delete(key);
      return null;
    }

    return current.value;
  }

  async set(key: string, value: string, expireSeconds?: number) {
    const expiresAt =
      typeof expireSeconds === 'number'
        ? this.now() + expireSeconds * 1000
        : undefined;
    this.cache.set(key, { value, expiresAt });
    return 'OK';
  }
}

// Provides a Redis-compatible interface for local development.
export const redis: Store = new InMemoryStore();

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

export const rateLimitBuckets: Record<
  'anonymous' | 'authenticated' | 'api_key',
  RateLimitConfig
> = {
  anonymous: { limit: 100, windowSeconds: 60 * 60 },
  authenticated: { limit: 1000, windowSeconds: 60 * 60 },
  api_key: { limit: 10000, windowSeconds: 60 * 60 },
};

export async function isRateLimited(
  key: string,
  config: RateLimitConfig,
): Promise<boolean> {
  const count = await redis.incr(key, config.windowSeconds);
  return count > config.limit;
}
