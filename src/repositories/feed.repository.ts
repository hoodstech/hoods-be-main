import { and, eq, sql } from 'drizzle-orm'

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { NewUserDailyFeed, UserDailyFeed } from '~/db/schemas'
import { userDailyFeeds } from '~/db/schemas'
import { getStartOfToday } from '~/utils'

export class FeedRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: NewUserDailyFeed): Promise<UserDailyFeed> {
    const [feed] = await this.db
      .insert(userDailyFeeds)
      .values(data)
      .returning()

    return feed
  }

  async createBatch(data: NewUserDailyFeed[]): Promise<UserDailyFeed[]> {
    if (data.length === 0) return []

    return this.db
      .insert(userDailyFeeds)
      .values(data)
      .returning()
  }

  async getTodaysFeed(userId: string): Promise<UserDailyFeed[]> {
    const today = getStartOfToday()

    return this.db
      .select()
      .from(userDailyFeeds)
      .where(
        and(
          eq(userDailyFeeds.userId, userId),
          sql`DATE(${userDailyFeeds.feedDate}) = DATE(${today})`
        )
      )
      .orderBy(userDailyFeeds.position)
  }

  async markAsShown(feedId: string): Promise<void> {
    await this.db
      .update(userDailyFeeds)
      .set({ shown: new Date() })
      .where(eq(userDailyFeeds.id, feedId))
  }

  async getNextUnshownItem(userId: string): Promise<UserDailyFeed | undefined> {
    const today = getStartOfToday()

    const [item] = await this.db
      .select()
      .from(userDailyFeeds)
      .where(
        and(
          eq(userDailyFeeds.userId, userId),
          sql`DATE(${userDailyFeeds.feedDate}) = DATE(${today})`,
          sql`${userDailyFeeds.shown} IS NULL`
        )
      )
      .orderBy(userDailyFeeds.position)
      .limit(1)

    return item
  }

  async hasTodaysFeed(userId: string): Promise<boolean> {
    const today = getStartOfToday()

    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(userDailyFeeds)
      .where(
        and(
          eq(userDailyFeeds.userId, userId),
          sql`DATE(${userDailyFeeds.feedDate}) = DATE(${today})`
        )
      )

    return Number(result?.count) > 0
  }

  async getShownItemsToday(userId: string): Promise<string[]> {
    const today = getStartOfToday()

    const items = await this.db
      .select({ itemId: userDailyFeeds.itemId })
      .from(userDailyFeeds)
      .where(
        and(
          eq(userDailyFeeds.userId, userId),
          sql`DATE(${userDailyFeeds.feedDate}) = DATE(${today})`,
          sql`${userDailyFeeds.shown} IS NOT NULL`
        )
      )

    return items.map(i => i.itemId)
  }

  async deleteFeed(userId: string, feedDate: Date): Promise<void> {
    await this.db
      .delete(userDailyFeeds)
      .where(
        and(
          eq(userDailyFeeds.userId, userId),
          sql`DATE(${userDailyFeeds.feedDate}) = DATE(${feedDate})`
        )
      )
  }
}
