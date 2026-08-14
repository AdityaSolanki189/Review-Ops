import 'dotenv/config'
import { pool } from '@/db'
import { seedProperties, seedSampleReviews } from '@/lib/seed'

async function main() {
    const result = await seedProperties()
    console.log(`Seeded ${result.length} properties`)

    const sample = await seedSampleReviews()
    if (sample.inserted > 0 || sample.skipped > 0) {
        console.log(
            `Sample reviews: ${sample.inserted} inserted, ${sample.skipped} skipped (${sample.topicsInserted} topic rows)`,
        )
    }

    await pool.end()
    process.exit(0)
}

main().catch(async (error) => {
    console.error('Seed failed:', error)
    await pool.end()
    process.exit(1)
})
