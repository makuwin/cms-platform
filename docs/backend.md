# NovaCMS Backend Overview

This document captures the current backend architecture that powers NovaCMS.

## Stack & Structure

- **Runtime**: Next.js App Router hosting API routes under `apps/api/app/api/*`.
- **Language**: TypeScript (strict config via shared `@repo/typescript-config`).
- **Database**: PostgreSQL accessed through Prisma (`apps/api/prisma/schema.prisma`).
- **Auth**: JWT-based (short-lived access + refresh) with role/permission mapping in `apps/api/lib/auth.ts`.
- **Key Modules**:
  - `app/api/auth/*`: Login, register, refresh, logout, me.
  - `app/api/content/*`: CRUD for content entries (versions, publish status).
  - `app/api/media/upload`: Media upload endpoint (writes to `apps/api/public/media`).
  - `lib/auth.ts`: Token helpers, permissions, `getAuthUserFromRequest`.
  - `lib/validation.ts`: Payload validators (login, register, content).
  - `lib/prisma.ts`: Prisma client singleton.

## Data Models (Prisma)

### `User`
- `id`, `email`, `name`, optional `passwordHash`.
- `role` (admin/editor/author/viewer) + `permissions` array.
- `primaryAdminLock` used to prevent duplicate initial admins.
- Relations to created/updated content and content versions.

### `Content`
- `title`, `slug` (unique), `type` (free-form), `status` (`draft` by default), optional `description`.
- Timestamps: `createdAt`, `updatedAt`, optional `publishedAt`.
- `createdById`, `updatedById`, optional `publishedVersionId`.
- Relations: `versions` (latest-first), `createdBy`, `updatedBy`, `publishedVersion`.

### `ContentVersion`
- `version` integer per content (`@@unique([contentId, version])`).
- `data` stored as JSON (rich text payload from Quill).
- Optional `publishedAt`, `createdById`.

Recent addition: `/api/content/[id]/status` updates `status` and auto-sets `publishedAt` when status transitions to `published`.

## Auth & Permissions

- `signTokens` issues access (15 min) and refresh (14 day) JWTs. Secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
- `getAuthUserFromRequest` tries bearer header first, then `access_token` cookie.
- Role permissions (in `lib/auth.ts`):
  - `admin`: `*` (full access).
  - `editor`: `content:*`, `media:*`, `comments:moderate` (placeholder).
  - `author`: `content:create`, `content:edit:own`, `media:upload`.
  - `viewer`: `content:read`, `comments:create` (comments not yet implemented).
- `hasPermission(user, action)` supports wildcard domains/actions (`content:*`).

## API Contract Highlights

| Endpoint | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/auth/register` | POST | Public | Returns `{ user, accessToken, refreshToken }`. First user auto-promoted to primary admin (enforced via unique `primaryAdminLock`). |
| `/api/auth/login` | POST | Public | Issues tokens + sets `access_token`/`refresh_token` cookies. |
| `/api/auth/refresh` | POST | Public | Requires refresh token, returns new tokens. |
| `/api/auth/logout` | POST | Auth | Clears auth cookies. |
| `/api/auth/me` | GET | Auth | Returns current user info. |
| `/api/content` | GET | Auth optional | Without auth → published content only; with `content:read` → all. Includes latest version, author info. |
| `/api/content` | POST | `content:create` | Creates draft content + version. |
| `/api/content/[id]` | GET | `content:read` | Full content with versions. |
| `/api/content/[id]` | PUT | `content:*` or owner + `content:edit:own` | Updates metadata, adds new version snapshot. |
| `/api/content/[id]` | DELETE | `content:*` | Hard delete. |
| `/api/content/[id]/status` | PATCH | Same as edit | Change status (`draft`, `review`, `published`, `archived`). Auto-updates `publishedAt`. |
| `/api/media/upload` | POST | `media:upload` | Accepts `multipart/form-data` (`file` field). Saves file under `apps/api/public/media/<uuid>/<filename>` and returns metadata `{ id, filename, mimeType, size, url }`. |

## Environment & Setup

Required env vars (see `.env.example`):
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- Optional: `BCRYPT_ROUNDS`

Setup steps:
1. `npm install`
2. `npx prisma migrate dev` (from `apps/api` or repo root with `--schema`)
3. `npx prisma generate`
4. `npx turbo run dev --filter=api`

### Local Uploads
- Media uploads are stored in `apps/api/public/media/*` (gitignored). Ensure the directory exists (`mkdir -p apps/api/public/media`).

## Validation Helpers

- `validateRegister` – ensures email/name/password present and valid.
- `validateLogin` – email/password.
- `validateContent` – requires title, slug, type, JSON data object; optional description.

## Points Of Attention / TODO

- Comments system not yet implemented (permissions are placeholders).
- Status transitions rely on `/status` endpoint; dashboard UI enforces options but backend does not validate transitions beyond list.
- Consider adding pagination/filtering on `/api/content` for large datasets.
- Uploaded files are stored locally; consider integrating S3 or another object store for production.

## Contributing

- Run `npm run lint` and `npx tsc --noEmit` (once enabled) before pushing.
- When adding a route:
  1. Validate input (extend `lib/validation.ts` or create a helper).
  2. Guard with `getAuthUserFromRequest` + `hasPermission`.
  3. Perform Prisma operations within try/catch, return meaningful errors.
- Keep this document updated when new resources or auth flows are added.

