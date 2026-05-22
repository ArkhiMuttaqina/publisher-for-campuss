---
name: hm-nodejs-cache
description: Use when implementing Redis caching, designing cache-aside pattern, setting TTL strategies, invalidating cache on mutations, or registering ioredis as a Fastify plugin.
---

# Cache (Redis + ioredis)

## Overview

Redis is used as an in-memory cache to reduce database load and improve response times. The cache-aside pattern is the standard approach: check cache first, hit DB on miss, populate cache. Cache invalidation happens explicitly on mutation.

Core principle: Cache is supplementary — the DB is always the source of truth. A cache miss must never break the app. Cache keys must be namespaced and predictable.

## Use this skill when

- caching expensive database queries
- implementing cache-aside pattern in services
- setting up ioredis as a Fastify plugin/decorator
- designing TTL (time-to-live) strategies
- invalidating cache after create/update/delete
- deciding what to cache and for how long

## 1. Dependencies

```bash
npm install ioredis
npm install -D @types/node
```

ioredis is the most battle-tested Redis client for Node.js. It supports clusters, sentinels, pipelining, and Lua scripting.

**References:**

- [ioredis documentation](https://github.com/redis/ioredis) — Redis/ioredis. The standard Redis client for Node.js

## 2. Redis Fastify plugin

Register a single Redis client as a Fastify decorator. Reuse the same connection across the app.

```typescript
// src/shared/plugins/redis.plugin.ts
import fp from "fastify-plugin";
import Redis from "ioredis";
import { env } from "@config/env";
import { logger } from "@shared/utils/logger";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (fastify) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    // Reconnect with exponential backoff
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  redis.on("error", (err) =>
    logger.error("Redis error", { error: err.message }),
  );
  redis.on("connect", () => logger.info("Redis connected"));

  await redis.connect();

  fastify.decorate("redis", redis);

  fastify.addHook("onClose", async () => {
    await redis.quit();
  });
});
```

Using `fastify-plugin` (fp) unwraps Fastify's plugin encapsulation so the `redis` decorator is accessible to all plugins registered after it.

**References:**

- [Fastify — Decorators](https://fastify.dev/docs/latest/Reference/Decorators/) — Fastify official docs.
- [fastify-plugin documentation](https://github.com/fastify/fastify-plugin) — Fastify ecosystem. Breaking plugin encapsulation for shared decorators

## 3. Cache helper utility

Wrap ioredis with a typed, namespaced helper. This is the only file the rest of the app imports for cache operations.

```typescript
// src/shared/cache/cache.ts
import type { Redis } from "ioredis";

export function createCache(redis: Redis, namespace: string) {
  const key = (id: string) => `${namespace}:${id}`;

  return {
    async get<T>(id: string): Promise<T | null> {
      const raw = await redis.get(key(id));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    },

    async set<T>(id: string, value: T, ttlSeconds: number): Promise<void> {
      await redis.set(key(id), JSON.stringify(value), "EX", ttlSeconds);
    },

    async del(id: string): Promise<void> {
      await redis.del(key(id));
    },

    async delPattern(pattern: string): Promise<void> {
      // Use SCAN — never KEYS in production (blocks event loop)
      const stream = redis.scanStream({
        match: `${namespace}:${pattern}`,
        count: 100,
      });
      const pipeline = redis.pipeline();
      let deleted = 0;

      await new Promise<void>((resolve, reject) => {
        stream.on("data", (keys: string[]) => {
          keys.forEach((k) => {
            pipeline.del(k);
            deleted++;
          });
        });
        stream.on("end", () => resolve());
        stream.on("error", reject);
      });

      if (deleted > 0) await pipeline.exec();
    },

    async getOrSet<T>(
      id: string,
      fetchFn: () => Promise<T>,
      ttlSeconds: number,
    ): Promise<T> {
      const cached = await this.get<T>(id);
      if (cached !== null) return cached;

      const fresh = await fetchFn();
      await this.set(id, fresh, ttlSeconds);
      return fresh;
    },
  };
}

export type Cache = ReturnType<typeof createCache>;
```

Key design decisions:

- Namespaced keys (`orders:uuid`) prevent collisions between modules
- `getOrSet` implements the cache-aside pattern in one call
- `delPattern` uses `SCAN` not `KEYS` — `KEYS` blocks the Redis event loop under load
- All values serialized as JSON — supports any serializable TypeScript type
- TTL always required on `set` — prevents unbounded memory growth

**References:**

- [Redis — SCAN command](https://redis.io/docs/latest/commands/scan/) — Redis official docs. Why SCAN over KEYS for pattern matching
- [Redis — SET with EX](https://redis.io/docs/latest/commands/set/) — Redis official docs. Atomic set + expire

## 4. Cache-aside pattern in services

Cache in the service layer, not in repositories or route handlers.

```typescript
// src/modules/order/order.service.ts
import { createCache } from "@shared/cache/cache";
import { orderRepository } from "./order.repository";
import { NotFoundError } from "@shared/errors/not-found.error";
import type { Redis } from "ioredis";
import { env } from "@config/env";

export function createOrderService(
  repo: typeof orderRepository,
  redis: Redis,
) {
  const cache = createCache(redis, "orders");

  return {
    async getById(id: string) {
      return cache.getOrSet(
        id,
        async () => {
          const order = await repo.findById(id);
          if (!order) throw new NotFoundError("Order", id);
          return order;
        },
        env.CACHE_TTL_DEFAULT, // 300 seconds
      );
    },

    async create(dto: CreateOrderDto, userId: string) {
      const order = await repo.create({ ... });
      // No need to pre-populate cache — next read will populate it
      return order;
    },

    async update(id: string, dto: UpdateOrderDto) {
      const order = await repo.update(id, dto);
      // Invalidate stale cache entry
      await cache.del(id);
      return order;
    },

    async delete(id: string) {
      await repo.delete(id);
      // Invalidate
      await cache.del(id);
    },

    async list(query: ListOrdersQuery) {
      // List queries are harder to cache — use short TTL or skip caching
      // Cache key includes query params to avoid incorrect results
      const cacheKey = `list:${JSON.stringify(query)}`;
      return cache.getOrSet(
        cacheKey,
        () => repo.findMany(query),
        60, // 1 minute — shorter TTL for lists
      );
    },
  };
}
```

Cache-aside pattern rules:

1. Read: check cache → miss → read DB → write to cache → return
2. Write (create/update/delete): write to DB → **invalidate** (don't update) cache
3. Always invalidate on mutation — stale cache data is worse than a cache miss

**References:**

- [AWS — Cache-Aside Pattern](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html) — AWS. Cache-aside vs write-through vs read-through
- [Redis — Caching Best Practices](https://redis.io/docs/latest/develop/use/patterns/) — Redis official docs.

## 5. TTL strategy

| Resource type              | Recommended TTL   | Why                                                        |
| -------------------------- | ----------------- | ---------------------------------------------------------- |
| Single resource by ID      | 5 min (300s)      | Frequently read, infrequently changed                      |
| List/search results        | 1 min (60s)       | High invalidation rate — short TTL reduces stale data risk |
| User session/profile       | 15 min (900s)     | Balance between freshness and load reduction               |
| Config / reference data    | 1 hour (3600s)    | Rarely changes — long cache is fine                        |
| Auth token revocation list | Same as token TTL | Must expire when the token expires                         |

Always set a TTL — never use `set(key, value)` without expiry in production.

```typescript
// src/config/env.ts — TTL values from env
CACHE_TTL_DEFAULT: z.coerce.number().default(300),    // 5 minutes
CACHE_TTL_LONG: z.coerce.number().default(3600),       // 1 hour
CACHE_TTL_LIST: z.coerce.number().default(60),         // 1 minute
```

**References:**

- [Redis — Expiring keys](https://redis.io/docs/latest/develop/use/keyspace-notifications/) — Redis official docs.

## 6. Registering cache in route plugins

Pass the redis instance from the Fastify app when constructing services:

```typescript
// src/modules/order/order.route.ts
import type { FastifyPluginAsync } from "fastify";
import { createOrderService } from "./order.service";
import { orderRepository } from "./order.repository";
import { emailQueue } from "@queues/email.queue";

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // Build service once per plugin registration — inject redis from app decorator
  const orderService = createOrderService(
    orderRepository,
    fastify.redis, // Injected by redisPlugin
    emailQueue,
  );

  fastify.get("/", async (request, reply) => {
    return orderService.list(request.query);
  });

  // ... other routes
};
```

**References:**

- [Fastify — Decorators](https://fastify.dev/docs/latest/Reference/Decorators/) — Fastify official docs.

## 7. Cache key design

| Pattern                     | Example key            | Use case                       |
| --------------------------- | ---------------------- | ------------------------------ |
| `{namespace}:{id}`          | `orders:uuid-123`      | Single resource by primary key |
| `{namespace}:list:{hash}`   | `orders:list:a3f9b2`   | Filtered list query            |
| `{namespace}:user:{userId}` | `orders:user:uuid-456` | User-scoped resource list      |
| `{namespace}:config`        | `settings:config`      | Global config/reference data   |

Rules:

- Always namespace by module: `orders:`, `users:`, `products:`
- Predictable and deterministic — same input always produces same key
- Avoid storing sensitive data in keys (e.g., raw email address)
- Keep keys short — Redis keys are stored in memory

## Common Mistakes

| Mistake                                           | Correct Approach                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| Caching in the route handler                      | Cache in the service layer — keeps HTTP layer thin                     |
| `redis.keys('orders:*')` for pattern delete       | Use `SCAN` — `KEYS` blocks the single-threaded Redis event loop        |
| `redis.set(key, value)` without TTL               | Always use `redis.set(key, value, 'EX', ttl)`                          |
| Updating cache after mutation                     | Invalidate (delete) cache after mutation — don't update it             |
| Same TTL for all resource types                   | Short TTL for lists (60s), longer for single resources (300s)          |
| Creating a new Redis connection per request/file  | Single connection registered as Fastify decorator via `redisPlugin`    |
| Storing non-serializable values (class instances) | Only store plain JSON-serializable objects                             |
| Using `redis.flushall()` for invalidation in prod | Use `delPattern` with SCAN — `flushall` deletes ALL keys, incl. others |

## References

- [ioredis documentation](https://github.com/redis/ioredis) — Redis/ioredis. The Node.js Redis client
- [Redis commands reference](https://redis.io/docs/latest/commands/) — Redis official docs. SET, GET, DEL, SCAN, EXPIRE
- [AWS — Caching Strategies](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html) — AWS. Cache-aside, write-through, read-through patterns
- [Redis — Best Practices](https://redis.io/docs/latest/develop/use/patterns/) — Redis official docs.
- [fastify-plugin](https://github.com/fastify/fastify-plugin) — Fastify ecosystem. Plugin encapsulation
- [Fastify — Decorators](https://fastify.dev/docs/latest/Reference/Decorators/) — Fastify official docs.
