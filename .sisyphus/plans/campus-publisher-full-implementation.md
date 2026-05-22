# Campus Publisher Full Implementation Plan

## TL;DR

> **Summary**: Upgrade the partially working monorepo into a production-ready campus publishing platform by **hardening and extending the foundations that already exist** rather than rebuilding them from scratch. The corrected plan treats auth, CI, shared contracts, and partial public routes as real starting points, then closes the remaining product, security, workflow, and QA gaps.
> **Deliverables**:
>
> - hardened `/api/v1` auth/session/RBAC foundation with refresh rotation and audit coverage
> - extended Prisma schema/contracts for campus seams, SEO, submission linkage, and media policy
> - route-structured admin portal with role-specific CRUD and editorial workflows
> - SSR/ISR public site with slug-based discovery routes, bilingual UX, and controlled PDF preview
> - real Vitest + Playwright + CI quality gates with no placeholder test passes
>   **Effort**: XL
>   **Parallel**: YES - 4 waves
>   **Critical Path**: 1 → 2/3/4/6 → 5/7/9 → 8/10/11 → 12

## Context

### Original Request

- Check the existing implementation plan.
- Continue by correcting the plan in place.
- Preserve the original platform goal: a secure, bilingual, campus-ready publishing platform spanning API, admin CMS, public discovery site, PDF viewing, workflows, and automated quality gates.

### Interview Summary

- The existing plan structure was strong, but repo-state drift made several tasks inaccurate.
- User chose to **overwrite** `.sisyphus/plans/campus-publisher-full-implementation.md` instead of creating a reviewed copy.
- Planning priority shifted from “review only” to “review + corrected execution plan”.

### Corrected Current-State Matrix

| Area                      | Already Present                                                                                                                                                                                                    | Partial / Needs Refactor                                                                                       | Still Missing / Must Be Added                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Monorepo / workspace      | `package.json:6-20`, `pnpm-workspace.yaml`, `turbo.json`, `.github/workflows/ci.yml:1-46`                                                                                                                          | CI is wired but test depth is weak                                                                             | Playwright setup, real UI tests, stronger release evidence                                                         |
| API bootstrap / hardening | `apps/api/src/main.ts:1-47` registers validation, exception filter, response interceptor, request IDs, security headers, and a simple global rate-limit guard                                                      | versioning, guard registration via DI, auth session lifecycle, richer public/query endpoints                   | refresh rotation, logout/revoke flow, `/api/v1`, stronger workflow/search/public-query coverage                    |
| Auth / RBAC               | `apps/api/src/modules/auth/auth.service.ts:1-63`, `apps/api/src/common/auth/roles.guard.ts:1-31`, `apps/admin/app/login/page.tsx:1-103`, `apps/admin/app/actions.ts:9-100`                                         | access token flow exists; admin cookie bridge exists                                                           | refresh token flow, explicit revocation, audit coverage, role-matrix cleanup (`author_manager`, `submission_user`) |
| Database                  | `apps/api/prisma/schema.prisma:1-274` already includes `Session`, `AuditLog`, `Submission`, `Publication`, `BookFile`, `MediaAsset`, `SeoMeta`; migration/seed hooks are present via `apps/api/package.json:13-20` | schema needs relation cleanup and future seams                                                                 | `Campus` seam, author/category SEO relations, submission→book linkage, blog author relation, additional indexes    |
| Shared contracts          | `packages/shared-types/src/index.ts:1-95`, `packages/shared-schemas/src/index.ts:1-124` already define API envelopes, roles, workflow types, pagination, auth, localized text                                      | coverage is uneven across full entity DTOs                                                                     | full CRUD/query contracts for books/authors/categories/blog/media/submissions and refresh/session DTOs             |
| Admin app                 | `apps/admin/app/page.tsx:1-140`, `apps/admin/app/actions.ts:1-160`, `apps/admin/app/lib/api.ts:1-72`, `apps/admin/app/login/page.tsx:1-103`                                                                        | dashboard is still one giant page and not route-structured                                                     | protected IA, role-filtered navigation, dedicated CRUD screens, workflow queues, submission-user portal            |
| Public web                | `apps/web/app/page.tsx:1-77`, `apps/web/app/catalog/page.tsx:1-71`, `apps/web/app/catalog/[id]/page.tsx:1-131`, `apps/web/app/blog/page.tsx:1-23`                                                                  | landing/catalog/detail are partially real; blog is still shell; detail route is ID-based instead of slug-based | author/category routes, blog detail, search/filter/pagination, canonical slug routes, shared public shell polish   |
| Media / PDF               | upload and media metadata foundations exist in schema/admin actions                                                                                                                                                | current public preview linkage must be audited and hardened                                                    | policy-controlled preview/full access matrix, non-public URL suppression, delete/update metadata flows             |
| Quality                   | lint/type/test/build scripts exist in root and apps; API e2e exists at `apps/api/test/health.e2e-spec.ts:1-31`                                                                                                     | web/admin still use `--passWithNoTests`; API tests are thin                                                    | Playwright, meaningful UI tests, broader API integration tests, CI browser setup                                   |

### Metis Review (gaps addressed)

- Corrected plan framing from “rebuild missing systems” to “extend/harden existing systems” for auth, contracts, CI, and public routes.
- Fixed dependency risk by making **Task 6 block all Playwright-dependent UI tasks**.
- Added missing decisions for role matrix, versioning timing, localization transport, PDF policy, and session storage so executors do not invent architecture mid-run.

### Oracle Guardrails Incorporated

- Phase 1 remains **single-campus**, but schema work adds a nullable `campusId` seam and `Campus` stub model so future multi-campus support is additive rather than destructive.
- Public content remains SEO-first and SSR/ISR-first; public detail pages become **slug-based canonical routes**, with the current ID-based book detail route redirected to its slug equivalent.
- Admin authentication uses **server-managed secure HttpOnly cookies only**; no browser JS storage, `localStorage`, or exposed refresh token handling in client components.
- Public PDF access is **preview-only** and policy-controlled; full PDFs stay authenticated/admin-only in phase 1.
- Media responses must never expose raw `publicUrl` for non-`PUBLIC` assets.
- API versioning moves early into foundation work as `/api/v1`; downstream client wrappers must adopt it before feature work continues.

### Decision Log (locked defaults)

