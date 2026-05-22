# publisher-for-campuss

SEO-first digital publishing platform monorepo.

## Architecture

- `apps/web`: Public landing and catalog site (Next.js, Tailwind CSS, Framer Motion)
- `apps/admin`: Admin CMS for books, authors, blog, media, SEO (Next.js)
- `apps/api`: Backend services and domain modules (NestJS + Prisma)
- `packages/shared-types`: Shared TypeScript contracts
- `packages/shared-schemas`: Shared validation schemas with Zod

## Tech Stack

- Frontend: Next.js
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Monorepo: pnpm workspace + Turborepo

## Quick Start

1. Install dependencies:
	- `pnpm install`
2. Copy env template:
	- `cp apps/api/.env.example apps/api/.env`
3. Run development mode:
	- `pnpm dev`

Default ports:

- Web: `3001`
- Admin: `3002`
- API: `3000`

## MVP Scope (Phase 1)

- Admin auth and role permissions (in progress)
- Books/authors/categories CRUD (in progress)
- Public landing, catalog, and book detail (in progress)
- Blog basic publish flow (in progress)
- Media uploads (in progress)
- SEO metadata management (in progress)