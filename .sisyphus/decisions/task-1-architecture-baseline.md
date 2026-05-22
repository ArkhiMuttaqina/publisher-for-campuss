# Task 1 — Architecture Contracts and Baseline (Locked)

Date: 2026-05-03  
Scope: Phase 1 execution defaults for campus publisher monorepo

## 1) Phase-1 Boundaries

### In Scope (Phase 1)

- Secure auth + RBAC + session lifecycle for admin/editorial users
- Core domain CRUD and editorial lifecycle
- Public discovery surfaces (catalog, book, author, category, blog)
- PDF upload + policy-controlled public/admin viewing
- Bilingual UI foundation (ID/EN) and bilingual metadata/content fields as defined below
- Submission/review workflow for campus contributors
- Full automated quality pipeline (lint, typecheck, unit/integration/e2e, CI)
- Runtime hardening (logging, health/readiness, error handling, rate limiting)

### Deferred / Out of Scope (Phase 1)

- Full multi-tenant rollout (single-campus operation in phase 1)
- E-commerce and payment flows
- OCR/full-text indexing of PDF contents
- Advanced BI dashboards beyond operational and audit visibility

## 2) Canonical Role Matrix (authorization contract)

Roles in scope:

- `super_admin`
- `publisher_admin`
- `editor`
- `catalog_manager`
- `reviewer`
- `submission_user`
- `viewer`

High-level permissions:

- `submission_user`: create/edit own submissions while in editable states; track status
- `reviewer`: review queue access, comment, recommend approve/reject
- `editor`: content edits, prepare releases, cannot bypass publish authority if policy forbids
- `catalog_manager`: taxonomy/media/catalog operations per policy
- `publisher_admin`: final publish/archive authority, workflow override where allowed
- `super_admin`: system-level operations and user/role administration
- `viewer`: read-only access to public resources only

Enforcement rule:

- Authorization is server-enforced only; client-side role hints are non-authoritative.

## 3) Editorial Workflow Lifecycle (single source of truth)

Canonical states:

- `draft`
- `review`
- `approved`
- `published`
- `archived`

Core transition policy:

- `draft -> review`: allowed for content owner/editorial role
- `review -> approved`: reviewer/editorial approval path
- `approved -> published`: publisher-level authority
- `published -> archived`: publisher/admin authority
- Back transitions require explicit policy logging and audit trail

Invariant:

- UI must never invent alternate workflow states.

## 4) Localization Contract (ID/EN)

Phase-1 localization rules:

- UI chrome supports Indonesian/English selection
- CMS-managed public metadata must be bilingual for:
  - landing copy blocks
  - book metadata fields
  - author biography/summary fields
  - category labels/descriptions
  - blog metadata fields
- Long-form rich body content may use one canonical body plus bilingual metadata in phase 1 unless split-body editing is implemented without destabilizing the roadmap.

Fallback policy:

- If requested locale content is missing, fallback to canonical locale without throwing runtime errors.

## 5) PDF Access Policy

Upload policy:

- Only authenticated authorized editorial/admin roles may upload PDFs.

Public access policy:

- Public users can only access policy-allowed PDFs tied to published entities.
- Private/draft files are never directly exposed by raw storage paths.

Delivery policy:

- PDFs are served through policy-aware API access (stream/proxy/signed mechanism), never by predictable direct storage URL for protected assets.

## 6) API Versioning and Runtime Policy

- API versioning strategy must be explicit before broad endpoint expansion.
- Global validation, structured errors, and logging/correlation are mandatory runtime contracts.
- Rate limiting and security headers are phase-1 hardening requirements, not optional polish.

## 7) Current-State Baseline: retain / refactor / rebuild

### A. Backend (`apps/api`)

Retain:

- `apps/api/src/modules/app.module.ts` (module composition baseline)
- `apps/api/src/main.ts` (bootstrap entrypoint with validation pipe already present)
- Core domain module structure under `apps/api/src/modules/*`
- Prisma entity foundation in `apps/api/prisma/schema.prisma`

Refactor:

- `apps/api/src/common/auth/roles.guard.ts` (currently trusts `x-role` header)
- `apps/api/src/modules/auth/auth.service.ts` (dummy login heuristic)
- Media and SEO/public query strategies for production policy alignment

Rebuild/Implement missing:

- Production auth/session/refresh/audit infrastructure
- Submission workflow endpoints and role-aware lifecycle transitions
- Search/filter/pagination breadth and policy-safe public querying

### B. Admin (`apps/admin`)

Retain:

- App-router baseline and server-action integration entry pattern
- `apps/admin/app/lib/api.ts` as the integration seam to evolve

Refactor:

- `apps/admin/app/actions.ts` (currently hard-coded role headers and narrow flows)
- Shared feedback/error/loading semantics across forms

Rebuild/Implement missing:

- `apps/admin/app/page.tsx` single-page shell into route-structured protected CMS
- Full CRUD screens for books/authors/categories/blog/media/SEO
- Submission/review dashboards and role-specific controls

### C. Public Web (`apps/web`)

Retain:

- Next app shell and SSR-first route architecture direction

Refactor:

- `apps/web/app/page.tsx` placeholder UX and dead-link assumptions

Rebuild/Implement missing:

- Catalog/detail/blog/author/category route surfaces
- Dynamic metadata/structured data/internal-linking system
- Public PDF viewer path aligned to policy checks

### D. Shared Packages (`packages/*`)

Retain:

- `packages/shared-schemas/src/index.ts` slug and schema style baseline
- `packages/shared-types/src/index.ts` naming/style baseline

Refactor:

- Expand shared contracts for auth, workflow, pagination, error envelopes, media/PDF metadata

Rebuild/Implement missing:

- Full bilingual-aware API contract layer consumed consistently by API/web/admin

### E. Quality/CI

Retain:

- Root turbo/pnpm orchestration scripts and monorepo wiring

Refactor:

- Placeholder lint/test scripts across apps into real toolchains

Rebuild/Implement missing:

- `.github/workflows/*` CI gates and enforceable PR checks

## 8) Non-negotiable Execution Rules

- No feature wave bypassing auth/RBAC policy finalization
- No release with placeholder lint/test scripts
- No public exposure of unpublished/private content
- No scope expansion to deferred items until phase-1 completion criteria are met

## 9) Decision Completeness Checklist

- [x] Role matrix locked
- [x] Workflow lifecycle locked
- [x] Localization boundary locked
- [x] PDF access policy locked
- [x] API/runtime hardening baseline locked
- [x] Current-state retain/refactor/rebuild matrix completed
