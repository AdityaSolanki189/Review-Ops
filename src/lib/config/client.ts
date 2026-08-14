// Client-safe configuration that can be imported in client components
// Only includes NEXT_PUBLIC_ environment variables and constants

export const clientConfig = {
    app: {
        name: process.env.NEXT_PUBLIC_APP_NAME || 'NextDay',
        description:
            process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
            'Production-ready Next.js template with authentication, database, and best practices built-in',
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
} as const
