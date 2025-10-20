# Repository Guidelines

## Project Structure & Module Organization
- Root is a Turborepo (`turbo.json`) with workspaces under `apps/*` and `packages/*`.
- `apps/api` hosts the Next.js 15 App Router service; API handlers live in `app/`, shared logic in `lib/`, and Prisma wiring in `lib/prisma.ts`.
- `apps/web` is an Astro 5 front end; page entry points live in `src/pages/`, and static assets belong in `public/`.
- Shared React primitives sit in `packages/ui/src/`; linting and TypeScript baselines are in `packages/eslint-config` and `packages/typescript-config`.
- Place design assets or marketing collateral in the root `assets/` directory.

## Build, Test, and Development Commands
- Global workflows run from the root via npm: `npm run dev` (parallel app dev servers), `npm run build` (full Turbo build graph), `npm run lint`, `npm run check-types`, and `npm run format`.
- Target a single workspace with Turbo filters, e.g. `npx turbo run dev --filter=api` or `npx turbo run build --filter=web`.
- Launch Astro locally with `npm run astro -- --help` inside `apps/web` when you need tool-specific utilities.

## Coding Style & Naming Conventions
- TypeScript is the default; use 2-space indentation and keep files in PascalCase or kebab-case to match existing patterns (`lib/auth.ts`, `src/pages/index.astro`).
- Prefer default exports for page-level components and named exports for shared utilities.
- Run `npm run format` before committing; Prettier and the shared ESLint config (`@repo/eslint-config`) enforce import ordering, unused-rule warnings, and Turbo workspace guards.
- Environment files should follow `.env.local` / `.env.example`; never commit secrets.

## Testing Guidelines
- Formal automated tests are not in place yet. When you introduce tests, colocate them next to the source (`feature.test.ts` or `component.spec.tsx`) and wire the command into Turbo (`"test": "vitest"` or framework-native runner).
- Until test automation lands, document manual QA steps in PRs and ensure `npm run lint` and `npm run check-types` pass before requesting review.

## Commit & Pull Request Guidelines
- Follow Conventional Commits; existing history uses `feat(scope): message`. Favor imperatives (`fix`, `chore`, `docs`) and scoped prefixes per workspace (`feat(api): add login route`).
- Every PR needs a concise summary, linked issue (if any), risk callouts, and UI screenshots/gifs when `apps/web` changes visuals.
- Request reviewers familiar with the touched workspace, and confirm CI (lint + type-check today) in the PR checklist.
