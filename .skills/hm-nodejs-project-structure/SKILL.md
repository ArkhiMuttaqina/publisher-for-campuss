---
name: hm-nodejs-project-structure
description: Use when creating a new Node.js/Fastify project, defining folder structure, setting up TypeScript configuration, or deciding file/module organization conventions.
---

# Project Structure

## Overview

Node.js + Fastify + TypeScript projects use module-based folder layout where each business domain lives in its own directory under `src/modules/`. Shared concerns (plugins, utils, types) live in `src/shared/`. Background jobs live in `src/queues/`.

Core principle: Structure by business domain (modules), not by technical role. Each module is self-contained with its own routes, services, DTOs, and schemas.

## Use this skill when

- scaffolding a new Fastify + TypeScript project
- adding a new business module
- deciding where a file should live
- setting up `tsconfig.json`, `package.json`, or entry points
- reviewing or refactoring folder structure

## 1. Canonical folder layout

```text
project-root/
├── src/
│   ├── index.ts                  # Entry point: starts HTTP server
│   ├── app.ts                    # Fastify app factory: plugins, modules, error handler
│   ├── modules/
│   │   └── {module-name}/
│   │       ├── {module-name}.module.ts        # Composition root: wires deps, registers routes
│   │       ├── {module-name}.controller.ts    # HTTP handlers (parse input → call service → send response)
│   │       ├── {module-name}.route.ts         # Route definitions (paths, methods, hooks → controller)
│   │       ├── {module-name}.service.ts       # Business logic layer
│   │       ├── {module-name}.repository.ts    # Data access layer (Prisma queries)
│   │       ├── {module-name}.schema.ts        # Zod validation schemas + inferred DTO types
│   │       ├── {module-name}.type.ts          # TypeScript interfaces/types (domain entities)
│   │       ├── {module-name}.constant.ts      # Module-specific constants
│   │       └── {module-name}.spec.ts          # Co-located tests
│   ├── queues/
│   │   ├── {queue-name}.queue.ts             # BullMQ Queue instance
│   │   └── {queue-name}.worker.ts            # BullMQ Worker + job processor
│   ├── shared/
│   │   ├── plugins/
│   │   │   ├── jwt.plugin.ts                 # @fastify/jwt setup + authenticate decorator
│   │   │   ├── rate-limit.plugin.ts          # @fastify/rate-limit setup
│   │   │   ├── redis.plugin.ts               # ioredis client as Fastify decorator
│   │   │   └── storage.plugin.ts             # S3Client as Fastify decorator
│   │   ├── hooks/
│   │   │   ├── auth.hook.ts                  # JWT preHandler hook
│   │   │   └── validate.hook.ts              # Zod validation preHandler hook
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   ├── not-found.error.ts
│   │   │   └── validation.error.ts
│   │   ├── cache/
│   │   │   └── cache.ts                      # Redis cache helpers (get/set/del/invalidate)
│   │   ├── storage/
│   │   │   └── storage.ts                    # S3 upload/download/presign helpers
│   │   ├── utils/
│   │   │   ├── logger.ts                     # Pino logger config + standalone instance
│   │   │   └── pagination.ts
│   │   └── types/
│   │       ├── fastify.d.ts          # Fastify type augmentation (request.user, etc.)
│   │       └── common.type.ts
│   └── config/
│       ├── env.ts                    # Zod-validated env variables
│       ├── database.ts
│       └── cors.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/                            # Integration/E2E tests (if not co-located)
│   └── setup.ts
├── tsconfig.json
├── package.json
├── .env
├── .env.example
└── .gitignore
```

This structure follows the "Structure by components" principle from the Node.js Best Practices guide, which recommends organizing code by self-contained business modules rather than technical layers (all routes in one folder, all services in another).

**References:**

