---
name: hm-nodejs-error-handling
description: Use when implementing error handling, creating custom error classes, setting up Fastify setErrorHandler, formatting Zod validation errors, or designing consistent error response shapes.
---

# Error Handling

## Overview

Errors are handled centrally via Fastify's `setErrorHandler`. Custom error classes form a hierarchy rooted at `AppError`. Services throw domain errors; the error handler maps them to HTTP responses. Stack traces are never exposed in production.

Core principle: Throw specific error types from services, catch centrally in one error handler, return consistent response shapes. Never swallow errors silently.

## Use this skill when

- creating custom error classes
- setting up global error handling via `setErrorHandler`
- formatting validation errors from Zod
- deciding where to catch errors (route handler vs error handler)
- ensuring consistent error response format

## 1. Error class hierarchy

```typescript
// src/shared/errors/app-error.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
```

```typescript
// src/shared/errors/not-found.error.ts
import { AppError } from "./app-error";

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND");
  }
}
```

```typescript
// src/shared/errors/validation.error.ts
import { AppError } from "./app-error";
import type { ZodIssue } from "zod";

export class ValidationError extends AppError {
  public readonly details: ZodIssue[];

  constructor(details: ZodIssue[]) {
    super("Validation failed", 400, "VALIDATION_ERROR");
    this.details = details;
  }
}
```

```typescript
// src/shared/errors/unauthorized.error.ts
import { AppError } from "./app-error";

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}
```

```typescript
// src/shared/errors/forbidden.error.ts
import { AppError } from "./app-error";

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}
```

```typescript
// src/shared/errors/conflict.error.ts
import { AppError } from "./app-error";

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}
```

The `isOperational` flag distinguishes between expected errors (validation, not found, unauthorized) and unexpected programming errors. Operational errors are safe to send to the client. Non-operational errors should be logged and masked with a generic 500 response.

**References:**

- [Node.js Best Practices — Distinguish operational vs programmer errors](https://github.com/goldbergyoni/nodebestpractices#212-distinguish-operational-vs-programmer-errors) — Goldbergyoni, Section 2.1.2
- [Joyent — Error Handling in Node.js](https://www.joyent.com/node-js/production/design/errors) — Joyent. Canonical Node.js error taxonomy

## 2. Fastify error handler (setErrorHandler)

```typescript
// src/shared/errors/error-handler.ts
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./app-error";
import { ValidationError } from "./validation.error";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logger } from "@shared/utils/logger";
import { env } from "@config/env";

export function errorHandler(
  err: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  // Zod validation errors
  if (err instanceof ValidationError) {
    return reply.status(400).send({
      error: {
        code: err.code,
        message: err.message,
        details: err.details.map((d) => ({
          field: d.path.join("."),
          message: d.message,
        })),
      },
    });
  }

  // Known operational errors
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Prisma known errors
  if (err instanceof PrismaClientKnownRequestError) {
    return handlePrismaError(err, reply);
  }

  // Fastify native errors (e.g., body limit exceeded → 413)
  if ("statusCode" in err && typeof err.statusCode === "number") {
    return reply.status(err.statusCode).send({
      error: {
        code: "REQUEST_ERROR",
        message: err.message,
      },
    });
  }

  // Unknown / programmer errors
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  return reply.status(500).send({
    error: {
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
      ...(env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
}

function handlePrismaError(
  err: PrismaClientKnownRequestError,
  reply: FastifyReply,
) {
  switch (err.code) {
    case "P2002": // Unique constraint violation
      return reply.status(409).send({
        error: {
          code: "CONFLICT",
          message: `Duplicate value for: ${(err.meta?.target as string[])?.join(", ")}`,
        },
      });
    case "P2025": // Record not found
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Record not found",
        },
      });
    default:
      return reply.status(500).send({
        error: {
          code: "DATABASE_ERROR",
          message: "A database error occurred",
        },
      });
  }
}
```

### Not found handler

```typescript
// src/shared/errors/not-found-handler.ts
import type { FastifyRequest, FastifyReply } from "fastify";

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(404).send({
    error: {
      code: "NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found`,
    },
  });
}
```

### Registering in app.ts

```typescript
// src/app.ts
app.setErrorHandler(errorHandler);
app.setNotFoundHandler(notFoundHandler);
```

Key rules:

- Register `setErrorHandler` and `setNotFoundHandler` **after** all route plugins
- Never leak stack traces or internal details in production
- Log all unhandled errors with full context
- Map Prisma errors to meaningful HTTP responses
- Handle Fastify native errors (body too large → 413) via `statusCode` check

**References:**

- [Fastify — Error Handling](https://fastify.dev/docs/latest/Reference/Server/#seterrorhandler) — Fastify official docs. `setErrorHandler` signature and behavior
- [Fastify — setNotFoundHandler](https://fastify.dev/docs/latest/Reference/Server/#setnotfoundhandler) — Fastify official docs.
- [Node.js Best Practices — Catch errors centrally](https://github.com/goldbergyoni/nodebestpractices#24-catch-errors-centrally-not-within-a-middleware) — Goldbergyoni, Section 2.4
- [Prisma Error Reference](https://www.prisma.io/docs/orm/reference/error-reference) — Prisma official docs. Error codes P2002, P2025, etc.

## 3. Consistent error response shape

All error responses follow one shape, inspired by RFC 7807 (Problem Details for HTTP APIs):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "items", "message": "At least one item required" }
    ]
  }
}
```

| Field     | Required | Purpose                                                                      |
| --------- | -------- | ---------------------------------------------------------------------------- |
| `code`    | Yes      | Machine-readable, `UPPER_SNAKE_CASE` — used by frontend for i18n or routing  |
| `message` | Yes      | Human-readable — safe for display in dev, generic in production              |
| `details` | No       | Field-level errors for validation, or additional context                     |

Never mix success and error in one shape. Success → `{ data }`. Error → `{ error }`.

**References:**

- [RFC 7807 — Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807) — IETF. Standard error response shape
- [Microsoft REST API Guidelines — Error Response](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#error-condition-responses) — Microsoft.

## Common Mistakes

| Mistake                                             | Correct Approach                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `try/catch` in every route handler                  | Throw and let `setErrorHandler` handle — Fastify routes async errors automatically |
| Using Express 4-arity error middleware signature    | Use Fastify `setErrorHandler(err, request, reply)` — 3 params                   |
| `setErrorHandler` registered before route plugins   | Register after all routes — Fastify scopes error handlers to registered routes   |
| Throwing HTTP status codes directly in services     | Throw domain errors (`NotFoundError`, `ForbiddenError`) — keep services HTTP-free |
| Exposing `err.stack` in production responses        | Always check `env.NODE_ENV !== 'production'` before including stack              |
| Ignoring Prisma error codes                         | Map `P2002` → 409 Conflict, `P2025` → 404 Not Found                             |

## References

- [Fastify — Error Handling](https://fastify.dev/docs/latest/Reference/Server/#seterrorhandler) — Fastify official docs.
- [Node.js Best Practices — Distinguish operational vs programmer errors](https://github.com/goldbergyoni/nodebestpractices#212-distinguish-operational-vs-programmer-errors) — Goldbergyoni.
- [Node.js Best Practices — Catch errors centrally](https://github.com/goldbergyoni/nodebestpractices#24-catch-errors-centrally-not-within-a-middleware) — Goldbergyoni.
- [RFC 7807 — Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807) — IETF.
- [Prisma Error Reference](https://www.prisma.io/docs/orm/reference/error-reference) — Prisma official docs.
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Robert C. Martin. Inner layers should not depend on HTTP framework
