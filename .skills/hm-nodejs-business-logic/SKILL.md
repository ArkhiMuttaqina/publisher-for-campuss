---
name: hm-nodejs-business-logic
description: Use when implementing service layer logic, repository pattern, dependency injection, transactions, dispatching background jobs (BullMQ), or deciding where business rules should live in a Fastify + TypeScript project.
---

# Business Logic

## Overview

Business logic lives exclusively in the service layer. Services orchestrate domain rules, call repositories for data access, dispatch background jobs, and never touch HTTP concerns. Repositories encapsulate all Prisma queries behind a clean interface.

Core principle: No Prisma in route handlers, no `request`/`reply` in services. Services are framework-agnostic — they could work with any HTTP framework or none at all.

## Use this skill when

- creating a new service class
- deciding where to put business rules
- implementing repository pattern over Prisma
- using transactions across multiple operations
- injecting dependencies into services
- dispatching background jobs to a BullMQ queue from a service

## 1. Three-layer architecture

```text
Module (composition root — wires all layers, registered in app.ts)
  └─ Controller (HTTP layer)
       ↓ calls
     Service (Business logic layer)
       ↓ calls
     Repository (Data access layer / Prisma)
       + Queue (Background jobs / BullMQ)
```

`module.ts` is **not** a layer — it is the wiring point that connects all layers via dependency injection (factory functions). It does not contain business logic or HTTP handling.

Each layer has strict boundaries:

| Layer      | Knows about                                     | Does NOT know about              |
| ---------- | ----------------------------------------------- | -------------------------------- |
| Controller | Fastify `request`/`reply`, Service              | Prisma, Database, Business rules |
| Service    | Repository, Queue, Domain types, Business rules | Fastify, HTTP, Request/Response  |
| Repository | Prisma client, Database queries                 | Fastify, Business rules          |
| Queue      | BullMQ Job, job payload types                   | Fastify, Prisma, Business rules  |

This separation is the core of the Ports and Adapters architecture (also known as Hexagonal Architecture), formalized by Alistair Cockburn. It ensures that business logic is testable in isolation and that changing the web framework or database layer doesn't require rewriting domain rules.

