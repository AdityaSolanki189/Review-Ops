import { defineConfig } from 'drizzle-kit'
import { migrationDatabaseUrl } from './src/lib/config/env'

export default defineConfig({
    out: './src/db/migrations',
    schema: './src/db/schema',
    dialect: 'postgresql',
    dbCredentials: {
        url: migrationDatabaseUrl,
    },
    casing: 'snake_case',
})
