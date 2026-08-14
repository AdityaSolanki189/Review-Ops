import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDashboardRoute } from '@/app/api/dashboard/_route'

describe('dashboard decision route contract', () => {
    it('returns a successful JSON payload after resolving a database-managed property', async () => {
        const expected = {
            scope: {
                propertySlug: 'database-managed-hotel',
                from: '2025-01-01',
                to: '2025-02-01',
                compare: 'previous-period',
                timezone: 'Australia/Sydney',
            },
            issues: [],
        }
        const handler = createDashboardRoute(
            async () => expected,
            async (slug) => slug === 'database-managed-hotel',
        )

        const response = await handler(
            new Request(
                'http://localhost/api/dashboard/issues?property=database-managed-hotel&from=2025-01-01&to=2025-02-01',
            ),
        )

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), expected)
    })

    it('returns 400 when the injected database resolver does not find a property', async () => {
        const handler = createDashboardRoute(
            async () => ({ unreachable: true }),
            async () => false,
        )
        const response = await handler(new Request('http://localhost/api/dashboard/issues?property=not-in-database'))

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'Unknown property.' })
    })

    it('returns validation errors before calling the property resolver', async () => {
        let resolverCalls = 0
        const handler = createDashboardRoute(
            async () => ({ unreachable: true }),
            async () => {
                resolverCalls += 1
                return true
            },
        )
        const response = await handler(new Request('http://localhost/api/dashboard/overview?timezone=UTC'))

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'Unsupported timezone.' })
        assert.equal(resolverCalls, 0)
    })
})
