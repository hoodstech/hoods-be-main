import type { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import type { AwilixContainer } from 'awilix'

import type { Container } from '~/container'
import { createAuthMiddleware, requireAdmin, requireSeller } from '~/middlewares'
import {
  AddImagesBodySchema,
  AddTagsBodySchema,
  CreateItemBodySchema,
  CreateSellerBodySchema,
  CreateTagBodySchema,
  ErrorResponseSchema,
  ItemResponseSchema,
  ItemWithDetailsResponseSchema,
  SellerSuccessResponseSchema,
  TagResponseSchema,
  UpdateItemBodySchema
} from '~/schemas'

export async function sellerRoutes(
  fastify: FastifyInstance,
  container: AwilixContainer<Container>
) {
  const { sellerService, userRepository } = container.cradle
  const requireAuth = createAuthMiddleware(userRepository)

  // Create Seller (Admin only)
  fastify.post('/sellers', {
    schema: {
      tags: ['seller'],
      description: 'Create a new seller account (Admin only)',
      body: CreateSellerBodySchema,
      response: {
        201: SellerSuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        409: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireAdmin()]
  }, async (request, reply) => {
    try {
      const body = request.body as { email: string; password: string; name: string }
      const seller = await sellerService.createSeller(body)

      return reply.code(201).send({
        success: true,
        data: {
          id: seller.id,
          email: seller.email,
          name: seller.name!,
          role: seller.role,
          isActive: seller.isActive
        }
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return reply.code(409).send({
          success: false,
          error: error.message
        })
      }

      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create seller'
      })
    }
  })

  // Create Item
  fastify.post('/items', {
    schema: {
      tags: ['seller'],
      description: 'Create a new item (Seller only)',
      body: CreateItemBodySchema,
      response: {
        201: Type.Object({
          success: Type.Literal(true),
          data: ItemWithDetailsResponseSchema
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireSeller()]
  }, async (request, reply) => {
    try {
      const body = request.body as any
      const result = await sellerService.createItem(request.userId!, body)

      return reply.code(201).send({
        success: true,
        data: result
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create item'
      })
    }
  })

  // Get Seller's Items
  fastify.get('/items/my', {
    schema: {
      tags: ['seller'],
      description: 'Get all items created by the seller',
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          data: Type.Array(ItemResponseSchema)
        }),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireSeller()]
  }, async (request, reply) => {
    const items = await sellerService.getSellerItems(request.userId!)

    return reply.send({
      success: true,
      data: items
    })
  })

  // Get Item by ID
  fastify.get('/items/:itemId', {
    schema: {
      tags: ['seller'],
      description: 'Get item details with images and tags',
      params: Type.Object({
        itemId: Type.String({ format: 'uuid' })
      }),
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          data: ItemWithDetailsResponseSchema
        }),
        404: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const { itemId } = request.params as { itemId: string }
    const result = await sellerService.getItemById(itemId)

    if (!result) {
      return reply.code(404).send({
        success: false,
        error: 'Item not found'
      })
    }

    return reply.send({
      success: true,
      data: result
    })
  })

  // Update Item
  fastify.put('/items/:itemId', {
    schema: {
      tags: ['seller'],
      description: 'Update item (Seller only)',
      params: Type.Object({
        itemId: Type.String({ format: 'uuid' })
      }),
      body: UpdateItemBodySchema,
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          data: ItemResponseSchema
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireSeller()]
  }, async (request, reply) => {
    try {
      const { itemId } = request.params as { itemId: string }
      const body = request.body as any

      const updated = await sellerService.updateItem(itemId, request.userId!, body)

      return reply.send({
        success: true,
        data: updated
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update item'
      })
    }
  })

  // Delete Item
  fastify.delete('/items/:itemId', {
    schema: {
      tags: ['seller'],
      description: 'Delete item (Seller only)',
      params: Type.Object({
        itemId: Type.String({ format: 'uuid' })
      }),
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          message: Type.String()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireSeller()]
  }, async (request, reply) => {
    try {
      const { itemId } = request.params as { itemId: string }
      await sellerService.deleteItem(itemId, request.userId!)

      return reply.send({
        success: true,
        message: 'Item deleted successfully'
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete item'
      })
    }
  })

  // Add Images to Item
  fastify.post('/items/:itemId/images', {
    schema: {
      tags: ['seller'],
      description: 'Add images to item (Seller only)',
      params: Type.Object({
        itemId: Type.String({ format: 'uuid' })
      }),
      body: AddImagesBodySchema,
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          data: Type.Array(Type.Object({
            id: Type.String(),
            itemId: Type.String(),
            imageUrl: Type.String(),
            createdAt: Type.String()
          }))
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireSeller()]
  }, async (request, reply) => {
    try {
      const { itemId } = request.params as { itemId: string }
      const { imageUrls } = request.body as { imageUrls: string[] }

      const images = await sellerService.addItemImages(itemId, request.userId!, imageUrls)

      return reply.send({
        success: true,
        data: images
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add images'
      })
    }
  })

  // Add Tags to Item
  fastify.post('/items/:itemId/tags', {
    schema: {
      tags: ['seller'],
      description: 'Add tags to item (Seller only)',
      params: Type.Object({
        itemId: Type.String({ format: 'uuid' })
      }),
      body: AddTagsBodySchema,
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          data: Type.Array(TagResponseSchema)
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireSeller()]
  }, async (request, reply) => {
    try {
      const { itemId } = request.params as { itemId: string }
      const { tagIds } = request.body as { tagIds: string[] }

      const tags = await sellerService.addTagsToItem(itemId, request.userId!, tagIds)

      return reply.send({
        success: true,
        data: tags
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add tags'
      })
    }
  })

  // Remove Tag from Item
  fastify.delete('/items/:itemId/tags/:tagId', {
    schema: {
      tags: ['seller'],
      description: 'Remove tag from item (Seller only)',
      params: Type.Object({
        itemId: Type.String({ format: 'uuid' }),
        tagId: Type.String({ format: 'uuid' })
      }),
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          message: Type.String()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireSeller()]
  }, async (request, reply) => {
    try {
      const { itemId, tagId } = request.params as { itemId: string; tagId: string }
      await sellerService.removeTagFromItem(itemId, request.userId!, tagId)

      return reply.send({
        success: true,
        message: 'Tag removed successfully'
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove tag'
      })
    }
  })

  // Create Tag
  fastify.post('/tags', {
    schema: {
      tags: ['seller'],
      description: 'Create a new tag (Seller only)',
      body: CreateTagBodySchema,
      response: {
        201: Type.Object({
          success: Type.Literal(true),
          data: TagResponseSchema
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireSeller()]
  }, async (request, reply) => {
    try {
      const { name, category } = request.body as { name: string; category: string }
      const tag = await sellerService.createTag(name, category)

      return reply.code(201).send({
        success: true,
        data: tag
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tag'
      })
    }
  })

  // Get All Tags
  fastify.get('/tags', {
    schema: {
      tags: ['seller'],
      description: 'Get all available tags',
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          data: Type.Array(TagResponseSchema)
        })
      }
    }
  }, async (_request, reply) => {
    const tags = await sellerService.getAllTags()

    return reply.send({
      success: true,
      data: tags
    })
  })

  // Get Tags by Category
  fastify.get('/tags/category/:category', {
    schema: {
      tags: ['seller'],
      description: 'Get tags by category',
      params: Type.Object({
        category: Type.String()
      }),
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          data: Type.Array(TagResponseSchema)
        })
      }
    }
  }, async (request, reply) => {
    const { category } = request.params as { category: string }
    const tags = await sellerService.getTagsByCategory(category)

    return reply.send({
      success: true,
      data: tags
    })
  })
}
