# The Brain (Deep Technical Context)

## Architecture Lock Defaults (Wave 1 Rules)
- **Role Matrix Rules**: Use exact string values (`super_admin`, `publisher_admin`, `editor`, `catalog_manager`, `author_manager`, `reviewer`, `submission_user`, `viewer`). No ad-hoc additions.
- **Session Rules**: JWT tokens must not be persisted in localStorage/sessionStorage. Use secure HttpOnly cookies strictly for the NextJS Admin app. 15 min access, 7 days refresh.
- **Database/Prisma Seams**: Initial implementation must remain single-tenant but prepare `campusId` seams as nullable fields for the future. Destructive schema changes must be avoided.
- **Preview PDF Policy**: Raw `publicUrl` fields must never leak for `PRIVATE` or `CAMPUS` visibility assets.
- **Quality Gates Constraint**: No dummy UI test passes (`--passWithNoTests`). Playwright testing must be established as a hard dependency in Wave 1.

## Workflow Rules
- Content progression must only be: `draft → review → approved → published → archived`.
- Submissions progression: `draft → submitted → in_review → approved/rejected`.
- **Public URL Conventions**: URLs MUST be slug-based (e.g. `/catalog/[slug]`), not ID-based. Legacy `/catalog/[id]` must redirect.
