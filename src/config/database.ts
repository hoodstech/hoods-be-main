/**
 * Database-related constants for the application
 * - Pagination limits
 * - Item constraints
 * - Feed configuration
 */

type DatabaseConsts = {
  readonly ITEMS_PER_PAGE: number
  readonly MAX_ITEM_IMAGES: number
  readonly DAILY_FEED_SIZE: number

}

export const DB_CONSTS: DatabaseConsts = {
  ITEMS_PER_PAGE: 100,
  MAX_ITEM_IMAGES: 5,
  DAILY_FEED_SIZE: 20
} as const
