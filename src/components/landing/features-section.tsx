'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Database, Palette, Zap, Lock, Rocket, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, defaultViewport } from '@/lib/ui/motion-variants'

export const FEATURES_SECTION_ID = 'features' as const

const features = [
    {
        icon: Shield,
        title: 'Authentication Ready',
        description: 'Complete auth system with email/password, Google OAuth, and secure session management',
        details: [
            'Email verification flow',
            'Password reset functionality',
            'Google OAuth integration',
            'Secure session handling',
            'Account deletion with protection',
        ],
        color: 'from-blue-500 to-cyan-500',
        demo: {
            type: 'auth-flow',
            content: 'Interactive login demo',
        },
    },
    {
        icon: Database,
        title: 'Database Integration',
        description: 'Type-safe database queries with Drizzle ORM and PostgreSQL support',
        details: [
            'Drizzle ORM with TypeScript',
            'PostgreSQL compatibility',
            'Automatic migrations',
            'Connection pooling',
            'Schema validation',
        ],
        color: 'from-green-500 to-emerald-500',
        demo: {
            type: 'schema',
            content: 'Database schema visualization',
        },
    },
    {
        icon: Palette,
        title: 'Modern UI Components',
        description: 'Beautiful, accessible components built with Tailwind CSS and Radix UI',
        details: [
            '50+ pre-built components',
            'Dark/light theme support',
            'Fully responsive design',
            'Accessibility compliant',
            'Customizable styling',
        ],
        color: 'from-purple-500 to-pink-500',
        demo: {
            type: 'components',
            content: 'Component showcase',
        },
    },
    {
        icon: Zap,
        title: 'Developer Experience',
        description: 'Optimized development workflow with modern tooling and best practices',
        details: [
            'TypeScript with strict mode',
            'Biome for linting/formatting',
            'Pre-commit hooks',
            'Hot reload development',
            'Environment validation',
        ],
        color: 'from-yellow-500 to-orange-500',
        demo: {
            type: 'workflow',
            content: 'Development workflow demo',
        },
    },
    {
        icon: Lock,
        title: 'Security First',
        description: 'Built-in security features to protect your application and users',
        details: [
            'Content Security Policy',
            'Rate limiting',
            'Input validation with Zod',
            'Environment variable validation',
            'Secure headers configuration',
        ],
        color: 'from-red-500 to-rose-500',
        demo: {
            type: 'security',
            content: 'Security features overview',
        },
    },
    {
        icon: Rocket,
        title: 'Production Ready',
        description: 'Deploy anywhere with optimized performance and monitoring',
        details: [
            'Build optimization',
            'CI/CD pipeline ready',
            'Performance monitoring',
            'Error tracking setup',
            'SEO optimized',
        ],
        color: 'from-indigo-500 to-blue-500',
        demo: {
            type: 'deployment',
            content: 'Deployment options',
        },
    },
]

export function FeaturesSection() {
    const [activeFeature, setActiveFeature] = useState(0)

    return (
        <section id={FEATURES_SECTION_ID} className="py-20 lg:py-28 bg-gray-50 dark:bg-gray-900">
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
                        Features
                    </Badge>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                        Everything you need to build{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            modern web apps
                        </span>
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                        A complete toolkit with all the features you need, from authentication to deployment
                    </p>
                </motion.div>

                {/* Features grid */}
                <motion.div
                    className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={staggerContainer}
                >
                    {features.map((feature, index) => {
                        const Icon = feature.icon
                        const isActive = activeFeature === index

                        return (
                            <motion.div key={feature.title} variants={staggerItem}>
                                <Card
                                    className={`group relative overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                                        isActive
                                            ? 'border-blue-500 shadow-xl scale-105'
                                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                    }`}
                                    onClick={() => setActiveFeature(index)}
                                >
                                    <CardHeader>
                                        <div className="mb-4">
                                            <div
                                                className={`inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.color}`}
                                            >
                                                <Icon className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                                            {feature.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-600 dark:text-gray-300 mb-4">{feature.description}</p>

                                        {/* Feature details */}
                                        <ul className="space-y-2 mb-6">
                                            {feature.details.map((detail, i) => (
                                                <li
                                                    key={i}
                                                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                                                >
                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Interactive demo placeholder */}
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {feature.demo.content}
                                                </span>
                                                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                        </div>
                                    </CardContent>

                                    {/* Hover gradient overlay */}
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}
                                    />
                                </Card>
                            </motion.div>
                        )
                    })}
                </motion.div>

                {/* Stats section */}
                <motion.div
                    className="mt-20"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">50+</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">UI Components</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400">100%</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">TypeScript</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">5min</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Setup Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">1K+</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Happy Developers</div>
                        </div>
                    </div>
                </motion.div>

                {/* CTA */}
                <motion.div
                    className="mt-16 text-center"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                        Get Started Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </motion.div>
            </div>
        </section>
    )
}
