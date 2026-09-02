import Dexie, { type EntityTable } from 'dexie'
import type { Store } from '../models/store'
import type { Prize } from '../models/prize'

class CraneRecordDatabase extends Dexie {
  stores!: EntityTable<Store, 'id'>
  prizes!: EntityTable<Prize, 'id'>

  constructor() {
    super('crane-record-database')

    this.version(1).stores({
      stores: 'id, name, createdAt, lastUsedAt',
    })
    this.version(2).stores({
      stores: 'id, name, createdAt, lastUsedAt',
      prizes: 'id, name, category, createdAt',
    })
  }
}

export const database = new CraneRecordDatabase()
