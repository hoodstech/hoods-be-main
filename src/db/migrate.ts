import { migrate } from 'drizzle-orm/postgres-js/migrator'
import dotenv from 'dotenv'

import { db, migrationClient } from './index'

dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development'
})

async function runMigrations() {
  console.log('Running migrations...')

  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' })
    console.log('Migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    await migrationClient.end()
    process.exit(1)
  } finally {
    await migrationClient.end()
    process.exit(0)
  }
}

runMigrations()
