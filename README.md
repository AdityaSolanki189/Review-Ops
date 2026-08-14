# ReviewOps

Full-stack Next.js application with a TypeScript/Playwright data-collection worker and PostgreSQL persistence for Azzurro Hotels Sydney review analytics.

## Stack

- **Next.js 16** App Router + Server Components
- **Drizzle ORM** + PostgreSQL (`pg`)
- **Playwright** CLI scraper (background worker, not an API route)
- **Zod** validation + keyword topic classification
- **Tailwind CSS** + shadcn/ui
- **Biome** lint/format

No authentication for this trial — the dashboard is a public internal operations view.

## Architecture

```text
ReviewOps
   ├── Next.js dashboard (/, /reviews, /properties, /sync)
   ├── Playwright worker (pnpm scrape)
   └── PostgreSQL
```

The scraper is intentionally **not** implemented as `app/api/scrape/route.ts`. Browser automation is a background job with retries, pagination, and incremental deduplication — not an HTTP request lifecycle.

## Quick start

### 1. Install dependencies

```bash
pnpm install
pnpm exec playwright install chromium
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

Default connection (Docker maps host port **5433**):

```text
postgresql://reviewops:reviewops@localhost:5433/reviewops
```

Copy env:

```bash
cp .env.example .env.local
```

### 3. Database setup

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4. Run scraper

```bash
pnpm scrape
```

For headed/debug mode:

```bash
SCRAPE_HEADED=1 pnpm scrape
```

### 5. Start dashboard

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Properties

| Property | Slug |
| --- | --- |
| Azzurro Pod Hotel - Central Sydney | `central-sydney` |
| Azzurro Pod Hotel - Potts Point | `potts-point` |
| Azzurro Pod Hotel - Darling Harbour | `darling-harbour` |
| Olympic Hotel Paddington | `olympic-paddington` |

## Scraper behavior

- **Incremental**: stops after 8 consecutive already-known reviews
- **Dedup**: Booking external ID + SHA-256 fingerprint
- **Retry**: 1s → 3s → 10s per property; one failure does not abort others
- **Blocked/CAPTCHA**: records `blocked` status, preserves existing data
- **Classification**: keyword-based topics at insert time (no LLM)

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm scrape` | Run Playwright scraper worker |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed four properties |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm check` | Biome lint + format |

## Booking.com terms notice

The trial specification requires automated collection of publicly visible Booking.com review data. Browser-based collection was implemented for demonstration purposes.

However, Booking.com's terms restrict automated scraping without express permission. A production deployment should verify authorization and preferably use an approved data partnership/API or another permitted review-data source.

When blocked, the scraper records a `blocked` scrape run, does not overwrite existing reviews, and the dashboard continues serving the last successful dataset with a stale-data warning.

## Out of scope

- Authentication
- CAPTCHA / anti-bot evasion
- Redis, queues, microservices
- Running the scraper on Vercel

## Project structure

```text
src/app/              Dashboard routes
src/db/               Drizzle schema, migrations, queries
src/lib/              Classification, config, seed, dedup
scraper/              Playwright worker
scripts/              seed CLI
```