- **Campus model**: single-campus in phase 1. Add `Campus` model plus nullable `campusId` seam fields on core records, but do not build tenant-aware UX or authorization yet.
- **Role matrix**:
  - `super_admin`: platform-wide access, user/role management, publish/archive
  - `publisher_admin`: all editorial/catalog/media/SEO/submission operations except super-admin-only platform settings
  - `editor`: create/update content, send to review, edit approved drafts, no final publish/archive
  - `catalog_manager`: manage books, categories, media, SEO, no publish/archive
  - `author_manager`: manage authors and author-linked metadata/media only, no publish/archive
  - `reviewer`: review queues, approve/reject review states, no final publish/archive
  - `submission_user`: restricted authenticated portal for creating and tracking own submissions only
  - `viewer`: authenticated read-only API/user role; **no admin portal access** in phase 1
- **Submission entry point**: `submission_user` uses the same Next admin app as a restricted campus portal, but only sees `/submissions` routes plus logout/profile surfaces.
- **Auth/session model**: login and refresh flows may return access + refresh tokens in the response body, but **only Next server actions / route handlers may invoke those endpoints from the admin app**. The server layer must immediately store them in separate secure HttpOnly cookies. No client component may call login/refresh directly. Access token lifetime = **15 minutes**. Refresh token lifetime = **7 days**. Refresh rotates on every successful refresh. Logout revokes the active session row.
- **API versioning**: URI versioning via `/api/v1`, introduced in Task 2. Unversioned routes are not kept as long-term public contract.
- **Localization transport**: public app continues to use `?lang=en|id`; admin app continues to use cookie-based language selection. API returns both localized fields; it does not decide language by header or cookie.
- **Publish readiness rule**: content cannot transition to `published` unless required bilingual fields are complete: books require `titleId`, `titleEn`, `summaryId`, `summaryEn`; blog requires bilingual title + excerpt metadata; author/category records require whichever localized fields are displayed on public pages.
- **Workflow lifecycle**:
  - content: `draft → review → approved → published → archived`
  - submissions: `draft → submitted → in_review → approved/rejected`
  - only `publisher_admin` and `super_admin` may publish/archive public content
- **Public routing**: public entity detail routes use slugs, not IDs. Canonical routes are `/catalog/[slug]`, `/authors/[slug]`, `/categories/[slug]`, `/blog/[slug]`. The current `/catalog/[id]` path must redirect to the slug URL after slug route rollout.
- **PDF policy**:
  - public users may access **preview PDFs only**
  - public preview requires related `Publication.status = PUBLISHED`, `Publication.isPublic = true`, `BookFile.isPreview = true`, and `BookFile.visibility = PUBLIC`
  - full PDFs remain authenticated/admin-only in phase 1
  - `CAMPUS` visibility means any authenticated, non-revoked user session in phase 1
  - non-public assets never expose raw object/disk URLs in API responses
- **Viewer implementation**: phase 1 uses native browser PDF viewing (`iframe`/embed) for both admin and public preview; do not add a heavy custom JS PDF stack unless existing browser viewing proves insufficient.
- **Rendering strategy**: `apps/web` uses a dedicated fetch helper with `next: { revalidate: 300 }` defaults for public reads; `apps/admin` keeps `cache: "no-store"` for authenticated operations.
- **Quality policy**: remove all `--passWithNoTests` usage. Root `pnpm test:e2e` must cover API e2e plus Playwright browser flows.

## Work Objectives

### Core Objective

Ship a campus-ready publishing platform that is secure, bilingual, operationally maintainable, and visibly polished across both the public site and the authenticated admin/submission portal.

### Deliverables

- versioned API foundation with hardened auth, session rotation, RBAC, and audit logging
- extended Prisma schema, migration chain, and seed data for campus publishing workflows
- secure media/PDF upload and controlled preview/full-access policy
- route-structured admin portal with role-specific CRUD, review, and submission experiences
- polished public discovery site with slug-based routes, SEO metadata, and PDF preview
- real workspace verification: unit/integration/e2e/CI with browser automation
- production hardening and release documentation

### Definition of Done (verifiable conditions with commands)

- `pnpm lint` succeeds at repo root and no workspace script uses `--passWithNoTests`.
- `pnpm typecheck` succeeds at repo root.
- `pnpm test` executes real Vitest suites across API, admin, web, and shared packages.
- `pnpm test:e2e` executes API e2e plus Playwright browser suites.
- `pnpm build` succeeds for all apps/packages.
- `pnpm release:check` succeeds from a clean branch.
- Public routes exist and render live data for `/`, `/catalog`, `/catalog/[slug]`, `/authors`, `/authors/[slug]`, `/categories`, `/categories/[slug]`, `/blog`, and `/blog/[slug]`.
- Admin routes exist and enforce auth for `/dashboard`, `/books`, `/authors`, `/categories`, `/blog`, `/media`, `/seo`, and `/submissions`.
- API protected routes require valid session-backed auth; role escalation and revoked sessions are denied.
- Public PDF preview works only for allowed preview assets and never leaks raw non-public asset URLs.

### Must Have

- Extend existing working foundations instead of rewriting them blindly.
- Explicit role matrix covering `author_manager` and `submission_user`.
- Shared request/response contracts across API and both Next apps.
- Slug-based public canonical URLs.
- Automated QA with evidence for every task.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)

- No `localStorage`, `sessionStorage`, or client-side token persistence.
- No trust in client-supplied role headers or workflow-state claims.
- No raw `publicUrl` leakage for `PRIVATE` or `CAMPUS` assets.
- No second workflow state machine invented outside the locked content/submission lifecycles.
- No multi-campus rollout UX, no OCR/full-text PDF indexing, no payments/e-commerce in phase 1.
- No public canonical routes using record IDs after slug migration is complete.
- No UI task may skip Playwright setup by hand-waving QA; Task 6 is a hard prerequisite.

## Verification Strategy

> ZERO HUMAN INTERVENTION - all verification is agent-executed.

- Test decision: **tests-after** using Vitest for unit/integration, Supertest for API e2e, and Playwright for browser e2e.
- QA policy: every task includes happy-path and failure-path scenarios with concrete commands/data.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy

### Parallel Execution Waves

> Target: 5-8 tasks per wave. Shared prerequisites are extracted into Wave 1.

**Wave 1 — decision, foundation, and verification prerequisites**: 1, 2, 3, 4, 5, 6

**Wave 2 — authenticated/admin and public shell delivery**: 7, 8, 9

**Wave 3 — public content routes and campus workflow completion**: 10, 11

**Wave 4 — production tuning and launch verification**: 12

