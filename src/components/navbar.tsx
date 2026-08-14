'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth/auth-client'
import { clientConfig } from '@/lib/config/client'
import { cn } from '@/lib/utils/utils'
import {
    Check,
    CheckSquare2,
    ChevronDown,
    CreditCard,
    FileText,
    Globe,
    Home,
    Info,
    Laptop,
    LogOut,
    Menu,
    Moon,
    ListTodo,
    Palette,
    Rocket,
    Server,
    Sun,
    User,
    Zap,
} from 'lucide-react'
import type { Route } from 'next'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function Navbar() {
    const { data: session, isPending } = authClient.useSession()
    const router = useRouter()
    const pathname = usePathname()
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSignOut = async () => {
        try {
            await authClient.signOut()
            toast.success('Signed out successfully')
            router.push('/')
        } catch {
            toast.error('Failed to sign out')
        }
    }

    function getUserInitials(name: string | null, email: string | null): string {
        if (name) {
            return name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
        }
        if (email) {
            return email[0]?.toUpperCase() ?? 'U'
        }
        return 'U'
    }

    // Services dropdown structure
    const servicesData = {
        'Website Development': {
            icon: <Globe className="h-4 w-4" />,
            description: 'Custom web solutions',
            services: [
                { name: 'Frontend Development', href: '/services/frontend', description: 'React, Next.js, Vue.js' },
                { name: 'Backend Development', href: '/services/backend', description: 'Node.js, Python, PHP' },
                { name: 'Full-Stack Solutions', href: '/services/fullstack', description: 'End-to-end development' },
                { name: 'E-commerce Platforms', href: '/services/ecommerce', description: 'Shopify, WooCommerce' },
            ],
        },
        Design: {
            icon: <Palette className="h-4 w-4" />,
            description: 'Creative design services',
            services: [
                { name: 'UI/UX Design', href: '/services/ui-ux', description: 'User interface & experience' },
                { name: 'Graphic Design', href: '/services/graphics', description: 'Branding, logos, print' },
                { name: 'Web Design', href: '/services/web-design', description: 'Responsive layouts' },
                { name: 'Mobile App Design', href: '/services/mobile-design', description: 'iOS & Android UI' },
            ],
        },
        Deployment: {
            icon: <Rocket className="h-4 w-4" />,
            description: 'Launch & maintenance',
            services: [
                { name: 'Cloud Hosting', href: '/services/cloud-hosting', description: 'AWS, Vercel, Netlify' },
                { name: 'DevOps Solutions', href: '/services/devops', description: 'CI/CD, Docker, K8s' },
                { name: 'Performance Optimization', href: '/services/performance', description: 'Speed & scalability' },
                { name: 'Maintenance & Support', href: '/services/support', description: '24/7 monitoring' },
            ],
        },
    }

    // Navigation links used in both desktop and mobile menu
    const navLinks = [
        {
            href: '/',
            label: 'Home',
            icon: <Home className="h-4 w-4" />,
        },
        {
            href: '/features',
            label: 'Features',
            icon: <Zap className="h-4 w-4" />,
        },
        {
            href: '/about',
            label: 'About',
            icon: <Info className="h-4 w-4" />,
        },
        {
            href: '/docs',
            label: 'Docs',
            icon: <FileText className="h-4 w-4" />,
        },
        {
            href: '/pricing',
            label: 'Pricing',
            icon: <CreditCard className="h-4 w-4" />,
        },
    ]

    // Theme options
    const themeOptions = [
        { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
        { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
        { value: 'system', label: 'System', icon: <Laptop className="h-4 w-4" /> },
    ]

    return (
        <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-sm">
            <div className="container mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                {/* Left: Logo */}
                <div className="flex items-center">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-md">
                            <CheckSquare2 className="h-4 w-4" />
                        </div>
                        <span className="text-lg font-bold">{clientConfig.app.name}</span>
                    </Link>
                </div>

                {/* Center: Desktop Navigation */}
                <div className="hidden md:flex flex-1 justify-center">
                    <div className="flex space-x-6 items-center">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href as Route}
                                className={cn(
                                    'hover:text-primary flex items-center space-x-1.5 text-sm transition-colors',
                                    pathname === link.href ? 'text-primary font-medium' : 'text-muted-foreground',
                                )}
                            >
                                {link.icon}
                                <span>{link.label}</span>
                            </Link>
                        ))}

                        {/* Services Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        'hover:text-primary flex items-center space-x-1.5 text-sm transition-colors h-auto p-0',
                                        pathname.startsWith('/services')
                                            ? 'text-primary font-medium'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    <Server className="h-4 w-4" />
                                    <span>Services</span>
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[600px] p-0" align="center">
                                <div className="grid grid-cols-3 gap-0">
                                    {Object.entries(servicesData).map(([category, data]) => (
                                        <div key={category} className="p-4 border-r last:border-r-0">
                                            <div className="flex items-center gap-2 mb-3">
                                                {data.icon}
                                                <div>
                                                    <h3 className="font-semibold text-sm">{category}</h3>
                                                    <p className="text-xs text-muted-foreground">{data.description}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {data.services.map((service) => (
                                                    <Link
                                                        key={service.href}
                                                        href={service.href as Route}
                                                        className="block p-2 rounded-md hover:bg-muted transition-colors"
                                                    >
                                                        <div className="font-medium text-sm">{service.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {service.description}
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t p-3 bg-muted/50">
                                    <Link
                                        href={'/services' as Route}
                                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                                    >
                                        View All Services
                                        <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
                                    </Link>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Right: Theme Toggle & Auth */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Theme Toggle - Desktop */}
                    {mounted && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hidden md:inline-flex">
                                    {theme === 'system' ? (
                                        <Laptop className="h-4 w-4" />
                                    ) : theme === 'light' ? (
                                        <Sun className="h-4 w-4" />
                                    ) : (
                                        <Moon className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">Toggle theme</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {themeOptions.map((option) => (
                                    <DropdownMenuItem
                                        key={option.value}
                                        className="cursor-pointer"
                                        onClick={() => setTheme(option.value)}
                                    >
                                        {option.icon}
                                        <span className="ml-2">{option.label}</span>
                                        {theme === option.value && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Desktop-only user elements */}
                    {isPending || !mounted ? (
                        <div className="hidden items-center gap-2 md:flex">
                            <Skeleton className="h-7 w-20 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </div>
                    ) : session ? (
                        <div className="hidden items-center gap-2 md:flex">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                        <Avatar className="border-primary h-10 w-10 border-2">
                                            <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                                            <AvatarFallback>
                                                {getUserInitials(session.user.name, session.user.email)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm leading-none font-medium">{session.user.name}</p>
                                            <p className="text-muted-foreground text-xs leading-none">
                                                {session.user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <Link href="/profile">
                                            <DropdownMenuItem className="cursor-pointer">
                                                <User className="mr-2 h-4 w-4" />
                                                <span>Profile</span>
                                            </DropdownMenuItem>
                                        </Link>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleSignOut}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Sign out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <Link
                            href="/signin"
                            className="bg-primary text-primary-foreground ring-offset-background hover:bg-primary/90 focus-visible:ring-ring hidden items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 md:inline-flex"
                        >
                            Sign in
                        </Link>
                    )}

                    {/* Mobile Menu Button - moved to right side */}
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild className="md:hidden">
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="flex w-[280px] flex-col p-0 sm:w-[320px]">
                            <SheetHeader className="p-6 pb-2">
                                <SheetTitle className="flex items-center gap-2">
                                    <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md">
                                        <CheckSquare2 className="h-3 w-3" />
                                    </div>
                                    <span>{clientConfig.app.name}</span>
                                </SheetTitle>
                            </SheetHeader>

                            {/* User Profile Section in Mobile Menu - Now clickable to go to profile */}
                            {!isPending && mounted && session && (
                                <div className="border-b px-6 py-4">
                                    <SheetClose asChild>
                                        <Link href="/profile" className="flex items-center space-x-3 hover:opacity-80">
                                            <Avatar className="border-primary h-10 w-10 border-2">
                                                <AvatarImage
                                                    src={session.user.image || ''}
                                                    alt={session.user.name || ''}
                                                />
                                                <AvatarFallback>
                                                    {getUserInitials(session.user.name, session.user.email)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{session.user.name}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {session.user.email}
                                                </span>
                                            </div>
                                        </Link>
                                    </SheetClose>
                                </div>
                            )}

                            {/* Navigation Links Section */}
                            <div className="flex-1 overflow-auto py-2">
                                <div className="px-3">
                                    {navLinks.map((link) => (
                                        <SheetClose asChild key={link.href}>
                                            <Link
                                                href={link.href as Route}
                                                className={cn(
                                                    'my-1 flex items-center gap-3 rounded-md px-3 py-2',
                                                    pathname === link.href
                                                        ? 'bg-muted text-primary font-medium'
                                                        : 'text-foreground hover:bg-muted hover:text-primary',
                                                )}
                                                onClick={() => setIsOpen(false)}
                                            >
                                                {link.icon}
                                                <span>{link.label}</span>
                                            </Link>
                                        </SheetClose>
                                    ))}

                                    {session && (
                                        <SheetClose asChild>
                                            <Link
                                                href={'/todos' as Route}
                                                className={cn(
                                                    'my-1 flex items-center gap-3 rounded-md px-3 py-2',
                                                    pathname === '/todos'
                                                        ? 'bg-muted text-primary font-medium'
                                                        : 'text-foreground hover:bg-muted hover:text-primary',
                                                )}
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <ListTodo className="h-4 w-4" />
                                                <span>Todos</span>
                                            </Link>
                                        </SheetClose>
                                    )}

                                    {/* Services Accordion - Mobile */}
                                    <Accordion type="single" collapsible className="mt-2">
                                        <AccordionItem value="services" className="border-none">
                                            <AccordionTrigger className="hover:bg-muted [&>svg]:text-muted-foreground gap-3 rounded-md px-3 py-2 [&>svg]:size-4">
                                                <div className="flex items-center gap-3">
                                                    <Server className="h-4 w-4" />
                                                    <span>Services</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-1 px-6">
                                                    {Object.entries(servicesData).map(([category, data]) => (
                                                        <div key={category} className="py-2">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {data.icon}
                                                                <span className="font-medium text-sm">{category}</span>
                                                            </div>
                                                            <div className="space-y-1 ml-6">
                                                                {data.services.map((service) => (
                                                                    <SheetClose asChild key={service.href}>
                                                                        <Link
                                                                            href={service.href as Route}
                                                                            className="block py-1.5 px-2 rounded-md hover:bg-muted text-sm"
                                                                            onClick={() => setIsOpen(false)}
                                                                        >
                                                                            <div className="font-medium">
                                                                                {service.name}
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {service.description}
                                                                            </div>
                                                                        </Link>
                                                                    </SheetClose>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="pt-2 border-t">
                                                        <SheetClose asChild>
                                                            <Link
                                                                href={'/services' as Route}
                                                                className="block py-2 px-2 rounded-md hover:bg-muted text-sm font-medium text-primary"
                                                                onClick={() => setIsOpen(false)}
                                                            >
                                                                View All Services
                                                            </Link>
                                                        </SheetClose>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>

                            {/* Theme Toggle - Mobile */}
                            {mounted && (
                                <div className="border-t px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Theme</span>
                                        <div className="flex items-center gap-1 rounded-md border p-1">
                                            {themeOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => setTheme(option.value)}
                                                    className={cn(
                                                        'flex h-8 w-8 items-center justify-center rounded-sm transition-colors',
                                                        theme === option.value
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'text-muted-foreground hover:text-foreground',
                                                    )}
                                                    title={option.label}
                                                >
                                                    {option.icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Auth Actions */}
                            <div className="mt-auto border-t px-6 py-4">
                                {!isPending && mounted ? (
                                    session ? (
                                        <SheetClose asChild>
                                            <Button
                                                variant="ghost"
                                                className="text-destructive w-full justify-start"
                                                onClick={handleSignOut}
                                            >
                                                <LogOut className="mr-2 h-4 w-4" />
                                                Sign out
                                            </Button>
                                        </SheetClose>
                                    ) : (
                                        <SheetClose asChild>
                                            <Link
                                                href="/signin"
                                                className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
                                            >
                                                Sign in
                                            </Link>
                                        </SheetClose>
                                    )
                                ) : (
                                    <Skeleton className="h-10 w-full rounded-md" />
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </nav>
    )
}
