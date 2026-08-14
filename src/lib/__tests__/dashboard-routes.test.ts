import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GET as overview } from '@/app/api/dashboard/overview/route'
import { GET as issues } from '@/app/api/dashboard/issues/route'
import { GET as topicMatrix } from '@/app/api/dashboard/topic-matrix/route'
import { GET as series } from '@/app/api/dashboard/series/route'

describe('dashboard decision routes', () => {
    it('returns a 400 scope contract before accessing analytics data', async () => {
        const request = new Request('http://localhost/api/dashboard/overview?timezone=UTC')
        const response = await overview(request)

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'Unsupported timezone.' })
    })

    it('shares validation across each decision endpoint', async () => {
        const request = new Request('http://localhost/api/dashboard/issues?property=not-a-property')
        const responses = await Promise.all([issues(request), topicMatrix(request), series(request)])

        for (const response of responses) {
            assert.equal(response.status, 400)
            assert.deepEqual(await response.json(), { error: 'Unknown property.' })
        }
    })
})
