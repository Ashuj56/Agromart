import Redis from 'ioredis';

class InMemoryCache {
  private store = new Map<string, { val: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.val;
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, { val: value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    // Simple regex conversion for redis-style wildcard '*'
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched: string[] = [];
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now > v.expiresAt) {
        this.store.delete(k);
      } else if (regex.test(k)) {
        matched.push(k);
      }
    }
    return matched;
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }
}

function normalizeRedisUrl(input?: string): string | null {
  if (!input) return null;
  let s = input.trim();
  const cliMatch = s.match(/(rediss?:\/\/[^\s"']+)/);
  if (cliMatch) {
    s = cliMatch[1];
  }
  if (s.includes('upstash.io') && s.startsWith('redis://')) {
    s = s.replace('redis://', 'rediss://');
  }
  return s.startsWith('redis://') || s.startsWith('rediss://') ? s : null;
}

const activeUrl = normalizeRedisUrl(process.env.REDIS_URL);
let redisInstance: any;

if (activeUrl) {
  try {
    const client = new Redis(activeUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      },
      lazyConnect: false,
    });

    client.on('error', (err) => {
      console.warn('⚠️  [Redis Connection Warning]:', err.message);
    });

    client.on('connect', () => {
      console.log('🚀 [Redis] Connected successfully to Upstash Redis cluster');
    });

    redisInstance = client;
  } catch (err: any) {
    console.warn('[Redis] Failed to initialize client, falling back to in-memory cache:', err.message);
    redisInstance = new InMemoryCache();
  }
} else {
  console.log('ℹ️  [Cache] Using in-memory cache (REDIS_URL not configured)');
  redisInstance = new InMemoryCache();
}

export const redis = redisInstance;
