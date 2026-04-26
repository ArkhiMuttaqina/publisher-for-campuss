---
name: hm-nodejs-testing
description: Use when writing unit tests, integration tests, setting up Jest or Vitest, mocking repositories, testing Fastify routes with app.inject(), mocking Redis/BullMQ, or configuring Prisma test database.
---

# Testing

## Overview

Tests follow the Testing Trophy model: mostly integration tests, supported by unit tests for pure logic, and a thin layer of E2E tests. Unit tests mock the repository layer. Integration tests use a real test database with Prisma and Fastify's built-in `inject()`. Test files are co-located with source: `{name}.spec.ts` next to `{name}.service.ts`.

Core principle: Write tests. Not too many. Mostly integration. Every service method should have at least one test. Mock at the repository boundary, not deeper.

## Use this skill when

- setting up test framework (Jest or Vitest)
- writing unit tests for services
- writing integration tests with Prisma + Fastify
- mocking dependencies (repositories, Redis, BullMQ queues)
- configuring test database
- deciding what to test and at which level

## 1. Test framework setup

### Vitest (recommended — faster, native ESM + TypeScript)

```bash
npm install -D vitest
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts", "tests/**/*.spec.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/*.type.ts", "src/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@config": path.resolve(__dirname, "./src/config"),
      "@queues": path.resolve(__dirname, "./src/queues"),
    },
  },
});
```

### Jest + ts-jest (alternative)

```bash
npm install -D jest ts-jest @types/jest
```

```typescript
// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@queues/(.*)$": "<rootDir>/src/queues/$1",
  },
  clearMocks: true,
};

export default config;
```

Vitest is significantly faster than Jest for TypeScript projects because it uses Vite's native TypeScript support.

**References:**

