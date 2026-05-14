import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Optimize DATABASE_URL for local development with connection pooling
let databaseUrl = process.env.DATABASE_URL || ''

if (process.env.NODE_ENV === 'development' && databaseUrl) {
  try {
    const dbUrl = new URL(databaseUrl)
    dbUrl.searchParams.set('connection_limit', '5')
    dbUrl.searchParams.set('pool_timeout', '10')
    dbUrl.searchParams.set('connect_timeout', '5')
    databaseUrl = dbUrl.toString()
  } catch (error) {
    console.warn('⚠️  Could not optimize DATABASE_URL, using original:', error)
  }
}

// Prisma 7: use driver adapter for database connection
const adapter = new PrismaPg({ connectionString: databaseUrl })
const db = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'pretty'
})

process.on('beforeExit', async () => {
  await db.$disconnect()
})

export default db
