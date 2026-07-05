import { Database } from '../database';

export abstract class BaseRepository {
  constructor(protected readonly db: Database) {}

  protected get database() {
    return this.db.getDb();
  }
}
