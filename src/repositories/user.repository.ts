import { eq } from 'drizzle-orm'

import type { Database } from '~/db'
import type { NewUser, User } from '~/db/schemas'
import { users } from '~/db/schemas'

import { BaseRepository } from './base.repository'

export class UserRepository extends BaseRepository {
  constructor(db: Database) {
    super(db)
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return result[0]
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return result[0]
  }

  async findByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1)

    return result[0]
  }

  async create(user: NewUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values({
        ...user,
        updatedAt: new Date()
      })
      .returning()

    return result[0]
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    return result[0]
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning()

    return result.length > 0
  }

  async findAll(limit = 100, offset = 0): Promise<User[]> {
    return this.db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset)
  }
}
