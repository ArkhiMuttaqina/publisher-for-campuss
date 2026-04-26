---
name: hm-nodejs-api-design
description: Use when designing REST API routes, creating Fastify route plugins, defining lifecycle hooks, choosing HTTP methods/status codes, or structuring request validation with Zod.
---

# API Design

## Overview

Fastify APIs follow a thin-route pattern: route handlers handle HTTP concerns only (parse input, call service, send response). Business logic lives in services. Input validation uses Zod schemas with a reusable `preHandler` hook.

Core principle: Route handlers are glue code — they translate HTTP to service calls and service results to HTTP responses. No business logic in route handlers.

## Use this skill when

- creating new API endpoints
- deciding HTTP methods, status codes, or URL patterns
- setting up request validation
- designing Fastify lifecycle hooks
- structuring route plugin files

## 1. REST URL conventions

Use plural nouns, not verbs. Resource hierarchy via nesting.

```text
GET    /api/orders              # List orders
POST   /api/orders              # Create order
GET    /api/orders/:id          # Get single order
PATCH  /api/orders/:id          # Partial update
PUT    /api/orders/:id          # Full replace
DELETE /api/orders/:id          # Delete order
GET    /api/orders/:id/items    # List items of an order
POST   /api/orders/:id/items    # Add item to order
```

Rules:

- Prefix all routes with `/api/` — no version segment in the URL
- Plural resource names: `/orders` not `/order`
- Use nouns: `/orders` not `/getOrders` or `/createOrder`
- Nest for relationships: `/orders/:id/items`
- Use query params for filtering/sorting: `/orders?status=active&sort=-createdAt`
- Max 2 levels of nesting. Beyond that, use query params or top-level resources

**References:**

