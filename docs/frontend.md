# NovaCMS Frontend Overview

This document outlines the front-end architecture powering the NovaCMS workspace and blog.

## Stack & Structure

- **Frameworks**: Astro 5 + React islands.
- **Styling**: Tailwind 4 (via `@tailwindcss/vite`). Global styles in `apps/web/src/styles/global.css`.
- **Routing**:
  - Dashboard: `/dashboard` (Astro SSR, multiple React islands).
  - Blog: `/blog` (public listing) and `/blog/[...slug]` (article page).
- **Component Layout**:
  - `src/layouts/BaseLayout.astro` – wraps pages with header/footer, global styles, `initialUser` hydration.
  - `src/components/astro/*` – Astro components (Header, Footer, etc.).
  - `src/components/react/*` – client-side islands (auth controls, Quill forms, blog search/list, dashboard cards).

## Key React Islands

### `AuthControls`
- Mounted in header (`Header.astro`) to manage session UI (sign-in/out, dashboard link).
- Reads tokens from localStorage, syncs with `/api/auth/me` + `/api/auth/refresh`.
- Handles logout by clearing tokens and calling `/api/auth/logout`.

### `CreateContentCard`
- Used on `/dashboard` to create new content entries.
- Lazily loads Quill via `useQuillEditor` hook (rich text with image uploads).
- Submits payload `{ title, slug, type, description, data: { body, excerpt, media } }` to `/api/content`.

### `ContentList`
- Shows existing content entries.
- Provides status dropdown (calls `/api/content/[id]/status`), edit link, delete button.
- Includes metadata (slug, type, author, timestamps, description).

### `EditContentCard`
- Dedicated edit page (`/dashboard/edit/[id]`).
- Preloads target content, mounts Quill with existing body/media.
- Updates via `/api/content/[id]` (same payload shape as create).

### Blog Islands
- `BlogSearch`: standalone search input dispatching custom event (`blog:search`).
- `BlogList`: fetches published content, sorts newest → oldest, filters by query (title/summary/type match), and renders cards with “Show more” CTA linking to `/blog/<slug>`.
- Supports SSR-preloaded entries (passed from Astro) and client refetch.

## Hooks & Utilities

- `useQuillEditor` (`src/hooks/useQuillEditor.ts`):
  - Loads Quill dynamically.
  - Applies Tailwind classes to toolbar/editor.
  - Handles image uploads via `/api/media/upload` with JWT tokens.
  - Returns refs + current HTML + media array.
- `stripHtml` (`src/utils/html.ts`): converts HTML to plain text for excerpt validation.
- `blogEvents` (`src/utils/blogEvents.ts`): custom event definitions for blog search.

## Page Summaries

### `/dashboard`
- Auth-protected (SSR redirects viewers/unauth users).
- Islands rendered in order: `DashboardShell` (status + alerts), `CreateContentCard`, `ContentList`, and `UserManagementTable` (for admins).
- Content data preloaded server-side (`bodyHtml`, `media`, `excerpt` extracted for islands).

### `/dashboard/edit/[id]`
- SSR route fetches selected content, reuses BaseLayout.
- Renders `EditContentCard` island with prefilled fields.

### `/blog` (index)
- SSR fetch for initial content list, passes to `BlogList` island.
- `BlogSearch` island sits above listing.
- Cards show type, author, published date, summary; CTA goes to article page.

### `/blog/[...slug]`
- SSR fetch, redirects back to `/blog` if not found/unpublished.
- Renders article body with Tailwind-prose styling.
- Back-to-blog link for navigation.

## State & Data Flow

- SSR Astro pages often fetch initial data (content list, single article) and pass to client islands.
- React islands make follow-up requests using `authorizedFetch` (injects auth headers, handles refresh fallback).
- Events: `dashboard:message` for toast-like alerts, `blog:search` for search input.

## Styling Notes

- Tailwind utilities heavily used; ensure classes survive purge (astro config includes `src/**/*`).
- Quill editors receive additional classes via hook to match NovaCMS look.
- Blog cards use `bg-white`, `shadow-xl`, `ring-1` for consistent styling.

## Setup & Commands

- Install deps: `npm install` (from repo root).
- Run dev server: `npx turbo run dev --filter=web` (runs Astro + Vite).
- Astro config in `astro.config.mjs` integrates React + Tailwind.
- Tailwind 4 config via `@tailwindcss/vite`; global stylesheet (`src/styles/global.css`) seeds backgrounds/font.

## TODO / Considerations

- Comments UI pending backend support.
- Consider pagination or infinite scroll for blog list when content grows.
- For accessibility, evaluate embedding ARIA roles in custom components (especially button links, toolbar controls).

## Updating This Doc

- When adding routes or major islands, note them here for future contributors.
- Include new utilities/hooks with brief usage guidance.

