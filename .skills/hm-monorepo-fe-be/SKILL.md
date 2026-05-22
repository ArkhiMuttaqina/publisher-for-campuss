---
name: hm-monorepo-fe-be
description: Use when setting up or maintaining a monorepo where frontend React and backend Node.js live together, including shared packages, build tooling, CI workflows, and deployment boundaries.
---

# Monorepo FE + BE

## Overview

A monorepo combines frontend and backend in one repository so teams can share types, validation schemas, tooling, and CI standards while still deploying each app independently.

Core principle: Keep apps independent for runtime and deployment, but share contracts and tooling through versioned internal packages.

## Use this skill when

- creating a FE + BE monorepo from scratch
- restructuring separate repositories into one workspace
- sharing types/schemas between React frontend and Node.js backend
- setting up workspace scripts, build pipelines, and affected-only CI
- defining boundaries between app code and shared packages

## 1. Canonical monorepo layout

```text
repo-root/
├── apps/
│   ├── web/                        # React frontend (Vite/Next)
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                        # Node.js backend (Fastify/Express)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── shared-types/               # Shared TS types/interfaces
│   ├── shared-schemas/             # Zod schemas for DTO/contracts
│   ├── eslint-config/              # Shared lint config
│   ├── tsconfig/                   # Shared tsconfig presets
│   └── ui/                         # Optional reusable UI library
├── package.json                    # Workspace root scripts
├── pnpm-workspace.yaml             # Workspace definition
├── turbo.json                      # Optional task graph/cache (Turborepo)
└── .github/workflows/              # CI pipelines
```

Guideline:

- `apps/` contains deployable runtime services
- `packages/` contains reusable non-runtime building blocks
- No app should import another app directly

## 2. Package manager and workspace setup

Use one workspace-aware package manager for deterministic linking.

Recommended:

- `pnpm` workspaces for performance and strictness
- Optionally add Turborepo or Nx for task orchestration and remote cache

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

Root `package.json` scripts:

```json
{
  "private": true,
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  }
}
```

## 3. Shared contracts between FE and BE

Use shared schema packages as single source of truth for request/response contracts.

Recommended flow:

- Define Zod schema in `packages/shared-schemas`
- Infer TypeScript types from schema
- Backend validates requests with same schema
- Frontend uses inferred types for API client and form model

```typescript
// packages/shared-schemas/src/user.ts
import { z } from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
});

export type User = z.infer<typeof userSchema>;
```

This reduces FE/BE drift and catches contract breaks at compile-time.

## 4. Import boundaries and dependency rules

- Apps can depend on packages
- Packages can depend on packages
- Packages must not depend on apps
- Keep shared packages framework-agnostic when possible
- Enforce boundaries via ESLint rules or Nx dependency constraints

Avoid:

- importing backend internals directly from frontend
- putting environment-specific secrets/config into shared packages

## 5. Local development workflow

- Run FE and BE concurrently from root (`pnpm dev`)
- Use per-app `.env` files (`apps/web/.env`, `apps/api/.env`)
- Keep ports explicit (e.g., web: `5173`, api: `3000`)
- Use proxy config on FE dev server to avoid CORS friction locally

Example Vite proxy (`apps/web/vite.config.ts`):

```typescript
server: {
  proxy: {
    "/api": {
      target: "http://localhost:3000",
      changeOrigin: true,
    },
  },
}
```

## 6. CI/CD strategy for monorepo

- Lint/test/build only affected projects when possible
- Cache dependencies and build artifacts
- Keep deployment pipelines separate per app
- Require contract checks before merge (typecheck + schema tests)

Typical pipeline stages:

1. Install dependencies once (workspace root)
2. Lint + typecheck (affected)
3. Unit/integration tests (affected)
4. Build artifacts per app
5. Deploy `apps/web` and `apps/api` independently

## 7. Versioning and releases

- Internal packages can be private and unpublished (workspace only)
- If publishing shared packages, use Changesets for versioning
- Keep changelog by app and by package when teams are separate

## 8. Common pitfalls

- Over-sharing code: shared package becomes dumping ground
- Circular dependencies between packages
- Tight coupling where FE import implies backend deployment change
- No clear ownership for shared contracts

Mitigation:

- Define ownership per package
- Keep package scope narrow (types, schema, ui primitives)
- Add architecture checks in CI

## References

- [pnpm Workspaces](https://pnpm.io/workspaces) — pnpm
- [Turborepo Docs](https://turbo.build/repo/docs) — Vercel
- [Nx Monorepo Concepts](https://nx.dev/concepts/decisions/why-monorepos) — Nx
- [Changesets](https://github.com/changesets/changesets) — Changesets
