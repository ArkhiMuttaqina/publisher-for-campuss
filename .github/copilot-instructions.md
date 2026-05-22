# Copilot Instructions

## Repository Context

This repository is a deployable monorepo for a publisher platform.

- `apps/web`: Next.js public website (SEO-first, SSR-first)
- `apps/admin`: Next.js admin CMS
- `apps/api`: NestJS backend with Prisma and PostgreSQL
- `packages/*`: shared schemas, types, and configs

## Coding Conventions

- Use TypeScript everywhere.
- Keep domain boundaries clear: apps can consume packages, packages must not depend on apps.
- Favor modular NestJS architecture (`Module`, `Controller`, `Service`).
- Use Prisma schema/migrations as the source of truth for database structure.
- Keep shared DTO validations in `packages/shared-schemas` when contracts are reused.

## SEO and Content Rules

- Public pages should remain SSR-first.
- Slugs must be human-readable and non-numeric.
- Book/author/blog routes should always be metadata-capable.

## Safety Rules

- Do not introduce breaking API contract changes without explicit migration notes.
- Keep changes incremental and MVP-focused unless otherwise requested.