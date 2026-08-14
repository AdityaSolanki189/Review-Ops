# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 template with a complete authentication system using:
- **Next.js 15** with App Router and TypeScript (strict mode)
- **Drizzle ORM** with PostgreSQL (Neon serverless adapter)
- **Better Auth** for authentication with email/password and Google OAuth
- **Biome** for linting, formatting, and code quality
- **Radix UI** components with Tailwind CSS styling
- **React Hook Form** with Zod validation
- **Zustand** for state management
- **TanStack Query** for data fetching
- **UploadThing** for file uploads
- **Resend** for email delivery

## Package Manager
**CRITICAL**: This project uses **pnpm** as the package manager. Always use `pnpm` for all package operations. Never use `npm` or `yarn`.

## Common Commands

### Development
- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server

### Code Quality
- `pnpm run lint` - Run Biome linter with auto-fix
- `pnpm run check` - Run Biome checks (lint + format)
- `pnpm run format` - Format code with Biome
- `pnpm run spell` - Check spelling in source files
- `pnpm run spell:fix` - Check spelling and show suggestions

### Database Operations
- `pnpm run db:generate` - Generate migrations from schema changes
- `pnpm run db:migrate` - Apply migrations to database
- `pnpm run db:push` - Push schema changes directly to database
- `pnpm run db:studio` - Open Drizzle Studio for database inspection

### Git Hooks
- Pre-commit: Automatically runs lint-staged (Biome lint/format + cspell on staged files)
- Commit-msg: Validates commit messages with commitlint (conventional commits)

## Architecture & Key Patterns

### Authentication System
The authentication is built with Better Auth and follows a layered approach:
- **Server Config**: `src/lib/auth/auth.ts` - Better Auth initialization with drizzleAdapter
- **Database Schema**: `src/db/schema/auth.ts` - Auth tables (user, session, account, verification)
- **Client Utilities**: `src/lib/auth/auth-client.ts` - Client-side auth hooks and helpers
- **Email Integration**: `src/lib/auth/email.ts` - Resend integration for transactional emails
- **Route Protection**: `src/proxy.ts` - Next.js 16 proxy for route guards (replaces traditional middleware)

Auth Features:
- Email/password authentication (email verification optional)
- Google OAuth integration
- Password reset with email verification
- Account deletion with admin protection (blocks emails containing 'admin')
- Email change with verification
- Session management with cookie caching (5-minute cache)
- Better Auth Harmony plugin for enhanced email workflows

### Next.js 16 Proxy Pattern
This project uses **Next.js 16's proxy pattern** (`src/proxy.ts`) instead of traditional middleware:
- Exports a default function that handles request interception
- Uses `getSessionCookie()` from Better Auth for session validation
- Defines route protection rules (public routes, auth routes, protected routes)
- Handles static asset bypassing (images, icons, Next.js internals)
- Returns `NextResponse.redirect()` for unauthorized access
- Exports a `config.matcher` to specify which routes to intercept

Route Categories:
- **Public Routes**: `/` (homepage) - accessible without authentication
- **Auth Routes**: `/signin`, `/signup`, `/reset-password`, `/goodbye` - redirect to `/profile` if logged in
- **Protected Routes**: All other routes - redirect to `/signin` if not authenticated
- **Static Assets**: `/_next`, `/icons`, `/images`, and common file extensions bypass proxy

### Database
- **ORM**: Drizzle with PostgreSQL adapter (Neon serverless)
- **Configuration**: `drizzle.config.ts`
- **Schema**: Located in `src/db/schema/` (auth.ts, todos.ts, index.ts)
- **Migrations**: Auto-generated in `src/db/migrations/`
- **Naming Convention**: snake_case for all columns
- **Connection**: Uses connection pooling via @neondatabase/serverless

### App Router Structure
```
src/app/
├── (auth)/              # Route group for authenticated pages
│   ├── layout.tsx      # Auth layout wrapper
│   ├── profile/        # User profile page
│   ├── signin/         # Sign in page
│   ├── signup/         # Sign up page
│   └── todos/          # Example todos feature
├── api/
│   ├── auth/[...all]/  # Better Auth API routes
│   └── todos/          # Example API routes
├── layout.tsx          # Root layout
├── providers.tsx       # Client providers (QueryClient, ThemeProvider)
├── globals.css         # Global styles and CSS variables
└── page.tsx            # Homepage (public)
```

### UI Components
- **Base Components**: Radix UI primitives in `src/components/ui/` (shadcn-style)
- **Auth Components**: Specialized forms in `src/components/auth/` (signin-form, signup-form)
- **Styling**: Tailwind CSS v4 with custom utilities and CSS variables
- **Theme**: Dark/light mode support with next-themes (system default)
- **Notifications**: Sonner for toast notifications (bottom-right, rich colors)
- **Icons**: Lucide React for consistent iconography

