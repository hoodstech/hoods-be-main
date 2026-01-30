import { asClass, asValue, createContainer, InjectionMode } from 'awilix'
import type Redis from 'ioredis'

import { db } from '~/db'
import { getRedisClient } from '~/config'
import { FeedRepository, InteractionRepository, ItemRepository, SessionRepository, TagRepository, UserRepository } from '~/repositories'
import { AuthService, BuyerService, GoogleOAuthService, RecommendationService, SellerService, SessionService } from '~/services'

export interface Container {
  db: typeof db
  redis: Redis
  userRepository: UserRepository
  itemRepository: ItemRepository
  tagRepository: TagRepository
  interactionRepository: InteractionRepository
  feedRepository: FeedRepository
  sessionRepository: SessionRepository
  authService: AuthService
  googleOAuthService: GoogleOAuthService
  sellerService: SellerService
  recommendationService: RecommendationService
  buyerService: BuyerService
  sessionService: SessionService
}

export function setupContainer() {
  const container = createContainer<Container>({
    injectionMode: InjectionMode.CLASSIC
  })

  // Register database and Redis
  container.register({
    db: asValue(db),
    redis: asValue(getRedisClient())
  })

  // Register repositories
  container.register({
    userRepository: asClass(UserRepository).singleton(),
    itemRepository: asClass(ItemRepository).singleton(),
    tagRepository: asClass(TagRepository).singleton(),
    interactionRepository: asClass(InteractionRepository).singleton(),
    feedRepository: asClass(FeedRepository).singleton(),
    sessionRepository: asClass(SessionRepository).singleton()
  })

  // Register services
  container.register({
    authService: asClass(AuthService).singleton(),
    googleOAuthService: asClass(GoogleOAuthService).singleton(),
    sellerService: asClass(SellerService).singleton(),
    recommendationService: asClass(RecommendationService).singleton(),
    buyerService: asClass(BuyerService).singleton(),
    sessionService: asClass(SessionService).singleton()
  })

  return container
}
