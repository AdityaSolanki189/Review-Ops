'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, slideInFromBottom, defaultViewport } from '@/lib/ui/motion-variants'
import { FEATURES_SECTION_ID } from './features-section'

const steps = [
    {
        number: '01',
        title: 'Clone & Configure',
        description: 'Get started in seconds with our one-command setup',
        code: `git clone https://github.com/your-template.git
cd your-template
pnpm install
cp .env.example .env.local`,
        visual: {
            title: 'Project Structure',
            content: [
                'src/',
                '├── app/ # Next.js app directory',
                '├── components/ # Reusable components',
                '├── lib/ # Utilities and config',
                '└── db/ # Database schema',
            ],
        },
    },
    {
        number: '02',
        title: 'Customize & Extend',
        description: 'Modify components and add features with our flexible architecture',
        code: `// Add your custom component
export function CustomFeature() {
  return (
    <div className="space-y-4">
      <h2>Your Feature</h2>
      {/* Your code here */}
    </div>
  )
}`,
        visual: {
            title: 'Component Library',
            content: [
                '🎨 50+ UI Components',
                '🔐 Auth Components',
                '📱 Responsive Design',
                '🌙 Dark Mode Support',
                '⚡ TypeScript Ready',
            ],
        },
    },
    {
        number: '03',
        title: 'Deploy & Scale',
        description: 'Deploy anywhere with built-in CI/CD and performance optimizations',
        code: `# Deploy to Vercel
vercel

# Or build for production
pnpm build
pnpm start`,
        visual: {
            title: 'Deploy Anywhere',
            content: ['▲ Vercel', '🚀 Netlify', '☁️ AWS', '🌊 Railway', '🔧 Self-hosted'],
        },
    },
]

export function HowItWorks() {
    const [copiedStep, setCopiedStep] = useState<number | null>(null)

    const copyToClipboard = async (text: string, stepIndex: number) => {
        await navigator.clipboard.writeText(text)
        setCopiedStep(stepIndex)
        setTimeout(() => setCopiedStep(null), 2000)
    }

    return (
        <section className="py-20 lg:py-28">
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
                        How It Works
                    </Badge>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                        Get from idea to production in{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            3 steps
                        </span>
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                        Skip the boilerplate and focus on what makes your product unique
                    </p>
                </motion.div>

                {/* Steps */}
                <motion.div
                    className="mt-16 space-y-16"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={staggerContainer}
                >
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.number}
                            className="grid gap-8 lg:grid-cols-2 lg:gap-16"
                            variants={slideInFromBottom}
                        >
                            {/* Content (left on odd, right on even) */}
                            <div className={`flex flex-col justify-center ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                                        {step.number}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {step.title}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
                                    </div>
                                </div>

                                {/* Code block */}
                                <Card className="bg-gray-900 text-gray-100">
                                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                                        <CardTitle className="text-sm text-gray-400">Terminal / Code</CardTitle>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                            onClick={() => copyToClipboard(step.code, index)}
                                        >
                                            {copiedStep === index ? (
                                                <CheckCircle className="h-4 w-4 text-green-400" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <pre className="text-sm font-mono leading-relaxed">
                                            <code>{step.code}</code>
                                        </pre>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Visual (right on odd, left on even) */}
                            <div className={`flex items-center justify-center ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                                <Card className="w-full max-w-md">
                                    <CardHeader>
                                        <CardTitle className="text-center">{step.visual.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {step.visual.content.map((item, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                                                >
                                                    {item.includes('├──') || item.includes('└──') ? (
                                                        <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
                                                            {item}
                                                        </span>
                                                    ) : item.startsWith('src/') ? (
                                                        <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                            {item}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm">{item}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* CTA */}
                <motion.div
                    className="mt-16 text-center"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700" asChild>
                        <a href={`#${FEATURES_SECTION_ID}`}>
                            Explore All Features
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                    </Button>
                </motion.div>
            </div>
        </section>
    )
}
