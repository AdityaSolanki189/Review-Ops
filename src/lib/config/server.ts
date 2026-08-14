import { env } from './env'

export const config = {
    app: {
        name: process.env.NEXT_PUBLIC_APP_NAME || 'My App',
        description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'A modern Next.js application with authentication',
        url: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    auth: {
        secret: env.BETTER_AUTH_SECRET,
    },
    database: {
        url: env.DATABASE_URL,
    },
    email: {
        from: `${process.env.NEXT_PUBLIC_APP_NAME || 'My App'} <noreply@${process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'example.com'}>`,
        resendApiKey: env.RESEND_API_KEY,
    },
    oauth: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
    },
    upload: {
        uploadthingToken: env.UPLOADTHING_TOKEN,
    },
} as const
