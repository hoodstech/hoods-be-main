import type { InteractionType, Item, ItemImage, Tag, UserDailyFeed, UserItemInteraction } from '~/db/schemas'
import type { FeedRepository } from '~/repositories/feed.repository'
import type { InteractionRepository } from '~/repositories/interaction.repository'
import type { ItemRepository } from '~/repositories/item.repository'
import type { TagRepository } from '~/repositories/tag.repository'
import type { RecommendationService } from './recommendation.service'
import { DB_CONSTS } from '~/config/database'
import { getStartOfToday } from '~/utils'

export interface FeedItemWithDetails {
  feedId: string
  item: Item
  images: ItemImage[]
  tags: Tag[]
  position: number
}

export class BuyerService {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly interactionRepository: InteractionRepository,
    private readonly itemRepository: ItemRepository,
    private readonly tagRepository: TagRepository,
    private readonly recommendationService: RecommendationService
  ) {}

  /**
   * Get or generate today's feed for a user
   */
  async getTodaysFeed(userId: string): Promise<FeedItemWithDetails[]> {
    // Check if feed already exists for today
    const hasFeed = await this.feedRepository.hasTodaysFeed(userId)

    if (!hasFeed) {
      // Generate new feed for today
      await this.generateDailyFeed(userId)
    }

    // Get feed items
    const feedItems = await this.feedRepository.getTodaysFeed(userId)

    // Fetch item details with images and tags
    const itemsWithDetails = await Promise.all(
      feedItems.map(async feedItem => {
        const item = await this.itemRepository.findById(feedItem.itemId)
        if (!item) {
          throw new Error(`Item ${feedItem.itemId} not found`)
        }

        const images = await this.itemRepository.getItemImages(item.id)
        const tags = await this.tagRepository.getItemTags(item.id)

        return {
          feedId: feedItem.id,
          item,
          images,
          tags,
          position: feedItem.position
        }
      })
    )

    return itemsWithDetails
  }

  /**
   * Get next unshown item from today's feed
   */
  async getNextItem(userId: string): Promise<FeedItemWithDetails | null> {
    // Ensure feed exists
    const hasFeed = await this.feedRepository.hasTodaysFeed(userId)

    if (!hasFeed) {
      await this.generateDailyFeed(userId)
    }

    // Get next unshown item
    const feedItem = await this.feedRepository.getNextUnshownItem(userId)

    if (!feedItem) {
      return null // All items have been shown
    }

    // Mark as shown
    await this.feedRepository.markAsShown(feedItem.id)

    // Fetch item details
    const item = await this.itemRepository.findById(feedItem.itemId)
    if (!item) {
      throw new Error(`Item ${feedItem.itemId} not found`)
    }

    const images = await this.itemRepository.getItemImages(item.id)
    const tags = await this.tagRepository.getItemTags(item.id)

    return {
      feedId: feedItem.id,
      item,
      images,
      tags,
      position: feedItem.position
    }
  }

  /**
   * Record user interaction with an item
   */
  async interact(
    userId: string,
    itemId: string,
    interactionType: InteractionType
  ): Promise<UserItemInteraction> {
    // Check if item exists
    const item = await this.itemRepository.findById(itemId)
    if (!item) {
      throw new Error('Item not found')
    }

    // Check if interaction already exists
    const existing = await this.interactionRepository.findByUserAndItem(userId, itemId)

    if (existing) {
      // Update existing interaction
      return this.interactionRepository.update(userId, itemId, interactionType)
    }

    // Create new interaction
    return this.interactionRepository.create({
      userId,
      itemId,
      interactionType
    })
  }

  /**
   * Get user's interaction history
   */
  async getInteractionHistory(userId: string): Promise<UserItemInteraction[]> {
    return this.interactionRepository.getUserInteractions(userId)
  }

  /**
   * Get user's favorite items with details
   */
  async getFavorites(userId: string): Promise<FeedItemWithDetails[]> {
    const favorites = await this.interactionRepository.getUserInteractionsByType(userId, 'favorite')

    const itemsWithDetails = await Promise.all(
      favorites.map(async (favorite, index) => {
        const item = await this.itemRepository.findById(favorite.itemId)
        if (!item) {
          throw new Error(`Item ${favorite.itemId} not found`)
        }

        const images = await this.itemRepository.getItemImages(item.id)
        const tags = await this.tagRepository.getItemTags(item.id)

        return {
          feedId: favorite.id,
          item,
          images,
          tags,
          position: index + 1
        }
      })
    )

    return itemsWithDetails
  }

  /**
   * Remove interaction (un-like, un-favorite, etc.)
   */
  async removeInteraction(userId: string, itemId: string): Promise<void> {
    await this.interactionRepository.delete(userId, itemId)
  }

  /**
   * Generate daily feed for user using recommendation algorithm
   */
  private async generateDailyFeed(userId: string): Promise<UserDailyFeed[]> {
    const today = getStartOfToday()

    // Use recommendation service to get personalized items
    const recommendedItems = await this.recommendationService.generateRecommendations(
      userId,
      DB_CONSTS.DAILY_FEED_SIZE
    )

    // Create feed entries
    const feedEntries = recommendedItems.map((item, index) => ({
      userId,
      itemId: item.id,
      feedDate: today,
      position: index + 1
    }))

    return this.feedRepository.createBatch(feedEntries)
  }
}
