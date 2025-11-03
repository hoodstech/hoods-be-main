import { asClass, asValue, createContainer, InjectionMode } from 'awilix'

import { db } from '~/db'
import { FeedRepository, InteractionRepository, ItemRepository, TagRepository, UserRepository } from '~/repositories'
import { AuthService, BuyerService, GoogleOAuthService, RecommendationService, SellerService } from '~/services'

export interface Container {
  db: typeof db
  userRepository: UserRepository
  itemRepository: ItemRepository
  tagRepository: TagRepository
  interactionRepository: InteractionRepository
  feedRepository: FeedRepository
  authService: AuthService
  googleOAuthService: GoogleOAuthService
  sellerService: SellerService
  recommendationService: RecommendationService
  buyerService: BuyerService
}

export function setupContainer() {
  const container = createContainer<Container>({
    injectionMode: InjectionMode.CLASSIC
  })

  // Register database
  container.register({
    db: asValue(db)
  })

  // Register repositories
  container.register({
    userRepository: asClass(UserRepository).singleton(),
    itemRepository: asClass(ItemRepository).singleton(),
    tagRepository: asClass(TagRepository).singleton(),
    interactionRepository: asClass(InteractionRepository).singleton(),
    feedRepository: asClass(FeedRepository).singleton()
  })

  // Register services
  container.register({
    authService: asClass(AuthService).singleton(),
    googleOAuthService: asClass(GoogleOAuthService).singleton(),
    sellerService: asClass(SellerService).singleton(),
    recommendationService: asClass(RecommendationService).singleton(),
    buyerService: asClass(BuyerService).singleton()
  })

  return container
}
