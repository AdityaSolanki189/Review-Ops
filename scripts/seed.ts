import 'dotenv/config'
import { pool } from '@/db'
import { seedProperties } from '@/lib/seed'

async function main() {
    const result = await seedProperties()
    console.log(`Seeded ${result.length} properties`)
    await pool.end()
    process.exit(0)
}

main().catch(async (error) => {
    console.error('Seed failed:', error)
    await pool.end()
    process.exit(1)
})
