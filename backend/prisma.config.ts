import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// generate does not connect to the DB; use a placeholder when DATABASE_URL is unset (e.g. Vercel install)
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun prisma/seed.ts'
  },
  datasource: {
    url: databaseUrl
  }
})
