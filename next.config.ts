import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    typedRoutes: true,
    headers: async () => {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: `
                            default-src 'self';
                            script-src 'self' 'unsafe-eval' 'unsafe-inline';
                            style-src 'self' 'unsafe-inline' fonts.googleapis.com;
                            img-src 'self' blob: data: https:;
                            font-src 'self' fonts.gstatic.com;
                            object-src 'none';
                            base-uri 'self';
                            form-action 'self';
                            frame-ancestors 'none';
                            block-all-mixed-content;
                            upgrade-insecure-requests;
                        `
                            .replace(/\s{2,}/g, ' ')
                            .trim(),
                    },
                ],
            },
        ]
    },
}

export default nextConfig
