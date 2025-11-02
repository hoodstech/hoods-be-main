import type { NewUser, User } from '~/db/schemas'
import type { UserRepository } from '~/repositories'
import type { GoogleUserProfile, RegisterData } from '~/types'

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async handleGoogleCallback(profile: GoogleUserProfile): Promise<User> {
    const existingUser = await this.userRepository.findByGoogleId(profile.sub)

    if (existingUser) {
      // Update user info if changed
      if (
        existingUser.name !== profile.name ||
        existingUser.avatarUrl !== profile.picture
      ) {
        const updated = await this.userRepository.update(existingUser.id, {
          name: profile.name,
          avatarUrl: profile.picture,
          updatedAt: new Date()
        })
        return updated!
      }
      return existingUser
    }

    // Create new user
    const newUser: NewUser = {
      email: profile.email,
      googleId: profile.sub,
      name: profile.name,
      avatarUrl: profile.picture,
      isActive: true
    }

    return this.userRepository.create(newUser)
  }

  async register(data: RegisterData): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(data.email)

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    const newUser: NewUser = {
      email: data.email,
      name: data.name,
      isActive: true
    }

    return this.userRepository.create(newUser)
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.userRepository.findById(id)
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findByEmail(email)
  }
}
