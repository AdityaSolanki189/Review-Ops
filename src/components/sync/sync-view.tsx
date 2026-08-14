'use client'

import { format } from 'date-fns'
import { SyncStatusBadge } from '@/components/dashboard/dashboard-parts'
import { QueryState, RefreshButton } from '@/components/query-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInvalidateCache } from '@/lib/mutations/cache.mutations'
import { useScrapeHistoryQuery } from '@/lib/queries/sync.queries'

export function SyncView() {
    const query = useScrapeHistoryQuery(100)
    const invalidateCache = useInvalidateCache()

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Sync history</h1>
                    <p className="mt-1 text-muted-foreground">
                        Operational log of Playwright scrape runs. Trigger sync locally with{' '}
                        <code className="rounded bg-muted px-1 py-0.5">pnpm scrape</code>.
                    </p>
                </div>
                <RefreshButton onClick={() => invalidateCache.mutate()} isPending={invalidateCache.isPending} />
            </div>

            <QueryState
                isLoading={query.isLoading}
                isError={query.isError}
                error={query.error}
                onRetry={() => void query.refetch()}
                skeleton={<Skeleton className="h-96 w-full" />}
            >
                {query.data ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent scrape runs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Property</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Started</TableHead>
                                        <TableHead>Finished</TableHead>
                                        <TableHead>Latest review</TableHead>
                                        <TableHead>Found</TableHead>
                                        <TableHead>Inserted</TableHead>
                                        <TableHead>Attempts</TableHead>
                                        <TableHead>Error</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {query.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-muted-foreground">
                                                No scrape runs recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        query.data.map(({ run, property }) => (
                                            <TableRow key={run.id}>
                                                <TableCell>
                                                    {property.name.replace('Azzurro Pod Hotel - ', '')}
                                                </TableCell>
                                                <TableCell>
                                                    <SyncStatusBadge status={run.status} />
                                                </TableCell>
                                                <TableCell>{format(run.startedAt, 'dd MMM yyyy, HH:mm')}</TableCell>
                                                <TableCell>
                                                    {run.finishedAt
                                                        ? format(run.finishedAt, 'dd MMM yyyy, HH:mm')
                                                        : '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {run.newestReviewAt
                                                        ? format(run.newestReviewAt, 'dd MMM yyyy')
                                                        : property.latestReviewAt
                                                          ? format(property.latestReviewAt, 'dd MMM yyyy')
                                                          : '—'}
                                                </TableCell>
                                                <TableCell>{run.reviewsFound}</TableCell>
                                                <TableCell>{run.reviewsInserted}</TableCell>
                                                <TableCell>{run.attemptCount}</TableCell>
                                                <TableCell className="max-w-xs truncate text-muted-foreground">
                                                    {run.errorMessage ?? '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>
        </div>
    )
}
