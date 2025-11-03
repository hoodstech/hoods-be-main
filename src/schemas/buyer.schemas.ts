import { Type } from '@sinclair/typebox'

// Response schemas
export const ItemImageSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  itemId: Type.String({ format: 'uuid' }),
  imageUrl: Type.String({ format: 'uri' }),
  createdAt: Type.String({ format: 'date-time' })
}, {
  $id: 'ItemImage',
  description: 'Item image details'
})

export const TagSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  category: Type.String(),
  createdAt: Type.String({ format: 'date-time' })
}, {
  $id: 'Tag',
  description: 'Tag details'
})

export const ItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  sellerId: Type.String({ format: 'uuid' }),
  title: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  priceAmount: Type.Integer(),
  priceCurrency: Type.String(),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' })
}, {
  $id: 'Item',
  description: 'Item details'
})

export const FeedItemSchema = Type.Object({
  feedId: Type.String({ format: 'uuid' }),
  item: ItemSchema,
  images: Type.Array(ItemImageSchema),
  tags: Type.Array(TagSchema),
  position: Type.Integer()
}, {
  $id: 'FeedItem',
  description: 'Feed item with all details'
})

// Request schemas
export const InteractBodySchema = Type.Object({
  interactionType: Type.Union([
    Type.Literal('like'),
    Type.Literal('dislike'),
    Type.Literal('favorite')
  ])
}, {
  $id: 'InteractBody',
  description: 'Request body for interacting with an item'
})

export const ItemIdParamSchema = Type.Object({
  itemId: Type.String({ format: 'uuid' })
}, {
  $id: 'ItemIdParam',
  description: 'Item ID path parameter'
})

// Response wrapper schemas
export const GetFeedResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    items: Type.Array(FeedItemSchema),
    total: Type.Integer(),
    remaining: Type.Integer()
  })
}, {
  $id: 'GetFeedResponse',
  description: 'Response for getting daily feed'
})

export const GetNextItemResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Union([FeedItemSchema, Type.Null()]),
  message: Type.Optional(Type.String())
}, {
  $id: 'GetNextItemResponse',
  description: 'Response for getting next item'
})

export const InteractResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    id: Type.String({ format: 'uuid' }),
    userId: Type.String({ format: 'uuid' }),
    itemId: Type.String({ format: 'uuid' }),
    interactionType: Type.Union([
      Type.Literal('like'),
      Type.Literal('dislike'),
      Type.Literal('favorite')
    ]),
    createdAt: Type.String({ format: 'date-time' })
  })
}, {
  $id: 'InteractResponse',
  description: 'Response for interaction action'
})

export const GetFavoritesResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    items: Type.Array(FeedItemSchema),
    total: Type.Integer()
  })
}, {
  $id: 'GetFavoritesResponse',
  description: 'Response for getting favorite items'
})

export const RemoveInteractionResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
}, {
  $id: 'RemoveInteractionResponse',
  description: 'Response for removing interaction'
})
