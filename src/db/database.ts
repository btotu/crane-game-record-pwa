import Dexie, { type EntityTable } from 'dexie'
import type { Store } from '../models/store'

class CraneRecordDatabase extends Dexie {
  stores!: EntityTable<Store, 'id'>

  constructor() {
    super('crane-record-database')

    this.version(1).stores({
      stores: 'id, name, createdAt, lastUsedAt',
    })
  }
}

export const database = new CraneRecordDatabase()
