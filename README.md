# ReviewOps

Full-stack Next.js application with a TypeScript/Playwright data-collection worker and PostgreSQL persistence for Azzurro Hotels Sydney review analytics.

## Stack

- **Next.js 16** App Router + client dashboard views
- **TanStack Query v5** client-side data fetching (`useQuery` / `useMutation`)
- **Drizzle ORM** + PostgreSQL (`pg`)
- **Upstash Redis** optional read cache for dashboard queries
- **Playwright** CLI scraper (background worker, not an API route)
- **Zod** validation + keyword topic classification
- **Tailwind CSS** + shadcn/ui
- **Biome** lint/format

No authentication for this trial — the dashboard is a public internal operations view.

## Architecture

```text
ReviewOps
   ├── Next.js dashboard (/, /reviews, /properties, /sync)
   ├── TanStack Query (browser cache + refetch)
   ├── app/api/* JSON routes (wrap Drizzle analytics queries)
   ├── Playwright worker (pnpm scrape)
   ├── PostgreSQL (source of truth)
   └── Upstash Redis (optional server read cache)
```

Dashboard pages fetch data client-side via TanStack Query hooks under `src/lib/queries/` and `src/lib/mutations/`. A single `QueryClientProvider` in `src/app/providers.tsx` wraps the app. Read hooks call thin `GET /api/...` routes that delegate to existing Drizzle query functions. The **Refresh data** button on the dashboard and sync pages runs `POST /api/cache/invalidate` (Redis epoch bump) and invalidates related query keys.

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

## Production (Vercel + Neon)

Local development uses Docker Postgres on port **5433**. Production uses [Neon](https://neon.tech) serverless Postgres.

1. In the Vercel project settings, set **`DATABASE_URL`** to your Neon **pooled** connection string (`…-pooler.…neon.tech`, with `sslmode=require`). Do not use `localhost:5433`.
2. Set **`NEXT_PUBLIC_APP_URL`** to your production site URL.
3. Apply schema and seed properties against Neon using the **direct** (non-pooler) URL:

```bash
DATABASE_URL_UNPOOLED="postgresql://…@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" pnpm db:migrate
DATABASE_URL_UNPOOLED="postgresql://…@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" pnpm db:seed
```

Reviews stay empty until you run `pnpm scrape` with Neon as `DATABASE_URL`. The scraper remains a local CLI job, not a Vercel function.

### Optional: Upstash Redis read cache

Dashboard analytics queries use a cache-aside layer when Upstash is configured. Without Redis, the app reads Postgres directly (local Docker dev works unchanged).

1. Create a Redis database in the [Upstash console](https://console.upstash.com) or add the Upstash integration in Vercel Marketplace.
2. Set in `.env.local` (and Vercel project env):

```text
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"
```

3. After each scrape run (`finishScrapeRun`) or property seed, the cache **epoch** is incremented so new reads miss stale keys. Old keys expire via TTL.

| Query group | TTL |
| --- | --- |
| Properties / property by slug | 1 hour |
| Weekly stats, performance, topic trends | 5 minutes |
| Filtered review lists | 2 minutes |
| Sync health / scrape history | 60 seconds |

`getSyncHealth` still computes the stale-data banner from `Date.now()` on every request.

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
- Queues, microservices
- Running the scraper on Vercel

## Project structure

```text
src/app/              Dashboard routes + app/api JSON endpoints
src/components/       Client views (dashboard, reviews, properties, sync)
src/db/               Drizzle schema, migrations, queries
src/lib/queries/      TanStack Query hooks + query keys
src/lib/mutations/    TanStack Query mutation hooks
src/lib/              Classification, config, cache, seed, dedup
scraper/              Playwright worker
scripts/              seed CLI
```
