import Dexie, { type EntityTable } from 'dexie'
import type { Store } from '../models/store'
import type { Prize } from '../models/prize'
import type { PlayRecord } from '../models/play'
import type { AppSetting } from '../models/appSetting'

class CraneRecordDatabase extends Dexie {
  stores!: EntityTable<Store, 'id'>
  prizes!: EntityTable<Prize, 'id'>
  plays!: EntityTable<PlayRecord, 'id'>
  settings!: EntityTable<AppSetting, 'key'>

  constructor() {
    super('crane-record-database')

    this.version(1).stores({
      stores: 'id, name, createdAt, lastUsedAt',
    })
    this.version(2).stores({
      stores: 'id, name, createdAt, lastUsedAt',
      prizes: 'id, name, category, createdAt',
    })
    this.version(3).stores({
      stores: 'id, name, createdAt, lastUsedAt',
      prizes: 'id, name, category, createdAt',
      plays: 'id, storeId, prizeId, playDate, startedAt, [storeId+playDate], [storeId+prizeId+playDate]',
    })
    this.version(4).stores({
      stores: 'id, name, createdAt, lastUsedAt',
      prizes: 'id, name, category, createdAt',
      plays: 'id, storeId, prizeId, playDate, startedAt, [storeId+playDate], [storeId+prizeId+playDate]',
      settings: 'key',
    })
  }
}

export const database = new CraneRecordDatabase()