**References:**

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Robert C. Martin, 2012. Dependency rule: inner layers know nothing about outer layers
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) — Alistair Cockburn, 2005. Ports and Adapters: domain logic is framework-independent
- [Bulletproof Node.js Architecture](https://www.softwareontheroad.com/ideal-nodejs-project-structure/) — Sam Quinn. Practical 3-layer application of Clean Architecture for Node.js

## 2. Repository pattern

Repositories abstract Prisma operations. Services never import `@prisma/client` directly.

```typescript
// src/modules/order/order.repository.ts
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const orderRepository = {
  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });
  },

  async findMany(params: {
    where?: Prisma.OrderWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.OrderOrderByWithRelationInput;
  }) {
    const [data, total] = await Promise.all([
      prisma.order.findMany(params),
      prisma.order.count({ where: params.where }),
    ]);
    return { data, total };
  },

  async create(data: Prisma.OrderCreateInput) {
    return prisma.order.create({ data, include: { items: true } });
  },

  async update(id: string, data: Prisma.OrderUpdateInput) {
    return prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });
  },

  async delete(id: string) {
    return prisma.order.delete({ where: { id } });
  },

  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(fn);
  },
};
```

The repository pattern (Martin Fowler, "Patterns of Enterprise Application Architecture") mediates between the domain and data mapping layers using a collection-like interface. In practice:

- Services depend on a repository interface, not Prisma directly
- Repositories can be mocked in unit tests without Prisma dependency
- Switching from Prisma to another ORM only requires changing repositories

**References:**

- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html) — Martin Fowler, PoEAA, 2002. Mediates between domain and data mapping layers
- [Prisma Client API](https://www.prisma.io/docs/orm/prisma-client) — Prisma official docs. Query methods used in repositories

## 3. Service layer pattern

```typescript
// src/modules/order/order.service.ts
import { orderRepository } from "./order.repository";
import { NotFoundError } from "@shared/errors/not-found.error";
import { ForbiddenError } from "@shared/errors/forbidden.error";
import { CreateOrderDto, UpdateOrderDto, ListOrdersQuery } from "./order.type";

export const orderService = {
  async list(query: ListOrdersQuery) {
    const skip = (query.page - 1) * query.limit;
    const where = query.status ? { status: query.status } : {};

    const { data, total } = await orderRepository.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: parseSortParam(query.sort),
    });

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw new NotFoundError("Order", id);
    return order;
  },

  async create(dto: CreateOrderDto, userId: string) {
    // Business rule: validate stock availability
    await validateStockAvailability(dto.items);

    // Business rule: calculate totals
    const total = await calculateOrderTotal(dto.items);

    return orderRepository.create({
      customer: { connect: { id: dto.customerId } },
      createdBy: { connect: { id: userId } },
      total,
      items: {
        create: dto.items.map((item) => ({
          product: { connect: { id: item.productId } },
          quantity: item.quantity,
        })),
      },
    });
  },

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.getById(id);

    // Business rule: only pending orders can be updated
    if (order.status !== "pending") {
      throw new ForbiddenError("Only pending orders can be updated");
    }

    return orderRepository.update(id, dto);
  },

  async delete(id: string) {
    const order = await this.getById(id);

    // Business rule: only pending orders can be deleted
    if (order.status !== "pending") {
      throw new ForbiddenError("Only pending orders can be deleted");
    }

    return orderRepository.delete(id);
  },
};
```

Key service rules:

- Services throw domain errors (`NotFoundError`, `ForbiddenError`), not HTTP errors
- Services receive plain typed objects (DTOs), not Express `req`
- Services call repositories, never `prisma` directly
- Business rules are enforced here: state validation, permission checks, calculations

**References:**

- [Service Layer pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html) — Martin Fowler, PoEAA, 2002. Defines application's boundary and available operations
- [Node.js Best Practices — Separate business logic from web layer](https://github.com/goldbergyoni/nodebestpractices#1-project-structure-practices) — Goldbergyoni

## 4. Dependency injection

For simple projects, use constructor injection with factory functions:

```typescript
// src/modules/order/order.service.ts
import { OrderRepository } from "./order.repository";

export function createOrderService(repo: OrderRepository) {
  return {
    async getById(id: string) {
      const order = await repo.findById(id);
      if (!order) throw new NotFoundError("Order", id);
      return order;
    },
    // ... other methods
  };
}

// Production wiring
import { orderRepository } from "./order.repository";
export const orderService = createOrderService(orderRepository);
```

```typescript
// In tests — inject mock
const mockRepo = {
  findById: vi.fn().mockResolvedValue({ id: "1", status: "pending" }),
  // ...
};
const service = createOrderService(mockRepo);
```

For larger projects, use a DI container like `tsyringe` or `inversify`:

```typescript
// With tsyringe
import { injectable, inject } from "tsyringe";

@injectable()
export class OrderService {
  constructor(@inject("OrderRepository") private repo: OrderRepository) {}

  async getById(id: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundError("Order", id);
    return order;
  }
}
```

Start simple (factory functions). Move to a DI container only when manual wiring becomes painful (10+ services with cross-dependencies). Premature DI container adoption adds complexity without proportional benefit.

**References:**

- [Dependency Inversion Principle](https://web.archive.org/web/20110714224327/http://www.objectmentor.com/resources/articles/dip.pdf) — Robert C. Martin, 1996. High-level modules should not depend on low-level modules; both should depend on abstractions
- [Inversion of Control Containers and the Dependency Injection pattern](https://martinfowler.com/articles/injection.html) — Martin Fowler, 2004. Canonical explanation of constructor injection vs service locator

## 5. Transaction patterns

Use Prisma interactive transactions for operations that must be atomic:

```typescript
// In repository — expose transaction method
async transferOrder(fromId: string, toId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    // Deduct from source
    const source = await tx.account.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });

    if (source.balance < 0) {
      throw new Error('Insufficient balance');
      // Transaction auto-rolls back on throw
    }

    // Add to target
    await tx.account.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });

    return { fromBalance: source.balance, toBalance: source.balance + amount };
  });
}
```

Transaction rules:

- Keep transactions short — long-running transactions hold DB locks
- Never call external APIs inside a transaction
- Throw inside `$transaction` callback to trigger automatic rollback
- Use `isolationLevel` for strict consistency: `prisma.$transaction(fn, { isolationLevel: 'Serializable' })`

**References:**

- [Prisma Interactive Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions) — Prisma official docs
- [Designing Data-Intensive Applications — Chapter 7: Transactions](https://dataintensive.net/) — Martin Kleppmann, O'Reilly, 2017. ACID guarantees, isolation levels, concurrency control

## 6. Business error vs HTTP error

Services throw domain-specific errors. The global error handler maps them to HTTP responses.

```typescript
// Service throws domain error
throw new NotFoundError("Order", id); // → 404
throw new ForbiddenError("Cannot cancel"); // → 403
throw new ConflictError("Email in use"); // → 409
throw new ValidationError(zodErrors); // → 400

// Error handler maps (see hm-nodejs-error-handling skill)
// NotFoundError  → 404
// ForbiddenError → 403
// ConflictError  → 409
// ValidationError → 400
// Unknown        → 500
```

Services should never import `express` or use HTTP status codes directly. This ensures services remain testable without any HTTP framework dependency.

## 7. Dispatching background jobs from services

When an operation is too slow for a synchronous response (email, PDF generation, external API call), dispatch a BullMQ job from the service:

```typescript
// src/modules/order/order.service.ts
import { emailQueue } from "@queues/email.queue";

export const orderService = {
  async create(dto: CreateOrderDto, userId: string) {
    const order = await orderRepository.create({ ... });

    // Dispatch background job — don't await, fire-and-forget
    await emailQueue.add("order-confirmation", {
      orderId: order.id,
      customerEmail: dto.customerEmail,
    });

    return order;
  },
};
```

Rules:

- Services dispatch jobs to queues; workers process them — services never process jobs directly
- Job payload must be serializable (plain object, no class instances)
- If the job must complete before responding, use `await job.waitUntilFinished()` — but prefer async
- Jobs should be idempotent: processing the same job twice should not cause duplicate side effects

**References:**

- [BullMQ — Adding Jobs](https://docs.bullmq.io/guide/queues/adding-bulks) — BullMQ official docs.
- [Twelve-Factor App — XI. Processes](https://12factor.net/processes) — Adam Wiggins. Stateless processes, background work offloaded to queue

**References:**

- [Clean Architecture — Dependency Rule](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Robert C. Martin. Inner layers (domain/services) must not depend on outer layers (frameworks/HTTP)

## Common Mistakes

| Mistake                                                           | Correct Approach                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Prisma queries in route handler                                   | All Prisma access through repository methods                                 |
| `request`, `reply` in service                                     | Services receive plain typed objects (DTOs), return plain objects            |
| `reply.status(404).send(...)` in service                          | Throw `NotFoundError` — let error handler map to HTTP                        |
| Business logic in route handler (validate stock, calculate total) | Move to service layer                                                        |
| One giant `service.ts` with all methods                           | One service per module: `order.service.ts`, `user.service.ts`                |
| Direct `new PrismaClient()` in every file                         | Single Prisma instance in repository, or shared via DI                       |
| Using DI container for 3 services                                 | Start with factory functions, add DI container when manual wiring is painful |
| External API call inside `$transaction`                           | Move external calls outside transaction boundary                             |
| Sending emails/SMS synchronously in service                       | Dispatch to BullMQ queue — keep synchronous path fast                        |
| Job payload contains class instances                              | Use plain serializable objects as job data                                   |

## References

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Robert C. Martin, 2012. Dependency rule, layer separation, framework independence
- [Hexagonal Architecture (Ports and Adapters)](https://alistair.cockburn.us/hexagonal-architecture/) — Alistair Cockburn, 2005. Domain logic isolated from infrastructure
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html) — Martin Fowler, PoEAA, 2002. Collection-like interface over data access
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html) — Martin Fowler, PoEAA, 2002. Application boundary and operation set
- [Dependency Inversion Principle](https://web.archive.org/web/20110714224327/http://www.objectmentor.com/resources/articles/dip.pdf) — Robert C. Martin, 1996. Depend on abstractions, not concretions
- [Inversion of Control and DI](https://martinfowler.com/articles/injection.html) — Martin Fowler, 2004. Constructor injection pattern
- [BullMQ documentation](https://docs.bullmq.io/) — BullMQ. Queue, Worker, Job lifecycle
- [Prisma Interactive Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) — Prisma official docs
- [Designing Data-Intensive Applications, Ch. 7](https://dataintensive.net/) — Martin Kleppmann, 2017. Transactions, ACID, isolation levels
