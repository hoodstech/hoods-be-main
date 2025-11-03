import type { NewUser, User, UserRole } from '~/db/schemas'
import type { UserRepository } from '~/repositories'
import type { LoginData, RegisterData } from '~/types'
import { hashPassword, verifyPassword } from '~/utils'

export interface AdminCreateUserData {
  email: string
  password: string
  name?: string
  role: UserRole
}

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async register(data: RegisterData): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(data.email)

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    if (!data.password) {
      throw new Error('Password is required')
    }

    const hashedPassword = await hashPassword(data.password)

    const newUser: NewUser = {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      isActive: true,
      emailVerified: false
    }

    return this.userRepository.create(newUser)
  }

  async login(data: LoginData): Promise<User> {
    const user = await this.userRepository.findByEmail(data.email)

    if (!user) {
      throw new Error('Invalid email or password')
    }

    if (!user.password) {
      throw new Error('This account uses OAuth authentication. Please sign in with Google.')
    }

    const isValidPassword = await verifyPassword(data.password, user.password)

    if (!isValidPassword) {
      throw new Error('Invalid email or password')
    }

    if (!user.isActive) {
      throw new Error('Account is inactive')
    }

    return user
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.userRepository.findById(id)
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findByEmail(email)
  }

  /**
   * Admin-only method to create a user with specified role
   */
  async adminCreateUser(data: AdminCreateUserData): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(data.email)

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    const hashedPassword = await hashPassword(data.password)

    const newUser: NewUser = {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role,
      isActive: true,
      emailVerified: false
    }

    return this.userRepository.create(newUser)
  }
}
