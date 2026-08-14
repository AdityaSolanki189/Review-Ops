export function normalizeText(value: string | null | undefined): string | undefined {
    if (!value) return undefined
    const trimmed = value.replace(/\s+/g, ' ').trim()
    return trimmed.length > 0 ? trimmed : undefined
}

export function parseRating(raw: string | null | undefined): number | null {
    if (!raw) return null
    const match = raw.match(/(\d+(?:\.\d+)?)/)
    if (!match?.[1]) return null
    const rating = Number.parseFloat(match[1])
    if (Number.isNaN(rating) || rating < 1 || rating > 10) return null
    return rating
}

export function parseUnixReviewDate(raw: number | string | null | undefined): Date | null {
    if (raw === null || raw === undefined) return null

    if (typeof raw === 'number') {
        const ms = raw > 1_000_000_000_000 ? raw : raw * 1000
        const date = new Date(ms)
        return Number.isNaN(date.getTime()) ? null : date
    }

    const trimmed = raw.trim()
    if (/^\d+$/.test(trimmed)) {
        return parseUnixReviewDate(Number.parseInt(trimmed, 10))
    }

    return parseReviewDate(trimmed)
}

export function parseReviewDate(raw: string | null | undefined): Date | null {
    if (!raw) return null

    const cleaned = raw.replace(/^Reviewed:\s*/i, '').trim()

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        const isoDate = new Date(`${cleaned}T00:00:00.000Z`)
        return Number.isNaN(isoDate.getTime()) ? null : isoDate
    }

    const parsed = Date.parse(cleaned)
    if (Number.isNaN(parsed)) {
        const fallback = new Date(cleaned)
        return Number.isNaN(fallback.getTime()) ? null : fallback
    }

    return new Date(parsed)
}

export function parseStayDate(raw: string | null | undefined): Date | undefined {
    if (!raw) return undefined
    const match = raw.match(/(?:Stayed in|Stayed)\s+(.+)/i)
    const datePart = match?.[1] ?? raw
    const parsed = parseReviewDate(datePart) ?? parseUnixReviewDate(datePart)
    return parsed ?? undefined
}
