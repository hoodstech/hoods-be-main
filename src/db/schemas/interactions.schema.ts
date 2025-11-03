import { integer, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

import { items } from './items.schema'
import { users } from './users.schema'

export const interactionTypeEnum = pgEnum('interaction_type', ['like', 'dislike', 'favorite'])

// User interactions with items (swipe left/right/favorite)
export const userItemInteractions = pgTable('user_item_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  interactionType: interactionTypeEnum('interaction_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

// Track daily feed for users
export const userDailyFeeds = pgTable('user_daily_feeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  feedDate: timestamp('feed_date').notNull(), // Date when item was shown in feed
  position: integer('position').notNull(), // Position in feed (1-20)
  shown: timestamp('shown'), // When user actually saw the item
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export type InteractionType = 'like' | 'dislike' | 'favorite'
export type UserItemInteraction = typeof userItemInteractions.$inferSelect
export type NewUserItemInteraction = typeof userItemInteractions.$inferInsert
export type UserDailyFeed = typeof userDailyFeeds.$inferSelect
export type NewUserDailyFeed = typeof userDailyFeeds.$inferInsert