- [Microsoft REST API Guidelines — URL Structure](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) — Microsoft
- [Zalando RESTful API Guidelines — Resources](https://opensource.zalando.com/restful-api-guidelines/#resources) — Zalando SE
- [REST Dissertation — Chapter 5: Uniform Interface](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — Roy Fielding, 2000

## 2. HTTP status codes

| Action           | Success Code     | When                          |
| ---------------- | ---------------- | ----------------------------- |
| GET single       | `200 OK`         | Resource found                |
| GET list         | `200 OK`         | Always (empty array is valid) |
| POST create      | `201 Created`    | Resource created successfully |
| PATCH/PUT update | `200 OK`         | Resource updated              |
| DELETE           | `204 No Content` | Resource deleted (no body)    |

| Error             | Code                        | When                            |
| ----------------- | --------------------------- | ------------------------------- |
| Validation failed | `400 Bad Request`           | Zod parse fails, missing fields |
| Not authenticated | `401 Unauthorized`          | No/invalid token                |
| Not authorized    | `403 Forbidden`             | Authenticated but no permission |
| Not found         | `404 Not Found`             | Resource doesn't exist          |
| Conflict          | `409 Conflict`              | Duplicate unique field          |
| Rate limited      | `429 Too Many Requests`     | Rate limit exceeded             |
| Server error      | `500 Internal Server Error` | Unhandled exception             |

Use the most specific status code. Never return `200` for errors or `500` for validation failures.

**References:**

- [HTTP Semantics — RFC 9110, Section 15](https://httpwg.org/specs/rfc9110.html#status.codes) — IETF
- [Microsoft REST API Guidelines — Response Codes](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#response-formats) — Microsoft

## 3. Route plugin structure (thin handler pattern)

Each module splits HTTP concerns into three files: **module** (composition root), **controller** (handlers), and **route** (path definitions). The module is the `FastifyPluginAsync` registered in `app.ts`.

### Module — composition root (`module.ts`)

The module wires dependencies and registers routes. It is the only file `app.ts` imports.

```typescript
// src/modules/order/order.module.ts
import type { FastifyPluginAsync } from "fastify";
import { createOrderRepository } from "./order.repository";
import { createOrderService } from "./order.service";
import { createOrderController } from "./order.controller";
import { orderRoutes } from "./order.route";

export const orderModule: FastifyPluginAsync = async (fastify) => {
  // 1. Data access
  const repository = createOrderRepository();

  // 2. Business logic
  const service = createOrderService(repository, fastify.redis);

  // 3. HTTP handlers
  const controller = createOrderController(service);

  // 4. Route definitions
  orderRoutes(fastify, controller);
};
```

### Controller — HTTP handlers (`controller.ts`)

Controllers handle HTTP concerns: parse validated input, call service, format response. No business logic.

```typescript
// src/modules/order/order.controller.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import type { CreateOrderDto, OrderParams } from "./order.schema";
import type { OrderService } from "./order.service";
import { NotFoundError } from "@shared/errors/not-found.error";

export function createOrderController(service: OrderService) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      const order = await service.create(request.body as CreateOrderDto);
      return reply.code(201).send({ data: order });
    },

    async list(request: FastifyRequest, reply: FastifyReply) {
      const result = await service.list(request.query);
      return result;
    },

    async getById(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as OrderParams;
      const order = await service.getById(id);
      if (!order) throw new NotFoundError("Order", id);
      return { data: order };
    },

    async update(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as OrderParams;
      const order = await service.update(id, request.body);
      return { data: order };
    },

    async delete(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as OrderParams;
      await service.delete(id);
      return reply.code(204).send();
    },
  };
}

export type OrderController = ReturnType<typeof createOrderController>;
```

### Route — path definitions (`route.ts`)

Routes define only paths, methods, hooks, and point to controller methods. No inline handler logic.

```typescript
// src/modules/order/order.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "@shared/hooks/auth.hook";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "@shared/hooks/validate.hook";
import {
  createOrderSchema,
  updateOrderSchema,
  listOrdersSchema,
  orderParamsSchema,
} from "./order.schema";
import type { OrderController } from "./order.controller";

export function orderRoutes(
  fastify: FastifyInstance,
  controller: OrderController,
) {
  fastify.get(
    "/",
    {
      preHandler: [authenticate, validateQuery(listOrdersSchema)],
    },
    controller.list,
  );

  fastify.post(
    "/",
    {
      preHandler: [authenticate, validateBody(createOrderSchema)],
    },
    controller.create,
  );

  fastify.get(
    "/:id",
    {
      preHandler: [authenticate, validateParams(orderParamsSchema)],
    },
    controller.getById,
  );

  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate, validateBody(updateOrderSchema)],
    },
    controller.update,
  );

  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    controller.delete,
  );
}
```

### Registration in app.ts

```typescript
// src/app.ts
import { orderModule } from "./modules/order/order.module";
await app.register(orderModule, { prefix: "/api/orders" });
```

Key rules:

- No `try/catch` in controllers — Fastify catches thrown errors and routes them to `setErrorHandler`
- No business logic in controllers — only `service.method(input)` calls
- No Prisma imports in controllers — data access is in repositories, called by services
- Hook order via `preHandler`: auth → validate → handler
- Return value from handler is auto-serialized to JSON (no `reply.send()` needed for simple cases)
- `reply.code(201).send(data)` for non-200 success responses
- `module.ts` is the only file imported by `app.ts` — everything else is internal to the module
- `route.ts` is a separate file by default. For modules with only 1–2 routes and no complex hooks, route definitions may live directly in `module.ts` — but extract to `route.ts` as soon as routes grow or hooks become non-trivial

Fastify natively handles async errors — any thrown error in an async handler goes directly to the error handler, no `asyncHandler` wrapper needed.

**References:**

- [Fastify — Routes](https://fastify.dev/docs/latest/Reference/Routes/) — Fastify official docs. Route options, preHandler hooks
- [Fastify — Lifecycle](https://fastify.dev/docs/latest/Reference/Lifecycle/) — Fastify official docs. Full request/response lifecycle
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Robert C. Martin, 2012. Single responsibility in HTTP layer

## 4. Request validation preHandler with Zod

```typescript
// src/shared/hooks/validate.hook.ts
import type {
  FastifyRequest,
  FastifyReply,
  HookHandlerDoneFunction,
} from "fastify";
import type { AnyZodObject, ZodError } from "zod";
import { ValidationError } from "@shared/errors/validation.error";

export function validateBody(schema: AnyZodObject) {
  return (
    request: FastifyRequest,
    _reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    try {
      request.body = schema.parse(request.body);
      done();
    } catch (err) {
      done(new ValidationError((err as ZodError).errors));
    }
  };
}

export function validateQuery(schema: AnyZodObject) {
  return (
    request: FastifyRequest,
    _reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    try {
      request.query = schema.parse(request.query);
      done();
    } catch (err) {
      done(new ValidationError((err as ZodError).errors));
    }
  };
}

export function validateParams(schema: AnyZodObject) {
  return (
    request: FastifyRequest,
    _reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    try {
      request.params = schema.parse(request.params);
      done();
    } catch (err) {
      done(new ValidationError((err as ZodError).errors));
    }
  };
}
```

```typescript
// src/modules/order/order.schema.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  notes: z.string().max(500).optional(),
});

export const updateOrderSchema = createOrderSchema.partial();

export const listOrdersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "confirmed", "shipped", "delivered"]).optional(),
  sort: z.string().default("-createdAt"),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type UpdateOrderDto = z.infer<typeof updateOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersSchema>;
```

Validate at the API boundary, not inside services. The preHandler parses AND transforms (via Zod's coercion), so downstream code gets properly typed data.

**References:**

- [Parse, don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) — Alexis King, 2019
- [Zod documentation — `.parse()`](https://zod.dev/) — Colin McDonnell
- [Fastify — Hooks (preHandler)](https://fastify.dev/docs/latest/Reference/Hooks/#prehandler) — Fastify official docs

## 5. Plugin registration order in app.ts

The order in which plugins and routes are registered in `buildApp()` matters:

```typescript
// src/app.ts
export async function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== "test" });

  // Error handling — registered FIRST so all child scopes inherit the handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // 1. Security plugins (registered before any routes)
  await app.register(helmet);
  await app.register(cors, corsConfig);
  await app.register(rateLimit, { max: 100, timeWindow: "15 minutes" });

  // 2. Infrastructure plugins (Redis, JWT)
  await app.register(redisPlugin);
  await app.register(jwtPlugin);

  // 3. Modules (each module is a Fastify plugin with its own controller/routes)
  await app.register(orderModule, { prefix: "/api/orders" });
  await app.register(userModule, { prefix: "/api/users" });

  return app;
}
```

The order is significant:

- Error handler + not found handler FIRST — `fp()`-wrapped plugins inherit the error handler from the parent scope at registration time. Setting handlers after plugins causes handler scope isolation bugs in Fastify 5
- Security plugins (Helmet, CORS, rate limit) before any modules
- Infrastructure plugins (Redis, JWT) before modules that depend on them
- Modules last — each module is a `FastifyPluginAsync` with its own controller and routes

**References:**

- [Fastify — Plugins](https://fastify.dev/docs/latest/Reference/Plugins/) — Fastify official docs. Plugin encapsulation, registration order
- [Fastify — Error Handling](https://fastify.dev/docs/latest/Reference/Server/#seterrorhandler) — Fastify official docs

## 6. Fastify type augmentation

Extend Fastify types for `request.user` set by the JWT plugin:

```typescript
// src/shared/types/fastify.d.ts
import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      userId: string;
      role: string;
    };
  }
}
```

**References:**

- [Fastify — TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/) — Fastify official docs. Augmenting Fastify interfaces

## 7. API response format

Consistent response shape for all endpoints:

```typescript
// Success response
{
  "data": { ... },           // Single object or array
  "meta": {                  // For paginated lists
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error response (see hm-nodejs-error-handling skill)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...]
  }
}
```

Never mix: don't return `{ data, error }` in the same response. Success responses always have `data`. Error responses always have `error`. This makes client-side parsing unambiguous.

**References:**

- [Microsoft REST API Guidelines — Error Response](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#error-condition-responses) — Microsoft
- [JSON:API Specification — Document Structure](https://jsonapi.org/format/#document-structure) — JSON:API, widely adopted response envelope pattern

## Common Mistakes

| Mistake                                                   | Correct Approach                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Business logic in controller (calculate tax, check stock) | Move to service layer — controller only calls `service.method()`                  |
| `try/catch` in every async controller method              | Not needed in Fastify — async errors auto-bubble to `setErrorHandler`             |
| Verbs in URLs: `/api/getOrders`, `/api/createOrder`       | Nouns: `GET /api/orders`, `POST /api/orders`                                      |
| Returning `200` for everything (even errors)              | Use correct status codes: `201` for create, `204` for delete, `404` for not found |
| Validation inside service or controller body              | Zod schema + `validateBody`/`validateQuery` preHandler at route level             |
| `request.body.name` without validation                    | Always validate via Zod preHandler first — downstream code uses typed DTO         |
| `reply.send({ success: true, data, error: null })`        | Separate shapes: `{ data }` for success, `{ error }` for failure                  |
| Registering modules before security plugins               | Always register Helmet, CORS, rate limiter before module plugins                  |
| Inline handler logic in `route.ts`                        | Separate: `controller.ts` (handlers), `route.ts` (path definitions only)          |
| Wiring dependencies in `route.ts`                         | Use `module.ts` as composition root — route.ts only defines paths and hooks       |
| Setting `setErrorHandler` after `fp()` plugins            | Set error/notFound handlers FIRST, before any plugin registration                 |

## References

- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) — Microsoft. URL structure, versioning, error responses, status codes
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/) — Zalando SE. Naming, pagination, filtering
- [REST Dissertation — Chapter 5](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — Roy Fielding, 2000. REST architectural constraints
- [HTTP Semantics — RFC 9110](https://httpwg.org/specs/rfc9110.html#status.codes) — IETF. HTTP methods and status codes
- [Fastify — Routes](https://fastify.dev/docs/latest/Reference/Routes/) — Fastify official docs. Route registration, options, preHandler
- [Fastify — Lifecycle](https://fastify.dev/docs/latest/Reference/Lifecycle/) — Fastify official docs. Full request/response lifecycle
- [Fastify — Plugins](https://fastify.dev/docs/latest/Reference/Plugins/) — Fastify official docs. Plugin encapsulation model
- [Parse, don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) — Alexis King, 2019. Type-driven validation
- [Zod documentation](https://zod.dev/) — Colin McDonnell. Runtime schema validation and TypeScript type inference
