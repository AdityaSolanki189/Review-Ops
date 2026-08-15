# ReviewOps

Repository: [github.com/AdityaSolanki189/Review-Ops](https://github.com/AdityaSolanki189/Review-Ops)

**Live demo:** [https://reviewops.adityasolanki.dev](https://reviewops.adityasolanki.dev)

Full-stack Next.js application with a TypeScript/Playwright data-collection worker and PostgreSQL persistence for Azzurro Hotels Sydney review analytics.

The scraper runs locally as a CLI job. The dashboard is deployed to Vercel with Neon Postgres. For local development, follow Quick start below.

## Stack

- **Next.js 16** App Router + client dashboard views
- **React 19** + **TanStack Query v5** client-side data fetching (`useQuery` / `useMutation`)
- **Drizzle ORM** + PostgreSQL (`pg`) + **pgvector** for semantic search embeddings
- **Upstash Redis** optional read cache for dashboard queries
- **Playwright** CLI scraper (background worker, not an API route)
- **Zod** validation + keyword topic classification
- **Recharts** dashboard charts
- **AI SDK v7** + `@openrouter/ai-sdk-provider` for optional AI features
- **react-hook-form** + Zod resolvers for filter forms
- **Tailwind CSS v4** + shadcn/ui + **next-themes** (dark/light) + **sonner** toasts
- **Biome** lint/format

No authentication for this trial — the dashboard is a public internal operations view.

## Architecture

```text
ReviewOps
   ├── Next.js dashboard (/, /reviews, /properties, /properties/[slug], /sync)
   ├── TanStack Query (browser cache + refetch)
   ├── app/api/* JSON routes (wrap Drizzle analytics queries)
   ├── Playwright worker (pnpm scrape)
   ├── PostgreSQL + pgvector (source of truth)
   └── Upstash Redis (optional server read cache)
```

Dashboard pages fetch data client-side via TanStack Query hooks under `src/lib/queries/` and `src/lib/mutations/`. A single `QueryClientProvider` in `src/app/providers.tsx` wraps the app (also: `ThemeProvider`, `TooltipProvider`, `Toaster`, React Query Devtools in dev). Read hooks call thin `GET /api/...` routes that delegate to existing Drizzle query functions. The **Refresh data** button on the dashboard and sync pages runs `POST /api/cache/invalidate` (Redis epoch bump) and invalidates related query keys.

The scraper is intentionally **not** implemented as `app/api/scrape/route.ts`. Browser automation is a background job with retries, pagination, and incremental deduplication — not an HTTP request lifecycle.

## Prerequisites

- **Node.js 22+**
- **pnpm 9.12+** (see `packageManager` in `package.json`)
- **Docker Desktop** for local PostgreSQL with **pgvector** (`docker-compose.yml` uses `pgvector/pgvector:pg16`; migration `0007` enables the `vector` extension and creates an HNSW cosine index on `vector(1536)` embeddings — a plain `postgres:16` image will fail migration; Neon supports pgvector in production)
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
- Up to **400 reviews per property** (newest first), exported from a live scrape (Olympic Hotel Paddington has 17 in the bundled export)
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
3. Captured requests are **replayed** with pagination (page size 25), sorted `NEWEST_FIRST`, until:
   - **Incremental mode** (DB count ≥ Booking total): 8 consecutive already-known reviews, or the watermark is reached
   - **Backfill mode** (DB count < Booking total): the site total is reached, with checkpoint resume via `properties.backfill_skip`
4. Review cards are normalized and persisted with deduplication:
   - **External ID:** `booking:{bookingPropertyId}:{reviewUrl}` — e.g. `booking:venus-surry-hills:a5698a52935ac7f7` (`bookingPropertyId` is the seed slug, not the DB UUID; `reviewUrl` is the raw GraphQL value, not a separate hash)
   - **Fingerprint:** SHA-256 over pipe-joined, lowercased, whitespace-collapsed fields: `propertyId | reviewerName | reviewDate(YYYY-MM-DD) | rating | positiveText | negativeText`
5. Topics are classified via keywords at insert time (`src/lib/classification/topics.ts`).

**Reliability controls:**

- Properties scraped **sequentially** with a **20 s** gap between properties
- Per-property retry: **1 s → 3 s → 10 s** (3 attempts)
- GraphQL replay retry: **30 s → 60 s → 120 s** on 403/429
- Jittered **2.5–5 s** delay between pages; **20–30 s** pause every 40 pages
- Safety cap: **2,000** pages per property
- One property failure does not abort the job
- CAPTCHA/block → scrape run status **`blocked`**; existing DB rows are preserved
- GraphQL rate limit (403/429 exhausted) → status **`partial`**, `backfill_skip` preserved for resume (distinct from `blocked`)
- Post-scrape: optional embedding generation when `OPENROUTER_API_KEY` is set

**Scrape run statuses:** `running`, `success`, `partial`, `failed`, `blocked`

## Data model

Schema: `src/db/schema/reviews.ts` (7 tables, 4 enums).

| Table | Purpose |
| --- | --- |
| `properties` | Hotel metadata, Booking URL/ID, `latest_review_at` watermark, `backfill_skip` checkpoint |
| `reviews` | Review text, rating, dates, dedup keys; generated `rating_numeric` column; `classifier_version` / `classified_at` |
| `review_topics` | Keyword-classified topic + sentiment per review (many per review) |
| `scrape_runs` | Per-property scrape history with counts and status |
| `review_insights` | Persisted AI summaries (one per review, Postgres — not Redis) |
| `review_embeddings` | pgvector `vector(1536)` for semantic search; HNSW cosine index |

**Enums:** `review_source` (`booking`), `review_sentiment` (`positive`, `negative`, `neutral`), `review_topic` (20 topics — see below), `scrape_run_status` (5 values above).

**Key constraints:** unique `reviews.fingerprint`; partial unique index on `(source, external_id)` where `external_id IS NOT NULL`.

## API surface

All routes live under `src/app/api/`. Dashboard scoped routes accept shared query params: `property` (slug), `from` / `to` (`YYYY-MM-DD`, default last 30 days), `compare=previous-period`, `timezone=Australia/Sydney`.

### Reviews

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/reviews` | Paginated/filtered review list (cursor pagination) |
| `GET` | `/api/reviews/[id]` | Single review by ID |
| `GET` | `/api/reviews/[id]/insight` | Stored AI insight (or unavailable) |
| `POST` | `/api/reviews/[id]/insight` | Generate AI insight |
| `GET` | `/api/reviews/search` | Semantic or keyword search (`q` required, 2–500 chars) |

### Dashboard

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/dashboard/overview` | Portfolio KPIs for scope |
| `GET` | `/api/dashboard/issues` | Needs-attention issue signals |
| `GET` | `/api/dashboard/topic-matrix` | Property × topic sentiment matrix |
| `GET` | `/api/dashboard/topic-impact` | Topic impact on ratings |
| `GET` | `/api/dashboard/series` | Time-series rating/volume data |
| `GET` | `/api/dashboard/recent-reviews` | Latest 6 reviews |
| `GET` | `/api/dashboard/sync-health` | Per-property scraper health |
| `GET` | `/api/dashboard/weekly-snapshot` | Week-over-week portfolio snapshot |
| `GET` | `/api/dashboard/weekly-briefing` | AI or deterministic portfolio briefing |
| `GET`, `POST` | `/api/dashboard/issues/[property]/[topic]/explain` | AI or deterministic issue explainer |

### Properties

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/properties` | All properties |
| `GET` | `/api/properties/performance` | Performance comparison |
| `GET` | `/api/properties/[slug]` | Single property detail |
| `GET` | `/api/properties/[slug]/topic-mix` | Topic distribution |

### Sync & cache

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/sync/history` | Scrape run history (`limit` 1–100, default 100) |
| `POST` | `/api/cache/invalidate` | Bump Redis cache epoch |

## Filtering, scope, and search

**Review filters** (`GET /api/reviews`, `/api/reviews/search`):

| Param | Values |
| --- | --- |
| `property` | Property slug |
| `minRating` / `maxRating` | 1–10 |
| `topic` | One of 20 topic keys |
| `sentiment` | `positive`, `negative`, `neutral` |
| `ratingBand` | `low`, `mid`, `high` |
| `from` / `to` | `YYYY-MM-DD` |
| `sort` | `newest`, `oldest`, `rating-high`, `rating-low` (default `newest`) |
| `cursor` | Base64url-encoded pagination cursor |
| `limit` | 1–100 (default 20; search capped at 50) |
| `representative` | `true` / `false` (default `false`) |

**Dashboard scope:** property slug (optional), date range, `compare=previous-period` for period-over-period comparison. Small sample sizes show “Not enough data”.

**Semantic search:** when `OPENROUTER_API_KEY` is set, `/api/reviews/search` embeds the query via OpenRouter and ranks by cosine similarity (threshold 0.25). Without a key, falls back to keyword `ilike` search (`mode: 'keyword'`).

## Insights methodology

**Topic classification (required for trial insights):**

- **20 topics:** `cleanliness`, `noise`, `staff`, `check_in`, `location`, `facilities`, `value`, `wifi`, `food`, `comfort`, `bathroom`, `safety`, `air_conditioning`, `maintenance`, `housekeeping`, `smell`, `pests`, `room_condition`, `accessibility`, `booking_payment`
- Keyword cue lists per topic; clause segmentation on `.`, `;`, and contrast words (`but`, `however`, etc.)
- Positive/negative polarity words with negation handling (`not`, `no`, `never`, etc.)
- Applied at scrape/insert time — **not** an LLM
- Versioned (`CLASSIFIER_VERSION = 2`); re-run with `pnpm reviews:reclassify`

**Dashboard metrics:**

- **This week** uses Monday–Sunday in `Australia/Sydney`
- **Negative reviews** for weekly insight = guest scores ≤5
- **High-score reviews** for positive insight = guest scores ≥8
- Example insight: *“40% of negative reviews this week mentioned Cleanliness.”*
- Period comparisons need sufficient sample size; small periods show “Not enough data”

**Optional AI features** (enhanced with `OPENROUTER_API_KEY`; core dashboard works without it):

| Feature | With key | Without key |
| --- | --- | --- |
| Portfolio briefing | AI rewrite via `openai/gpt-4o-mini` | Deterministic summary (`source: 'deterministic'`) |
| Issue explainer | AI with suggested actions | Deterministic explainer |
| Per-review insight | Generate + persist in `review_insights` | `{ available: false }` |
| Semantic search | pgvector cosine similarity | Keyword `ilike` fallback |
| Post-scrape embeddings | Auto-generated after scrape | Skipped silently |
| `pnpm reviews:embed` | Backfill embeddings | **Errors** — key required |

Default models: `OPENROUTER_MODEL=openai/gpt-4o-mini`, `OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small`.

## Known limitations & assumptions

- **Trial/demo only.** Booking.com ToS may prohibit automated access without permission. Production should use an approved data source.
- **No authentication.** Anyone who can reach the server can view the dashboard.
- **Scraper is a local CLI job**, not deployed on Vercel.
- **No CAPTCHA / anti-bot evasion.** Blocks are expected in some environments; the dashboard shows a stale-data banner.
- **Keyword classifier limitations:** misses paraphrases, sarcasm, and implicit complaints; topic mentions indicate association, not verified root cause.
- **Redis cache is optional.** Without Upstash, queries read Postgres directly.
- **Booking URLs** include legacy Venus/Chateau slugs for some properties; scraper uses GraphQL capture rather than DOM selectors.
- **GraphQL response shape** can change; if capture fails, the property run is marked `failed` or `blocked`.

## Production (Vercel + Neon)

Local development uses Docker Postgres on port **5433**. Production uses [Neon](https://neon.tech) serverless Postgres (pgvector supported).

1. In the Vercel project settings, set **`DATABASE_URL`** to your Neon **pooled** connection string (`…-pooler.…neon.tech`, with `sslmode=require`). Do not use `localhost:5433`.
2. Set **`NEXT_PUBLIC_APP_URL`** to `https://reviewops.adityasolanki.dev` (or your deployment URL).
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

3. After each scrape run (`finishScrapeRun`), property seed, or reclassify, the cache **epoch** is incremented so new reads miss stale keys. Key format: `reviewops:v1:{epoch}:{suffix}`. Old keys expire via TTL.

| Query group | TTL |
| --- | --- |
| Properties / property by slug | 1 hour (3600 s) |
| Weekly stats, performance, negative topic trends | 5 minutes (300 s) |
| Weekly snapshot, rating series, rating distribution, property topic mix | 5 minutes (300 s) |
| Dashboard overview, issues, topic matrix, series, topic impact | 5 minutes (300 s) |
| Filtered review lists | 2 minutes (120 s) |
| Sync health / scrape history | 60 seconds |
| AI portfolio briefing, issue explainer | 1 hour (3600 s) |
| Search query embedding cache | 24 hours (86400 s) |

`getSyncHealth` still computes the stale-data banner from `Date.now()` on every request.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Yes** (server) | — | PostgreSQL connection (pooled in production) |
| `DATABASE_URL_UNPOOLED` | No | falls back to `DATABASE_URL` | Direct connection for migrations only |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Canonical app URL |
| `NEXT_PUBLIC_APP_NAME` | No | `ReviewOps` | App title |
| `NEXT_PUBLIC_APP_DESCRIPTION` | No | (long default) | Meta description |
| `UPSTASH_REDIS_REST_URL` | No | — | Upstash Redis REST URL (both URL + token needed) |
| `UPSTASH_REDIS_REST_TOKEN` | No | — | Upstash Redis REST token |
| `OPENROUTER_API_KEY` | No | — | Enables AI features and embeddings |
| `OPENROUTER_MODEL` | No | `openai/gpt-4o-mini` | Chat model for briefing/explainer/insights |
| `OPENROUTER_EMBEDDING_MODEL` | No | `openai/text-embedding-3-small` | Embedding model (1536 dimensions) |
| `NODE_ENV` | No | `development` | Environment |
| `SCRAPE_HEADED` | No | headless | Set to `1` for headed browser during scrape |

See `.env.example` for a copy-paste template.

## Properties

| Property | Slug | Booking.com URL |
| --- | --- | --- |
| Azzurro Pod Hotel - Central Sydney | `central-sydney` | https://www.booking.com/hotel/au/venus-surry-hills.html |
| Azzurro Pod Hotel - Potts Point | `potts-point` | https://www.booking.com/hotel/au/venus-potts-point-sydney.html |
| Azzurro Pod Hotel - Darling Harbour | `darling-harbour` | https://www.booking.com/hotel/au/chateau-de-venus.html |
| Olympic Hotel Paddington | `olympic-paddington` | https://www.booking.com/hotel/au/olympic-paddington.html |

Full URLs with tracking params are stored in `src/lib/properties.ts`.

## Scraper behavior

- **Sequential:** one property at a time, 20 s gap between properties
- **Incremental:** stops after 8 consecutive already-known reviews (incremental mode only)
- **Backfill:** paginates until site total; resumes from `backfill_skip` checkpoint
- **Page size:** 25 reviews per GraphQL replay, sorted `NEWEST_FIRST`
- **Dedup:** Booking external ID + SHA-256 fingerprint
- **Retry:** 1 s → 3 s → 10 s per property; GraphQL 403/429: 30 s → 60 s → 120 s
- **Rate limited:** `partial` status, `backfill_skip` preserved for resume
- **Blocked/CAPTCHA:** `blocked` status, preserves existing data
- **Classification:** keyword-based topics at insert time (no LLM)
- **Embeddings:** optional post-scrape generation when OpenRouter key is present

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server after build |
| `pnpm scrape` | Run Playwright scraper worker |
| `pnpm test` | Unit tests — 15 test files across scraper, analytics, cache, classification, dashboard contracts |
| `pnpm check` | Biome lint + format |
| `pnpm lint` | Biome lint with auto-fix |
| `pnpm format` | Biome format |
| `pnpm spell` | cspell check |
| `pnpm spell:fix` | cspell with suggestions |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Drizzle push (dev shortcut) |
| `pnpm db:seed` | Seed properties + sample reviews |
| `pnpm db:export-sample` | Export anonymized reviews to `data/sample-reviews.json` |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm reviews:reclassify` | Re-run keyword classifier on outdated reviews |
| `pnpm reviews:embed` | Backfill embeddings (requires OpenRouter) |

## Testing

Run `pnpm test` (Node.js built-in test runner via `tsx --test`).

| Area | Test files |
| --- | --- |
| Scraper | `scraper/__tests__/graphql-parser.test.ts` (pagination, stop logic), `scraper/__tests__/persistence.test.ts` (dedup, topic replacement, rollback) |
| Cache | `src/lib/__tests__/cache.test.ts` (epoch invalidation, Redis fallback) |
| Classification | `src/lib/__tests__/classification.test.ts`, `review-utils.test.ts` |
| Analytics | `analytics-scope.test.ts`, `weekly-snapshot.test.ts`, `dashboard-analytics-contracts.test.ts`, `dashboard-routes.test.ts`, `dashboard-scope.test.ts`, `dashboard-status.test.ts` |
| Reviews | `reviews-contracts.test.ts`, `sync-history.test.ts` |
| Migrations | `migration-integrity.test.ts` (journal ↔ SQL file alignment) |
| AI | `portfolio-briefing.test.ts` (deterministic briefing shape) |

## CI and conventions

- **GitHub Actions** (`.github/workflows/pull_request.yml`): Biome check on push and PR (Node 22, pnpm, frozen lockfile)
- **Husky** pre-commit hook runs lint-staged (Biome + cspell on staged files)
- **Commitlint** conventional commits (`commitlint.config.js`)
- **Dependabot** for dependency updates (`.github/dependabot.yml`)

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Dashboard shows 0 reviews | Seed not run or sample file missing | Run `pnpm db:seed` |
| Scrape status `blocked` | Booking bot protection | Use seeded data; try `SCRAPE_HEADED=1`; see limitations |
| Scrape status `partial` | GraphQL rate limit (403/429) | Re-run scrape; backfill resumes from `backfill_skip` |
| DB connection error | Postgres not running | `docker compose up -d`, confirm port **5433** |
| Migration fails on `vector` | Wrong Postgres image | Use `pgvector/pgvector:pg16` from `docker-compose.yml` |
| AI briefing is basic / no per-review insight | No OpenRouter key | Briefing/explainer use deterministic fallback; insight unavailable; search uses keywords |
| `pnpm reviews:embed` fails | No OpenRouter key | Set `OPENROUTER_API_KEY` |
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
src/app/                  Dashboard routes + app/api JSON endpoints
src/components/
  dashboard/              Analytics dashboard UI (charts, KPIs, issues, weekly snapshot)
  reviews/                Review browser, filters, detail/insight sheet
  properties/             Portfolio grid + property detail view
  sync/                   Scraper history table
  layout/                 App shell, sidebar, header, theme toggle
  ui/                     shadcn/ui primitives
src/db/
  schema/                 Drizzle table definitions
  migrations/             SQL migration files
  queries/                analytics.ts, dashboard-analytics.ts
src/lib/
  ai/                     OpenRouter integration (briefing, explainer, insights, embeddings)
  cache/                  Upstash Redis cache-aside layer
  classification/         Keyword topic classifier
  config/                 Environment validation (Zod)
  queries/                TanStack Query hooks + query keys
  mutations/              TanStack Query mutation hooks
  validations/            Zod schemas
  __tests__/              Unit tests
src/hooks/                Shared React hooks
data/                     Committed sample review export
scraper/                  Playwright worker + __tests__
scripts/                  seed, export, reclassify, embed CLIs
.github/workflows/        CI (Biome check)
```
