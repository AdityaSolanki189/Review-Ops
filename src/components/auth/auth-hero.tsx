import { clientConfig } from '@/lib/config/client'
import { Sparkles } from 'lucide-react'

interface AuthHeroProps {
    page: 'signin' | 'signup'
}

export function AuthHero({ page }: AuthHeroProps) {
    const content = {
        signin: {
            headline: `Welcome back to ${clientConfig.app.name}`,
            description: 'Sign in to access your account and continue where you left off',
        },
        signup: {
            headline: `Get started with ${clientConfig.app.name}`,
            description: 'Create your account and unlock powerful features to enhance your experience',
        },
    }

    const { headline, description } = content[page]

    return (
        <div className="flex flex-col gap-6">
            {/* App Branding */}
            <div className="flex items-center gap-3">
                <Sparkles className="text-primary h-10 w-10" />
                <span className="text-2xl font-bold">{clientConfig.app.name}</span>
            </div>

            {/* Headline and Description */}
            <div className="flex flex-col gap-2 text-left">
                <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">{headline}</h1>
                <h2 className="text-muted-foreground text-base font-normal leading-normal sm:text-lg">{description}</h2>
            </div>

            {/* Gradient Background Placeholder */}
            <div
                className="bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 aspect-video w-full rounded-xl bg-cover bg-center bg-no-repeat"
                role="img"
                aria-label="Abstract gradient illustration"
            />
        </div>
    )
}
