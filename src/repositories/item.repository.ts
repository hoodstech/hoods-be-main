import { and, eq, notInArray } from 'drizzle-orm'

import { DB_CONSTS } from '~/config'
import type { Database } from '~/db'
import type { Item, ItemImage, NewItem } from '~/db/schemas'
import { itemImages, items } from '~/db/schemas'

import { BaseRepository } from './base.repository'

export interface FindAllOptions {
  isActive?: boolean
  excludeIds?: string[]
  limit?: number
  offset?: number
}

export class ItemRepository extends BaseRepository {
  constructor(db: Database) {
    super(db)
  }

  async findById(id: string): Promise<Item | undefined> {
    const result = await this.db
      .select()
      .from(items)
      .where(eq(items.id, id))
      .limit(1)

    return result[0]
  }

  async findBySellerId(sellerId: string, limit = DB_CONSTS.ITEMS_PER_PAGE, offset = 0): Promise<Item[]> {
    return this.db
      .select()
      .from(items)
      .where(eq(items.sellerId, sellerId))
      .limit(limit)
      .offset(offset)
  }

  async findActive(limit = DB_CONSTS.ITEMS_PER_PAGE, offset = 0): Promise<Item[]> {
    return this.db
      .select()
      .from(items)
      .where(eq(items.isActive, true))
      .limit(limit)
      .offset(offset)
  }

  async findAll(options: FindAllOptions = {}): Promise<Item[]> {
    const {
      isActive,
      excludeIds = [],
      limit = DB_CONSTS.ITEMS_PER_PAGE,
      offset = 0
    } = options

    const conditions = []

    if (isActive !== undefined) {
      conditions.push(eq(items.isActive, isActive))
    }

    if (excludeIds.length > 0) {
      conditions.push(notInArray(items.id, excludeIds))
    }

    if (conditions.length === 0) {
      return this.db
        .select()
        .from(items)
        .limit(limit)
        .offset(offset)
    }

    return this.db
      .select()
      .from(items)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
  }

  async create(item: NewItem): Promise<Item> {
    const result = await this.db
      .insert(items)
      .values({
        ...item,
        updatedAt: new Date()
      })
      .returning()

    return result[0]
  }

  async update(id: string, data: Partial<NewItem>): Promise<Item | undefined> {
    const result = await this.db
      .update(items)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(items.id, id))
      .returning()

    return result[0]
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(items)
      .where(eq(items.id, id))
      .returning()

    return result.length > 0
  }

  // Item Images methods
  async addImage(itemId: string, imageUrl: string): Promise<ItemImage> {
    const result = await this.db
      .insert(itemImages)
      .values({
        itemId,
        imageUrl
      })
      .returning()

    return result[0]
  }

  async addImagesBatch(itemId: string, imageUrls: string[]): Promise<ItemImage[]> {
    if (imageUrls.length === 0) return []

    const values = imageUrls.map(url => ({
      itemId,
      imageUrl: url
    }))

    return this.db
      .insert(itemImages)
      .values(values)
      .returning()
  }

  async getItemImages(itemId: string): Promise<ItemImage[]> {
    return this.db
      .select()
      .from(itemImages)
      .where(eq(itemImages.itemId, itemId))
  }

  async deleteImage(imageId: string): Promise<boolean> {
    const result = await this.db
      .delete(itemImages)
      .where(eq(itemImages.id, imageId))
      .returning()

    return result.length > 0
  }

  async countImagesByItemId(itemId: string): Promise<number> {
    const result = await this.db
      .select()
      .from(itemImages)
      .where(eq(itemImages.itemId, itemId))

    return result.length
  }

  // Check if item belongs to seller
  async isOwner(itemId: string, sellerId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.sellerId, sellerId)))
      .limit(1)

    return result.length > 0
  }
}