### Dependency Matrix (full, all tasks)

| Task | Blocks                   | Blocked By              |
| ---- | ------------------------ | ----------------------- |
| 1    | 2,3,4,5,6,7,8,9,10,11,12 | —                       |
| 2    | 5,7,8,10,11,12           | 1                       |
| 3    | 4,5,8,10,11,12           | 1                       |
| 4    | 7,8,9,10,11,12           | 1,3                     |
| 5    | 8,10,11,12               | 1,2,3                   |
| 6    | 7,8,9,10,11,12           | 1                       |
| 7    | 8,11,12                  | 1,2,4,6                 |
| 8    | 10,11,12                 | 1,2,3,4,5,6,7           |
| 9    | 10,12                    | 1,4,6                   |
| 10   | 12                       | 1,2,3,4,5,6,8,9         |
| 11   | 12                       | 1,2,3,4,5,6,7,8         |
| 12   | F1,F2,F3,F4              | 1,2,3,4,5,6,7,8,9,10,11 |

### Agent Dispatch Summary

- Wave 1 → 6 tasks → writing / deep / unspecified-high
- Wave 2 → 3 tasks → visual-engineering / deep
- Wave 3 → 2 tasks → visual-engineering / deep
- Wave 4 → 1 task → deep

## TODOs

> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Lock architecture defaults and corrected baseline

  **What to do**: Create `IMPLEMENTATION_DECISIONS.md` at repo root as the authoritative execution artifact. It must capture: corrected current-state matrix; role capability matrix; token/cookie lifetimes; `/api/v1` decision; public `?lang=` strategy; admin cookie-language strategy; slug-based public route map; PDF visibility/access matrix; publish-readiness rules; `submission_user` restricted-admin entry point; and the additive `Campus` seam plan. Include a `retain / refactor / extend / replace` classification for the current files already in use (`apps/api/src/main.ts`, auth module, admin login/actions, current public catalog/detail pages, CI workflow, shared packages).
  **Must NOT do**: Do not reopen product scope, invent new roles, add multi-campus UX, or leave architecture questions as TODOs.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: this task is architecture locking and execution guidance, not source implementation
  - Skills: `[]` - no special skill required
  - Omitted: `visual-engineering` - no UI implementation belongs here

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5,6,7,8,9,10,11,12 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/campus-publisher-full-implementation.md` - current plan being corrected and then executed
  - Pattern: `apps/api/src/main.ts:1-47` - existing hardening already present; classify as `retain + extend`
  - Pattern: `apps/api/src/modules/auth/auth.service.ts:1-63` - existing auth is real, not dummy
  - Pattern: `apps/admin/app/actions.ts:9-100` - current cookie/token bridge and allowed-role gate
  - Pattern: `apps/admin/app/login/page.tsx:1-103` - current admin auth entry point and seeded-login UX
  - Pattern: `apps/web/app/catalog/page.tsx:1-71` - public catalog already exists in partial form
  - Pattern: `apps/web/app/catalog/[id]/page.tsx:1-131` - current ID-based detail route to classify as `replace with redirect to slug`
  - Pattern: `.github/workflows/ci.yml:1-46` - existing CI that must be classified as `retain + strengthen`
  - API/Type: `packages/shared-types/src/index.ts:1-95` - real current contracts, including `author_manager`
  - API/Type: `packages/shared-schemas/src/index.ts:1-124` - real current validation surface
  - API/Type: `apps/api/prisma/schema.prisma:1-274` - current schema baseline for seam decisions

  **Acceptance Criteria** (agent-executable only):
  - [ ] `IMPLEMENTATION_DECISIONS.md` exists and contains no unresolved architectural TODO markers.
  - [ ] The document explicitly defines the role matrix, session model, versioning rule, localization rule, public route map, PDF policy, and publish-readiness rule.
  - [ ] The document classifies existing major modules/pages as `retain`, `refactor`, `extend`, or `replace` with referenced file paths.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Decision artifact completeness
    Tool: Bash
    Steps: run `grep -E "Role matrix|Session model|API versioning|Localization|Public route map|PDF policy|Publish readiness" IMPLEMENTATION_DECISIONS.md`
    Expected: each required section exists exactly once and contains concrete decisions, not placeholders
    Evidence: .sisyphus/evidence/task-1-architecture-defaults.txt

  Scenario: Scope-creep rejection
    Tool: Bash
    Steps: run `grep -E "multi-tenant rollout|OCR|payment|e-commerce" IMPLEMENTATION_DECISIONS.md || true`
    Expected: no banned phase-1 items appear as active deliverables; if mentioned, they are marked deferred/out of scope
    Evidence: .sisyphus/evidence/task-1-architecture-defaults-error.txt
  ```

  **Commit**: YES | Message: `docs(plan): lock campus publisher execution defaults` | Files: `IMPLEMENTATION_DECISIONS.md`