- [Node.js Best Practices — Structure by components](https://github.com/goldbergyoni/nodebestpractices#1-project-structure-practices) — Goldbergyoni, Section 1.1
- [Fastify — Getting Started](https://fastify.dev/docs/latest/Guides/Getting-Started/) — Fastify official docs

## 2. Naming conventions

| Element             | Convention               | Example                           |
| ------------------- | ------------------------ | --------------------------------- |
| Folders             | `kebab-case`             | `order-item/`, `user-profile/`    |
| Files               | `kebab-case` with suffix | `order-item.route.ts`             |
| Classes             | `PascalCase`             | `OrderItemService`                |
| Functions/variables | `camelCase`              | `getOrderById`, `orderService`    |
| Constants           | `UPPER_SNAKE_CASE`       | `MAX_RETRY_COUNT`                 |
| Interfaces/Types    | `PascalCase`             | `CreateOrderDto`, `OrderResponse` |
| Env variables       | `UPPER_SNAKE_CASE`       | `DATABASE_URL`, `JWT_SECRET`      |

File suffix conventions:

| Suffix           | Purpose                                                  |
| ---------------- | -------------------------------------------------------- |
| `.module.ts`     | Composition root — wires deps, registers routes          |
| `.controller.ts` | HTTP handlers — parse input, call service, send response |
| `.route.ts`      | Route definitions — paths, methods, hooks → controller   |
| `.service.ts`    | Business logic layer                                     |
| `.repository.ts` | Data access layer (Prisma queries)                       |
| `.schema.ts`     | Zod validation schemas + inferred DTO types              |
| `.type.ts`       | TypeScript interfaces and types (domain entities)        |
| `.spec.ts`       | Test file (co-located with source)                       |
| `.plugin.ts`     | Fastify plugin (shared infrastructure)                   |
| `.hook.ts`       | Fastify lifecycle hook (auth, validation)                |
| `.queue.ts`      | BullMQ Queue instance definition                         |
| `.worker.ts`     | BullMQ Worker + job processor                            |
| `.constant.ts`   | Module-specific constants                                |
| `.error.ts`      | Custom error classes                                     |

Consistent file suffixes are recommended by the Node.js Best Practices guide as part of clear separation of concerns. The kebab-case convention aligns with npm package naming rules and avoids case-sensitivity issues across OS environments.

**References:**

- [Node.js Best Practices — Separate app definition from network concerns](https://github.com/goldbergyoni/nodebestpractices#14-separate-express-app-and-server) — Goldbergyoni, Section 1.4
- [npm package naming rules](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#name) — npm official docs

## 3. Entry point separation

Separate app creation from server start. The `buildApp()` factory returns a Fastify instance, which enables testing without binding to a port (use `app.inject()`).

```typescript
// src/app.ts — Fastify app factory
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { corsConfig } from "./config/cors";
import { env } from "./config/env";
import { errorHandler } from "./shared/errors/error-handler";
import { notFoundHandler } from "./shared/errors/not-found-handler";
import { orderModule } from "./modules/order/order.module";
import { userModule } from "./modules/user/user.module";
import { jwtPlugin } from "./shared/plugins/jwt.plugin";
import { redisPlugin } from "./shared/plugins/redis.plugin";

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
  });

  // Error handling — registered FIRST so fp() plugins inherit the handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Security plugins
  await app.register(helmet);
  await app.register(cors, corsConfig);
  await app.register(rateLimit, { max: 100, timeWindow: "15 minutes" });

  // Infrastructure plugins
  await app.register(redisPlugin);
  await app.register(jwtPlugin);

  // Modules
  await app.register(orderModule, { prefix: "/api/orders" });
  await app.register(userModule, { prefix: "/api/users" });

  return app;
}
```

```typescript
// src/index.ts — Server start only
import { buildApp } from "./app";
import { env } from "./config/env";
import { logger } from "./shared/utils/logger";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    logger.info(`Server running on port ${env.PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

start();
```

This pattern is explicitly recommended by the Fastify docs and reinforced by the Twelve-Factor App methodology.

**References:**

- [Fastify — Testing](https://fastify.dev/docs/latest/Guides/Testing/) — Fastify official docs. `buildApp()` pattern for injectable app
- [The Twelve-Factor App — VII. Port binding](https://12factor.net/port-binding)

## 4. Environment configuration with validation

Never trust raw `process.env`. Validate at startup using Zod. Split connection config into individual fields (host, port, user, password) — not opaque URLs — for readability, rotation, and environment-specific defaults.

```typescript
// src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  // Redis — separate fields (not a URL) for readability
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),

  // Cache TTL defaults (seconds)
  CACHE_TTL_DEFAULT: z.coerce.number().default(300), // 5 minutes
  CACHE_TTL_LONG: z.coerce.number().default(3600), // 1 hour

  // Database — separate fields (not a URL)
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default("postgres"),
  DB_NAME: z.string().default("hm_nodejs_db"),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default("*"),

  // Logger
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("debug"),
  LOG_RETENTION_DAYS: z.coerce.number().default(14),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;

// Derived database URL for Prisma / other DB clients
export const databaseUrl = `postgresql://${env.DB_USER}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
```

If validation fails, the app crashes immediately with a clear message — no silent misconfiguration at runtime.

**References:**

- [The Twelve-Factor App — III. Config](https://12factor.net/config) — Adam Wiggins, Heroku
- [Node.js Best Practices — Validate config at startup](https://github.com/goldbergyoni/nodebestpractices#814-validate-config-values-when-they-are-loaded) — Goldbergyoni, Section 8.14
- [Zod documentation](https://zod.dev/) — Colin McDonnell

## 5. `tsconfig.json` essentials

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"],
      "@modules/*": ["./src/modules/*"],
      "@shared/*": ["./src/shared/*"],
      "@config/*": ["./src/config/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Key decisions:

- `strict: true` — enforced by TypeScript team as recommended default for all new projects
- `ES2022` target — covers all LTS Node.js versions (18+), enables native `Error.cause`
- `Node16` module — correct for Node.js projects (NOT `commonjs`, NOT `esnext`)
- Path aliases — reduce deep relative imports (`../../../shared/utils/logger`). Do NOT use `baseUrl` (deprecated in TypeScript 5.9+); `paths` alone is sufficient
- Always use `node:` prefix for Node.js built-in modules: `import fs from 'node:fs'` not `'fs'`. Linters enforce this as best practice to distinguish built-ins from npm packages

**References:**

- [TypeScript Handbook — tsconfig reference](https://www.typescriptlang.org/tsconfig) — TypeScript official docs
- [TypeScript `strict` mode](https://www.typescriptlang.org/tsconfig#strict) — TypeScript official docs, recommended for all new projects
- [Node.js `module: "Node16"`](https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16) — TypeScript module resolution docs

## 6. Module creation checklist

When adding a new business module:

- [ ] Create folder: `src/modules/{module-name}/`
- [ ] Create `{module-name}.module.ts` — Fastify plugin (composition root)
- [ ] Create `{module-name}.controller.ts` — HTTP handlers
- [ ] Create `{module-name}.route.ts` — route definitions (paths, hooks → controller)
- [ ] Create `{module-name}.service.ts` — business logic
- [ ] Create `{module-name}.repository.ts` — Prisma queries
- [ ] Create `{module-name}.schema.ts` — Zod input validation + inferred DTO types
- [ ] Create `{module-name}.type.ts` — TypeScript interfaces (domain entities)
- [ ] Register module in `src/app.ts`
- [ ] Add Prisma model to `prisma/schema.prisma` (if new entity)
- [ ] Run `npx prisma migrate dev` (if schema changed)
- [ ] Create `{module-name}.spec.ts` — at least one test

## 7. Module sizing guide

The 7-file module template is the **default** for this boilerplate. Not every file is mandatory from day one — some are created only when complexity demands it.

### Always create (core files)

| File             | Reason                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| `.module.ts`     | Composition root: wires deps, registers routes. Only export to `app.ts` |
| `.controller.ts` | HTTP handlers: parse input → call service → send response               |
| `.route.ts`      | Route definitions: paths, methods, hooks → controller                   |
| `.service.ts`    | Business logic: rules, orchestration, no HTTP concerns                  |
| `.schema.ts`     | Zod schemas + inferred DTO types (`z.infer<>`)                          |

### Create when needed (optional files)

| File             | Create when…                                                         |
| ---------------- | -------------------------------------------------------------------- |
| `.repository.ts` | Module has database access (Prisma queries)                          |
| `.type.ts`       | Domain types differ from Zod-inferred DTOs, or shared across modules |
| `.constant.ts`   | Module has its own magic values or enums                             |
| `.spec.ts`       | Always recommended, but can start with integration tests in `tests/` |

### When to split files further

| Trigger                           | Action                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| Service > 150 LOC                 | Split by business capability: `order.service.ts` + `order.fulfillment.service.ts`   |
| Controller > 100 LOC              | Split by feature or auth level: `order.controller.ts` + `order.admin.controller.ts` |
| Schema > 50 LOC or 10+ schemas    | Split by operation: `order.create.schema.ts`, `order.update.schema.ts`              |
| Repository has complex aggregates | Separate `order.query.ts` for read-heavy queries                                    |

### Decision rules

- **Start with all core files.** The ceremony is small; the separation pays dividends at 5+ endpoints.
- **Skip `.type.ts`** if `z.infer<typeof schema>` covers all your types. Add it later when domain models diverge from transport DTOs.
- **Skip `.repository.ts`** only for modules that don't touch the database (e.g., pure API proxies).
- **Never skip `.controller.ts`** — even for 1 endpoint, keeping HTTP parsing separate from business logic is non-negotiable.

## Common Mistakes

| Mistake                                              | Correct Approach                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Flat `src/routes/`, `src/services/` structure        | Module-based: `src/modules/{name}/{name}.module.ts`                            |
| Using `PascalCase` or `camelCase` for file names     | Always `kebab-case`: `order-item.route.ts`                                     |
| Raw `process.env.PORT` without validation            | Zod schema in `src/config/env.ts`, validate at startup                         |
| Single `index.ts` that creates app AND starts server | Separate `buildApp()` factory in `app.ts` from `start()` in `index.ts`         |
| Putting shared hooks inside a module folder          | Shared hooks in `src/shared/hooks/`                                            |
| Deep relative imports `../../../shared/utils/logger` | Path aliases: `@shared/utils/logger`                                           |
| `module: "commonjs"` in tsconfig                     | `module: "Node16"` for Node.js projects                                        |
| No `.env.example` in repo                            | Always commit `.env.example` with all required keys (no values)                |
| `import fs from 'fs'` (bare built-in)                | `import fs from 'node:fs'` — always use `node:` prefix                         |
| `baseUrl` in tsconfig without `ignoreDeprecations`   | Remove `baseUrl` entirely — `paths` works without it in TypeScript 5.0+        |
| BullMQ workers in `src/modules/`                     | Workers in `src/queues/` — they are infrastructure, not business modules       |
| Redis client instantiated per-file                   | Single `redis.plugin.ts` registers one client via Fastify decorator            |
| Mixing handler logic + wiring in `route.ts`          | Separate: `controller.ts` (handlers), `module.ts` (wiring), `route.ts` (paths) |

## 7. Logger with Pino

Fastify ships with Pino as its built-in logger. Use Fastify's native `logger` option instead of a separate logging library. Use `pino-pretty` in development for human-readable output, JSON in production for structured log aggregation.

```bash
npm install pino-pretty -D
```

```typescript
// src/shared/utils/logger.ts
import pino from "pino";
import { env } from "../../config/env.js";

export const loggerConfig = {
  level: env.NODE_ENV === "production" ? "info" : "debug",
  ...(env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
};

// Standalone logger for use outside Fastify (startup, scripts, workers)
export const logger = pino(loggerConfig);
```

```typescript
// src/app.ts — Pass pino config to Fastify
import Fastify from "fastify";
import { loggerConfig } from "./shared/utils/logger.js";
import { env } from "./config/env.js";

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === "test" ? false : loggerConfig,
  });

  // ...
  return app;
}
```

Key decisions:

- Fastify's built-in Pino integration — request/response logging, request IDs, serializers all handled automatically
- `pino-pretty` for dev only (`devDependencies`) — human-readable colored output
- JSON in production — structured logs for log aggregation tools (ELK, Datadog, CloudWatch)
- `logger: false` in test — no log noise during tests
- Use `app.log` inside route handlers for request-scoped logging with request IDs
- Use standalone `logger` export for code outside Fastify (workers, startup scripts)
- Child loggers via `app.log.child({ module: "payment" })` for subsystem tracing

**References:**

- [Fastify — Logging](https://fastify.dev/docs/latest/Reference/Logging/) — Fastify official docs
- [Pino documentation](https://getpino.io/) — Pino official docs
- [pino-pretty](https://github.com/pinojs/pino-pretty) — Pino. Human-readable dev transport

## 8. Storage with S3-compatible OSS

Use `@aws-sdk/client-s3` for S3-compatible object storage (AWS S3, MinIO, DigitalOcean Spaces, Alibaba OSS). Register as a Fastify plugin via decorator.

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Add env vars to `src/config/env.ts`:

```typescript
S3_BUCKET: z.string(),
S3_REGION: z.string().default("us-east-1"),
S3_ENDPOINT: z.string().url().optional(),         // Set for MinIO / DO Spaces / Alibaba
S3_ACCESS_KEY_ID: z.string(),
S3_SECRET_ACCESS_KEY: z.string(),
S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false), // true for MinIO
```

```typescript
// src/shared/plugins/storage.plugin.ts
import fp from "fastify-plugin";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";

export const storagePlugin = fp(async (fastify) => {
  const s3 = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  fastify.decorate("s3", s3);
  fastify.addHook("onClose", () => s3.destroy());
});
```

```typescript
// src/shared/storage/storage.ts — Helper functions
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";

export function createStorage(s3: S3Client) {
  const bucket = env.S3_BUCKET;

  return {
    async upload(key: string, body: Buffer | Uint8Array, contentType: string) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return key;
    },

    async getSignedUrl(key: string, expiresIn = 3600) {
      return getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn },
      );
    },

    async delete(key: string) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
```

Key decisions:

- Single `S3Client` instance shared via Fastify decorator — avoid per-request instantiation
- `forcePathStyle: true` for MinIO — virtual-hosted style doesn't work with local endpoints
- `endpoint` override for non-AWS providers (MinIO, DO Spaces, Alibaba Cloud OSS)
- Helper returns clean `upload/getSignedUrl/delete` — services never import AWS SDK directly
- Presigned URLs for downloads — avoid proxying large files through the app server

**References:**

- [AWS SDK v3 — S3Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/) — AWS official docs
- [@aws-sdk/s3-request-presigner](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/) — AWS official docs

## 8. ESLint and pre-commit hooks

Use ESLint with typescript-eslint (flat config) + Husky + lint-staged to enforce code quality on every commit.

```bash
npm install -D eslint @eslint/js typescript-eslint husky lint-staged
npx husky init
```

Add `"prepare": "husky"` to `package.json` scripts. Add lint-staged config to `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "tsc --noEmit --skipLibCheck"
  ]
}
```

Update `.husky/pre-commit` to run `npx lint-staged`.

### ESLint flat config

Use `eslint/config`'s `defineConfig()` — **not** the deprecated `tseslint.config()`. Use `...tseslint.configs.recommendedTypeChecked` (spread array, not wrap).

```javascript
// eslint.config.js
// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "path",
                "fs",
                "os",
                "child_process",
                "crypto",
                "http",
                "https",
                "url",
                "stream",
                "util",
                "events",
                "buffer",
              ],
              message: "Use 'node:' prefix instead (e.g., 'node:path')",
            },
          ],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    files: ["**/*.spec.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    files: ["eslint.config.js"],
    ...tseslint.configs.disableTypeChecked,
  },
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
]);
```

### Separate tsconfig for ESLint type-aware linting

The build `tsconfig.json` has `rootDir: "./src"`, so test files and config files cannot be included in it. Create a separate `tsconfig.eslint.json` that ESLint uses:

```json
// tsconfig.eslint.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*", "vitest.config.ts"]
}
```

Key decisions:

- `tsconfig.json` — for building only, includes `src/**/*`, has `rootDir: "./src"`, `outDir: "./dist"`
- `tsconfig.eslint.json` — for ESLint only, extends build tsconfig, no `outDir`, `rootDir: "."` so tests/ are included
- `defineConfig()` from `eslint/config` replaces the deprecated `tseslint.config()` variadic overload
- Spread `...tseslint.configs.recommendedTypeChecked` — it's an array; wrapping in `tseslint.config()` uses the deprecated overload
- ESLint config itself (`eslint.config.js`) applies `disableTypeChecked` to avoid type-aware errors on the config file

## References

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices) — Goldbergyoni et al. Industry-standard guide: module-based structure (#1.1), config validation (#8.14), app/server separation (#1.4)
- [Fastify — Getting Started](https://fastify.dev/docs/latest/Guides/Getting-Started/) — Fastify official docs. Plugin system, lifecycle hooks, route registration
- [Fastify — Testing](https://fastify.dev/docs/latest/Guides/Testing/) — Fastify official docs. `buildApp()` factory + `app.inject()` pattern
- [BullMQ documentation](https://docs.bullmq.io/) — BullMQ. Queue and Worker organization patterns
- [ioredis documentation](https://github.com/redis/ioredis) — ioredis. Redis client for Node.js
- [The Twelve-Factor App](https://12factor.net/) — Adam Wiggins (Heroku). Config separation (III), port binding (VII)
- [TypeScript tsconfig reference](https://www.typescriptlang.org/tsconfig) — TypeScript official docs. strict mode, module resolution, path aliases
- [Zod documentation](https://zod.dev/) — Colin McDonnell. Runtime validation for env config and request schemas
