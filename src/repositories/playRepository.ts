import { database } from '../db/database'
import type { ApproximatePlayInput, PlayInput, PlayRecord, PlayUpdateInput } from '../models/play'

const localDate = (date: Date) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-')
export const playRepository = {
  getAll: (): Promise<PlayRecord[]> => database.plays.toArray(),
  get: (id:string):Promise<PlayRecord|undefined> => database.plays.get(id),
  countByStore: (storeId:string):Promise<number> => database.plays.where('storeId').equals(storeId).count(),
  countByPrize: (prizeId:string):Promise<number> => database.plays.where('prizeId').equals(prizeId).count(),
  async create(input: PlayInput): Promise<PlayRecord> {
    const now = new Date(); const timestamp = now.toISOString()
    const prize = await database.prizes.get(input.prizeId)
    const record: PlayRecord = { id:crypto.randomUUID(), ...input, playDate:localDate(now), startedAt:timestamp, endedAt:timestamp, memo:'', isApproximate:false, estimatedPriceAtPlay:prize?.estimatedPrice ?? 0 }
    await database.transaction('rw', database.plays, database.stores, async () => { await database.plays.add(record); await database.stores.update(input.storeId, { lastUsedAt:timestamp, updatedAt:timestamp }) })
    return record
  },
  async createApproximate(input:ApproximatePlayInput):Promise<PlayRecord>{const local=new Date(`${input.playDate}T${input.playTime}:00`);const timestamp=local.toISOString();const prize=await database.prizes.get(input.prizeId);const record:PlayRecord={id:crypto.randomUUID(),storeId:input.storeId,prizeId:input.prizeId,amount:input.amount,result:input.result,playDate:input.playDate,startedAt:timestamp,endedAt:timestamp,memo:'',isApproximate:true,estimatedPriceAtPlay:prize?.estimatedPrice??0};await database.plays.add(record);return record},
  forToday: (storeId:string, prizeId:string, playDate:string) => database.plays.where('[storeId+prizeId+playDate]').equals([storeId, prizeId, playDate]).sortBy('startedAt'),
  forVisit: (storeId:string, playDate:string) => database.plays.where('[storeId+playDate]').equals([storeId, playDate]).sortBy('startedAt'),
  update: (id:string, input:PlayUpdateInput):Promise<number> => { const timestamp=new Date(`${input.playDate}T${input.playTime}:00`).toISOString();return database.plays.update(id, { amount:input.amount,result:input.result,memo:input.memo.trim(),isApproximate:input.isApproximate,playDate:input.playDate,startedAt:timestamp,endedAt:timestamp,estimatedPriceAtPlay:input.estimatedPriceAtPlay }) },
  remove: async (id:string):Promise<PlayRecord|undefined> => {const record=await database.plays.get(id);await database.plays.delete(id);return record},
  restore: (record:PlayRecord):Promise<string> => database.plays.put(record),
}
