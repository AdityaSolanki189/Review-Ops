'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Star, Github, Heart, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, defaultViewport } from '@/lib/ui/motion-variants'
import { FAQ_SECTION_ID } from './faq-section'

const pricingPlans = [
    {
        name: 'Free Template',
        price: '$0',
        description: 'Complete source code with all features included',
        features: [
            'Complete Next.js 15 template',
            'Authentication system (email + OAuth)',
            'Database integration with Drizzle ORM',
            '50+ UI components with shadcn/ui',
            'Dark/light theme support',
            'TypeScript with strict mode',
            'Biome for linting & formatting',
            'Security features (CSP, rate limiting)',
            'Production deployment ready',
            'MIT License - use anywhere',
            'Community support',
        ],
        buttonText: 'Get Started Free',
        buttonVariant: 'default' as const,
        popular: false,
        href: 'https://github.com/your-template',
    },
    {
        name: 'Pro Support',
        price: '$99',
        description: 'Everything in Free plus priority support and consultation',
        features: [
            'Everything in Free Template',
            'Priority email support',
            '1-hour setup consultation call',
            'Custom feature implementation guide',
            'Private Discord access',
            'Additional template variants',
            'Early access to new features',
            'Code review and feedback',
            'Deployment assistance',
            '30-day money-back guarantee',
        ],
        buttonText: 'Get Pro Support',
        buttonVariant: 'outline' as const,
        popular: true,
        href: '#contact',
    },
]

export function PricingSection() {
    return (
        <section className="py-20 lg:py-28 bg-gray-50 dark:bg-gray-900">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <motion.div
                    className="mx-auto max-w-3xl text-center"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <Badge variant="outline" className="mb-4">
                        Pricing
                    </Badge>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                        Simple, transparent{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            pricing
                        </span>
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                        Start building for free. Upgrade to Pro for priority support and consultation.
                    </p>
                </motion.div>

                {/* Pricing cards */}
                <motion.div
                    className="mt-16 grid gap-8 lg:grid-cols-2 lg:gap-12 max-w-5xl mx-auto"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={staggerContainer}
                >
                    {pricingPlans.map((plan) => (
                        <motion.div key={plan.name} variants={staggerItem}>
                            <Card
                                className={`relative ${
                                    plan.popular
                                        ? 'border-2 border-blue-500 shadow-xl scale-105'
                                        : 'border border-gray-200 dark:border-gray-800'
                                }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-blue-600 text-white px-4 py-1">
                                            <Star className="h-3 w-3 mr-1" />
                                            Most Popular
                                        </Badge>
                                    </div>
                                )}

                                <CardHeader className="text-center pb-8">
                                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {plan.name}
                                    </CardTitle>
                                    <div className="mt-4">
                                        <span className="text-5xl font-bold text-gray-900 dark:text-white">
                                            {plan.price}
                                        </span>
                                        {plan.price !== '$0' && (
                                            <span className="text-gray-600 dark:text-gray-300 ml-2">one-time</span>
                                        )}
                                    </div>
                                    <p className="mt-4 text-gray-600 dark:text-gray-300">{plan.description}</p>
                                </CardHeader>

                                <CardContent>
                                    {/* Features list */}
                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-3">
                                                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA button */}
                                    <Button
                                        size="lg"
                                        variant={plan.buttonVariant}
                                        className={`w-full ${
                                            plan.popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                                        }`}
                                        asChild
                                    >
                                        <Link href={plan.href as Route}>
                                            {plan.buttonText}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>

                                    {plan.name === 'Free Template' && (
                                        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div className="flex items-center gap-1">
                                                <Github className="h-4 w-4" />
                                                <span>Open Source</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Heart className="h-4 w-4 text-red-500" />
                                                <span>MIT License</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                {/* FAQ links */}
                <motion.div
                    className="mt-16 text-center"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <p className="text-gray-600 dark:text-gray-300 mb-4">Have questions about pricing?</p>
                    <div className="flex flex-wrap justify-center gap-6 text-sm">
                        <Link
                            href={`#${FAQ_SECTION_ID}`}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            View FAQ
                        </Link>
                        <Link
                            href="#contact"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            Contact Sales
                        </Link>
                        <Link
                            href={'/docs' as Route}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            View Documentation
                        </Link>
                    </div>
                </motion.div>

                {/* Trust indicators */}
                <motion.div
                    className="mt-16 border-t border-gray-200 dark:border-gray-800 pt-16"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <div className="text-center mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Trusted by developers at
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-6 items-center justify-items-center opacity-60">
                        {/* Company logos would go here */}
                        <div className="flex items-center justify-center h-12 w-24 bg-gray-100 dark:bg-gray-800 rounded text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Startup A
                        </div>
                        <div className="flex items-center justify-center h-12 w-24 bg-gray-100 dark:bg-gray-800 rounded text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Company B
                        </div>
                        <div className="flex items-center justify-center h-12 w-24 bg-gray-100 dark:bg-gray-800 rounded text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Scale Co
                        </div>
                        <div className="flex items-center justify-center h-12 w-24 bg-gray-100 dark:bg-gray-800 rounded text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Tech Inc
                        </div>
                        <div className="flex items-center justify-center h-12 w-24 bg-gray-100 dark:bg-gray-800 rounded text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Dev Corp
                        </div>
                        <div className="flex items-center justify-center h-12 w-24 bg-gray-100 dark:bg-gray-800 rounded text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Build Co
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
