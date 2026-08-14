import { cn } from '@/lib/utils/utils'

export function PageIntro({
    children,
    action,
    className,
}: {
    children: React.ReactNode
    action?: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
            <p className="text-sm text-muted-foreground">{children}</p>
            {action ? (
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
                    {action}
                </div>
            ) : null}
        </div>
    )
}
