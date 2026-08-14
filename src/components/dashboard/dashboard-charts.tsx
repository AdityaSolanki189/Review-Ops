'use client'

import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/dashboard/dashboard-parts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'

const ratingTrendConfig = {
    avgRating: {
        label: 'Average rating',
        color: 'var(--chart-1)',
    },
    reviewCount: {
        label: 'Reviews',
        color: 'var(--chart-2)',
    },
} satisfies ChartConfig

const distributionConfig = {
    count: {
        label: 'Reviews',
        color: 'var(--chart-2)',
    },
} satisfies ChartConfig

const sentimentConfig = {
    positive: {
        label: 'Positive',
        color: 'var(--success)',
    },
    neutral: {
        label: 'Neutral',
        color: 'var(--muted-foreground)',
    },
    negative: {
        label: 'Negative',
        color: 'var(--destructive)',
    },
} satisfies ChartConfig

export function SentimentPieChart({
    mix,
    compact = false,
}: {
    mix: { positive: number; neutral: number; negative: number }
    compact?: boolean
}) {
    const total = mix.positive + mix.neutral + mix.negative
    if (total === 0) {
        return compact ? (
            <p className="text-xs text-muted-foreground">No classified mentions</p>
        ) : (
            <EmptyState message="No classified topic mentions in this period." />
        )
    }

    const chartData = [
        { key: 'positive', value: mix.positive, fill: 'var(--color-positive)' },
        { key: 'neutral', value: mix.neutral, fill: 'var(--color-neutral)' },
        { key: 'negative', value: mix.negative, fill: 'var(--color-negative)' },
    ].filter((row) => row.value > 0)

    const heightClass = compact ? 'h-24 w-24' : 'h-[180px] w-full'

    return (
        <ChartContainer config={sentimentConfig} className={heightClass}>
            <PieChart>
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            formatter={(value, name) => {
                                const count = Number(value)
                                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
                                return [
                                    `${count} (${pct}%)`,
                                    sentimentConfig[name as keyof typeof sentimentConfig]?.label ?? name,
                                ]
                            }}
                        />
                    }
                />
                {!compact ? <ChartLegend content={<ChartLegendContent nameKey="key" />} /> : null}
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={compact ? '55%' : '45%'}
                    outerRadius={compact ? '90%' : '80%'}
                    strokeWidth={1}
                    stroke="var(--background)"
                >
                    {chartData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                    ))}
                </Pie>
            </PieChart>
        </ChartContainer>
    )
}

export function PeriodRatingTrendChart({
    rating,
    reviewVolume,
    granularity,
}: {
    rating: Array<{ bucket: string; value: number | null; sampleSize: number }>
    reviewVolume: Array<{ bucket: string; value: number }>
    granularity: 'day' | 'week'
}) {
    const volumeByBucket = new Map(reviewVolume.map((row) => [row.bucket, row.value]))
    const chartData = rating.map((row) => ({
        period: format(new Date(`${row.bucket}T00:00:00`), granularity === 'day' ? 'd MMM' : 'd MMM'),
        avgRating: row.value === null ? null : Number(row.value.toFixed(1)),
        reviewCount: volumeByBucket.get(row.bucket) ?? row.sampleSize,
    }))

    return (
        <ChartContainer config={ratingTrendConfig} className="aspect-auto h-[280px] w-full">
            <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis yAxisId="rating" domain={[0, 10]} tickLine={false} axisLine={false} width={32} />
                <YAxis yAxisId="count" orientation="right" tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                    yAxisId="rating"
                    type="monotone"
                    dataKey="avgRating"
                    stroke="var(--color-avgRating)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                />
                <Line
                    yAxisId="count"
                    type="monotone"
                    dataKey="reviewCount"
                    stroke="var(--color-reviewCount)"
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ChartContainer>
    )
}

export function RatingBandDistributionChart({ data }: { data: Array<{ band: string; reviewCount: number }> }) {
    const chartData = data.map((row) => ({
        band: row.band,
        count: row.reviewCount,
    }))

    return (
        <ChartContainer config={distributionConfig} className="aspect-auto h-[240px] w-full">
            <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="band" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
        </ChartContainer>
    )
}

export function ChartSectionSkeleton({ title }: { title: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>Loading chart data</CardDescription>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[280px] w-full" />
            </CardContent>
        </Card>
    )
}
