import type { FastifyInstance } from 'fastify'

import type { NewUser, User, UserRole } from '~/db/schemas'
import type { UserRepository } from '~/repositories'
import type { SessionService } from './session.service'
import type { LoginData, RegisterData } from '~/types'
import { env, JWT_CONSTANTS } from '~/config'
import { hashPassword, verifyPassword } from '~/utils'
import { generateDeviceFingerprint, parseExpirationToSeconds } from '~/utils/jwt.utils'

type JWTSignFunction = FastifyInstance['jwt']['sign']

export interface AdminCreateUserData {
  email: string
  password: string
  name?: string
  role: UserRole
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface JWTPayload {
  sub: string // user id
  email: string
  role: UserRole
  jti: string // unique token id
  iat: number
  exp: number
  iss: string
  aud: string
  deviceId?: string
}

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private sessionService: SessionService
  ) {}

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

  /**
   * Generate JWT tokens and create session
   */
  async generateTokens(
    user: User,
    jwtSign: JWTSignFunction,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const jti = this.sessionService.generateJti()
    const deviceId = await generateDeviceFingerprint(userAgent, ipAddress)

    // Create access token payload
    const accessPayload: Partial<JWTPayload> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
      iss: JWT_CONSTANTS.ISSUER,
      aud: JWT_CONSTANTS.AUDIENCE,
      deviceId
    }

    // Create refresh token payload (same but different expiration)
    const refreshPayload: Partial<JWTPayload> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: `refresh_${jti}`, // Different JTI for refresh token
      iss: JWT_CONSTANTS.ISSUER,
      aud: JWT_CONSTANTS.AUDIENCE,
      deviceId
    }

    // Sign tokens
    const accessToken = jwtSign(accessPayload, {
      expiresIn: JWT_CONSTANTS.ACCESS_TOKEN_EXPIRATION
    })

    const refreshToken = jwtSign(refreshPayload, {
      expiresIn: JWT_CONSTANTS.REFRESH_TOKEN_EXPIRATION
    })

    // Create session in database
    await this.sessionService.createSession({
      userId: user.id,
      jti,
      deviceId,
      ipAddress,
      userAgent,
      expiresIn: parseExpirationToSeconds(JWT_CONSTANTS.ACCESS_TOKEN_EXPIRATION)
    })

    return {
      accessToken,
      refreshToken
    }
  }

  /**
   * Verify JWT token and check session validity
   */
  async verifyToken(jti: string, userId: string): Promise<boolean> {
    // Check if token is blacklisted
    const isValid = await this.sessionService.isSessionValid(jti)
    if (!isValid) {
      return false
    }

    // Verify user is still active
    const user = await this.userRepository.findById(userId)
    if (!user || !user.isActive) {
      return false
    }

    // Update last activity
    await this.sessionService.updateActivity(jti)

    return true
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshPayload: JWTPayload,
    jwtSign: JWTSignFunction
  ): Promise<string> {
    // Verify user still exists and is active
    const user = await this.userRepository.findById(refreshPayload.sub)
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive')
    }

    // Generate new JTI for access token
    const newJti = this.sessionService.generateJti()

    // Create new access token
    const accessPayload: Partial<JWTPayload> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: newJti,
      iss: JWT_CONSTANTS.ISSUER,
      aud: JWT_CONSTANTS.AUDIENCE,
      deviceId: refreshPayload.deviceId
    }

    const accessToken = jwtSign(accessPayload, {
      expiresIn: JWT_CONSTANTS.ACCESS_TOKEN_EXPIRATION
    })

    return accessToken
  }

  /**
   * Logout - revoke session
   */
  async logout(jti: string): Promise<void> {
    await this.sessionService.revokeSession(jti)
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAllUserSessions(userId)
  }

  /**
   * Logout from all devices except current
   */
  async logoutOthers(userId: string, currentJti: string): Promise<void> {
    await this.sessionService.revokeAllUserSessionsExcept(userId, currentJti)
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string, currentJti?: string) {
    return this.sessionService.getUserSessions(userId, currentJti)
  }

  /**
   * Verify IP address for strict mode
   */
  async verifyIpAddress(jti: string, ipAddress: string): Promise<boolean> {
    if (!env.SESSION_STRICT_IP_CHECK) {
      return true
    }

    return this.sessionService.verifyIpAddress(jti, ipAddress)
  }
}
