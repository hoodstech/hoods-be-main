import { DB_CONSTS } from '~/config'
import type { Item, ItemImage, NewItem, NewUser, Tag, User } from '~/db/schemas'
import type { ItemRepository, TagRepository, UserRepository } from '~/repositories'
import { hashPassword } from '~/utils'

interface CreateItemData {
  title: string
  description?: string
  priceAmount: number
  priceCurrency?: string
  imageUrls: string[]
  tagIds: string[]
}

interface UpdateItemData {
  title?: string
  description?: string
  priceAmount?: number
  priceCurrency?: string
  isActive?: boolean
}

export class SellerService {
  constructor(
    private itemRepository: ItemRepository,
    private tagRepository: TagRepository,
    private userRepository: UserRepository
  ) {}

  async createItem(sellerId: string, data: CreateItemData): Promise<{ item: Item; images: ItemImage[]; tags: Tag[] }> {
    // Validate image count
    if (data.imageUrls.length === 0) {
      throw new Error('At least one image is required')
    }
    if (data.imageUrls.length > DB_CONSTS.MAX_ITEM_IMAGES) {
      throw new Error(`Maximum ${DB_CONSTS.MAX_ITEM_IMAGES} images allowed`)
    }

    // Create item
    const newItem: NewItem = {
      sellerId,
      title: data.title,
      description: data.description,
      priceAmount: data.priceAmount,
      priceCurrency: data.priceCurrency || 'USD',
      isActive: true
    }

    const item = await this.itemRepository.create(newItem)

    // Add images
    const images = await this.itemRepository.addImagesBatch(item.id, data.imageUrls)

    // Add tags
    if (data.tagIds.length > 0) {
      await this.tagRepository.addTagsToItemBatch(item.id, data.tagIds)
    }

    const tags = await this.tagRepository.getItemTags(item.id)

    return { item, images, tags }
  }

  async updateItem(itemId: string, sellerId: string, data: UpdateItemData): Promise<Item> {
    // Verify ownership
    const isOwner = await this.itemRepository.isOwner(itemId, sellerId)
    if (!isOwner) {
      throw new Error('You do not have permission to update this item')
    }

    const updated = await this.itemRepository.update(itemId, data)
    if (!updated) {
      throw new Error('Item not found')
    }

    return updated
  }

  async deleteItem(itemId: string, sellerId: string): Promise<boolean> {
    // Verify ownership
    const isOwner = await this.itemRepository.isOwner(itemId, sellerId)
    if (!isOwner) {
      throw new Error('You do not have permission to delete this item')
    }

    return this.itemRepository.delete(itemId)
  }

  async getSellerItems(sellerId: string, limit?: number, offset?: number): Promise<Item[]> {
    return this.itemRepository.findBySellerId(sellerId, limit, offset)
  }

  async getItemById(itemId: string): Promise<{ item: Item; images: ItemImage[]; tags: Tag[] } | null> {
    const item = await this.itemRepository.findById(itemId)
    if (!item) return null

    const [images, tags] = await Promise.all([
      this.itemRepository.getItemImages(itemId),
      this.tagRepository.getItemTags(itemId)
    ])

    return { item, images, tags }
  }

  // Image management
  async addItemImages(itemId: string, sellerId: string, imageUrls: string[]): Promise<ItemImage[]> {
    // Verify ownership
    const isOwner = await this.itemRepository.isOwner(itemId, sellerId)
    if (!isOwner) {
      throw new Error('You do not have permission to modify this item')
    }

    // Check current image count
    const currentCount = await this.itemRepository.countImagesByItemId(itemId)
    if (currentCount + imageUrls.length > DB_CONSTS.MAX_ITEM_IMAGES) {
      throw new Error(`Maximum ${DB_CONSTS.MAX_ITEM_IMAGES} images allowed per item`)
    }

    return this.itemRepository.addImagesBatch(itemId, imageUrls)
  }

  async deleteItemImage(imageId: string, itemId: string, sellerId: string): Promise<boolean> {
    // Verify ownership
    const isOwner = await this.itemRepository.isOwner(itemId, sellerId)
    if (!isOwner) {
      throw new Error('You do not have permission to modify this item')
    }

    return this.itemRepository.deleteImage(imageId)
  }

  // Tag management
  async addTagsToItem(itemId: string, sellerId: string, tagIds: string[]): Promise<Tag[]> {
    // Verify ownership
    const isOwner = await this.itemRepository.isOwner(itemId, sellerId)
    if (!isOwner) {
      throw new Error('You do not have permission to modify this item')
    }

    await this.tagRepository.addTagsToItemBatch(itemId, tagIds)
    return this.tagRepository.getItemTags(itemId)
  }

  async removeTagFromItem(itemId: string, sellerId: string, tagId: string): Promise<boolean> {
    // Verify ownership
    const isOwner = await this.itemRepository.isOwner(itemId, sellerId)
    if (!isOwner) {
      throw new Error('You do not have permission to modify this item')
    }

    return this.tagRepository.removeTagFromItem(itemId, tagId)
  }

  // Tag CRUD for sellers
  async createTag(name: string, category: string): Promise<Tag> {
    return this.tagRepository.findOrCreate(name, category)
  }

  async getAllTags(limit?: number, offset?: number): Promise<Tag[]> {
    return this.tagRepository.findAll(limit, offset)
  }

  async getTagsByCategory(category: string, limit?: number, offset?: number): Promise<Tag[]> {
    return this.tagRepository.findByCategory(category, limit, offset)
  }

  // Admin-only: Create seller account
  async createSeller(data: { email: string; password: string; name: string }): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(data.email)

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    const hashedPassword = await hashPassword(data.password)

    const newSeller: NewUser = {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: 'seller',
      isActive: true,
      emailVerified: false
    }

    return this.userRepository.create(newSeller)
  }
}
