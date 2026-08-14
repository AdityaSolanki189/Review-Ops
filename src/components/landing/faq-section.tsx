'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, defaultViewport } from '@/lib/ui/motion-variants'

export const FAQ_SECTION_ID = 'faq' as const

const faqs = [
    {
        question: 'Is this template really free?',
        answer: 'Yes! The template is completely free and open-source under the MIT license. You can use it for personal projects, commercial applications, or any other purpose without any restrictions or attribution requirements.',
    },
    {
        question: "What's included in the template?",
        answer: 'The template includes a complete Next.js 15 setup with authentication (email/password + Google OAuth), database integration with Drizzle ORM, 50+ UI components, dark/light theme support, TypeScript, Biome for code quality, security features, and production deployment configuration.',
    },
    {
        question: 'How do I customize the template for my project?',
        answer: 'The template is designed for easy customization. You can modify the color scheme in tailwind.config.ts, update app configuration in src/lib/config.ts, add your own components in src/components/, and extend the database schema in src/db/schema/. All components use CSS variables for theming.',
    },
    {
        question: 'What technologies and frameworks are used?',
        answer: 'Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui components, Drizzle ORM, Better Auth, PostgreSQL, Biome (linting/formatting), Husky (git hooks), Resend (emails), UploadThing (file uploads), and Zod for validation.',
    },
    {
        question: 'How do I deploy the template?',
        answer: 'The template is optimized for deployment on Vercel, but works anywhere that supports Node.js. We include configurations for Vercel, Railway, Netlify, and self-hosting. The build process is optimized and includes proper environment variable validation.',
    },
    {
        question: 'Is this production-ready?',
        answer: 'Absolutely! The template includes security headers, rate limiting, input validation, error handling, performance optimizations, and monitoring setup. It follows Next.js best practices and is used by many production applications.',
    },
    {
        question: "What's the difference between Free and Pro Support?",
        answer: 'The free template includes everything you need. Pro Support adds priority email support, a 1-hour consultation call, custom implementation guidance, private Discord access, additional template variants, and early access to new features.',
    },
    {
        question: "How do I get help if I'm stuck?",
        answer: 'We have comprehensive documentation, a community Discord server, GitHub discussions, and example implementations. Pro Support customers get priority help via email and private Discord access.',
    },
    {
        question: 'Can I use this for commercial projects?',
        answer: 'Yes! The MIT license allows commercial use without any restrictions. You can build and sell applications using this template, modify it however you like, and even create your own templates based on it.',
    },
    {
        question: 'How often is the template updated?',
        answer: 'We regularly update the template with security patches, dependency updates, new features, and improvements. All updates are backward compatible, and we maintain detailed changelogs for each release.',
    },
]

export function FaqSection() {
    return (
        <section id={FAQ_SECTION_ID} className="py-20 lg:py-28">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <motion.div
                    className="text-center mb-16"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <Badge variant="outline" className="mb-4">
                        FAQ
                    </Badge>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                        Frequently asked{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            questions
                        </span>
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                        Everything you need to know about the template and getting started
                    </p>
                </motion.div>

                {/* FAQ Accordion */}
                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={staggerContainer}
                >
                    <Accordion type="single" collapsible className="space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div key={index} variants={staggerItem}>
                                <AccordionItem
                                    value={`item-${index}`}
                                    className="border border-gray-200 dark:border-gray-800 rounded-lg px-6 bg-white dark:bg-gray-900"
                                >
                                    <AccordionTrigger className="text-left font-semibold text-gray-900 dark:text-white hover:no-underline">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            </motion.div>
                        ))}
                    </Accordion>
                </motion.div>

                {/* Contact section */}
                <motion.div
                    className="mt-16 text-center"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-8">
                        <MessageCircle className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Still have questions?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Can&apos;t find the answer you&apos;re looking for? Our team is here to help.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button asChild>
                                <Link href="https://github.com/your-template/discussions">
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                    Join Community
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="mailto:support@yourtemplate.com">
                                    Contact Support
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Additional resources */}
                <motion.div
                    className="mt-12"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-6">
                        Additional Resources
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Link
                            href={'/docs' as Route}
                            className="group rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        >
                            <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                📚 Documentation
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Complete setup guide</div>
                        </Link>

                        <Link
                            href={'/examples' as Route}
                            className="group rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        >
                            <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                💡 Examples
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Live demos and code</div>
                        </Link>

                        <Link
                            href="https://github.com/your-template"
                            className="group rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        >
                            <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                🔧 GitHub
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Source code & issues</div>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
