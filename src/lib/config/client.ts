export const clientConfig = {
    app: {
        name: process.env.NEXT_PUBLIC_APP_NAME || 'ReviewOps',
        description:
            process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
            'Review analytics dashboard for Azzurro Hotels Sydney properties',
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
} as const
