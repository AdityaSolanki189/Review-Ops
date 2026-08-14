import { format } from 'date-fns'
import { SyncStatusBadge } from '@/components/dashboard/dashboard-parts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getScrapeRunHistory } from '@/db/queries/analytics'

export default async function SyncPage() {
    const history = await getScrapeRunHistory(100)

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Sync history</h1>
                <p className="mt-1 text-muted-foreground">
                    Operational log of Playwright scrape runs. Trigger sync locally with{' '}
                    <code className="rounded bg-muted px-1 py-0.5">pnpm scrape</code>.
                </p>
            </div>

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
                                <TableHead>Found</TableHead>
                                <TableHead>Inserted</TableHead>
                                <TableHead>Attempts</TableHead>
                                <TableHead>Error</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-muted-foreground">
                                        No scrape runs recorded yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map(({ run, property }) => (
                                    <TableRow key={run.id}>
                                        <TableCell>{property.name.replace('Azzurro Pod Hotel - ', '')}</TableCell>
                                        <TableCell>
                                            <SyncStatusBadge status={run.status} />
                                        </TableCell>
                                        <TableCell>{format(run.startedAt, 'dd MMM yyyy, HH:mm')}</TableCell>
                                        <TableCell>
                                            {run.finishedAt ? format(run.finishedAt, 'dd MMM yyyy, HH:mm') : '—'}
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
        </div>
    )
}
