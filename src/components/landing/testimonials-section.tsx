'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { fadeInUp, scaleIn, defaultViewport } from '@/lib/ui/motion-variants'

const testimonials = [
    {
        id: 1,
        content:
            'This template saved me 2 weeks of setup time. The authentication system is rock solid and the code quality is exceptional. Perfect for MVP development.',
        author: 'Sarah Chen',
        role: 'Senior Full-Stack Developer',
        company: 'TechFlow',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        rating: 5,
    },
    {
        id: 2,
        content:
            "Best Next.js template I've used. The developer experience is incredible - hot reload, TypeScript, and perfect linting setup. My team adopted it immediately.",
        author: 'Marcus Rodriguez',
        role: 'Tech Lead',
        company: 'StartupCo',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
        rating: 5,
    },
    {
        id: 3,
        content:
            'The security features are impressive. Rate limiting, CSP headers, and input validation out of the box. Exactly what we needed for our enterprise project.',
        author: 'Emily Watson',
        role: 'DevOps Engineer',
        company: 'SecureApp',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
        rating: 5,
    },
    {
        id: 4,
        content:
            'Fantastic documentation and clean code structure. I was able to customize everything I needed without any hassle. The component library is comprehensive.',
        author: 'Alex Kim',
        role: 'Frontend Developer',
        company: 'DesignStudio',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        rating: 5,
    },
    {
        id: 5,
        content:
            'The database integration with Drizzle is seamless. Type-safe queries and automatic migrations made our development process so much smoother.',
        author: 'Jordan Taylor',
        role: 'Backend Developer',
        company: 'DataFlow',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
        rating: 5,
    },
    {
        id: 6,
        content:
            'Production deployment was effortless. The CI/CD setup and performance optimizations work perfectly. Our app handles thousands of users without issues.',
        author: 'Rachel Green',
        role: 'CTO',
        company: 'ScaleUp',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rachel',
        rating: 5,
    },
]

export function TestimonialsSection() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isAutoPlaying, setIsAutoPlaying] = useState(true)

    // Auto-rotate testimonials
    useEffect(() => {
        if (!isAutoPlaying) return

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length)
        }, 5000)

        return () => clearInterval(interval)
    }, [isAutoPlaying])

    const goToPrevious = () => {
        setIsAutoPlaying(false)
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    }

    const goToNext = () => {
        setIsAutoPlaying(false)
        setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }

    const goToSlide = (index: number) => {
        setIsAutoPlaying(false)
        setCurrentIndex(index)
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
                        Testimonials
                    </Badge>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                        Don&apos;t just take our{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            word for it
                        </span>
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                        Our developers are our best ambassadors. Discover why we&apos;re the top choice for modern web
                        development.
                    </p>
                </motion.div>

                {/* Testimonials carousel */}
                <motion.div
                    className="mt-16 relative"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={scaleIn}
                >
                    <div className="overflow-hidden">
                        <div
                            className="flex transition-transform duration-500 ease-in-out"
                            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                        >
                            {testimonials.map((testimonial) => (
                                <div key={testimonial.id} className="w-full flex-shrink-0 px-4">
                                    <Card className="mx-auto max-w-4xl bg-white dark:bg-gray-800 shadow-xl">
                                        <CardContent className="p-8 lg:p-12">
                                            <div className="text-center">
                                                {/* Stars */}
                                                <div className="flex justify-center mb-6">
                                                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className="h-5 w-5 fill-yellow-400 text-yellow-400"
                                                        />
                                                    ))}
                                                </div>

                                                {/* Quote */}
                                                <blockquote className="text-xl font-medium text-gray-900 dark:text-white lg:text-2xl leading-relaxed mb-8">
                                                    &ldquo;{testimonial.content}&rdquo;
                                                </blockquote>

                                                {/* Author */}
                                                <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                                                    <div
                                                        className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 bg-cover bg-center"
                                                        style={{ backgroundImage: `url(${testimonial.avatar})` }}
                                                        role="img"
                                                        aria-label={testimonial.author}
                                                    />
                                                    <div className="text-center sm:text-left">
                                                        <div className="font-semibold text-gray-900 dark:text-white">
                                                            {testimonial.author}
                                                        </div>
                                                        <div className="text-gray-600 dark:text-gray-300">
                                                            {testimonial.role} at {testimonial.company}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation buttons */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-lg bg-white dark:bg-gray-800"
                        onClick={goToPrevious}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-lg bg-white dark:bg-gray-800"
                        onClick={goToNext}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>

                    {/* Indicators */}
                    <div className="flex justify-center mt-8 gap-2">
                        {testimonials.map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                className={`h-2 w-8 rounded-full transition-colors ${
                                    index === currentIndex
                                        ? 'bg-blue-600'
                                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                                }`}
                                onClick={() => goToSlide(index)}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Trust indicators */}
                <motion.div
                    className="mt-16 grid gap-8 sm:grid-cols-3 lg:grid-cols-3"
                    initial="initial"
                    whileInView="animate"
                    viewport={defaultViewport}
                    variants={fadeInUp}
                >
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">1,000+</div>
                        <div className="text-gray-600 dark:text-gray-300">Happy Developers</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">99%</div>
                        <div className="text-gray-600 dark:text-gray-300">Satisfaction Rate</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">24/7</div>
                        <div className="text-gray-600 dark:text-gray-300">Community Support</div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