- [ ] 2. Harden existing auth, session rotation, RBAC, and API versioning

  **What to do**: Extend the current JWT+bcrypt login flow instead of replacing it. Implement `/api/v1` versioning at the API boundary; register auth/RBAC/rate-limit guards through Nest providers (`APP_GUARD`) rather than direct `new` instantiation in bootstrap; add refresh-token issuance, rotation, and revocation using the existing `Session` table; add `/auth/refresh` and `/auth/logout`; record audit events for login, refresh, logout, denied access, publish attempts, and role escalation attempts. Update Next server actions to store separate secure HttpOnly cookies (access + refresh) and include `author_manager` plus restricted `submission_user` access according to the locked role matrix.
  **Must NOT do**: Do not reintroduce header-based auth, unversioned endpoint drift, browser-side token storage, or client-component login/refresh calls.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: auth, security, guard registration, and versioning are cross-cutting and high-risk
  - Skills: `[]` - no special skill required
  - Omitted: `visual-engineering` - backend/session correctness is the priority

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 5,7,8,10,11,12 | Blocked By: 1

  **References**:
  - Pattern: `apps/api/src/modules/auth/auth.service.ts:1-63` - existing login and JWT issuance to extend
  - Pattern: `apps/api/src/common/auth/roles.guard.ts:1-31` - current role enforcement to preserve conceptually while moving to DI-registered guards
  - Pattern: `apps/api/src/main.ts:1-47` - current bootstrap currently owns global middleware/guards/versioning insertion point
  - Pattern: `apps/admin/app/actions.ts:9-100` - current server-action cookie bridge to convert into access+refresh cookie handling
  - Pattern: `apps/admin/app/login/page.tsx:1-103` - existing login route that must remain the entry point
  - API/Type: `packages/shared-types/src/index.ts:76-88` - current auth response types to extend for refresh flow
  - API/Type: `packages/shared-schemas/src/index.ts:100-117` - current auth validation schemas to extend
  - API/Type: `apps/api/prisma/schema.prisma:32-84` - `User`, `Role`, `Session`, and `AuditLog` persistence base
  - External: `https://docs.nestjs.com/security/authentication` - Nest auth patterns

  **Acceptance Criteria** (agent-executable only):
  - [ ] `/api/v1/auth/login`, `/api/v1/auth/refresh`, and `/api/v1/auth/logout` exist and work with session-backed rotation.
  - [ ] Protected admin/API calls succeed with valid cookies/tokens and fail with `401`/`403` after revocation or role mismatch.
  - [ ] `author_manager` and restricted `submission_user` behavior matches the locked role matrix.
  - [ ] Guard registration no longer depends on direct `new SimpleRateLimitGuard()` in bootstrap for global security flow.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Login, refresh, protected access
    Tool: Bash
    Steps: boot API; authenticate with seeded `admin@campus.local` / `ChangeMe123!`; capture access/refresh cookies from the server-side login flow; call a protected `/api/v1` endpoint; call `/api/v1/auth/refresh`; retry the protected endpoint with the rotated cookie set
    Expected: login succeeds; protected endpoint returns 200; refresh rotates the session token; old refresh token becomes unusable; audit rows exist for login and refresh
    Evidence: .sisyphus/evidence/task-2-auth-session.txt

  Scenario: Revocation and role denial
    Tool: Bash
    Steps: log in as a lower-privilege role; call a publish-only endpoint; log out; retry a protected endpoint with the revoked cookies
    Expected: publish attempt returns 403; revoked session returns 401; audit log records denied action and logout/revocation
    Evidence: .sisyphus/evidence/task-2-auth-session-error.txt
  ```

  **Commit**: YES | Message: `feat(api): harden auth sessions rbac and versioning` | Files: `apps/api/**`, `apps/admin/app/actions.ts`, `packages/shared-types/**`, `packages/shared-schemas/**`

- [ ] 3. Extend the Prisma schema, migration chain, and seeds from the current baseline

  **What to do**: Build on the existing schema and migration chain. Add a stub `Campus` model plus nullable `campusId` seam fields on `User`, `Author`, `Category`, `Book`, `BlogPost`, `Submission`, and media/content records that will need future campus partitioning. Extend `SeoMeta` to support `Author` and `Category`. Add `Submission.bookId` linkage for approved submissions and `BlogPost.authorId` as an optional relation while keeping `authorName` as display fallback. Add any missing indexes for slug lookups, public discovery queries, workflow queues, and preview-PDF access checks. Make seed data idempotent and include role coverage for `author_manager` and `submission_user`.
  **Must NOT do**: Do not rewrite existing migration history, create destructive migrations, or remove working relations without a compatible replacement.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: schema evolution, migration safety, and relation design are high-risk
  - Skills: `[]` - no special skill required
  - Omitted: `writing` - this is a real schema/data task, not documentation-only

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4,5,8,10,11,12 | Blocked By: 1

  **References**:
  - Pattern: `apps/api/prisma/schema.prisma:1-274` - current schema baseline that already includes sessions, audit logs, submissions, media, and SEO
  - Pattern: `apps/api/package.json:13-20` - Prisma migration/seed command contract already in place
  - API/Type: `apps/api/prisma/schema.prisma:32-84` - auth/session/audit models
  - API/Type: `apps/api/prisma/schema.prisma:86-156` - author/category/book/publication models
  - API/Type: `apps/api/prisma/schema.prisma:167-274` - file/media/blog/SEO/submission models
  - External: `https://www.prisma.io/docs/orm/prisma-migrate` - migration best practices

  **Acceptance Criteria** (agent-executable only):
  - [ ] New migration files apply cleanly on top of the existing migration chain and on an empty database.
  - [ ] Seed flow is idempotent and creates canonical role/user/demo content rows without duplication.
  - [ ] `SeoMeta` supports book, blog, author, and category targets; approved submissions can link to books.
  - [ ] Nullable `campusId` seams exist without changing phase-1 runtime behavior.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Migrate and seed from scratch
    Tool: Bash
    Steps: provision an empty test database; run `pnpm prisma:migrate`; run `pnpm prisma:seed`; query roles, users, submissions, books, seo metadata, and campus rows via Prisma or SQL
    Expected: migrations succeed; seed exits 0; canonical rows exist; rerunning seed preserves uniqueness
    Evidence: .sisyphus/evidence/task-3-schema-seed.txt

  Scenario: Constraint and duplicate rejection
    Tool: Bash
    Steps: rerun seed twice and attempt to create duplicate slugs / duplicate unique SEO target links / invalid submission-book relation data
    Expected: canonical seed data is not duplicated; schema rejects invalid duplicates and broken relations
    Evidence: .sisyphus/evidence/task-3-schema-seed-error.txt
  ```

  **Commit**: YES | Message: `feat(db): extend campus workflow schema safely` | Files: `apps/api/prisma/**`, `apps/api/scripts/**`

- [ ] 4. Expand shared contracts, validation, and API client conventions

  **What to do**: Extend the already-real shared packages so they cover the full execution surface: refresh/login/logout DTOs; author/category/book/blog/media/submission CRUD inputs and responses; public query/filter/pagination contracts; SEO contracts for all public entities; publish-readiness validation; and versioned API envelope usage. Create distinct API client conventions for `apps/admin` and `apps/web`: admin remains `no-store` with cookie-authenticated server actions, while web uses a dedicated helper with `revalidate: 300` and `lang` query propagation. Update both Next apps to consume `/api/v1` consistently.
  **Must NOT do**: Do not leave controller-local DTO shapes as the only source of truth or reuse admin `no-store` defaults for public ISR traffic.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-package contract work touches API and both Next apps
  - Skills: `[]` - no special skill required
  - Omitted: `visual-engineering` - this is interface discipline, not UI layout work

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7,8,9,10,11,12 | Blocked By: 1,3

  **References**:
  - Pattern: `packages/shared-types/src/index.ts:1-95` - current type exports to extend
  - Pattern: `packages/shared-schemas/src/index.ts:1-124` - current Zod contract style to extend
  - Pattern: `apps/admin/app/lib/api.ts:1-72` - current admin fetch helper that should remain `no-store`
  - Pattern: `apps/admin/app/actions.ts:103-160` - current action payload creation that must consume shared contracts
  - Pattern: `apps/web/app/catalog/page.tsx:1-71` - public rendering already using bilingual data returned from API
  - Pattern: `apps/web/app/catalog/[id]/page.tsx:1-131` - current detail route to migrate onto shared slug/public contracts
  - API/Type: `apps/api/prisma/schema.prisma:86-274` - entity fields requiring consistent DTO coverage

  **Acceptance Criteria** (agent-executable only):
  - [ ] Shared packages expose typed contracts for auth/session, books, authors, categories, blog, media, SEO, submissions, pagination, and error envelopes.
  - [ ] `apps/admin` and `apps/web` use different fetch helpers aligned to their caching/auth requirements.
  - [ ] All Next API calls point at `/api/v1` and compile/typecheck against shared contracts.
  - [ ] Invalid publish transitions and malformed bilingual payloads fail validation using shared schemas.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Shared-contract compile verification
    Tool: Bash
    Steps: run `pnpm typecheck` after wiring the updated shared contracts into API, admin, and web imports
    Expected: typecheck succeeds with no stale unversioned endpoints or controller-only payload drift
    Evidence: .sisyphus/evidence/task-4-shared-contracts.txt

  Scenario: Validation rejection path
    Tool: Bash
    Steps: send malformed `/api/v1` payloads for invalid slug, missing bilingual publish fields, and impossible workflow transitions
    Expected: API returns structured validation errors using the shared error envelope; no untyped 500s occur
    Evidence: .sisyphus/evidence/task-4-shared-contracts-error.txt
  ```

  **Commit**: YES | Message: `refactor(shared): extend contracts and client conventions` | Files: `packages/shared-types/**`, `packages/shared-schemas/**`, `apps/api/**`, `apps/admin/**`, `apps/web/**`

- [ ] 5. Secure media storage, PDF delivery, and asset response policy

  **What to do**: Replace any direct/raw asset exposure with a policy-aware media delivery layer. Keep the current upload foundation, but add a storage abstraction for local dev + object storage readiness, explicit MIME/size enforcement, metadata update/delete flows, malware-scan hook interface, and access-policy checks for `PUBLIC`, `CAMPUS`, and `PRIVATE` assets. For books, implement preview-only public delivery from a controlled endpoint and ensure the current public preview path is validated against publication status, `BookFile.isPreview`, and asset visibility. Preserve native browser PDF viewing in both apps.
  **Must NOT do**: Do not return raw `publicUrl` for non-public assets, and do not let full PDFs become anonymously accessible.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: file security, asset policy, and public preview logic are high-risk
  - Skills: `[]` - no special skill required
  - Omitted: `visual-engineering` - storage and authorization policy matter more than UI here

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8,10,11,12 | Blocked By: 1,2,3

  **References**:
  - Pattern: `apps/web/app/catalog/[id]/page.tsx:63-127` - current public preview embed that must be pointed at the hardened policy endpoint
  - Pattern: `apps/admin/app/actions.ts:138-160` - existing authenticated mutation pattern to preserve for media admin actions
  - API/Type: `apps/api/prisma/schema.prisma:139-181` - publication and `BookFile` policy fields
  - API/Type: `apps/api/prisma/schema.prisma:225-239` - `MediaAsset` persistence fields including `publicUrl`
  - External: `https://docs.nestjs.com/techniques/file-upload` - Nest file upload handling reference

  **Acceptance Criteria** (agent-executable only):
  - [ ] Admin upload/update/delete flows enforce allowed MIME types, size limits, and role protection.
  - [ ] Public preview succeeds only for published `preview_pdf` assets with `PUBLIC` visibility.
  - [ ] `CAMPUS` assets require authenticated active sessions; `PRIVATE` assets remain admin-only.
  - [ ] API responses never expose raw non-public storage URLs.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Allowed preview and authenticated full access
    Tool: Bash
    Steps: seed a published book with both preview and full PDF assets; request the public preview endpoint anonymously; request the authenticated full-PDF endpoint with admin cookies; inspect the returned JSON for asset metadata
    Expected: anonymous preview returns 200 only for the preview asset; authenticated full route returns 200; metadata omits raw non-public URLs
    Evidence: .sisyphus/evidence/task-5-media-policy.txt

  Scenario: Policy denial and invalid upload
    Tool: Bash
    Steps: request a draft/private/campus-only asset anonymously; upload an invalid MIME or oversize file through the admin API
    Expected: unauthorized asset requests return 401/403/404 per policy; invalid upload is rejected with structured errors; no direct storage key is leaked
    Evidence: .sisyphus/evidence/task-5-media-policy-error.txt
  ```

  **Commit**: YES | Message: `feat(media): enforce secure asset and pdf policy` | Files: `apps/api/**`, `apps/admin/**`, `apps/web/**`

- [ ] 6. Strengthen quality gates, add Playwright, and make UI QA executable

  **What to do**: Upgrade the already-existing CI and script baseline into real quality gates. Remove `--passWithNoTests` from `apps/web/package.json` and `apps/admin/package.json`; add meaningful Vitest suites for shared logic/components; expand API integration/e2e coverage beyond health; add Playwright configuration, browser install steps, and reusable seeded-auth helpers for admin/public flows; update root `pnpm test:e2e` and `.github/workflows/ci.yml` so browser tests run in CI. This task is the hard prerequisite for UI-task QA in Tasks 7-11.
  **Must NOT do**: Do not leave any workspace package able to report success with zero tests.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: monorepo tooling, CI, browser automation, and test orchestration span multiple apps
  - Skills: `[]` - no special skill required
  - Omitted: `writing` - the deliverable is executable verification infrastructure

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7,8,9,10,11,12 | Blocked By: 1

  **References**:
  - Pattern: `package.json:6-20` - root command contract including `test:e2e` and `release:check`
  - Pattern: `apps/api/package.json:5-20` - current API test/migrate scripts
  - Pattern: `apps/web/package.json:5-13` - current `vitest run --passWithNoTests` to remove
  - Pattern: `apps/admin/package.json:5-12` - current `vitest run --passWithNoTests` to remove
  - Pattern: `.github/workflows/ci.yml:1-46` - existing CI to strengthen rather than replace
  - Pattern: `apps/api/test/health.e2e-spec.ts:1-31` - current e2e pattern to expand

  **Acceptance Criteria** (agent-executable only):
  - [ ] `apps/web` and `apps/admin` no longer use `--passWithNoTests`.
  - [ ] `pnpm test:e2e` runs API e2e plus Playwright suites from repo root.
  - [ ] CI installs browser dependencies and runs lint, typecheck, test, e2e, build, and release checks.
  - [ ] Tasks 7-11 can execute their Playwright QA scenarios without adding ad hoc test scaffolding.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Healthy full pipeline
    Tool: Bash
    Steps: run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build && pnpm release:check` from repo root and inspect `.github/workflows/ci.yml`
    Expected: every command exits 0 on a healthy branch; CI includes browser setup plus matching jobs
    Evidence: .sisyphus/evidence/task-6-quality-gates.txt

  Scenario: Gate failure detection
    Tool: Bash
    Steps: introduce a controlled failing test or lint violation in a temporary local change and rerun the affected command
    Expected: the command fails non-zero and points to the exact failing suite/rule; the branch cannot pass CI with zero-test shortcuts
    Evidence: .sisyphus/evidence/task-6-quality-gates-error.txt
  ```

  **Commit**: YES | Message: `build(ci): enforce real tests and playwright gates` | Files: `.github/workflows/**`, `package.json`, `apps/**`, `packages/**`, `playwright.config.*`

- [ ] 7. Build the protected admin information architecture and role-aware shell

  **What to do**: Replace the single giant dashboard page with a route-structured authenticated workspace. Implement a protected layout and navigation for `/dashboard`, `/books`, `/authors`, `/categories`, `/blog`, `/media`, `/seo`, and `/submissions`. Role visibility must follow the locked matrix: `submission_user` sees only submissions routes; `author_manager` sees author-related routes; editorial roles see review/publish surfaces according to permissions. Preserve the existing login page as the sign-in entry point and the admin language cookie flow. Include loading, empty, error, and success states plus accessible nav, forms, and feedback components.
  **Must NOT do**: Do not keep the primary admin UX as one long home page, and do not expose hidden routes in nav to unauthorized roles.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this is major information architecture and UI system work on top of existing auth
  - Skills: `[]` - no special skill required
  - Omitted: `deep` - backend/auth foundations are already handled by Tasks 2 and 4

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8,11,12 | Blocked By: 1,2,4,6

  **References**:
  - Pattern: `apps/admin/app/page.tsx:1-140` - current single-page shell to replace
  - Pattern: `apps/admin/app/login/page.tsx:1-103` - login UX that remains the portal entry point
  - Pattern: `apps/admin/app/actions.ts:1-160` - current server actions and cookie-language behavior to keep wired
  - Pattern: `apps/admin/app/lib/api.ts:1-72` - authenticated fetch helper to preserve
  - API/Type: `packages/shared-types/src/index.ts:15-23` - role names including `author_manager` and `submission_user`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Unauthenticated visits to protected admin routes redirect or deny consistently.
  - [ ] Navigation and route access are filtered correctly for `publisher_admin`, `editor`, `author_manager`, and `submission_user`.
  - [ ] Admin layout provides reusable loading, empty, error, success, and confirmation patterns.
  - [ ] Keyboard navigation and form error messaging are accessible.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Admin shell and role-filtered navigation
    Tool: Playwright
    Steps: sign in as `admin@campus.local`; visit `/dashboard`, `/books`, `/authors`, `/categories`, `/blog`, `/media`, `/seo`, and `/submissions`; sign out; sign in as a seeded `submission_user` and revisit the shell
    Expected: admin can reach all permitted sections; `submission_user` only sees submission routes; unauthorized nav items and routes are hidden or blocked
    Evidence: .sisyphus/evidence/task-7-admin-shell.png

  Scenario: Unauthorized route and invalid form state
    Tool: Playwright
    Steps: open a protected admin route without auth; then inside an authenticated session submit an invalid form with missing required fields
    Expected: anonymous user is redirected to `/login`; invalid form shows field-level and summary feedback without page crashes
    Evidence: .sisyphus/evidence/task-7-admin-shell-error.png
  ```

  **Commit**: YES | Message: `feat(admin): add role-aware workspace shell` | Files: `apps/admin/**`

- [ ] 8. Implement admin CRUD, SEO, and editorial workflow operations

  **What to do**: Build dedicated list/detail/create/edit flows for books, authors, categories, blog posts, media library, and SEO. Use the route shell from Task 7 and the role matrix from Task 1: `author_manager` handles authors and related bios/media; `catalog_manager` handles books/categories/media/SEO; `editor` can create/update and submit for review; `reviewer` can approve/reject review states; `publisher_admin`/`super_admin` can publish/archive. Deny destructive deletes for in-use published records; require archive or relation cleanup instead of unsafe hard deletion. Ensure all CRUD flows use shared contracts and versioned endpoints.
  **Must NOT do**: Do not leave entity management trapped on the homepage, and do not allow final publish/archive to non-publisher roles.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: complex data-heavy admin UI layered on real APIs/workflows
  - Skills: `[]` - no special skill required
  - Omitted: `writing` - execution and permission behavior dominate

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10,11,12 | Blocked By: 1,2,3,4,5,6,7

  **References**:
  - Pattern: `apps/admin/app/page.tsx:58-64` - current module intent that must become real routed screens
  - Pattern: `apps/admin/app/actions.ts:103-160` - current mutation examples to extend into full CRUD workflows
  - Pattern: `apps/api/src/modules/app.module.ts:1-36` - current backend module boundaries available for admin integration
  - API/Type: `apps/api/prisma/schema.prisma:86-274` - entity relationships and workflow fields to expose correctly
  - API/Type: `packages/shared-schemas/src/index.ts:3-124` - slug, role, workflow, and envelope conventions to keep consistent

  **Acceptance Criteria** (agent-executable only):
  - [ ] Admin users can create, edit, search, filter, review, approve/reject, publish/archive, and safely delete/deny-delete according to the locked role matrix.
  - [ ] SEO and media management live on dedicated routes, not only on a home dashboard widget.
  - [ ] Publish/archive is blocked until bilingual publish-readiness checks pass.
  - [ ] In-use published records cannot be destructively deleted without policy-approved cleanup.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Editorial CRUD and publish flow
    Tool: Playwright
    Steps: sign in as editor; create category `campus-research`, author `Dr. Sinta`, and book `campus-systems-101`; attach SEO + preview PDF; send the book to review; switch to reviewer to approve; switch to publisher_admin to publish
    Expected: records appear in lists/details; workflow transitions obey role restrictions; publish succeeds only after bilingual fields and required relations are complete
    Evidence: .sisyphus/evidence/task-8-admin-crud.png

  Scenario: Permission denial and unsafe delete rejection
    Tool: Playwright
    Steps: attempt publish as editor; submit duplicate slug data; try deleting a published/in-use author or category without cleanup
    Expected: publish attempt is blocked; duplicate slug shows validation feedback; unsafe delete is denied with clear policy messaging
    Evidence: .sisyphus/evidence/task-8-admin-crud-error.png
  ```

  **Commit**: YES | Message: `feat(admin): implement editorial and seo workflows` | Files: `apps/admin/**`, `apps/api/**`, `packages/shared-*/**`

- [ ] 9. Upgrade the public shell, landing page, and shared discovery components

  **What to do**: Turn the current public site into a polished bilingual shell around the already-partial landing/catalog work. Build a shared header/footer, language switch behavior, navigation, campus trust sections, featured content blocks, empty-state components, and page scaffolds for public discovery. Ensure nav targets exist for `/catalog`, `/authors`, `/categories`, and `/blog`, and keep all shared public components compatible with the slug-based route strategy in Task 10.
  **Must NOT do**: Do not keep broken navigation, placeholder-only sections, or admin-style no-store data patterns in the public shell.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: public IA, branding, accessibility, and shared component polish dominate
  - Skills: `[]` - no special skill required
  - Omitted: `deep` - data/query behavior is handled more heavily in Task 10

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10,12 | Blocked By: 1,4,6

  **References**:
  - Pattern: `apps/web/app/page.tsx:1-77` - current landing and `?lang=` pattern to preserve
  - Pattern: `apps/web/app/catalog/page.tsx:1-71` - existing catalog cards and public navigation style
  - Pattern: `apps/web/app/blog/page.tsx:1-23` - current blog shell to fold into the shared public layout
  - Pattern: `README.md` - SEO-first / SSR-first product framing

  **Acceptance Criteria** (agent-executable only):
  - [ ] Landing page and shared public layout provide functioning bilingual navigation and responsive campus-oriented sections.
  - [ ] Header/footer links resolve to implemented route shells with no dead links.
  - [ ] Shared public components are accessible by keyboard and compatible with later live-data route work.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Public shell navigation and language behavior
    Tool: Playwright
    Steps: open `/` in desktop and mobile viewports; toggle `?lang=en` and `?lang=id`; use header/footer links to navigate to catalog, authors, categories, and blog route shells
    Expected: layout remains responsive; language toggle updates content chrome; all linked routes resolve without dead links
    Evidence: .sisyphus/evidence/task-9-public-shell.png

  Scenario: Accessibility and dead-link regression
    Tool: Playwright
    Steps: tab through header, hero CTAs, and footer links; inspect heading order and landmark regions; click every primary navigation item
    Expected: keyboard traversal is usable; no link resolves to 404; semantic structure is consistent
    Evidence: .sisyphus/evidence/task-9-public-shell-error.png
  ```

  **Commit**: YES | Message: `feat(web): build public shell and landing experience` | Files: `apps/web/**`

