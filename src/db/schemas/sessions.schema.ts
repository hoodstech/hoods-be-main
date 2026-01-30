import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jti: varchar('jti', { length: 255 }).notNull().unique(), // JWT ID
  deviceId: varchar('device_id', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 max length
  userAgent: varchar('user_agent', { length: 500 }),
  issuedAt: timestamp('issued_at').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivityAt: timestamp('last_activity_at').notNull(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