### Code Standards
- **Biome Configuration**:
  - 4-space indentation, 120 character line width
  - Single quotes for JS/TS, double quotes for JSX
  - Trailing commas, semicolons as needed
  - Auto-fix on lint, excludes migrations and .next/
- **TypeScript Configuration**:
  - Strict mode enabled with enhanced checks
  - `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`
  - Path aliases: `@/*` maps to `src/*`
- **Git Workflow**:
  - Conventional commits enforced by commitlint
  - Husky pre-commit: lint, format, and spell-check staged files
  - lint-staged.config.mjs defines pre-commit behavior
- **Spell Checking**: cspell with custom dictionary (tech terms, package names)
- **Environment Safety**:
  - Zod validation for all env vars (server-side)
  - Client-side code cannot access server env vars
  - Separate config files for server (`config.ts`) and client (`client-config.ts`)

### Environment Variables Required
All environment variables are validated at startup using Zod schemas:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - 32+ character secret for auth
- `RESEND_API_KEY` - Email service API key
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `UPLOADTHING_TOKEN` - File upload service token

**Optional:**
- `NEXT_PUBLIC_APP_NAME` - Application display name
- `NEXT_PUBLIC_APP_DESCRIPTION` - App description for SEO
- `NEXT_PUBLIC_APP_URL` - Production URL for callbacks
- `NEXT_PUBLIC_EMAIL_DOMAIN` - Domain for email sending

### Project Structure

```
src/
├── hooks/                  # React custom hooks
│   └── usePWAInstall.ts
├── lib/
│   ├── auth/              # Authentication & email
│   │   ├── auth.ts        # Better Auth server config
│   │   ├── auth-client.ts # Client-side auth utilities
│   │   └── email.ts       # Resend email integration
│   ├── config/            # Configuration & environment
│   │   ├── env.ts         # Environment variable validation (Zod)
│   │   ├── server.ts      # Server-side config
│   │   └── client.ts      # Client-safe config (NEXT_PUBLIC_ vars)
│   ├── mutations/         # TanStack Query mutations
│   │   └── todos.ts       # Todo CRUD operations
│   ├── ui/                # UI utilities
│   │   └── motion-variants.ts # Framer Motion animation presets
│   ├── utils/             # General utilities
│   │   ├── utils.ts       # cn(), URL helpers, etc.
│   │   └── rate-limit.ts  # In-memory rate limiter
│   └── validations/       # Zod validation schemas
│       └── todo.ts        # Todo input validation
└── proxy.ts               # Next.js 16 proxy for route protection
```

### Key Files
- `src/proxy.ts` - **Next.js 16 proxy for route protection** (replaces traditional middleware.ts)
- `src/app/layout.tsx` - Root layout with SEO metadata
- `src/app/providers.tsx` - Query client (TanStack) and theme providers (next-themes)
- `src/lib/config/env.ts` - Environment variable validation with Zod (server-side only)
- `src/lib/config/server.ts` - Server-side app configuration (uses validated env vars)
- `src/lib/config/client.ts` - Client-safe configuration for components (NEXT_PUBLIC_ vars only)
- `next.config.ts` - Next.js config with security headers (CSP, X-Frame-Options, etc.)
- `drizzle.config.ts` - Drizzle Kit configuration (migrations, schema path, snake_case)

### Security Features
- **CSP Headers**: Configured in `next.config.ts` with strict content security policy
- **Security Headers**: X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy
- **Rate Limiting**: In-memory rate limiter for auth endpoints (prevents brute force)
- **Input Validation**: Zod schemas for all user inputs and form validation
- **Environment Validation**: Runtime validation prevents app start with invalid config
- **Session Security**: Secure cookie configuration with HTTP-only flags
- **Route Protection**: Proxy-based authentication guards on protected routes
- **SQL Injection Protection**: Drizzle ORM parameterized queries

## Important Patterns

### Adding New Environment Variables
1. Add to `.env.example` with placeholder value
2. Add to Zod schema in `src/lib/config/env.ts`
3. If client-accessible, prefix with `NEXT_PUBLIC_` and add to `src/lib/config/client.ts`
4. Access via `config` object from `@/lib/config/server` (server) or `clientConfig` from `@/lib/config/client` (client)

### Creating Protected Routes
1. Add route to `src/app/(auth)/` directory for automatic layout
2. Route will be protected by `src/proxy.ts` automatically
3. To make a route public, add it to `PUBLIC_ROUTES` set in `proxy.ts`

### Database Schema Changes
1. Modify schema files in `src/db/schema/`
2. Run `pnpm run db:generate` to create migration
3. Run `pnpm run db:migrate` to apply migration
4. Or use `pnpm run db:push` for quick dev changes (skips migrations)