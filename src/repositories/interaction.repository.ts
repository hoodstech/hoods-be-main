import { and, eq } from 'drizzle-orm'

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type {
  InteractionType,
  NewUserItemInteraction,
  UserItemInteraction
} from '~/db/schemas'
import { userItemInteractions } from '~/db/schemas'

export class InteractionRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: NewUserItemInteraction): Promise<UserItemInteraction> {
    const [interaction] = await this.db
      .insert(userItemInteractions)
      .values(data)
      .returning()

    return interaction
  }

  async findByUserAndItem(
    userId: string,
    itemId: string
  ): Promise<UserItemInteraction | undefined> {
    const [interaction] = await this.db
      .select()
      .from(userItemInteractions)
      .where(
        and(
          eq(userItemInteractions.userId, userId),
          eq(userItemInteractions.itemId, itemId)
        )
      )
      .limit(1)

    return interaction
  }

  async getUserInteractions(userId: string): Promise<UserItemInteraction[]> {
    return this.db
      .select()
      .from(userItemInteractions)
      .where(eq(userItemInteractions.userId, userId))
  }

  async getUserInteractionsByType(
    userId: string,
    type: InteractionType
  ): Promise<UserItemInteraction[]> {
    return this.db
      .select()
      .from(userItemInteractions)
      .where(
        and(
          eq(userItemInteractions.userId, userId),
          eq(userItemInteractions.interactionType, type)
        )
      )
  }

  async delete(userId: string, itemId: string): Promise<void> {
    await this.db
      .delete(userItemInteractions)
      .where(
        and(
          eq(userItemInteractions.userId, userId),
          eq(userItemInteractions.itemId, itemId)
        )
      )
  }

  async update(
    userId: string,
    itemId: string,
    interactionType: InteractionType
  ): Promise<UserItemInteraction> {
    const [updated] = await this.db
      .update(userItemInteractions)
      .set({ interactionType })
      .where(
        and(
          eq(userItemInteractions.userId, userId),
          eq(userItemInteractions.itemId, itemId)
        )
      )
      .returning()

    return updated
  }

  /**
   * Get item IDs that user has already interacted with
   */
  async getInteractedItemIds(userId: string): Promise<string[]> {
    const interactions = await this.db
      .select({ itemId: userItemInteractions.itemId })
      .from(userItemInteractions)
      .where(eq(userItemInteractions.userId, userId))

    return interactions.map(i => i.itemId)
  }
}
