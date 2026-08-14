'use client'

import { useId } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Property } from '@/db/schema'
import { Select } from '@/components/ui/select'
import {
    buildScopePreset,
    buildScopeSearchParams,
    PERIOD_PRESETS,
    resolveScopeFromSearchParams,
    scopeComparisonLabel,
    scopePeriodDays,
} from '@/lib/dashboard-scope'

interface DashboardScopeBarProps {
    properties: Property[]
}

export function DashboardScopeBar({ properties }: DashboardScopeBarProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const propertyFieldId = useId()
    const scope = resolveScopeFromSearchParams(searchParams)
    const activeDays = scopePeriodDays(scope)

    function navigate(nextScope: typeof scope) {
        const query = buildScopeSearchParams(nextScope).toString()
        router.push(query ? `/?${query}` : '/')
    }

    return (
        <div className="sticky top-16 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="space-y-1.5">
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
                            className="min-w-[200px]"
                        >
                            <option value="">All properties</option>
                            {properties.map((property) => (
                                <option key={property.id} value={property.slug}>
                                    {property.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Period</span>
                        <div className="flex flex-wrap gap-1.5">
                            {PERIOD_PRESETS.map((preset) => (
                                <button
                                    key={preset.days}
                                    type="button"
                                    onClick={() => navigate(buildScopePreset(scope, preset.days))}
                                    className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-[transform,background-color,border-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                                        activeDays === preset.days
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">{scopeComparisonLabel(scope)}</p>
            </div>
        </div>
    )
}