- [ ] 10. Complete live public routes, slug migration, SEO surfaces, and public PDF preview

  **What to do**: Convert public discovery pages into live, SEO-grade routes backed by real API data. Replace `/catalog/[id]` with canonical `/catalog/[slug]` and implement redirect behavior from legacy ID links. Add `/authors`, `/authors/[slug]`, `/categories`, `/categories/[slug]`, `/blog`, and `/blog/[slug]` using live data, structured metadata, canonical URLs, internal linking, search/filter/pagination where appropriate, and policy-controlled preview PDF embedding. Use the dedicated public fetch helper with `revalidate: 300`. Public queries must exclude unpublished/private content.
  **Must NOT do**: Do not leave canonical public URLs ID-based, and do not surface draft/private metadata publicly.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: public route execution blends UX, SEO, and data presentation
  - Skills: `[]` - no special skill required
  - Omitted: `writing` - implementation detail outweighs prose work

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 1,2,3,4,5,6,8,9

  **References**:
  - Pattern: `apps/web/app/catalog/page.tsx:1-71` - existing catalog list foundation
  - Pattern: `apps/web/app/catalog/[id]/page.tsx:1-131` - current detail route to migrate to slug + redirect policy
  - Pattern: `apps/web/app/blog/page.tsx:1-23` - blog shell needing live data
  - API/Type: `apps/api/prisma/schema.prisma:86-274` - author/category/book/blog/SEO/media relationships to expose publicly
  - API/Type: `packages/shared-types/src/index.ts:1-95` - shared workflow/media/pagination contract conventions
  - API/Type: `packages/shared-schemas/src/index.ts:3-124` - validation conventions for slugs and envelopes

  **Acceptance Criteria** (agent-executable only):
  - [ ] Public routes exist for `/catalog/[slug]`, `/authors`, `/authors/[slug]`, `/categories`, `/categories/[slug]`, `/blog`, and `/blog/[slug]` with live data.
  - [ ] The old `/catalog/[id]` path redirects to the canonical slug route.
  - [ ] Metadata/canonical tags render per route using live SEO data where available.
  - [ ] Search/filter/pagination work against real published API data.
  - [ ] Public PDF preview uses the controlled preview endpoint and never exposes full/private assets.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Published discovery and canonical routing
    Tool: Playwright
    Steps: seed published books, authors, categories, and blog posts; visit catalog, author, category, and blog pages; open a book detail page by slug; visit the old ID detail URL and observe redirect behavior
    Expected: all pages render live published data; old ID route redirects to slug canonical URL; metadata/canonical tags exist; related links stay coherent
    Evidence: .sisyphus/evidence/task-10-public-routes.png

  Scenario: Unpublished/private denial
    Tool: Playwright
    Steps: navigate directly to unpublished book/blog/author/category URLs and private preview endpoints
    Expected: unpublished/private resources return not-found or policy denial without leaking metadata or raw asset URLs
    Evidence: .sisyphus/evidence/task-10-public-routes-error.png
  ```

  **Commit**: YES | Message: `feat(web): ship live public routes and seo surfaces` | Files: `apps/web/**`, `apps/api/**`, `packages/shared-*/**`

- [ ] 11. Implement restricted submission portal and campus review workflow

  **What to do**: Build the campus submission workflow inside the restricted admin portal. `submission_user` must be able to create, edit, submit, and track only their own submissions. Reviewer/editor/publisher roles must have queue views, reviewer assignment, approval/rejection notes, audit history, and transition controls aligned to the locked submission lifecycle. When a submission is approved, link it to a book record (or create a draft book if that is the chosen approval path) so it feeds the standard editorial/catalog pipeline instead of inventing a second publication system.
  **Must NOT do**: Do not allow `submission_user` to see editorial CMS routes, and do not allow submissions to bypass approval into public publication.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: workflow orchestration spans schema, API, permissions, and portal UX
  - Skills: `[]` - no special skill required
  - Omitted: `writing` - system behavior and guardrails are the core work

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 1,2,3,4,5,6,7,8

  **References**:
  - Pattern: `apps/admin/app/page.tsx:58-64` - current submissions section intent that must become real routes
  - Pattern: `apps/admin/app/actions.ts:1-160` - current server-action pattern for authenticated mutations
  - API/Type: `apps/api/prisma/schema.prisma:255-274` - existing `Submission` model to extend and operationalize
  - API/Type: `packages/shared-types/src/index.ts:8-23,90-95` - submission status, role names, and submission input baseline
  - API/Type: `packages/shared-schemas/src/index.ts:37-54,119-124` - submission and role validation conventions

  **Acceptance Criteria** (agent-executable only):
  - [ ] `submission_user` can create, edit, submit, and track only their own submissions.
  - [ ] Reviewer/editor/publisher roles see different queue actions and cannot violate the locked submission lifecycle.
  - [ ] Approval/rejection actions persist notes, audit history, and submission→book linkage.
  - [ ] Submission workflow never creates publicly visible content without the normal editorial publish path.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Submission-user to editorial handoff
    Tool: Playwright
    Steps: sign in as seeded `submission_user`; create submission `campus-journal-issue-1` with bilingual metadata and preview asset; submit it; sign in as reviewer to move it to `in_review`; sign in as publisher_admin to approve and attach/create the draft book record
    Expected: each role sees only allowed controls; status transitions are valid; audit/history entries appear; the approved submission links to a non-public book record pending normal publish flow
    Evidence: .sisyphus/evidence/task-11-submission-workflow.png

  Scenario: Ownership and transition denial
    Tool: Playwright
    Steps: sign in as one submission user and try opening another user’s submission; attempt direct publish from a submission route; attempt reviewer actions as `submission_user`
    Expected: cross-user access is denied; direct publish is blocked; invalid role actions show clear error feedback and create denial audit entries
    Evidence: .sisyphus/evidence/task-11-submission-workflow-error.png
  ```

  **Commit**: YES | Message: `feat(campus): implement restricted submission workflow` | Files: `apps/api/**`, `apps/admin/**`, `packages/shared-*/**`

