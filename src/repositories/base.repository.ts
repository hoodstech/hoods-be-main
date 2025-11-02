import type { Database } from '~/db'

export abstract class BaseRepository {
  constructor(protected db: Database) {}
}
