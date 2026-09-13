import { database } from '../db/database'
import type { Prize, PrizeInput } from '../models/prize'

export const prizeRepository = {
  getAll: (): Promise<Prize[]> => database.prizes.orderBy('createdAt').reverse().toArray(),
  async create(input: PrizeInput): Promise<void> {
    const now = new Date().toISOString()
    await database.prizes.add({ id: crypto.randomUUID(), ...input, imageDataUrl: input.imageDataUrl ?? undefined, janCode: input.janCode?.trim() || undefined, manufacturer: input.manufacturer?.trim() || undefined, contentDescription: input.contentDescription?.trim() || undefined, priceReferenceName: input.priceReferenceName?.trim() || undefined, priceReferenceUrl: input.priceReferenceUrl?.trim() || undefined, priceCheckedAt: input.priceCheckedAt || undefined, name: input.name.trim(), createdAt: now, updatedAt: now })
  },
  update: (id: string, input: PrizeInput): Promise<number> => database.prizes.update(id, { ...input, imageDataUrl: input.imageDataUrl ?? undefined, janCode: input.janCode?.trim() || undefined, manufacturer: input.manufacturer?.trim() || undefined, contentDescription: input.contentDescription?.trim() || undefined, priceReferenceName: input.priceReferenceName?.trim() || undefined, priceReferenceUrl: input.priceReferenceUrl?.trim() || undefined, priceCheckedAt: input.priceCheckedAt || undefined, name: input.name.trim(), updatedAt: new Date().toISOString() }),
  remove: (id: string): Promise<void> => database.prizes.delete(id),
  setArchived: (id:string,isArchived:boolean):Promise<number> => database.prizes.update(id,{isArchived,updatedAt:new Date().toISOString()}),
}
