'use client'

import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSyncHealthQuery } from '@/lib/queries/dashboard.queries'

export function SyncStatusIndicator() {
    const { data, isLoading } = useSyncHealthQuery()

    if (isLoading || !data) {
        return (
            <Button variant="outline" size="icon" className="size-9 shrink-0" disabled aria-label="Sync status loading">
                <AlertCircle className="size-4 text-muted-foreground" />
            </Button>
        )
    }

    const needsAttention = data.isStale || data.hasBlockedOrFailed

    if (needsAttention) {
        return (
            <Button variant="outline" size="icon" className="size-9 shrink-0" asChild>
                <Link href="/sync" aria-label="Sync needs attention">
                    <AlertCircle className="size-4 text-warning-foreground" />
                </Link>
            </Button>
        )
    }

    return (
        <Button variant="outline" size="icon" className="size-9 shrink-0" asChild>
            <Link href="/sync" aria-label="Sync healthy">
                <CheckCircle2 className="size-4 text-success" />
            </Link>
        </Button>
    )
}
