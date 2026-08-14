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

export function parseReviewDate(raw: string | null | undefined): Date | null {
    if (!raw) return null

    const cleaned = raw.replace(/^Reviewed:\s*/i, '').trim()
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
    const parsed = parseReviewDate(datePart)
    return parsed ?? undefined
}
