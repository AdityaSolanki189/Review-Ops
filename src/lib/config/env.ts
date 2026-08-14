import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
    // Database
    DATABASE_URL: z
        .string()
        .transform(
            (val) =>
                val || 'postgresql://postgres.qwerty:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
        ),

    // Authentication
    BETTER_AUTH_SECRET: z.string().transform((val) => val || 'your-32-character-secret-key-here-change-in-production'),

    // Email
    RESEND_API_KEY: z.string().transform((val) => val || 're_123'),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().transform((val) => val || ''),
    GOOGLE_CLIENT_SECRET: z.string().transform((val) => val || ''),

    // UploadThing
    UPLOADTHING_TOKEN: z.string().transform((val) => val || ''),

    // App Config
    NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
    // Only validate environment variables on the server side
    if (typeof window !== 'undefined') {
        // Client side - return a safe object with only public variables
        return {
            DATABASE_URL: '',
            BETTER_AUTH_SECRET: '',
            RESEND_API_KEY: '',
            GOOGLE_CLIENT_ID: '',
            GOOGLE_CLIENT_SECRET: '',
            UPLOADTHING_TOKEN: '',
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
            NODE_ENV: (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development',
        }
    }

    try {
        return envSchema.parse(process.env)
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join('\n')
            throw new Error(`❌ Environment validation failed:\n${missingVars}`)
        }
        throw error
    }
}

export const env = validateEnv()
