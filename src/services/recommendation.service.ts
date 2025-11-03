import type { Item } from '~/db/schemas'
import type { InteractionRepository } from '~/repositories/interaction.repository'
import type { ItemRepository } from '~/repositories/item.repository'
import type { TagRepository } from '~/repositories/tag.repository'
import { DB_CONSTS } from '~/config/database'

interface ScoredItem {
  item: Item
  score: number
}

interface RecommendationTiers {
  high: ScoredItem[]
  medium: ScoredItem[]
  low: ScoredItem[]
  exploration: ScoredItem[]
}

/**
 * Simple Recommendation Algorithm (No ML)
 *
 * This algorithm recommends items based on:
 * 1. Tag-based similarity to items the user has liked/favorited
 * 2. Avoidance of tags from disliked items
 * 3. Randomization to prevent repetitive feeds
 *
 * Algorithm Steps:
 * ================
 *
 * 1. **Build User Preference Profile**
 *    - Get all user interactions (likes, dislikes, favorites)
 *    - Extract tags from liked/favorited items
 *    - Extract tags from disliked items
 *    - Calculate tag scores:
 *      • Favorite interaction: +3 points per tag
 *      • Like interaction: +2 points per tag
 *      • Dislike interaction: -1 point per tag
 *
 * 2. **Score Available Items**
 *    - Get all active items user hasn't interacted with
 *    - For each item, calculate score based on its tags:
 *      • Sum of all tag scores that match user preferences
 *      • Items with no matching tags get score of 0
 *
 * 3. **Group Items by Score Tiers**
 *    - High relevance: score >= 6 (strong match)
 *    - Medium relevance: score 3-5 (moderate match)
 *    - Low relevance: score 1-2 (weak match)
 *    - No relevance: score <= 0 (no match or contains disliked tags)
 *
 * 4. **Select Items with Weighted Randomization**
 *    - Take 60% from high relevance (randomized)
 *    - Take 25% from medium relevance (randomized)
 *    - Take 10% from low relevance (randomized)
 *    - Take 5% from no relevance (pure exploration - randomized)
 *    - If not enough items in a tier, fill from next tier
 *
 * 5. **Shuffle Final Selection**
 *    - Randomize the order of selected items
 *    - This prevents the feed from being too predictable
 *
 * Benefits:
 * ---------
 * • No ML training required - works immediately
 * • Transparent and explainable
 * • Balances relevance with exploration
 * • Prevents echo chamber effect (5% random items)
 * • Respects user dislikes
 * • Simple to debug and tune
 */
export class RecommendationService {
  constructor(
    private readonly interactionRepository: InteractionRepository,
    private readonly itemRepository: ItemRepository,
    private readonly tagRepository: TagRepository
  ) {}

  /**
   * Generate personalized feed for user
   */
  async generateRecommendations(userId: string, count: number = DB_CONSTS.DAILY_FEED_SIZE): Promise<Item[]> {
    // Step 1: Build user preference profile
    const tagScores = await this.buildUserPreferenceProfile(userId)

    // Get items user hasn't interacted with
    const interactedIds = await this.interactionRepository.getInteractedItemIds(userId)
    const availableItems = await this.itemRepository.findAll({
      isActive: true,
      excludeIds: interactedIds,
      limit: 1000 // Get more items than needed for scoring
    })

    if (availableItems.length === 0) {
      return []
    }

    // Step 2: Score all available items
    const scoredItems = await this.scoreItems(availableItems, tagScores)

    // Step 3: Group items by score tiers
    const tiers = this.groupItemsByTier(scoredItems)

    // Step 4: Select items with weighted randomization
    const selectedItems = this.selectItemsFromTiers(tiers, count)

    // Step 5: Shuffle final selection
    return this.shuffleArray(selectedItems)
  }

  /**
   * Build user preference profile based on past interactions
   * Returns a map of tagId -> score
   */
  private async buildUserPreferenceProfile(userId: string): Promise<Map<string, number>> {
    const tagScores = new Map<string, number>()

    const interactions = await this.interactionRepository.getUserInteractions(userId)

    for (const interaction of interactions) {
      const tags = await this.tagRepository.getItemTags(interaction.itemId)

      let scoreMultiplier = 0
      switch (interaction.interactionType) {
        case 'favorite':
          scoreMultiplier = 3
          break
        case 'like':
          scoreMultiplier = 2
          break
        case 'dislike':
          scoreMultiplier = -1
          break
      }

      for (const tag of tags) {
        const currentScore = tagScores.get(tag.id) || 0
        tagScores.set(tag.id, currentScore + scoreMultiplier)
      }
    }

    return tagScores
  }

  /**
   * Score items based on tag preferences
   */
  private async scoreItems(
    items: Item[],
    tagScores: Map<string, number>
  ): Promise<ScoredItem[]> {
    const scoredItems: ScoredItem[] = []

    for (const item of items) {
      const tags = await this.tagRepository.getItemTags(item.id)

      let score = 0
      for (const tag of tags) {
        const tagScore = tagScores.get(tag.id) || 0
        score += tagScore
      }

      scoredItems.push({ item, score })
    }

    return scoredItems
  }

  /**
   * Group items into relevance tiers
   */
  private groupItemsByTier(scoredItems: ScoredItem[]): RecommendationTiers {
    return {
      high: scoredItems.filter(si => si.score >= 6),
      medium: scoredItems.filter(si => si.score >= 3 && si.score < 6),
      low: scoredItems.filter(si => si.score >= 1 && si.score < 3),
      exploration: scoredItems.filter(si => si.score <= 0)
    }
  }

  /**
   * Select items from tiers with weighted randomization
   * 60% high, 25% medium, 10% low, 5% exploration
   */
  private selectItemsFromTiers(
    tiers: RecommendationTiers,
    totalCount: number
  ): Item[] {
    const selected: Item[] = []

    // Calculate target counts for each tier
    const targets = {
      high: Math.floor(totalCount * 0.6),
      medium: Math.floor(totalCount * 0.25),
      low: Math.floor(totalCount * 0.1),
      exploration: Math.floor(totalCount * 0.05)
    }

    // Fill from high tier
    const highItems = this.shuffleArray(tiers.high.map(si => si.item))
    selected.push(...highItems.slice(0, targets.high))

    // Fill from medium tier (or overflow from high)
    const mediumNeeded = Math.min(targets.medium + (targets.high - selected.length), tiers.medium.length)
    const mediumItems = this.shuffleArray(tiers.medium.map(si => si.item))
    selected.push(...mediumItems.slice(0, mediumNeeded))

    // Fill from low tier
    const lowNeeded = Math.min(targets.low + (targets.medium - (selected.length - targets.high)), tiers.low.length)
    const lowItems = this.shuffleArray(tiers.low.map(si => si.item))
    selected.push(...lowItems.slice(0, lowNeeded))

    // Fill from exploration tier
    const explorationNeeded = totalCount - selected.length
    const explorationItems = this.shuffleArray(tiers.exploration.map(si => si.item))
    selected.push(...explorationItems.slice(0, explorationNeeded))

    return selected.slice(0, totalCount)
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}
