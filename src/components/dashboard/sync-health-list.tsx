'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import { EmptyState, SyncStatusBadge } from '@/components/dashboard/dashboard-parts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { shortPropertyName } from '@/lib/dashboard-scope'
import type { SyncHealth } from '@/lib/queries/dashboard.queries'

export function SyncHealthList({ data }: { data: SyncHealth }) {
    if (data.latestRuns.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sync health</CardTitle>
                    <CardDescription>Last scrape run per property</CardDescription>
                </CardHeader>
                <CardContent>
                    <EmptyState icon={RefreshCw} message="No sync runs recorded yet." />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                    <CardTitle>Sync health</CardTitle>
                    <CardDescription>Last scrape run per property</CardDescription>
                </div>
                <Link
                    href="/sync"
                    className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                    Details
                </Link>
            </CardHeader>
            <CardContent>
                <ul className="divide-y">
                    {data.latestRuns.map(({ property, run }) => (
                        <li
                            key={property.id}
                            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{shortPropertyName(property.name)}</p>
                                <p className="text-xs text-muted-foreground">
                                    {run?.finishedAt ? format(run.finishedAt, 'dd MMM, HH:mm') : 'Never synced'}
                                    {run?.reviewsInserted !== undefined && Number(run.reviewsInserted) > 0
                                        ? ` · +${run.reviewsInserted}`
                                        : ''}
                                </p>
                            </div>
                            <SyncStatusBadge status={run?.status} />
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
