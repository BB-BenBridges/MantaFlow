# Tempo — IT Delivery Gantt

A Linear-style Gantt planning app for tracking IT delivery projects, built from the design handoff in `../Gantt App.dc.html`.

- **Framework:** Next.js (App Router)
- **UI:** Mantine
- **Gantt chart:** [Frappe Gantt](https://github.com/frappe/gantt)
- **Auth:** Clerk
- **Data:** Prisma + PostgreSQL
- **Package manager:** Yarn 4 (Berry, node-modules linker)

## Setup

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Copy the env file and fill in real values:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — a PostgreSQL connection string.
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from the [Clerk dashboard](https://dashboard.clerk.com) (API Keys).

3. Apply the Prisma schema and seed sample data:

   ```bash
   yarn db:migrate   # creates tables from prisma/schema.prisma
   yarn db:seed      # loads the sample IT-delivery dataset
   ```

4. Run the dev server:

   ```bash
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000). You'll be redirected to Clerk sign-in until authenticated.

## Project structure

- `prisma/schema.prisma` — `Project` / `Task` models.
- `prisma/seed.ts` — seeds the sample dataset from the design handoff.
- `src/server/projects.ts` — reads projects/tasks from Postgres.
- `src/server/actions.ts` — server action for creating a project (used by the "New project" modal).
- `src/lib/gantt-logic.ts` — pure functions shared by the desktop/mobile views (row visibility, sort order, date window, month ticks).
- `src/components/GanttApp.tsx` — top-level client component holding UI state (sort order, view mode, expanded rows) and switching between desktop/mobile layouts.
- `src/components/DesktopBoard.tsx` / `MobileBoard.tsx` — the two layouts from the handoff.
- `src/components/GanttChart.tsx` — Frappe Gantt wrapper.
- `src/middleware.ts` — Clerk route protection.

## Useful scripts

| Script            | Purpose                                   |
| ----------------- | ------------------------------------------ |
| `yarn dev`         | Start the dev server                       |
| `yarn build`       | Production build                           |
| `yarn lint`        | ESLint                                     |
| `yarn db:migrate`  | Run Prisma migrations (dev)                |
| `yarn db:deploy`   | Apply migrations (prod)                    |
| `yarn db:seed`     | Seed the sample dataset                    |
| `yarn db:studio`   | Open Prisma Studio                         |
