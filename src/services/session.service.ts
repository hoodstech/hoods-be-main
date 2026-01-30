import { randomUUID } from 'crypto'
import type Redis from 'ioredis'

import type { NewSession, Session } from '~/db/schemas'
import type { SessionRepository } from '~/repositories/session.repository'
import { env } from '~/config'

export interface CreateSessionData {
  userId: string
  jti: string
  deviceId?: string
  ipAddress?: string
  userAgent?: string
  expiresIn: number // in seconds
}

export interface SessionMetadata {
  id: string
  deviceId: string | null
  ipAddress: string | null
  userAgent: string | null
  issuedAt: Date
  expiresAt: Date
  lastActivityAt: Date
  isCurrent: boolean
}

export class SessionService {
  constructor(
    private sessionRepository: SessionRepository,
    private redis: Redis
  ) {}

  /**
   * Create a new session
   */
  async createSession(data: CreateSessionData): Promise<Session> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + data.expiresIn * 1000)

    // Check concurrent sessions limit
    const activeSessions = await this.sessionRepository.findActiveByUserId(data.userId)
    if (activeSessions.length >= env.SESSION_MAX_CONCURRENT) {
      // Revoke oldest session
      const oldestSession = activeSessions[0]
      await this.revokeSession(oldestSession.jti)
    }

    const newSession: NewSession = {
      userId: data.userId,
      jti: data.jti,
      deviceId: data.deviceId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      issuedAt: now,
      expiresAt,
      lastActivityAt: now,
      isRevoked: false
    }

    return this.sessionRepository.create(newSession)
  }

  /**
   * Check if session is valid (not revoked and not expired)
   */
  async isSessionValid(jti: string): Promise<boolean> {
    // First check Redis blacklist (faster)
    const isBlacklisted = await this.redis.exists(`blacklist:${jti}`)
    if (isBlacklisted) {
      return false
    }

    // Then check database
    const session = await this.sessionRepository.findByJti(jti)
    if (!session) {
      return false
    }

    if (session.isRevoked) {
      return false
    }

    if (session.expiresAt < new Date()) {
      return false
    }

    return true
  }

  /**
   * Get session by JTI
   */
  async getSession(jti: string): Promise<Session | undefined> {
    return this.sessionRepository.findByJti(jti)
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity(jti: string): Promise<void> {
    await this.sessionRepository.updateLastActivity(jti)
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(jti: string): Promise<void> {
    const session = await this.sessionRepository.findByJti(jti)
    if (!session) {
      return
    }

    // Revoke in database
    await this.sessionRepository.revokeByJti(jti)

    // Add to Redis blacklist with TTL
    const ttl = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000))
    if (ttl > 0) {
      await this.redis.setex(`blacklist:${jti}`, ttl, '1')
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId)

    // Revoke in database
    await this.sessionRepository.revokeAllByUserId(userId)

    // Add all to Redis blacklist
    const pipeline = this.redis.pipeline()
    for (const session of sessions) {
      const ttl = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000))
      if (ttl > 0) {
        pipeline.setex(`blacklist:${session.jti}`, ttl, '1')
      }
    }
    await pipeline.exec()
  }

  /**
   * Revoke all sessions except current one
   */
  async revokeAllUserSessionsExcept(userId: string, currentJti: string): Promise<void> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId)

    // Revoke in database except current
    await this.sessionRepository.revokeAllByUserIdExcept(userId, currentJti)

    // Add others to Redis blacklist
    const pipeline = this.redis.pipeline()
    for (const session of sessions) {
      if (session.jti !== currentJti) {
        const ttl = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000))
        if (ttl > 0) {
          pipeline.setex(`blacklist:${session.jti}`, ttl, '1')
        }
      }
    }
    await pipeline.exec()
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string, currentJti?: string): Promise<SessionMetadata[]> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId)

    return sessions.map((session) => ({
      id: session.id,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      isCurrent: session.jti === currentJti
    }))
  }

  /**
   * Verify IP address matches session (if strict mode enabled)
   */
  async verifyIpAddress(jti: string, ipAddress: string): Promise<boolean> {
    if (!env.SESSION_STRICT_IP_CHECK) {
      return true
    }

    const session = await this.sessionRepository.findByJti(jti)
    if (!session) {
      return false
    }

    return session.ipAddress === ipAddress
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    return this.sessionRepository.deleteExpired()
  }

  /**
   * Generate unique JTI
   */
  generateJti(): string {
    return randomUUID()
  }
}
