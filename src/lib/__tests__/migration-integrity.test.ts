import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

interface MigrationJournal {
    entries: Array<{
        idx: number
        tag: string
    }>
}

const migrationsDirectory = path.resolve(process.cwd(), 'src/db/migrations')
const journalPath = path.join(migrationsDirectory, 'meta/_journal.json')

function readJournal(): MigrationJournal {
    return JSON.parse(readFileSync(journalPath, 'utf8')) as MigrationJournal
}

describe('Drizzle migration integrity', () => {
    it('registers every SQL migration in the journal', () => {
        const sqlMigrations = readdirSync(migrationsDirectory)
            .filter((file) => file.endsWith('.sql'))
            .map((file) => path.basename(file, '.sql'))
            .sort()
        const journalMigrations = readJournal()
            .entries.map((entry) => entry.tag)
            .sort()

        assert.deepEqual(journalMigrations, sqlMigrations)
    })

    it('stores a schema snapshot for the latest journal entry', () => {
        const entries = readJournal().entries
        const latestEntry = entries.at(-1)

        assert.ok(latestEntry, 'migration journal must contain at least one entry')

        const snapshotName = `${String(latestEntry.idx).padStart(4, '0')}_snapshot.json`
        assert.ok(existsSync(path.join(migrationsDirectory, 'meta', snapshotName)))
    })
})
