export type RatingTone = 'primary' | 'success' | 'warning' | 'destructive'

export function ratingTone(rating: string | null | undefined): RatingTone {
    const numeric = rating ? Number.parseFloat(rating) : Number.NaN
    if (Number.isNaN(numeric)) return 'primary'
    if (numeric <= 5) return 'destructive'
    if (numeric <= 7.9) return 'warning'
    return 'success'
}

export const ratingToneStyles: Record<RatingTone, { block: string; border: string }> = {
    primary: {
        block: 'bg-primary/10 text-primary',
        border: 'border-l-primary',
    },
    success: {
        block: 'bg-success/10 text-success',
        border: 'border-l-success',
    },
    warning: {
        block: 'bg-warning/15 text-warning-foreground',
        border: 'border-l-warning',
    },
    destructive: {
        block: 'bg-destructive/10 text-destructive',
        border: 'border-l-destructive',
    },
}
