const DEFAULT_SYNC_HISTORY_LIMIT = 100
const MAX_SYNC_HISTORY_LIMIT = 100

export function clampSyncHistoryLimit(value: number | null | undefined): number {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return DEFAULT_SYNC_HISTORY_LIMIT
    }

    return Math.min(Math.max(1, Math.trunc(value)), MAX_SYNC_HISTORY_LIMIT)
}