- [ ] 12. Tune production behavior, release hardening, and launch verification

  **What to do**: Build on the existing bootstrap hardening instead of duplicating it. Finalize per-route rate-limit policy, CSP/HSTS and other secure-header tuning, health vs readiness checks, structured log coverage, request-correlation visibility, sitemap/robots hardening, environment validation, cache/revalidation documentation, and release/deploy runbooks. Confirm versioned endpoints, public SEO artifacts, and release commands behave correctly in a clean environment.
  **Must NOT do**: Do not relitigate already-finished foundation work from `main.ts`; this task is to tune, verify, and operationalize it.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: production runtime, SEO artifacts, and release safety span the whole platform
  - Skills: `[]` - no special skill required
  - Omitted: `visual-engineering` - operational safety dominates this stage

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1,F2,F3,F4 | Blocked By: 1,2,3,4,5,6,7,8,9,10,11

  **References**:
  - Pattern: `apps/api/src/main.ts:1-47` - existing middleware/filter/interceptor/security setup to tune rather than rebuild
  - Pattern: `apps/api/src/modules/app.module.ts:1-36` - module registration surface for operational providers
  - Pattern: `.github/workflows/ci.yml:1-46` - release pipeline contract to keep aligned with runtime docs
  - Pattern: `package.json:6-20` - root release-check commands that must pass in clean environments
  - Pattern: `README.md` - current setup docs to expand with production guidance

  **Acceptance Criteria** (agent-executable only):
  - [ ] Health/readiness, structured logging, security headers, and rate-limit tuning are documented and validated.
  - [ ] `robots.txt`, sitemap output, and canonical SEO behavior are production-ready for the public app.
  - [ ] Environment validation and deploy/runbook docs cover auth secrets, DB, storage, and release commands.
  - [ ] A clean-environment startup following docs succeeds without hidden manual fixes.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Clean launch verification
    Tool: Bash
    Steps: provision a clean environment from docs; run install, migrate, seed, build, and startup commands; hit readiness endpoints and public SEO artifacts
    Expected: the app boots from documented steps alone; readiness passes; sitemap/robots respond correctly; logs contain request correlation IDs
    Evidence: .sisyphus/evidence/task-12-launch-hardening.txt

  Scenario: Abuse and failure behavior
    Tool: Bash
    Steps: send repeated requests to a rate-limited endpoint; trigger a validation error and an internal error path; inspect returned payloads and log output
    Expected: rate limiting activates; error responses stay structured/sanitized; logs include correlation data without leaking secrets
    Evidence: .sisyphus/evidence/task-12-launch-hardening-error.txt
  ```

  **Commit**: YES | Message: `chore(platform): tune production runtime and release docs` | Files: `apps/api/**`, `apps/web/**`, `apps/admin/**`, `.github/**`, `README.md`, `apps/api/.env.example`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy

- Commit by dependency cluster, not by file type.
- Required commit groups: architecture defaults, auth/versioning, schema/contracts, media policy, quality gates, admin shell, admin workflows, public shell, public routes, submission workflow, production hardening.
- Do not mix auth/session changes with large visual polish commits.
- Do not land public slug-route changes without corresponding redirect and internal-link updates in the same commit cluster.

## Success Criteria

- Campus contributors can authenticate, submit work, and track submission progress without seeing unrelated CMS surfaces.
- Editorial/admin users can manage catalog, authors, blog, media, SEO, and workflow transitions under enforced RBAC.
- Public users can browse bilingual content, use slug-based discovery routes, and preview only allowed PDFs safely.
- The monorepo passes automated lint, type, unit, integration, and browser e2e checks through CI and release commands.
- Future multi-campus expansion remains additive because the schema/contracts already contain the `campusId` seam.
