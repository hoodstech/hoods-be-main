import { and, eq } from 'drizzle-orm'

import { DB_CONSTS } from '~/config'
import type { Database } from '~/db'
import type { ItemTag, NewTag, Tag } from '~/db/schemas'
import { itemTags, tags } from '~/db/schemas'

import { BaseRepository } from './base.repository'

export class TagRepository extends BaseRepository {
  constructor(db: Database) {
    super(db)
  }

  async findById(id: string): Promise<Tag | undefined> {
    const result = await this.db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1)

    return result[0]
  }

  async findByName(name: string): Promise<Tag | undefined> {
    const result = await this.db
      .select()
      .from(tags)
      .where(eq(tags.name, name))
      .limit(1)

    return result[0]
  }

  async findByCategory(category: string, limit = DB_CONSTS.ITEMS_PER_PAGE, offset = 0): Promise<Tag[]> {
    return this.db
      .select()
      .from(tags)
      .where(eq(tags.category, category))
      .limit(limit)
      .offset(offset)
  }

  async findAll(limit = DB_CONSTS.ITEMS_PER_PAGE, offset = 0): Promise<Tag[]> {
    return this.db
      .select()
      .from(tags)
      .limit(limit)
      .offset(offset)
  }

  async create(tag: NewTag): Promise<Tag> {
    const result = await this.db
      .insert(tags)
      .values(tag)
      .returning()

    return result[0]
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(tags)
      .where(eq(tags.id, id))
      .returning()

    return result.length > 0
  }

  // Item-Tag relationship methods
  async addTagToItem(itemId: string, tagId: string): Promise<ItemTag> {
    const result = await this.db
      .insert(itemTags)
      .values({
        itemId,
        tagId
      })
      .returning()

    return result[0]
  }

  async addTagsToItemBatch(itemId: string, tagIds: string[]): Promise<ItemTag[]> {
    if (tagIds.length === 0) return []

    const values = tagIds.map(tagId => ({
      itemId,
      tagId
    }))

    return this.db
      .insert(itemTags)
      .values(values)
      .returning()
  }

  async removeTagFromItem(itemId: string, tagId: string): Promise<boolean> {
    const result = await this.db
      .delete(itemTags)
      .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)))
      .returning()

    return result.length > 0
  }

  async getItemTags(itemId: string): Promise<Tag[]> {
    const result = await this.db
      .select({
        id: tags.id,
        name: tags.name,
        category: tags.category,
        createdAt: tags.createdAt
      })
      .from(itemTags)
      .innerJoin(tags, eq(itemTags.tagId, tags.id))
      .where(eq(itemTags.itemId, itemId))

    return result
  }

  async findOrCreate(name: string, category: string): Promise<Tag> {
    const existing = await this.findByName(name)
    if (existing) return existing

    return this.create({ name, category })
  }
}
