import type { FastifyInstance } from 'fastify'
import type { AwilixContainer } from 'awilix'

import type { Container } from '~/container'
import { DB_CONSTS } from '~/config'
import { createAuthMiddleware } from '~/middlewares/auth.middleware'
import { requireRole } from '~/middlewares/require-role'
import {
  GetFavoritesResponseSchema,
  GetFeedResponseSchema,
  GetNextItemResponseSchema,
  InteractBodySchema,
  InteractResponseSchema,
  ItemIdParamSchema,
  RemoveInteractionResponseSchema
} from '~/schemas'

export async function buyerRoutes(
  fastify: FastifyInstance,
  container: AwilixContainer<Container>
) {
  const { buyerService, userRepository } = container.cradle
  const requireAuth = createAuthMiddleware(userRepository)
  const requireBuyer = requireRole('buyer', 'admin')

  // GET /feed - Get today's full feed
  fastify.get(
    '/feed',
    {
      preHandler: [requireAuth, requireBuyer],
      schema: {
        tags: ['buyer'],
        summary: 'Get today\'s daily feed',
        description: `Get all ${DB_CONSTS.DAILY_FEED_SIZE} items for today's feed`,
        response: {
          200: GetFeedResponseSchema
        }
      }
    },
    async (request, reply) => {
      const userId = request.userId!

      const items = await buyerService.getTodaysFeed(userId)

      // Calculate remaining unshown items
      const shownCount = items.filter((_, index) => index < items.length).length
      const remaining = DB_CONSTS.DAILY_FEED_SIZE - shownCount

      return reply.code(200).send({
        success: true,
        data: {
          items,
          total: items.length,
          remaining
        }
      })
    }
  )

  // GET /feed/next - Get next item from feed
  fastify.get(
    '/feed/next',
    {
      preHandler: [requireAuth, requireBuyer],
      schema: {
        tags: ['buyer'],
        summary: 'Get next item from feed',
        description: 'Get the next unshown item from today\'s feed',
        response: {
          200: GetNextItemResponseSchema
        }
      }
    },
    async (request, reply) => {
      const userId = request.userId!

      const item = await buyerService.getNextItem(userId)

      if (!item) {
        return reply.code(200).send({
          success: true,
          data: null,
          message: 'No more items in today\'s feed'
        })
      }

      return reply.code(200).send({
        success: true,
        data: item
      })
    }
  )

  // POST /feed/:itemId/interact - Interact with an item (like/dislike/favorite)
  fastify.post<{
    Params: { itemId: string }
    Body: { interactionType: 'like' | 'dislike' | 'favorite' }
  }>(
    '/feed/:itemId/interact',
    {
      preHandler: [requireAuth, requireBuyer],
      schema: {
        tags: ['buyer'],
        summary: 'Interact with an item',
        description: 'Like, dislike, or favorite an item',
        params: ItemIdParamSchema,
        body: InteractBodySchema,
        response: {
          200: InteractResponseSchema
        }
      }
    },
    async (request, reply) => {
      const userId = request.userId!
      const { itemId } = request.params
      const { interactionType } = request.body

      try {
        const interaction = await buyerService.interact(userId, itemId, interactionType)

        return reply.code(200).send({
          success: true,
          data: {
            id: interaction.id,
            userId: interaction.userId,
            itemId: interaction.itemId,
            interactionType: interaction.interactionType,
            createdAt: interaction.createdAt.toISOString()
          }
        })
      } catch (error) {
        return reply.code(404).send({
          success: false,
          error: error instanceof Error ? error.message : 'Item not found'
        })
      }
    }
  )

  // DELETE /feed/:itemId/interact - Remove interaction
  fastify.delete<{
    Params: { itemId: string }
  }>(
    '/feed/:itemId/interact',
    {
      preHandler: [requireAuth, requireBuyer],
      schema: {
        tags: ['buyer'],
        summary: 'Remove interaction',
        description: 'Remove like/dislike/favorite from an item',
        params: ItemIdParamSchema,
        response: {
          200: RemoveInteractionResponseSchema
        }
      }
    },
    async (request, reply) => {
      const userId = request.userId!
      const { itemId } = request.params

      await buyerService.removeInteraction(userId, itemId)

      return reply.code(200).send({
        success: true,
        message: 'Interaction removed successfully'
      })
    }
  )

  // GET /favorites - Get user's favorite items
  fastify.get(
    '/favorites',
    {
      preHandler: [requireAuth, requireBuyer],
      schema: {
        tags: ['buyer'],
        summary: 'Get favorite items',
        description: 'Get all items marked as favorite by the user',
        response: {
          200: GetFavoritesResponseSchema
        }
      }
    },
    async (request, reply) => {
      const userId = request.userId!

      const items = await buyerService.getFavorites(userId)

      return reply.code(200).send({
        success: true,
        data: {
          items,
          total: items.length
        }
      })
    }
  )
}
