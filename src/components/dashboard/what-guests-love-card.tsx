'use client'

import type { LucideIcon } from 'lucide-react'
import {
    Accessibility,
    AirVent,
    BadgeDollarSign,
    BedDouble,
    Bug,
    CreditCard,
    Droplets,
    MapPin,
    Shield,
    Sparkles,
    Users,
    UtensilsCrossed,
    Wifi,
    Wrench,
} from 'lucide-react'
import { CardHeaderWithInfo } from '@/components/dashboard/info-tip'
import { SignalBar } from '@/components/dashboard/dashboard-parts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import { cn } from '@/lib/utils/utils'

type PositiveDriver = {
    topic: ReviewTopicKey
    mentionCount: number
    positiveMentionRate: number | null
    momentumPercentagePoints: number | null
    status: string
}

const topicIcons: Partial<Record<ReviewTopicKey, LucideIcon>> = {
    cleanliness: Sparkles,
    staff: Users,
    location: MapPin,
    facilities: BedDouble,
    value: BadgeDollarSign,
    wifi: Wifi,
    food: UtensilsCrossed,
    comfort: BedDouble,
    bathroom: Droplets,
    safety: Shield,
    air_conditioning: AirVent,
    maintenance: Wrench,
    housekeeping: Sparkles,
    accessibility: Accessibility,
    booking_payment: CreditCard,
    pests: Bug,
}

function mentionRateTint(rate: number | null): string {
    if (rate === null || rate === 0) return 'border-border bg-muted/30'
    if (rate >= 30) return 'border-success/25 bg-success/15'
    if (rate >= 15) return 'border-success/20 bg-success/10'
    return 'border-success/15 bg-success/5'
}

function PositiveDriverTile({ driver }: { driver: PositiveDriver }) {
    const rate = driver.positiveMentionRate ?? 0
    const Icon = topicIcons[driver.topic] ?? Sparkles
    const momentumUp = driver.momentumPercentagePoints !== null && driver.momentumPercentagePoints > 0
    const momentumDown = driver.momentumPercentagePoints !== null && driver.momentumPercentagePoints < 0

    return (
        <div className={cn('rounded-lg border p-4 transition-colors', mentionRateTint(driver.positiveMentionRate))}>
            <div className="flex items-start gap-3">
                <div className="rounded-lg bg-success/15 p-2 text-success">
                    <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                        <p className="font-medium">{formatTopicLabel(driver.topic)}</p>
                        <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-success">
                            {driver.positiveMentionRate?.toFixed(1) ?? '0'}%
                        </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {driver.mentionCount} positive {driver.mentionCount === 1 ? 'mention' : 'mentions'}
                    </p>
                    <SignalBar label="Positive share" value={`${rate.toFixed(1)}%`} percentage={rate} tone="success" />
                    {driver.momentumPercentagePoints !== null ? (
                        <p
                            className={cn(
                                'font-mono text-xs tabular-nums',
                                momentumUp && 'text-success',
                                momentumDown && 'text-muted-foreground',
                                !momentumUp && !momentumDown && 'text-muted-foreground',
                            )}
                        >
                            {driver.momentumPercentagePoints >= 0 ? '+' : ''}
                            {driver.momentumPercentagePoints.toFixed(1)} pp vs prior period
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

export function WhatGuestsLoveCard({ drivers }: { drivers: PositiveDriver[] }) {
    const visible = drivers.slice(0, 6)

    return (
        <Card>
            <CardHeader>
                <CardHeaderWithInfo
                    title={<CardTitle>What guests love</CardTitle>}
                    description={<CardDescription>Top positive operational drivers in this period</CardDescription>}
                    infoLabel="About what guests love"
                    info={
                        <>
                            Topics mentioned most often in a positive tone. Rate is the share of all reviews in this
                            period. Momentum compares that share to the previous period of the same length.
                        </>
                    }
                />
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
                {visible.map((driver) => (
                    <PositiveDriverTile key={driver.topic} driver={driver} />
                ))}
            </CardContent>
        </Card>
    )
}
