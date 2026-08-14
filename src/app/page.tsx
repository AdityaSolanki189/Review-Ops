import { HeroSection } from '@/components/landing/hero-section'
import { HowItWorks } from '@/components/landing/how-it-works'
import { FeaturesSection } from '@/components/landing/features-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { FaqSection } from '@/components/landing/faq-section'
import type { Metadata } from 'next'
import { config } from '@/lib/config/server'

export const metadata: Metadata = {
    title: `${config.app.name} - Build Modern Web Apps Fast`,
    description: `${config.app.description}. Production-ready Next.js template with authentication, database integration, and best practices. Start shipping in minutes, not weeks.`,
    keywords: [
        'Next.js template',
        'React template',
        'TypeScript template',
        'Authentication template',
        'Full-stack template',
        'Modern web development',
        'Starter template',
        'Boilerplate',
        'SaaS template',
        'Production ready',
    ],
    openGraph: {
        title: `${config.app.name} - Build Modern Web Apps Fast`,
        description: `${config.app.description}. Production-ready Next.js template with authentication, database integration, and best practices.`,
        type: 'website',
        url: config.app.url,
        images: [
            {
                url: `${config.app.url}/og-image.png`,
                width: 1200,
                height: 630,
                alt: `${config.app.name} - Modern Web App Template`,
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: `${config.app.name} - Build Modern Web Apps Fast`,
        description: `${config.app.description}. Start shipping in minutes, not weeks.`,
        images: [`${config.app.url}/og-image.png`],
    },
    alternates: {
        canonical: config.app.url,
    },
}

export default function LandingPage() {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <HeroSection />

            {/* How It Works */}
            <HowItWorks />

            {/* Features */}
            <FeaturesSection />

            {/* Testimonials */}
            <TestimonialsSection />

            {/* Pricing */}
            <PricingSection />

            {/* FAQ */}
            <FaqSection />
        </div>
    )
}
