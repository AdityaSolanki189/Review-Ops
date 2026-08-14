'use client'

import { useId, useState } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import type { Property } from '@/db/schema'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import { useIsMobile } from '@/hooks/use-mobile'
import {
    buildAllTimeScope,
    buildCustomScope,
    buildScopePreset,
    buildScopeSearchParams,
    formatCustomRangeLabel,
    isAllTimeScope,
    isCustomScope,
    isoDateFromDate,
    PERIOD_PRESETS,
    resolveScopeFromSearchParams,
    scopeComparisonLabel,
    scopePeriodDays,
    sydneyToday,
} from '@/lib/dashboard-scope'
import { cn } from '@/lib/utils/utils'

interface DashboardScopeBarProps {
    properties: Property[]
    /** When set, property selector is hidden (e.g. property detail page) */
    lockedPropertySlug?: string
}

function periodChipClass(active: boolean): string {
    return cn(
        'inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium transition-[transform,background-color,border-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
        active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
    )
}

function parseScopeDateRange(scope: { from: string; to: string }): DateRange | undefined {
    const from = new Date(`${scope.from}T00:00:00`)
    const to = new Date(`${scope.to}T00:00:00`)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return undefined
    return { from, to }
}

export function DashboardScopeBar({ properties, lockedPropertySlug }: DashboardScopeBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const propertyFieldId = useId()
    const customRangeId = useId()
    const isMobile = useIsMobile()
    const scope = resolveScopeFromSearchParams(searchParams)
    const activeDays = scopePeriodDays(scope)
    const showPropertySelect = !lockedPropertySlug
    const today = sydneyToday()
    const todayDate = new Date(`${today}T12:00:00`)
    const allTimeActive = isAllTimeScope(scope)
    const customActive = isCustomScope(scope)
    const [customOpen, setCustomOpen] = useState(false)
    const [pendingRange, setPendingRange] = useState<DateRange | undefined>(() => parseScopeDateRange(scope))

    function navigate(nextScope: typeof scope) {
        const query = buildScopeSearchParams(nextScope).toString()
        router.push((query ? `${pathname}?${query}` : pathname) as Route)
    }

    function handleCustomSelect(range: DateRange | undefined) {
        setPendingRange(range)
        if (range?.from && range?.to) {
            const from = isoDateFromDate(range.from)
            const to = isoDateFromDate(range.to)
            if (from <= to) {
                navigate(buildCustomScope(scope, from, to))
                setCustomOpen(false)
            }
        }
    }

    const customLabel = customActive ? formatCustomRangeLabel(scope) : 'Custom'

    return (
        <div className="sticky top-16 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
                    {showPropertySelect ? (
                        <div className="w-full space-y-1.5 sm:w-auto">
                            <label htmlFor={propertyFieldId} className="text-xs font-medium text-muted-foreground">
                                Property
                            </label>
                            <Select
                                id={propertyFieldId}
                                value={scope.propertySlug ?? ''}
                                onChange={(event) => {
                                    const propertySlug = event.target.value || undefined
                                    navigate({ ...scope, propertySlug })
                                }}
                                className="w-full min-w-0 sm:min-w-[200px]"
                            >
                                <option value="">All properties</option>
                                {properties.map((property) => (
                                    <option key={property.id} value={property.slug}>
                                        {property.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    ) : null}
                    <div className="w-full space-y-1.5 sm:w-auto">
                        <span className="text-xs font-medium text-muted-foreground">Period</span>
                        <div className="flex flex-wrap gap-1.5">
                            {PERIOD_PRESETS.map((preset) => (
                                <button
                                    key={preset.days}
                                    type="button"
                                    onClick={() => navigate(buildScopePreset(scope, preset.days))}
                                    className={periodChipClass(
                                        activeDays === preset.days &&
                                            scope.to === today &&
                                            !allTimeActive &&
                                            !customActive,
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => navigate(buildAllTimeScope(scope))}
                                className={periodChipClass(allTimeActive)}
                            >
                                All time
                            </button>
                            <Popover
                                open={customOpen}
                                onOpenChange={(open) => {
                                    setCustomOpen(open)
                                    if (open) setPendingRange(parseScopeDateRange(scope))
                                }}
                            >
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        id={customRangeId}
                                        className={cn(
                                            periodChipClass(customActive),
                                            'max-w-full gap-2 truncate sm:max-w-xs',
                                        )}
                                    >
                                        <CalendarIcon className="size-4 shrink-0" aria-hidden />
                                        <span className="truncate">{customLabel}</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        defaultMonth={pendingRange?.from ?? todayDate}
                                        selected={pendingRange}
                                        onSelect={handleCustomSelect}
                                        numberOfMonths={isMobile ? 1 : 2}
                                        disabled={{ after: todayDate }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">{scopeComparisonLabel(scope)}</p>
            </div>
        </div>
    )
}
