# NovaCMS Monorepo

NovaCMS is a Turborepo workspace combining a Next.js backend (`apps/api`) and an Astro + React frontend (`apps/web`).

## Tech Stack

- **Monorepo tool**: Turborepo
- **Backend**: Next.js API Routes (App Router), Prisma, PostgreSQL
- **Frontend**: Astro 5 + React islands, Tailwind CSS 4
- **Auth**: JWT (access + refresh tokens) with role-based permissions
- **Editor**: Quill rich text editor (uploads stored under `apps/api/public/media`)

## Installation

```
git clone <repo-url>
cd cms-platform
npm install
```

Create a `.env` (or `.env.local`) at the repo root:

```
DATABASE_URL=postgres://...
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

## Database

```
npx prisma migrate dev
npx prisma generate
```

## Running Locally

- Start the API (Next.js):

  ```
  npx turbo run dev --filter=api
  ```

- Start the web frontend (Astro):

  ```
  npx turbo run dev --filter=web
  ```

Run both commands in separate terminals or use `npx turbo run dev` to start all workspaces.

## Useful Scripts

```
# Lint
npm run lint

# Type check (if enabled)
npx tsc --noEmit

# Format (if configured)
npm run format
```

## Directory Highlights

- `apps/api` – Next.js backend (API routes, Prisma schema, auth helpers)
- `apps/web` – Astro frontend (layouts, React islands, blog/dashboard pages)
- `apps/api/public/media` – Local upload storage (gitignored; ensure exists)
- `docs/` – Architecture notes (`backend.md`, `frontend.md`)

## Testing on Another Machine

1. Clone repo, `npm install`
2. Copy `.env` values (DATABASE_URL, JWT secrets, etc.)
3. `npx prisma migrate dev`
4. Start API + web (`npx turbo run dev --filter=api`, `npx turbo run dev --filter=web`)
5. Access `http://localhost:3000` (API) and `http://localhost:4321` (Astro dev server)

## Notes

- First registered user becomes primary admin (`apps/api/app/api/auth/register/route.ts`)
- Blog listing shows `published` posts; update status via dashboard dropdown
- Uploaded media lives on disk; consider external storage for production

