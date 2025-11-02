import { asClass, asValue, createContainer, InjectionMode } from 'awilix'

import { db } from '~/db'
import { UserRepository } from '~/repositories/user.repository'
import { AuthService } from '~/services/auth.service'

export interface Container {
  db: typeof db
  userRepository: UserRepository
  authService: AuthService
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
    userRepository: asClass(UserRepository).singleton()
  })

  // Register services
  container.register({
    authService: asClass(AuthService).singleton()
  })

  return container
}
