---
name: hm-nodejs-database
description: Use when designing Prisma schemas, running migrations, writing queries, implementing soft delete, pagination, or avoiding N+1 query problems.
---

# Database (Prisma)

## Overview

Prisma is the canonical ORM. Schema lives in `prisma/schema.prisma`. Migrations are managed via `prisma migrate`. Queries go through repository layer, never called directly from controllers or services.

Core principle: Schema is the source of truth. Migrate in dev with `migrate dev`, deploy to production with `migrate deploy`. Never use `db push` in production.

## Use this skill when

- designing or modifying Prisma schema
- running migrations
- writing efficient queries (avoiding N+1)
- implementing soft delete
- implementing pagination (cursor or offset)
- optimizing database performance

## 1. Schema conventions

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Order {
  id          String      @id @default(uuid())
  orderNumber String      @unique @map("order_number")
  status      OrderStatus @default(PENDING)
  total       Decimal     @db.Decimal(12, 2)
  notes       String?

  // Relations
  customerId  String      @map("customer_id")
  customer    Customer    @relation(fields: [customerId], references: [id])
  items       OrderItem[]

  // Audit fields
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  deletedAt   DateTime?   @map("deleted_at")

  @@map("orders")
  @@index([customerId])
  @@index([status])
  @@index([createdAt])
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
```

Naming rules:

| Element | Prisma (code) | Database (mapped) |
|---------|--------------|-------------------|
| Model | `PascalCase` — `OrderItem` | `snake_case` — `order_items` via `@@map` |
| Field | `camelCase` — `customerId` | `snake_case` — `customer_id` via `@map` |
| Enum | `PascalCase` — `OrderStatus` | Stored as-is |
| Enum value | `UPPER_SNAKE_CASE` — `PENDING` | Stored as-is |

Always use `@map` / `@@map` to keep TypeScript-idiomatic field names in code while using database-idiomatic column/table names in SQL. This is a Prisma-recommended practice for maintaining clean boundaries.

**References:**
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) — Prisma official docs. Model/field conventions, `@map`/`@@map` usage
- [Prisma Data Model — Naming Conventions](https://www.prisma.io/docs/orm/prisma-schema/data-model/models#naming-conventions) — Prisma official docs

## 2. Standard audit fields

Every model should include:

```prisma
createdAt   DateTime    @default(now()) @map("created_at")
updatedAt   DateTime    @updatedAt @map("updated_at")
```

For soft-delete models, add:

```prisma
deletedAt   DateTime?   @map("deleted_at")
```

`@updatedAt` is automatically managed by Prisma — it updates the timestamp on every `.update()` call. `createdAt` is set once via `@default(now())`.

**References:**
- [Prisma `@updatedAt` attribute](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#updatedat) — Prisma official docs

## 3. Migration workflow

```bash
# Development — create and apply migration
npx prisma migrate dev --name add-order-status

# Production — apply pending migrations (no interactive prompts)
npx prisma migrate deploy

# Generate Prisma Client after schema changes (auto-runs with migrate dev)
npx prisma generate

# Reset database (development only — drops all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

| Command | Environment | Effect |
|---------|------------|--------|
| `migrate dev` | Development | Creates migration file + applies + generates client |
| `migrate deploy` | Production/CI | Applies pending migrations only |
| `migrate reset` | Development | Drops DB + re-applies all migrations |
| `db push` | Prototyping only | Pushes schema without migration file — **never in production** |

The distinction between `migrate dev` and `migrate deploy` is critical. `migrate dev` is interactive and may prompt for destructive changes. `migrate deploy` is non-interactive and safe for CI/CD pipelines.

**References:**
- [Prisma Migrate — Development and Production](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production) — Prisma official docs
- [Prisma Migrate in CI/CD](https://www.prisma.io/docs/orm/prisma-migrate/workflows/deploy-migration) — Prisma official docs

## 4. Query patterns

### findUnique vs findFirst

```typescript
// findUnique — uses @id or @unique field. Returns null if not found.
const order = await prisma.order.findUnique({
  where: { id: 'uuid-here' },
});

// findFirst — uses any field with a filter. Returns first match or null.
const order = await prisma.order.findFirst({
  where: { orderNumber: 'ORD-001', deletedAt: null },
});
```

Use `findUnique` when querying by primary key or unique constraint — it's optimized by Prisma's query engine. Use `findFirst` only when the filter doesn't map to a unique constraint.

### select vs include

```typescript
// include — load full relation
const order = await prisma.order.findUnique({
  where: { id },
  include: { items: true, customer: true },
});
// Returns: order with ALL fields + ALL item fields + ALL customer fields

// select — pick specific fields (more efficient)
const order = await prisma.order.findUnique({
  where: { id },
  select: {
    id: true,
    orderNumber: true,
    total: true,
    customer: {
      select: { id: true, name: true, email: true },
    },
  },
});
// Returns: only selected fields — smaller payload, faster query
```

Prefer `select` when you don't need all fields. This reduces data transferred from DB and prevents accidentally exposing sensitive fields (e.g., `passwordHash`).

**References:**
- [Prisma Client — Select and Include](https://www.prisma.io/docs/orm/prisma-client/queries/select-fields) — Prisma official docs

## 5. Avoiding N+1 queries

N+1 is the most common performance problem in ORM-backed applications.

```typescript
// BAD — N+1: 1 query for orders + N queries for customers
const orders = await prisma.order.findMany();
for (const order of orders) {
  const customer = await prisma.customer.findUnique({
    where: { id: order.customerId },
  });
  // ... use customer
}

// GOOD — Single query with include
const orders = await prisma.order.findMany({
  include: { customer: true },
});

// GOOD — Explicit batch query
const orders = await prisma.order.findMany();
const customerIds = [...new Set(orders.map((o) => o.customerId))];
const customers = await prisma.customer.findMany({
  where: { id: { in: customerIds } },
});
const customerMap = new Map(customers.map((c) => [c.id, c]));
```

Rule of thumb: if you're calling Prisma inside a loop, you have an N+1 problem. Use `include`, `select` with nested relations, or batch queries with `{ in: [...] }`.

**References:**
- [Prisma — Solving N+1 Problem](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance#solving-n1) — Prisma official docs
- [Designing Data-Intensive Applications — Chapter 2: Data Models](https://dataintensive.net/) — Martin Kleppmann. Relational vs document models and query patterns

## 6. Soft delete pattern

Implement soft delete via Prisma middleware:

```typescript
// src/shared/utils/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware: intercept delete → set deletedAt
prisma.$use(async (params, next) => {
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }
  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    if (params.args.data !== undefined) {
      params.args.data.deletedAt = new Date();
    } else {
      params.args.data = { deletedAt: new Date() };
    }
  }
  return next(params);
});

// Middleware: auto-filter soft-deleted records
prisma.$use(async (params, next) => {
  if (params.action === 'findFirst' || params.action === 'findMany') {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
  }
  return next(params);
});

export { prisma };
```

For Prisma 5+, consider using the [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions) API instead of middleware, as it provides better type safety:

```typescript
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async delete({ args }) {
        return prisma[args.model].update({
          where: args.where,
          data: { deletedAt: new Date() },
        });
      },
    },
  },
});
```

**References:**
- [Prisma Middleware](https://www.prisma.io/docs/orm/prisma-client/client-extensions/middleware) — Prisma official docs
- [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions) — Prisma official docs (recommended for Prisma 5+)
- [Soft Delete — Wikipedia](https://en.wikipedia.org/wiki/Soft_delete) — General concept overview

## 7. Pagination patterns

### Offset-based (simple, good for UI pages)

```typescript
async findMany(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: { deletedAt: null },
    }),
    prisma.order.count({ where: { deletedAt: null } }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Cursor-based (efficient, good for infinite scroll / large datasets)

```typescript
async findMany(cursor?: string, limit: number = 20) {
  const data = await prisma.order.findMany({
    take: limit + 1,  // Fetch one extra to check if there's more
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,  // Skip the cursor item itself
    }),
    orderBy: { createdAt: 'desc' },
    where: { deletedAt: null },
  });

  const hasMore = data.length > limit;
  if (hasMore) data.pop();  // Remove the extra item

  return {
    data,
    meta: {
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    },
  };
}
```

| Pattern | Best for | Limitation |
|---------|---------|-----------|
| Offset | Admin panels, numbered pages | Slow on large tables (OFFSET scans rows) |
| Cursor | Infinite scroll, real-time feeds, APIs | Can't jump to arbitrary page |

For general-purpose APIs, start with offset-based. Switch specific endpoints to cursor-based when table size exceeds ~100k rows or when offset performance degrades.

**References:**
- [Prisma Pagination](https://www.prisma.io/docs/orm/prisma-client/queries/pagination) — Prisma official docs. Offset vs cursor-based with Prisma
- [Slack Engineering — Evolving API Pagination at Slack](https://slack.engineering/evolving-api-pagination-at-slack/) — Real-world cursor pagination case study
- [Use the Index, Luke — Pagination Done the Right Way](https://use-the-index-luke.com/no-offset) — Markus Winand. Why offset pagination degrades on large datasets

## 8. Index strategy

Add indexes for fields that appear in `WHERE`, `ORDER BY`, or `JOIN` clauses:

```prisma
model Order {
  // ... fields

  @@index([customerId])           // Foreign key — always index
  @@index([status])               // Frequently filtered
  @@index([createdAt])            // Frequently sorted
  @@index([status, createdAt])    // Composite for filtered + sorted queries
  @@unique([orderNumber])         // Business key — already indexed by @unique
}
```

Rules:
- Always index foreign keys (`customerId`, `productId`)
- Index fields used in `WHERE` clauses
- Composite indexes: most selective field first
- Don't over-index: each index slows down writes
- Use `EXPLAIN ANALYZE` to verify index usage on slow queries

**References:**
- [Prisma — Indexes](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes) — Prisma official docs
- [Use the Index, Luke](https://use-the-index-luke.com/) — Markus Winand. Comprehensive SQL indexing guide

## Common Mistakes

| Mistake | Correct Approach |
|---------|-----------------|
| `db push` in production | Use `migrate deploy` — `db push` doesn't create migration files |
| No `@map` / `@@map` — DB columns in camelCase | Map to `snake_case` for database: `@map("customer_id")`, `@@map("orders")` |
| Prisma queries in controller | All queries in repository layer |
| Calling Prisma inside a loop | Use `include` or batch query with `{ in: [...] }` |
| No index on foreign keys | Always `@@index([foreignKeyField])` |
| `findFirst` on unique fields | Use `findUnique` — it's optimized for unique lookups |
| Hard delete without soft delete consideration | Add `deletedAt` field + middleware for reversible deletes |
| `migrate dev` in production CI | `migrate dev` is interactive — use `migrate deploy` in CI/production |

## References

- [Prisma Official Documentation](https://www.prisma.io/docs) — Prisma. Authoritative source for schema, client, migrate, and performance
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) — Prisma official docs. Model conventions, `@map`/`@@map`, field types
- [Prisma Migrate Workflows](https://www.prisma.io/docs/orm/prisma-migrate/workflows) — Prisma official docs. Dev vs production migration flow
- [Use the Index, Luke](https://use-the-index-luke.com/) — Markus Winand. SQL indexing, pagination, and query optimization
- [Designing Data-Intensive Applications](https://dataintensive.net/) — Martin Kleppmann, O'Reilly, 2017. Data modeling, query patterns, consistency, and replication
- [Slack Engineering — Evolving API Pagination](https://slack.engineering/evolving-api-pagination-at-slack/) — Slack. Real-world cursor vs offset pagination decision
