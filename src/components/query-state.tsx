'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface QueryStateProps {
    isLoading: boolean
    isError: boolean
    error?: Error | null
    onRetry?: () => void
    children: React.ReactNode
    skeleton?: React.ReactNode
}

export function QueryState({ isLoading, isError, error, onRetry, children, skeleton }: QueryStateProps) {
    if (isLoading) {
        return (
            skeleton ?? (
                <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            )
        )
    }

    if (isError) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
                <p className="text-sm text-destructive">{error?.message ?? 'Failed to load data'}</p>
                {onRetry ? (
                    <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                        Try again
                    </Button>
                ) : null}
            </div>
        )
    }

    return children
}

interface RefreshButtonProps {
    onClick: () => void
    isPending?: boolean
}

export function RefreshButton({ onClick, isPending }: RefreshButtonProps) {
    return (
        <Button
            variant="outline"
            size="sm"
            className="min-h-11 w-full sm:w-auto"
            onClick={onClick}
            disabled={isPending}
        >
            {isPending ? 'Refreshing…' : 'Refresh data'}
        </Button>
    )
}
