'use client'

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={label}
                >
                    <Info className="size-4" aria-hidden />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-sm">
                {children}
            </TooltipContent>
        </Tooltip>
    )
}

export function CardHeaderWithInfo({
    title,
    description,
    infoLabel,
    info,
}: {
    title: ReactNode
    description?: ReactNode
    infoLabel: string
    info: ReactNode
}) {
    return (
        <div className="flex min-w-0 flex-1 items-start gap-1">
            <div className="min-w-0 flex-1">
                {title}
                {description}
            </div>
            <InfoTip label={infoLabel}>{info}</InfoTip>
        </div>
    )
}
