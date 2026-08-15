import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    createReviewsSearchRoute,
    executeReviewSearch,
    type ReviewSearchResult,
    type ReviewsSearchDeps,
} from '@/app/api/reviews/search/route'
import type { ParsedReviewSearchFilters } from '@/lib/reviews'

const baseFilters: ParsedReviewSearchFilters = {
    q: 'noisy rooms',
    sort: 'newest',
    limit: 20,
    representative: false,
}

function mockKeywordResult(reason?: ReviewSearchResult['reason']): ReviewSearchResult {
    return {
        mode: 'keyword',
        ...(reason ? { reason } : {}),
        items: [{ id: 'review-1', similarity: null } as ReviewSearchResult['items'][number]],
    }
}

function mockSemanticResult(): ReviewSearchResult {
    return {
        mode: 'semantic',
        items: [{ id: 'review-2', similarity: 0.82 } as ReviewSearchResult['items'][number]],
    }
}

function createDeps(overrides: Partial<ReviewsSearchDeps> = {}): ReviewsSearchDeps {
    return {
        isEmbeddingConfigured: () => true,
        countEmbeddedReviews: async () => 42,
        searchByEmbedding: async () => mockSemanticResult(),
        searchByKeyword: async (_filters, reason) => mockKeywordResult(reason),
        ...overrides,
    }
}

describe('review search route', () => {
    it('falls back to keyword with index_empty when embeddings are configured but the index is empty', async () => {
        const result = await executeReviewSearch(
            baseFilters,
            createDeps({
                countEmbeddedReviews: async () => 0,
            }),
        )

        assert.equal(result.mode, 'keyword')
        assert.equal(result.reason, 'index_empty')
        assert.equal(result.items.length, 1)
    })

    it('uses keyword search without a reason when embeddings are not configured', async () => {
        const result = await executeReviewSearch(
            baseFilters,
            createDeps({
                isEmbeddingConfigured: () => false,
            }),
        )

        assert.equal(result.mode, 'keyword')
        assert.equal(result.reason, undefined)
    })

    it('returns semantic results when embeddings are configured and indexed', async () => {
        const result = await executeReviewSearch(baseFilters, createDeps())

        assert.equal(result.mode, 'semantic')
        assert.equal(result.reason, undefined)
        assert.equal(result.items[0]?.similarity, 0.82)
    })

    it('falls back to keyword with embed_failed when semantic search throws', async () => {
        const result = await executeReviewSearch(
            baseFilters,
            createDeps({
                searchByEmbedding: async () => {
                    throw new Error('OpenRouter unavailable')
                },
            }),
        )

        assert.equal(result.mode, 'keyword')
        assert.equal(result.reason, 'embed_failed')
    })

    it('returns a 400 response before searching for invalid request parameters', async () => {
        const handler = createReviewsSearchRoute(async () => mockSemanticResult())

        const response = await handler(new Request('http://localhost/api/reviews/search?q=a'))

        assert.equal(response.status, 400)
    })

    it('returns a JSON 500 when the search loader throws', async () => {
        const handler = createReviewsSearchRoute(async () => {
            throw new Error('Database query failed')
        })

        const response = await handler(new Request('http://localhost/api/reviews/search?q=noisy%20rooms'))

        assert.equal(response.status, 500)
        assert.deepEqual(await response.json(), { error: 'Database query failed' })
    })
})