- [Vitest documentation](https://vitest.dev/) — StackBlitz. Vite-native test framework, Jest-compatible API
- [Jest documentation](https://jestjs.io/docs/getting-started) — Meta.

## 2. Test file organization

Co-locate test files with source:

```text
src/modules/order/
├── order.route.ts
├── order.service.ts
├── order.repository.ts
├── order.schema.ts
├── order.type.ts
└── order.spec.ts          # Tests for this module
```

For integration tests that span multiple modules or need special setup:

```text
tests/
├── setup.ts               # Global test setup (DB connection, cleanup)
├── helpers.ts             # Shared test utilities (buildApp, token generation)
└── integration/
    └── order-flow.spec.ts # Cross-module integration tests
```

**References:**

- [Kent C. Dodds — Colocation](https://kentcdodds.com/blog/colocation) — Kent C. Dodds, 2019.
- [Node.js Best Practices — Test file names](https://github.com/goldbergyoni/nodebestpractices#44-other-generic-good-testing-hygiene) — Goldbergyoni, Section 4.4

## 3. Unit testing services (mock repository)

```typescript
// src/modules/order/order.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrderService } from "./order.service";
import { NotFoundError } from "@shared/errors/not-found.error";
import { ForbiddenError } from "@shared/errors/forbidden.error";

// Mock repository
const mockRepo = {
  findById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
};

// Mock queue (if service dispatches jobs)
const mockEmailQueue = { add: vi.fn() };

const orderService = createOrderService(mockRepo, mockEmailQueue);

describe("OrderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("should return order when found", async () => {
      const mockOrder = { id: "1", status: "pending", total: 100 };
      mockRepo.findById.mockResolvedValue(mockOrder);

      const result = await orderService.getById("1");

      expect(result).toEqual(mockOrder);
      expect(mockRepo.findById).toHaveBeenCalledWith("1");
    });

    it("should throw NotFoundError when order does not exist", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(orderService.getById("999")).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("should delete pending order", async () => {
      mockRepo.findById.mockResolvedValue({ id: "1", status: "pending" });
      mockRepo.delete.mockResolvedValue(undefined);

      await orderService.delete("1");

      expect(mockRepo.delete).toHaveBeenCalledWith("1");
    });

    it("should reject deletion of non-pending order", async () => {
      mockRepo.findById.mockResolvedValue({ id: "1", status: "shipped" });

      await expect(orderService.delete("1")).rejects.toThrow(ForbiddenError);
    });
  });
});
```

Mock at the repository boundary only. Also mock BullMQ queues as the service boundary — don't let tests actually enqueue jobs.

**References:**

- [Martin Fowler — Unit Test](https://martinfowler.com/bliki/UnitTest.html) — Martin Fowler. Tests that run in isolation from infrastructure
- [Kent C. Dodds — Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) — Kent C. Dodds, 2018.

## 4. Integration testing with Fastify inject + Prisma

Fastify's built-in `app.inject()` makes HTTP-level integration tests fast and port-free — no need for supertest or a running server.

### Test database setup

```bash
# .env.test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myapp_test"
REDIS_URL="redis://localhost:6379/1"   # Use DB 1 for tests, DB 0 for dev
```

```typescript
// tests/setup.ts
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

const prisma = new PrismaClient();

export async function setupTestDb() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
}

export async function cleanupTestDb() {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== "_prisma_migrations") {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }
  }
}

export async function teardownTestDb() {
  await prisma.$disconnect();
}

export { prisma };
```

```typescript
// tests/helpers.ts
import { buildApp } from "@/app";
import jwt from "jsonwebtoken";
import { env } from "@config/env";

export async function buildTestApp() {
  const app = await buildApp();
  await app.ready();
  return app;
}

export function generateTestToken(userId: string, role = "user") {
  return jwt.sign({ userId, role }, env.JWT_SECRET, {
    expiresIn: "1h",
    issuer: "your-app-name",
    audience: "your-app-name",
  });
}
```

### Integration test example

```typescript
// tests/integration/order-flow.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, cleanupTestDb, teardownTestDb, prisma } from "../setup";
import { buildTestApp, generateTestToken } from "../helpers";
import type { FastifyInstance } from "fastify";

describe("Order API (integration)", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();

    const user = await prisma.user.create({
      data: { email: "test@example.com", name: "Test", passwordHash: "..." },
    });
    authToken = generateTestToken(user.id);
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  it("POST /api/orders — should create order", async () => {
    const customer = await prisma.customer.create({
      data: { name: "Test Customer", email: "customer@test.com" },
    });
    const product = await prisma.product.create({
      data: { name: "Widget", price: 10.0 },
    });

    // Use app.inject() instead of supertest — no port needed
    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 3 }],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({
      customerId: customer.id,
      total: 30.0,
    });
    expect(res.json().data.items).toHaveLength(1);

    // Verify in database
    const dbOrder = await prisma.order.findUnique({
      where: { id: res.json().data.id },
    });
    expect(dbOrder).not.toBeNull();
  });

  it("GET /api/orders/:id — should return 404 for non-existent order", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/orders/00000000-0000-0000-0000-000000000000",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });
});
```

Integration tests hit the real Fastify app and real database. They catch problems that unit tests miss: hook ordering, serialization, database constraints.

**References:**

- [Fastify — Testing with inject()](https://fastify.dev/docs/latest/Guides/Testing/) — Fastify official docs. `app.inject()` for HTTP-level testing without network
- [Kent C. Dodds — Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) — Kent C. Dodds, 2019.
- [Prisma Testing Guide](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing) — Prisma official docs.

## 5. Mocking Redis and BullMQ

In unit tests, mock Redis and BullMQ at the service boundary:

```typescript
// Mock Redis cache helper
vi.mock("@shared/cache/cache", () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock BullMQ queue
vi.mock("@queues/email.queue", () => ({
  emailQueue: {
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
  },
}));
```

In integration tests, use a separate Redis DB index (e.g., `DB 1`) to avoid polluting development data. Clean up queues in `beforeEach`:

```typescript
// tests/setup.ts
import Redis from "ioredis";
import { env } from "@config/env";

const redis = new Redis(env.REDIS_URL);

export async function cleanupRedis() {
  await redis.flushdb();
}

export async function teardownRedis() {
  await redis.quit();
}
```

**References:**

- [Vitest — Mocking modules](https://vitest.dev/guide/mocking) — Vitest official docs.
- [BullMQ — Testing](https://docs.bullmq.io/guide/testing) — BullMQ official docs.

## 6. Test naming conventions

```typescript
describe('OrderService', () => {                    // Class/Module name
  describe('getById', () => {                       // Method name
    it('should return order when found', ...);      // Expected behavior
    it('should throw NotFoundError when ...', ...); // Edge case
  });
});
```

This creates readable test output:

```
OrderService
  getById
    ✓ should return order when found
    ✓ should throw NotFoundError when order does not exist
  delete
    ✓ should delete pending order
    ✓ should reject deletion of non-pending order
```

**References:**

- [Roy Osherove — Naming Standards for Unit Tests](https://osherove.com/blog/2005/4/3/naming-standards-for-unit-tests.html) — Roy Osherove, "The Art of Unit Testing"

## 7. What to test at each level

### Testing Trophy (Kent C. Dodds model)

```text
         /  E2E  \          ← Few: critical user flows only
        /----------\
       / Integration\       ← Most: API routes + DB
      /--------------\
     /   Unit Tests   \     ← Many: pure logic, edge cases
    /------------------\
   /   Static Analysis  \   ← TypeScript + ESLint (always on)
  /______________________\
```

| Level       | What to test                                         | Tools                            |
| ----------- | ---------------------------------------------------- | -------------------------------- |
| Static      | Type errors, lint rules                              | TypeScript `strict`, ESLint      |
| Unit        | Service logic, pure functions, edge cases            | Vitest + mocks                   |
| Integration | API routes end-to-end with real DB + Fastify inject  | Vitest + Prisma test DB          |
| E2E         | Critical user flows (signup → create → list)         | Vitest or Playwright             |

Priority: static > integration > unit > E2E

**References:**

- [Kent C. Dodds — The Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) — Kent C. Dodds, 2021.
- [Martin Fowler — Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) — Ham Vocke / Martin Fowler, 2018.

## 8. Test scripts in package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "dotenv -e .env.test -- vitest run tests/integration",
    "test:ci": "dotenv -e .env.test -- vitest run --coverage --reporter=junit"
  }
}
```

## Common Mistakes

| Mistake                                                   | Correct Approach                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Using `supertest` with Fastify                            | Use `app.inject()` — built-in to Fastify, no port or HTTP server needed               |
| Not calling `await app.ready()` in test setup             | Always `await app.ready()` before injecting requests                                  |
| Not calling `await app.close()` in teardown               | Always close app after tests — releases Redis/Prisma connections                      |
| Not mocking BullMQ queues in unit tests                   | Mock `queue.add` at module level — prevent real job dispatch in tests                 |
| Using production Redis DB in tests                        | Use a separate DB index in `.env.test` (`REDIS_URL=redis://localhost:6379/1`)          |
| Mocking Prisma in integration tests                       | Integration tests use real test DB — that's the point                                 |
| Shared test state between test files                      | `beforeEach` cleanup: `cleanupTestDb()` + `cleanupRedis()`                            |
| `test.only` committed to repo                             | Add ESLint rule `no-only-tests` to catch accidental `.only`                           |
| No `clearMocks: true` in config                           | Always: `clearMocks: true` in Vitest/Jest config                                      |

## References

- [Fastify — Testing with inject()](https://fastify.dev/docs/latest/Guides/Testing/) — Fastify official docs. Zero-dependency HTTP testing
- [Kent C. Dodds — Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) — Kent C. Dodds, 2019.
- [Kent C. Dodds — The Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) — Kent C. Dodds, 2021.
- [Martin Fowler — Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) — Ham Vocke / Martin Fowler, 2018.
- [Vitest documentation](https://vitest.dev/) — StackBlitz. Vite-native, Jest-compatible, faster for TypeScript
- [Prisma Testing Guide](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing) — Prisma official docs.
- [BullMQ — Testing](https://docs.bullmq.io/guide/testing) — BullMQ official docs.
- [Node.js Best Practices — Testing](https://github.com/goldbergyoni/nodebestpractices#4-testing-and-overall-quality-practices) — Goldbergyoni, Section 4.
- [Roy Osherove — Naming Standards for Unit Tests](https://osherove.com/blog/2005/4/3/naming-standards-for-unit-tests.html) — Roy Osherove.
