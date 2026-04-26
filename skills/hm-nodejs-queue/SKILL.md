---
name: hm-nodejs-queue
description: Use when implementing background jobs with BullMQ, defining queues, creating workers, handling retries, scheduling recurring jobs, or monitoring job status with Bull Board.
---

# Queue (BullMQ + Redis)

## Overview

BullMQ is the standard Node.js job queue, backed by Redis. Use queues for any work that should not block the HTTP response: emails, notifications, report generation, external API calls, data processing. Workers run jobs asynchronously in separate processes or the same process.

Core principle: Queues decouple producers (services that add jobs) from consumers (workers that process them). A slow worker never slows down the HTTP layer.

## Use this skill when

- offloading slow operations from HTTP handlers (email, SMS, PDF, webhooks)
- scheduling recurring jobs (cron)
- implementing delayed jobs (retry after N minutes)
- managing job retries with exponential backoff
- monitoring queue health and job statuses
- structuring queue and worker files

## 1. Dependencies

```bash
npm install bullmq ioredis
```

BullMQ is the successor to Bull. It is built on Redis Streams and has first-class TypeScript support.

**References:**

- [BullMQ documentation](https://docs.bullmq.io/) — BullMQ official docs.
- [BullMQ — Migration from Bull](https://docs.bullmq.io/guide/migration-from-bull) — BullMQ official docs.

## 2. File structure

Each logical queue has two files:

```text
src/queues/
├── email.queue.ts        # Queue instance + job type definitions
├── email.worker.ts       # Worker + job processor functions
├── report.queue.ts
└── report.worker.ts
```

Queue instances are shared across producers (services) and the worker setup.

## 3. Queue definition

```typescript
// src/queues/email.queue.ts
import { Queue } from "bullmq";
import Redis from "ioredis";
import { env } from "@config/env";

// Shared Redis connection for all queues — never create per-queue connections
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false, // Required by BullMQ
});

// Typed job data
export interface EmailJobData {
  to: string;
  subject: string;
  templateId: string;
  variables: Record<string, string>;
}

export type EmailJobName =
  | "order-confirmation"
  | "password-reset"
  | "welcome"
  | "invoice-ready";

export const emailQueue = new Queue<EmailJobData, void, EmailJobName>("email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000, // Start with 1s, then 2s, 4s
    },
    removeOnComplete: { count: 1000 }, // Keep last 1000 completed jobs
    removeOnFail: { count: 5000 }, // Keep last 5000 failed jobs
  },
});
```

Key decisions:

- `maxRetriesPerRequest: null` is required by BullMQ for the blocking connection
- `removeOnComplete` and `removeOnFail` prevent unbounded Redis memory growth
- Typed job data and job names provide compile-time safety at `queue.add()` call sites

**References:**

- [BullMQ — Queues](https://docs.bullmq.io/guide/queues) — BullMQ official docs.
- [BullMQ — Connection](https://docs.bullmq.io/guide/connections) — BullMQ official docs. Why `maxRetriesPerRequest: null` is required

## 4. Worker definition

```typescript
// src/queues/email.worker.ts
import { Worker, type Job } from "bullmq";
import {
  redisConnection,
  type EmailJobData,
  type EmailJobName,
} from "./email.queue";
import { emailService } from "@modules/notification/email.service";
import { logger } from "@shared/utils/logger";

async function processEmailJob(
  job: Job<EmailJobData, void, EmailJobName>,
): Promise<void> {
  logger.info("Processing email job", { jobId: job.id, name: job.name });

  switch (job.name) {
    case "order-confirmation":
      await emailService.sendOrderConfirmation(job.data);
      break;

    case "password-reset":
      await emailService.sendPasswordReset(job.data);
      break;

    case "welcome":
      await emailService.sendWelcome(job.data);
      break;

    case "invoice-ready":
      await emailService.sendInvoice(job.data);
      break;

    default:
      // TypeScript exhaustive check — unreachable if all names are handled
      throw new Error(`Unknown job name: ${job.name}`);
  }
}

export const emailWorker = new Worker<EmailJobData, void, EmailJobName>(
  "email",
  processEmailJob,
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs simultaneously
  },
);

emailWorker.on("completed", (job) => {
  logger.info("Email job completed", { jobId: job.id, name: job.name });
});

emailWorker.on("failed", (job, err) => {
  logger.error("Email job failed", {
    jobId: job?.id,
    name: job?.name,
    error: err.message,
    attemptsMade: job?.attemptsMade,
  });
});

emailWorker.on("error", (err) => {
  logger.error("Email worker error", { error: err.message });
});
```

Key decisions:

- Use a `switch` on `job.name` — TypeScript enforces exhaustive handling of all job names
- Log completed and failed events for monitoring
- `concurrency: 5` — tune to your CPU/memory budget and external service rate limits
- Workers can run in the same process as the HTTP server (for small apps) or a separate process

**References:**

- [BullMQ — Workers](https://docs.bullmq.io/guide/workers) — BullMQ official docs. Worker configuration, concurrency

## 5. Starting workers

### Same process (small apps)

```typescript
// src/index.ts
import { buildApp } from "./app";
import { emailWorker } from "./queues/email.worker";
import { env } from "./config/env";
import { logger } from "./shared/utils/logger";

async function start() {
  const app = await buildApp();

  // Workers start automatically when instantiated
  // Register graceful shutdown
  const shutdown = async () => {
    logger.info("Graceful shutdown...");
    await emailWorker.close();
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info(`Server running on port ${env.PORT}`);
}

start();
```

### Separate worker process (larger apps / Docker)

```typescript
// src/worker.ts — separate entry point
import { emailWorker } from "./queues/email.worker";
import { reportWorker } from "./queues/report.worker";
import { logger } from "./shared/utils/logger";

logger.info("Workers started");

const shutdown = async () => {
  logger.info("Shutting down workers...");
  await Promise.all([emailWorker.close(), reportWorker.close()]);
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

Separate worker process is preferred in production — it scales independently of the HTTP layer and a worker crash doesn't bring down the API.

**References:**

- [BullMQ — Running Workers in Separate Processes](https://docs.bullmq.io/patterns/separate-processes) — BullMQ official docs.

## 6. Dispatching jobs from services

```typescript
// src/modules/order/order.service.ts
import { emailQueue } from "@queues/email.queue";

export const orderService = {
  async create(dto: CreateOrderDto, userId: string) {
    const order = await orderRepository.create({ ... });

    // Fire-and-forget background job
    await emailQueue.add("order-confirmation", {
      to: dto.customerEmail,
      subject: "Your order is confirmed",
      templateId: "order-confirmation-v2",
      variables: {
        orderId: order.id,
        total: order.total.toString(),
      },
    });

    return order;
  },
};
```

Rules:

- `await queue.add(...)` — always await the add call to catch Redis connection errors
- Job payload must be plain JSON-serializable (no class instances, no Functions)
- Services only dispatch jobs; workers process them — no processing logic in services

**References:**

- [BullMQ — Adding Jobs](https://docs.bullmq.io/guide/queues/adding-bulks) — BullMQ official docs.

## 7. Delayed and scheduled jobs

```typescript
// Delayed job — process after 5 minutes
await emailQueue.add(
  "order-reminder",
  { to: "user@example.com", ... },
  { delay: 5 * 60 * 1000 }, // milliseconds
);

// Recurring job with cron (in QueueScheduler or via repeat)
await emailQueue.add(
  "weekly-digest",
  { templateId: "weekly-digest" },
  { repeat: { cron: "0 9 * * MON" } }, // Every Monday at 9am
);
```

For recurring jobs, use a dedicated setup function called once at startup:

```typescript
// src/queues/scheduled-jobs.ts
import { emailQueue } from "./email.queue";

export async function setupScheduledJobs() {
  // Remove existing repeat jobs before re-adding (prevent duplicates on restart)
  const repeatableJobs = await emailQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await emailQueue.removeRepeatableByKey(job.key);
  }

  await emailQueue.add(
    "weekly-digest",
    { templateId: "weekly-digest" },
    { repeat: { cron: "0 9 * * MON" }, jobId: "weekly-digest" },
  );
}
```

**References:**

- [BullMQ — Delayed Jobs](https://docs.bullmq.io/guide/jobs/delayed) — BullMQ official docs.
- [BullMQ — Repeatable Jobs](https://docs.bullmq.io/guide/jobs/repeatable) — BullMQ official docs.

## 8. Job retry strategy

Configure retries at the queue level (default) or per job:

```typescript
// Queue-level defaults (applies to all jobs in this queue)
const emailQueue = new Queue("email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000, // 1s, 2s, 4s
    },
  },
});

// Per-job override (for a job that needs more retries)
await emailQueue.add(
  "invoice-ready",
  { ... },
  {
    attempts: 5,
    backoff: { type: "fixed", delay: 30_000 }, // Retry every 30s
  },
);
```

When a worker throws, BullMQ automatically schedules a retry based on the backoff config. After all attempts are exhausted, the job moves to the `failed` state.

**References:**

- [BullMQ — Retrying Failing Jobs](https://docs.bullmq.io/guide/retrying-failing-jobs) — BullMQ official docs.
- [BullMQ — Backoff](https://docs.bullmq.io/guide/jobs/backoff) — BullMQ official docs. Exponential vs fixed backoff

## 9. Monitoring with Bull Board

Bull Board provides a web UI to inspect queues, jobs, and retry failed jobs.

```bash
npm install @bull-board/fastify @bull-board/api
```

```typescript
// src/shared/plugins/bull-board.plugin.ts
import fp from "fastify-plugin";
import { FastifyAdapter } from "@bull-board/fastify";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { emailQueue } from "@queues/email.queue";
import { env } from "@config/env";

export const bullBoardPlugin = fp(async (fastify) => {
  // Only expose in non-production, or protect with auth
  if (env.NODE_ENV === "production") return;

  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  serverAdapter.setBasePath("/admin/queues");
  await fastify.register(serverAdapter.registerPlugin(), {
    prefix: "/admin/queues",
  });
});
```

In production, protect the Bull Board route with `authenticate` + `authorize("admin")` preHandlers.

**References:**

- [Bull Board documentation](https://github.com/felixmosh/bull-board) — felixmosh. Queue monitoring UI for BullMQ

## 10. Graceful shutdown

Always drain workers before process exit to avoid orphaned jobs:

```typescript
process.on("SIGTERM", async () => {
  // close() waits for current jobs to finish, then stops accepting new ones
  await emailWorker.close();
  await redisConnection.quit();
  process.exit(0);
});
```

`worker.close()` completes currently running jobs before shutting down. Never use `process.exit()` directly in a worker process without closing workers first.

**References:**

- [BullMQ — Graceful shutdown](https://docs.bullmq.io/patterns/graceful-shutdown) — BullMQ official docs.

## Common Mistakes

| Mistake                                              | Correct Approach                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Not setting `maxRetriesPerRequest: null`             | Required by BullMQ — without it, ioredis throws on blocking commands      |
| Creating a new Redis connection per queue            | One shared `redisConnection` used by all queues                           |
| No `removeOnComplete` / `removeOnFail`               | Always set limits — unbounded job storage fills Redis memory              |
| Processing heavy logic in the HTTP handler           | Dispatch to queue — return `{ jobId }` to client for status polling       |
| `process.exit()` without `worker.close()`            | Always await `worker.close()` before exiting — prevents job corruption    |
| Non-serializable job data (class instances, Buffers) | Use plain JSON objects as job payload                                     |
| Adding recurring jobs without removing duplicates    | Remove existing repeat jobs before re-adding on startup                   |
| No error logging on worker `failed` event            | Always attach `worker.on('failed', ...)` listener with structured logging |

## References

- [BullMQ documentation](https://docs.bullmq.io/) — BullMQ official docs. Comprehensive guide to queues, workers, jobs, retries
- [BullMQ — Connection](https://docs.bullmq.io/guide/connections) — BullMQ official docs. Redis connection configuration
- [BullMQ — Graceful shutdown](https://docs.bullmq.io/patterns/graceful-shutdown) — BullMQ. Draining workers on SIGTERM
- [Bull Board](https://github.com/felixmosh/bull-board) — felixmosh. Queue monitoring UI
- [ioredis documentation](https://github.com/redis/ioredis) — Redis/ioredis. Node.js Redis client
- [Twelve-Factor App — XI. Processes](https://12factor.net/processes) — Adam Wiggins. Stateless and disposable processes
- [Designing Data-Intensive Applications — Ch. 11: Stream Processing](https://dataintensive.net/) — Martin Kleppmann. Message queues and event-driven architectures
