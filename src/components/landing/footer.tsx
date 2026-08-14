import { config } from '@/lib/config/server'
import Link from 'next/link'
import type { Route } from 'next'
import { Github, Twitter, Mail, Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const footerLinks = {
    product: [
        { name: 'Features', href: '#features' },
        { name: 'Demo', href: '/demo' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Changelog', href: '/changelog' },
        { name: 'Roadmap', href: '/roadmap' },
    ],
    resources: [
        { name: 'Documentation', href: '/docs' },
        { name: 'Tutorials', href: '/tutorials' },
        { name: 'Blog', href: '/blog' },
        { name: 'Examples', href: '/examples' },
        { name: 'Templates', href: '/templates' },
    ],
    developers: [
        { name: 'API Docs', href: '/api-docs' },
        { name: 'GitHub', href: 'https://github.com/your-template' },
        { name: 'Discord', href: 'https://discord.gg/your-server' },
        { name: 'Stack Overflow', href: '#' },
        { name: 'Status Page', href: '/status' },
    ],
    company: [
        { name: 'About', href: '/about' },
        { name: 'Contact', href: '/contact' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'License', href: '/license' },
    ],
}

const socialLinks = [
    {
        name: 'GitHub',
        href: 'https://github.com/your-template',
        icon: Github,
    },
    {
        name: 'Twitter',
        href: 'https://twitter.com/your-handle',
        icon: Twitter,
    },
    {
        name: 'Email',
        href: 'mailto:hello@yourtemplate.com',
        icon: Mail,
    },
]

export function Footer() {
    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Main footer content */}
                <div className="py-16">
                    <div className="grid gap-8 lg:grid-cols-6">
                        {/* Logo and description */}
                        <div className="lg:col-span-2">
                            <Link href="/" className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">T</span>
                                </div>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    {config.app.name}
                                </span>
                            </Link>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
                                {config.app.description}. Start building modern web applications in minutes with our
                                production-ready template.
                            </p>

                            {/* Social links */}
                            <div className="flex gap-4">
                                {socialLinks.map((social) => {
                                    const Icon = social.icon
                                    return (
                                        <Link
                                            key={social.name}
                                            href={social.href as Route}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            target={social.href.startsWith('http') ? '_blank' : undefined}
                                            rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="sr-only">{social.name}</span>
                                        </Link>
                                    )
                                })}
                            </div>

                            {/* Status badges */}
                            <div className="mt-6 flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs">
                                    🟢 All systems operational
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    ⚡ 99.9% uptime
                                </Badge>
                            </div>
                        </div>

                        {/* Footer links */}
                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:col-span-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Product</h3>
                                <ul className="space-y-3">
                                    {footerLinks.product.map((link) => (
                                        <li key={link.name}>
                                            <Link
                                                href={link.href as Route}
                                                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                            >
                                                {link.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Resources</h3>
                                <ul className="space-y-3">
                                    {footerLinks.resources.map((link) => (
                                        <li key={link.name}>
                                            <Link
                                                href={link.href as Route}
                                                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                            >
                                                {link.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Developers</h3>
                                <ul className="space-y-3">
                                    {footerLinks.developers.map((link) => (
                                        <li key={link.name}>
                                            <Link
                                                href={link.href as Route}
                                                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                                target={link.href.startsWith('http') ? '_blank' : undefined}
                                                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                            >
                                                {link.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Company</h3>
                                <ul className="space-y-3">
                                    {footerLinks.company.map((link) => (
                                        <li key={link.name}>
                                            <Link
                                                href={link.href as Route}
                                                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                            >
                                                {link.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Newsletter signup */}
                <div className="border-t border-gray-200 dark:border-gray-800 py-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Stay up to date
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Get notified about new features, updates, and developer resources.
                            </p>
                        </div>
                        <div className="flex gap-2 sm:min-w-96">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                            >
                                Subscribe
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom footer */}
                <div className="border-t border-gray-200 dark:border-gray-800 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <span>
                                © {new Date().getFullYear()} {config.app.name}
                            </span>
                            <span>•</span>
                            <span>MIT Licensed</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                Made with <Heart className="h-3 w-3 text-red-500" /> by developers
                            </span>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                            <span>Version 2.1.0</span>
                            <Link
                                href={'/changelog' as Route}
                                className="hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                What&apos;s new?
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
