'use client'

import Link from 'next/link'
import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePropertiesPerformanceQuery } from '@/lib/queries/properties.queries'

export function PropertiesView() {
    const query = usePropertiesPerformanceQuery()

    return (
        <div className="space-y-8">
            <div>
                <p className="text-muted-foreground">Performance across the four Azzurro Sydney properties</p>
            </div>

            <QueryState
                isLoading={query.isLoading}
                isError={query.isError}
                error={query.error}
                onRetry={() => void query.refetch()}
                skeleton={
                    <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                    </div>
                }
            >
                {query.data ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {query.data.map((row) => (
                            <Card key={row.property.id}>
                                <CardHeader>
                                    <CardTitle>{row.property.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-semibold">{row.avgRating.toFixed(1)}</span>
                                        <Badge variant={row.delta >= 0 ? 'default' : 'destructive'}>
                                            {row.delta >= 0 ? '+' : ''}
                                            {row.delta.toFixed(1)} this week
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {row.reviewCount} reviews this week · {row.totalReviews} total collected
                                    </p>
                                    <Link
                                        href={`/properties/${row.property.slug}`}
                                        className="text-sm font-medium text-primary hover:underline"
                                    >
                                        View property details
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : null}
            </QueryState>
        </div>
    )
}
