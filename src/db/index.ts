import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'
import { config } from '@/lib/config/server'

const pool = new Pool({ connectionString: config.database.url })
attachDatabasePool(pool)

const db = drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === 'development',
    casing: 'snake_case',
})

export { db, pool }
