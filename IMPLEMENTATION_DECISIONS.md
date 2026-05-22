# Implementation Decisions

This document acts as the authoritative execution artifact for the Campus Publisher Platform, detailing the architecture defaults, workflow rules, and module classifications for Phase 1.

## 1. Corrected Current-State Matrix & File Classifications

| Area | Component / File | Classification |
|---|---|---|
| API Bootstrap | `apps/api/src/main.ts` | **Retain + Extend** (Harden guards, add `/api/v1`) |
| Auth & RBAC | `apps/api/src/modules/auth/auth.service.ts` | **Retain + Extend** (Add session rotation, audit log) |
| Auth & RBAC | `apps/admin/app/actions.ts` | **Refactor** (Secure HttpOnly cookies access/refresh bridge) |
| Auth & RBAC | `apps/admin/app/login/page.tsx` | **Retain + Extend** (Keep as entry point, update APIs) |
| Database | `apps/api/prisma/schema.prisma` | **Retain + Extend** (Add `campusId` seams, SEO targets) |
| Shared Contracts | `packages/shared-types`, `packages/shared-schemas` | **Retain + Extend** (Add full DTOs, workflow schemas) |
| Admin App | `apps/admin/app/page.tsx` | **Replace** (Giant dashboard replaced with structured routing) |
| Public Web | `apps/web/app/catalog/page.tsx` | **Retain + Extend** (Live data, SEO) |
| Public Web | `apps/web/app/catalog/[id]/page.tsx` | **Replace** (Redirect to `[slug]` canonical route) |
| CI & Tools | `.github/workflows/ci.yml`, `package.json` | **Retain + Strengthen** (Add Playwright, remove dummy tests) |

## 2. Role Capability Matrix
- **`super_admin`**: Platform-wide access, user/role management, publish/archive.
- **`publisher_admin`**: Editorial, catalog, media, SEO, submission operations. Cannot manage users.
- **`editor`**: Create/update content, send to review, edit approved drafts. No final publish/archive.
- **`catalog_manager`**: Manage books, categories, media, SEO. No publish/archive.
- **`author_manager`**: Manage authors and author-linked metadata/media. No publish/archive.
- **`reviewer`**: Review queues, approve/reject review states. No publish/archive.
- **`submission_user`**: Restricted portal for creating and tracking own submissions only.
- **`viewer`**: Authenticated read-only API user. No admin portal access.

## 3. Token & Session Storage Strategy
- **Client Side**: `localStorage`, `sessionStorage`, and exposed JS memory are strictly **PROHIBITED** for tokens.
- **Admin App**: Uses server-managed secure HttpOnly cookies exclusively (`apps/admin/app/actions.ts` handles the bridge).
- **Access Token Lifetime**: 15 minutes.
- **Refresh Token Lifetime**: 7 days. Rotates on every successful refresh. Logout revokes the session row.

## 4. API Versioning
- **URI Versioning**: Implemented strictly via `/api/v1`.
- Downstream clients (web & admin) must update fetch helpers to consume versioned endpoints. Unversioned endpoints are deprecated immediately.

## 5. Localization Strategy
- **Public App**: Uses query param `?lang=en|id`.
- **Admin App**: Uses cookie-based language selection.
- **API**: Always returns both localized fields (`titleId`, `titleEn`) and does not decide language via header/cookie.

## 6. Public Route Map (Slug-based)
- `/catalog/[slug]`
- `/authors/[slug]`
- `/categories/[slug]`
- `/blog/[slug]`
*(Note: Legacy `/catalog/[id]` must strictly redirect to the `[slug]` variant after migration).*

## 7. PDF Visibility and Access Matrix
- **Public Preview**: Requires `Publication.status = PUBLISHED`, `Publication.isPublic = true`, `BookFile.isPreview = true`, and `BookFile.visibility = PUBLIC`.
- **Full PDFs**: Authenticated/admin-only in Phase 1. `CAMPUS` visibility means any authenticated, non-revoked session.
- **Data Policy**: Raw non-public asset URLs (`publicUrl`) are **NEVER** exposed in API responses.

## 8. Publish-Readiness Rules
- Content cannot transition to `published` unless required bilingual fields are complete.
  - **Books**: require `titleId`, `titleEn`, `summaryId`, `summaryEn`.
  - **Blog**: requires bilingual title + excerpt metadata.
  - **Author/Category**: requires whichever localized fields are displayed on public pages.

## 9. Submission Portal Entry Point
- **`submission_user`**: Utilizes the identical Next.js admin app but is strictly restricted to seeing ONLY `/submissions` routes, logout, and profile surfaces. They must not see the editorial CMS interface.

## 10. Additive `Campus` Seam Plan
- Phase 1 remains **single-campus**.
- A stub `Campus` model plus a nullable `campusId` seam field will be added on core records (`User`, `Author`, `Category`, `Book`, `BlogPost`, `Submission`, media). This prepares for future multi-campus capability without breaking or requiring tenant-aware UX in Phase 1.
