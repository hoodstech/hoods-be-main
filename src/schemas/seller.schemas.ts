import { Type } from '@sinclair/typebox'

// Tag schemas (defined first to avoid circular reference)
export const TagResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  category: Type.String(),
  createdAt: Type.String({ format: 'date-time' })
}, {
  $id: 'TagResponse'
})

// Item schemas
export const ItemResponseSchema = Type.Object({
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
  $id: 'ItemResponse'
})

export const ItemImageResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  itemId: Type.String({ format: 'uuid' }),
  imageUrl: Type.String({ format: 'uri' }),
  createdAt: Type.String({ format: 'date-time' })
}, {
  $id: 'ItemImageResponse'
})

export const ItemWithDetailsResponseSchema = Type.Object({
  item: ItemResponseSchema,
  images: Type.Array(ItemImageResponseSchema),
  tags: Type.Array(TagResponseSchema)
}, {
  $id: 'ItemWithDetailsResponse'
})

export const CreateItemBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String()),
  priceAmount: Type.Integer({ minimum: 0 }),
  priceCurrency: Type.Optional(Type.String({ minLength: 3, maxLength: 3 })),
  imageUrls: Type.Array(Type.String({ format: 'uri' }), { minItems: 1, maxItems: 5 }),
  tagIds: Type.Array(Type.String({ format: 'uuid' }))
}, {
  $id: 'CreateItemBody',
  description: 'Request body for creating a new item'
})

export const UpdateItemBodySchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  description: Type.Optional(Type.String()),
  priceAmount: Type.Optional(Type.Integer({ minimum: 0 })),
  priceCurrency: Type.Optional(Type.String({ minLength: 3, maxLength: 3 })),
  isActive: Type.Optional(Type.Boolean())
}, {
  $id: 'UpdateItemBody',
  description: 'Request body for updating an item'
})

export const CreateTagBodySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  category: Type.String({ minLength: 1, maxLength: 50 })
}, {
  $id: 'CreateTagBody',
  description: 'Request body for creating a new tag'
})

export const AddTagsBodySchema = Type.Object({
  tagIds: Type.Array(Type.String({ format: 'uuid' }), { minItems: 1 })
}, {
  $id: 'AddTagsBody'
})

export const AddImagesBodySchema = Type.Object({
  imageUrls: Type.Array(Type.String({ format: 'uri' }), { minItems: 1, maxItems: 5 })
}, {
  $id: 'AddImagesBody'
})
