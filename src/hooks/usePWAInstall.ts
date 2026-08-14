'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        window.addEventListener('beforeinstallprompt', handler as EventListener)

        return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
    }, [])

    const installApp = async () => {
        if (!deferredPrompt) return

        // Prompt the user
        const promptEvent = deferredPrompt
        promptEvent.prompt()

        // Optionally, handle user's choice
        const result = await promptEvent.userChoice
        if (result.outcome === 'accepted') {
            console.log('User accepted the install prompt.')
        } else {
            console.log('User dismissed the install prompt.')
        }

        setDeferredPrompt(null) // Clear after prompt
    }

    return {
        deferredPrompt,
        installApp,
    }
}
