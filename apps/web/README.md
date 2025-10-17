# Web Frontend

Astro-based frontend for the CMS Platform with SSR, hybrid output, Tailwind CSS styling, and React islands powered by TanStack Query and Axios.

## Scripts

- `npm run dev --workspace web` – start the Astro development server.
- `npm run build --workspace web` – build the production bundle to `dist/`.
- `npm run preview --workspace web` – preview the built site locally.
- `npm run check-types --workspace web` – run `astro check`.
- `npm run lint --workspace web` – lint using the shared repo configuration.

Set `PUBLIC_API_URL` or `API_URL` to point at the backend API for content and comments data.
