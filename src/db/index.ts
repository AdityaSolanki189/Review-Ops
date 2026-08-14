import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from '@/db/schema'
import { config } from '@/lib/config/server'

const pool = new Pool({ connectionString: config.database.url })

const db = drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === 'development',
    casing: 'snake_case',
})

export { db }
