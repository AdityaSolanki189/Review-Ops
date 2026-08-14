import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

// Next.js loads .env.local automatically; scripts (drizzle-kit, tsx) need this explicitly.
loadEnv({ path: '.env.local' })
loadEnv()

const envSchema = z.object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
    if (typeof window !== 'undefined') {
        return {
            DATABASE_URL: '',
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
            NODE_ENV: (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development',
        }
    }

    try {
        return envSchema.parse(process.env)
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join('\n')
            throw new Error(`Environment validation failed:\n${missingVars}`)
        }
        throw error
    }
}

export const env = validateEnv()

/** Direct Postgres URL for migrations (bypasses PgBouncer pooler). */
export const migrationDatabaseUrl = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL
