import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { items } from './items.schema'

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 50 }).notNull(), // e.g., 'size', 'season', 'fit', 'style', 'brand', 'color'
  createdAt: timestamp('created_at').defaultNow().notNull()
})

// Many-to-many relationship between items and tags
export const itemTags = pgTable('item_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
export type ItemTag = typeof itemTags.$inferSelect
export type NewItemTag = typeof itemTags.$inferInsert
