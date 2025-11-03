import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { users } from './users.schema'

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priceAmount: integer('price_amount').notNull(), // Price in cents
  priceCurrency: varchar('price_currency', { length: 3 }).notNull().default('USD'), // ISO 4217 currency code
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const itemImages = pgTable('item_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export type Item = typeof items.$inferSelect
export type NewItem = typeof items.$inferInsert
export type ItemImage = typeof itemImages.$inferSelect
export type NewItemImage = typeof itemImages.$inferInsert
