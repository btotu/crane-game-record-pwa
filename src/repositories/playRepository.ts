import { database } from '../db/database'
import type { PlayInput, PlayRecord } from '../models/play'

const localDate = (date: Date) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-')
export const playRepository = {
  getAll: (): Promise<PlayRecord[]> => database.plays.toArray(),
  async create(input: PlayInput): Promise<PlayRecord> {
    const now = new Date(); const timestamp = now.toISOString()
    const record: PlayRecord = { id:crypto.randomUUID(), ...input, playDate:localDate(now), startedAt:timestamp, endedAt:timestamp, memo:'', isApproximate:false }
    await database.transaction('rw', database.plays, database.stores, async () => { await database.plays.add(record); await database.stores.update(input.storeId, { lastUsedAt:timestamp, updatedAt:timestamp }) })
    return record
  },
  forToday: (storeId:string, prizeId:string, playDate:string) => database.plays.where('[storeId+prizeId+playDate]').equals([storeId, prizeId, playDate]).sortBy('startedAt'),
}
