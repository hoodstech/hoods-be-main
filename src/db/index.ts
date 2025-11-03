import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schemas/index'

const connectionString = process.env.DATABASE_URL || ''

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined')
}

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 })

// For queries
const queryClient = postgres(connectionString)
export const db = drizzle(queryClient, { schema })

export type Database = typeof db
