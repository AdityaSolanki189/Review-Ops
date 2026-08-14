'use client'

import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSyncHealthQuery } from '@/lib/queries/dashboard.queries'

export function SyncStatusIndicator() {
    const { data, isLoading } = useSyncHealthQuery()

    if (isLoading || !data) {
        return (
            <Badge variant="outline" className="hidden font-normal sm:inline-flex">
                Sync status
            </Badge>
        )
    }

    const needsAttention = data.isStale || data.hasBlockedOrFailed

    if (needsAttention) {
        return (
            <Link href="/sync">
                <Badge
                    variant="outline"
                    className="hidden gap-1 font-normal text-amber-700 dark:text-amber-300 sm:inline-flex"
                >
                    <AlertCircle className="size-3.5" />
                    Sync needs attention
                </Badge>
            </Link>
        )
    }

    return (
        <Badge variant="outline" className="hidden gap-1 font-normal text-muted-foreground sm:inline-flex">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Sync healthy
        </Badge>
    )
}
