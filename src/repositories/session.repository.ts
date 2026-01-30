import { and, eq, gt } from 'drizzle-orm'

import type { Database } from '~/db'
import type { NewSession, Session } from '~/db/schemas'
import { sessions } from '~/db/schemas'

import { BaseRepository } from './base.repository'

export class SessionRepository extends BaseRepository {
  constructor(db: Database) {
    super(db)
  }

  async create(session: NewSession): Promise<Session> {
    const result = await this.db
      .insert(sessions)
      .values(session)
      .returning()

    return result[0]
  }

  async findByJti(jti: string): Promise<Session | undefined> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.jti, jti))
      .limit(1)

    return result[0]
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const now = new Date()

    return this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.isRevoked, false),
          gt(sessions.expiresAt, now)
        )
      )
      .orderBy(sessions.lastActivityAt)
  }

  async updateLastActivity(jti: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(sessions.jti, jti))
  }

  async revokeByJti(jti: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ isRevoked: true })
      .where(eq(sessions.jti, jti))
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ isRevoked: true })
      .where(eq(sessions.userId, userId))
  }

  async revokeAllByUserIdExcept(userId: string, exceptJti: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ isRevoked: true })
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.isRevoked, false)
        )
      )
      .execute()

    // Keep the current session active
    await this.db
      .update(sessions)
      .set({ isRevoked: false })
      .where(eq(sessions.jti, exceptJti))
  }

  async deleteExpired(): Promise<number> {
    const now = new Date()
    const result = await this.db
      .delete(sessions)
      .where(gt(sessions.expiresAt, now))
      .returning()

    return result.length
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.db
      .delete(sessions)
      .where(eq(sessions.id, id))
      .returning()

    return result.length > 0
  }
}
