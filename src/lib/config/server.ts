import { env } from './env'

export const config = {
    app: {
        name: process.env.NEXT_PUBLIC_APP_NAME || 'ReviewOps',
        description:
            process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
            'Review analytics dashboard for Azzurro Hotels Sydney properties',
        url: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    database: {
        url: env.DATABASE_URL,
    },
} as const
