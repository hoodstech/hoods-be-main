import type { NewUser, User } from '~/db/schemas'
import type { UserRepository } from '~/repositories'
import type { GoogleUserProfile } from '~/types'

export class GoogleOAuthService {
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
      emailVerified: true, // Google emails are verified
      isActive: true
    }

    return this.userRepository.create(newUser)
  }
}
