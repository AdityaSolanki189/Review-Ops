'use client'

import { format } from 'date-fns'
import { EmptyState, MetricCard, SyncStatusBadge } from '@/components/dashboard/dashboard-parts'
import { PageIntro } from '@/components/layout/page-intro'
import { QueryState, RefreshButton } from '@/components/query-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInvalidateCache } from '@/lib/mutations/cache.mutations'
import { shortPropertyName } from '@/lib/dashboard-scope'
import { useScrapeHistoryQuery } from '@/lib/queries/sync.queries'

function countByStatus(runs: Array<{ run: { status: string } }>, status: string): number {
    return runs.filter(({ run }) => run.status === status).length
}

export function SyncView() {
    const query = useScrapeHistoryQuery(100)
    const invalidateCache = useInvalidateCache()

    const runs = query.data ?? []
    const successCount = countByStatus(runs, 'success')
    const failedCount = countByStatus(runs, 'failed')
    const blockedCount = countByStatus(runs, 'blocked')

    return (
        <div className="space-y-6">
            <PageIntro
                action={
                    <div className="w-full sm:w-auto">
                        <RefreshButton onClick={() => invalidateCache.mutate()} isPending={invalidateCache.isPending} />
                    </div>
                }
            >
                Operational log of Playwright scrape runs. Trigger sync locally with{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">pnpm scrape</code>.
            </PageIntro>

            {query.data && query.data.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <MetricCard title="Success" value={String(successCount)} tone="success" />
                    <MetricCard title="Failed" value={String(failedCount)} tone="destructive" />
                    <div className="col-span-2 sm:col-span-1">
                        <MetricCard title="Blocked" value={String(blockedCount)} tone="warning" />
                    </div>
                </div>
            ) : null}

            <QueryState
                isLoading={query.isLoading}
                isError={query.isError}
                error={query.error}
                onRetry={() => void query.refetch()}
                skeleton={<Skeleton className="h-96 w-full" />}
            >
                {query.data ? (
                    query.data.length === 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent scrape runs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <EmptyState message="No scrape runs recorded yet." />
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="space-y-3 md:hidden">
                                {query.data.map(({ run, property }) => (
                                    <Card key={run.id}>
                                        <CardContent className="space-y-3 p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-medium">{shortPropertyName(property.name)}</p>
                                                <SyncStatusBadge status={run.status} />
                                            </div>
                                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                <div>
                                                    <dt className="text-muted-foreground">Finished</dt>
                                                    <dd>
                                                        {run.finishedAt
                                                            ? format(run.finishedAt, 'dd MMM yyyy, HH:mm')
                                                            : '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-muted-foreground">Inserted</dt>
                                                    <dd className="font-mono tabular-nums">{run.reviewsInserted}</dd>
                                                </div>
                                            </dl>
                                            {run.errorMessage ? (
                                                <p
                                                    className="line-clamp-2 text-sm text-muted-foreground"
                                                    title={run.errorMessage}
                                                >
                                                    {run.errorMessage}
                                                </p>
                                            ) : null}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <Card className="hidden md:block">
                                <CardHeader>
                                    <CardTitle>Recent scrape runs</CardTitle>
                                </CardHeader>
                                <CardContent className="overflow-x-auto">
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
                                            {query.data.map(({ run, property }) => (
                                                <TableRow key={run.id}>
                                                    <TableCell>{shortPropertyName(property.name)}</TableCell>
                                                    <TableCell>
                                                        <SyncStatusBadge status={run.status} />
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums text-sm">
                                                        {format(run.startedAt, 'dd MMM yyyy, HH:mm')}
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums text-sm">
                                                        {run.finishedAt
                                                            ? format(run.finishedAt, 'dd MMM yyyy, HH:mm')
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums text-sm">
                                                        {run.newestReviewAt
                                                            ? format(run.newestReviewAt, 'dd MMM yyyy')
                                                            : property.latestReviewAt
                                                              ? format(property.latestReviewAt, 'dd MMM yyyy')
                                                              : '—'}
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums">
                                                        {run.reviewsFound}
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums">
                                                        {run.reviewsInserted}
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums">
                                                        {run.attemptCount}
                                                    </TableCell>
                                                    <TableCell
                                                        className="max-w-xs truncate text-muted-foreground"
                                                        title={run.errorMessage ?? undefined}
                                                    >
                                                        {run.errorMessage ?? '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    )
                ) : null}
            </QueryState>
        </div>
    )
}
