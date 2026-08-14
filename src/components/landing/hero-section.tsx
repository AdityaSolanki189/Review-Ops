'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { clientConfig } from '@/lib/config/client'
import { ArrowRight, Github, Star, Users } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, scaleIn, defaultViewport } from '@/lib/ui/motion-variants'

export function HeroSection() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <section className="relative overflow-hidden py-20 lg:py-28">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900" />

            {/* Announcement bar */}
            <motion.div
                className="relative z-10 mx-auto mb-8 max-w-4xl px-4 sm:px-6 lg:px-8"
                initial="initial"
                whileInView="animate"
                viewport={defaultViewport}
                variants={fadeInUp}
            >
                <div className="flex justify-center">
                    <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 px-4 py-2 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    >
                        🚀 v2.0 Released - Now with Enhanced Security & AI Integration
                    </Badge>
                </div>
            </motion.div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
                    {/* Left column - Content */}
                    <motion.div
                        className="flex flex-col justify-center"
                        initial="initial"
                        whileInView="animate"
                        viewport={defaultViewport}
                        variants={staggerContainer}
                    >
                        <motion.h1
                            className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl"
                            variants={staggerItem}
                        >
                            Build Modern Web Apps{' '}
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Fast
                            </span>
                        </motion.h1>

                        <motion.p
                            className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 sm:text-xl"
                            variants={staggerItem}
                        >
                            Production-ready Next.js template with authentication, database, and best practices
                            built-in. Start shipping in minutes, not weeks.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-6" variants={staggerItem}>
                            <Button
                                size="lg"
                                className="group relative overflow-hidden bg-blue-600 hover:bg-blue-700"
                                asChild
                            >
                                <Link href="/signup">
                                    Start Building Free
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </Button>

                            <Button size="lg" variant="outline" asChild>
                                <Link href={'/demo' as Route}>View Live Demo</Link>
                            </Button>
                        </motion.div>

                        {/* Trust indicators */}
                        <motion.div className="mt-8 flex flex-wrap items-center gap-6" variants={staggerItem}>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Users className="h-4 w-4" />
                                <span>Trusted by 1,000+ developers</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Github className="h-4 w-4" />
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>500+ GitHub Stars</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span>⚡</span>
                                <span>MIT Licensed</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right column - Interactive preview */}
                    <motion.div
                        className="relative"
                        initial="initial"
                        whileInView="animate"
                        viewport={defaultViewport}
                        variants={scaleIn}
                    >
                        <div className="relative mx-auto max-w-lg">
                            {/* Mock browser window */}
                            <Card className="overflow-hidden border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                                {/* Browser chrome */}
                                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
                                    <div className="flex gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-red-400" />
                                        <div className="h-3 w-3 rounded-full bg-yellow-400" />
                                        <div className="h-3 w-3 rounded-full bg-green-400" />
                                    </div>
                                    <div className="ml-4 flex-1 rounded-md bg-white px-3 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                        {clientConfig.app.url}
                                    </div>
                                </div>

                                {/* Mock dashboard content */}
                                <div className="p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Welcome back!
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-blue-600" />
                                        </div>
                                    </div>

                                    <div className="grid gap-4">
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        Active Users
                                                    </div>
                                                    <div className="text-2xl font-bold text-blue-600">2,547</div>
                                                </div>
                                                <div className="text-green-500">↗ +12%</div>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        Revenue
                                                    </div>
                                                    <div className="text-2xl font-bold text-purple-600">$12,847</div>
                                                </div>
                                                <div className="text-green-500">↗ +8%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Floating elements */}
                            {mounted && (
                                <>
                                    <motion.div
                                        className="absolute -top-4 -right-4"
                                        initial={{ opacity: 0, scale: 0 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={defaultViewport}
                                        transition={{ delay: 0.5, duration: 0.6 }}
                                    >
                                        <Badge className="bg-green-500 text-white shadow-lg">🔒 Secure</Badge>
                                    </motion.div>

                                    <motion.div
                                        className="absolute -bottom-4 -left-4"
                                        initial={{ opacity: 0, scale: 0 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={defaultViewport}
                                        transition={{ delay: 0.7, duration: 0.6 }}
                                    >
                                        <Badge className="bg-purple-500 text-white shadow-lg">⚡ Fast</Badge>
                                    </motion.div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
