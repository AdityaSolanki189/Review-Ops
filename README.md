# ReviewOps

Repository: [github.com/AdityaSolanki189/Review-Ops](https://github.com/AdityaSolanki189/Review-Ops)

Full-stack Next.js application with a TypeScript/Playwright data-collection worker and PostgreSQL persistence for Azzurro Hotels Sydney review analytics.

**Demo:** local application via Quick start below. The scraper runs locally; the dashboard can also be deployed to Vercel with Neon Postgres.

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

## Prerequisites

- **Node.js 22+**
- **pnpm 9.12+** (see `packageManager` in `package.json`)
- **Docker Desktop** for local PostgreSQL
- **Playwright Chromium** (`pnpm exec playwright install chromium`)

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
pnpm db:migrate
pnpm db:seed
```

`pnpm db:seed` inserts the four properties **and** loads anonymized sample reviews from `data/sample-reviews.json`. After seeding, the dashboard is usable immediately — you do not need to scrape first.

### 4. Start dashboard

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

You should see:

- **This week** snapshot at the top (calendar week in Sydney time)
- Portfolio KPIs for the default 30-day period
- Property comparison, topic insights, and a review feed at `/reviews`

### 5. Update with live data (optional)

```bash
pnpm scrape
```

For headed/debug mode:

```bash
SCRAPE_HEADED=1 pnpm scrape
```

The scraper deduplicates against seeded fingerprints and external IDs, so existing sample rows are skipped and only new reviews are inserted.

## Sample data

The repo includes `data/sample-reviews.json`:

- **1,217 reviews** collected from the four listed Booking.com properties
- Up to **400 reviews per property** (newest first), exported from a live scrape
- **Anonymized reviewer names** (`Guest 1001`, etc.); public review text preserved
- **Fingerprints and external IDs retained** so live scrapes deduplicate correctly
- **Topic tags included** from the keyword classifier

Re-export after a fresh scrape:

```bash
pnpm db:export-sample
```

Commit the updated JSON if you want to refresh the bundled dataset.

## How reviews are collected

1. The Playwright worker loads each property’s Booking.com URL from seed data (`src/lib/properties.ts`).
2. It navigates to the reviews section and **captures** Booking’s `reviewListFrontend` GraphQL request (`scraper/graphql.ts`, `scraper/booking.ts`).
3. Captured requests are **replayed** with pagination, sorted `NEWEST_FIRST`, until:
   - **Incremental mode:** 8 consecutive already-known reviews, or the watermark is reached
   - **Backfill mode:** the site total is reached (with checkpoint resume)
4. Review cards are normalized and persisted with deduplication:
   - **External ID:** `booking:{propertyId}:{reviewUrlHash}`
   - **Fingerprint:** SHA-256 over property, reviewer, date, rating, and text
5. Topics are classified via keywords at insert time (`src/lib/classification/topics.ts`).

**Reliability controls:**

- Per-property retry: 1s → 3s → 10s
- GraphQL replay retry: 30s → 60s → 120s on 403/429
- One property failure does not abort the job
- CAPTCHA/block → scrape run status `blocked`; existing DB rows are preserved

## Insights methodology

**Topic classification (required for trial insights):**

- Keyword cue lists per operational topic (cleanliness, check-in, staff, noise, facilities, location, room condition, value, plus extended topics)
- Clause segmentation with positive/negative polarity words and negation handling
- Applied at scrape/insert time — **not** an LLM
- Versioned (`CLASSIFIER_VERSION`); re-run with `pnpm reviews:reclassify`

**Dashboard metrics:**

- **This week** uses Monday–Sunday in `Australia/Sydney`
- **Negative reviews** for weekly insight = guest scores ≤5
- **High-score reviews** for positive insight = guest scores ≥8
- Example insight: *“40% of negative reviews this week mentioned Cleanliness.”*
- Period comparisons need sufficient sample size; small periods show “Not enough data”

**Optional AI features** (require `OPENROUTER_API_KEY`):

- Portfolio brief rewrite
- Issue explainer with suggested actions
- Per-review AI summary
- Semantic review search via embeddings

Core dashboard and topic insights work without OpenRouter.

## Known limitations & assumptions

- **Trial/demo only.** Booking.com ToS may prohibit automated access without permission. Production should use an approved data source.
- **No authentication.** Anyone who can reach the server can view the dashboard.
- **Scraper is a local CLI job**, not deployed on Vercel.
- **No CAPTCHA / anti-bot evasion.** Blocks are expected in some environments; the dashboard shows a stale-data banner.
- **Keyword classifier limitations:** misses paraphrases, sarcasm, and implicit complaints; topic mentions indicate association, not verified root cause.
- **Redis cache is optional.** Without Upstash, queries read Postgres directly.
- **Booking URLs** include legacy Venus/Chateau slugs for some properties; scraper uses GraphQL capture rather than DOM selectors.
- **GraphQL response shape** can change; if capture fails, the property run is marked failed/blocked.

## Production (Vercel + Neon)

Local development uses Docker Postgres on port **5433**. Production uses [Neon](https://neon.tech) serverless Postgres.

1. In the Vercel project settings, set **`DATABASE_URL`** to your Neon **pooled** connection string (`…-pooler.…neon.tech`, with `sslmode=require`). Do not use `localhost:5433`.
2. Set **`NEXT_PUBLIC_APP_URL`** to your production site URL.
3. Apply schema and seed against Neon using the **direct** (non-pooler) URL:

```bash
DATABASE_URL_UNPOOLED="postgresql://…@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" pnpm db:migrate
DATABASE_URL_UNPOOLED="postgresql://…@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" pnpm db:seed
```

Run `pnpm scrape` locally against Neon when you want to refresh live review data. The scraper remains a local CLI job, not a Vercel function.

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

| Property | Slug | Booking.com URL |
| --- | --- | --- |
| Azzurro Pod Hotel - Central Sydney | `central-sydney` | https://www.booking.com/hotel/au/venus-surry-hills.html |
| Azzurro Pod Hotel - Potts Point | `potts-point` | https://www.booking.com/hotel/au/venus-potts-point-sydney.html |
| Azzurro Pod Hotel - Darling Harbour | `darling-harbour` | https://www.booking.com/hotel/au/chateau-de-venus.html |
| Olympic Hotel Paddington | `olympic-paddington` | https://www.booking.com/hotel/au/olympic-paddington.html |

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
| `pnpm start` | Run production server after build |
| `pnpm scrape` | Run Playwright scraper worker |
| `pnpm test` | Unit tests (scraper parser, analytics, classifier) |
| `pnpm check` | Biome lint + format |
| `pnpm lint` | Biome lint with auto-fix |
| `pnpm format` | Biome format |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Drizzle push (dev shortcut) |
| `pnpm db:seed` | Seed properties + sample reviews |
| `pnpm db:export-sample` | Export anonymized reviews to `data/sample-reviews.json` |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm reviews:reclassify` | Re-run keyword classifier on all reviews |
| `pnpm reviews:embed` | Backfill embeddings (needs OpenRouter) |

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Dashboard shows 0 reviews | Seed not run or sample file missing | Run `pnpm db:seed` |
| Scrape status `blocked` | Booking bot protection | Use seeded data; try `SCRAPE_HEADED=1`; see limitations |
| DB connection error | Postgres not running | `docker compose up -d`, confirm port **5433** |
| AI brief/explainer disabled | No OpenRouter key | Optional; core dashboard works without it |
| Comparisons show “Not enough data” | Few reviews in period | Widen date range or wait for more reviews |

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
data/                 Committed sample review export
scraper/              Playwright worker
scripts/              seed + export CLIs
```
