import { database } from '../db/database'
import type { Prize, PrizeInput } from '../models/prize'

export const prizeRepository = {
  getAll: (): Promise<Prize[]> => database.prizes.orderBy('createdAt').reverse().toArray(),
  async create(input: PrizeInput): Promise<void> {
    const now = new Date().toISOString()
    await database.prizes.add({ id: crypto.randomUUID(), ...input, imageDataUrl: input.imageDataUrl ?? undefined, name: input.name.trim(), priceSource: 'user', userEditedPrice: true, createdAt: now, updatedAt: now })
  },
  update: (id: string, input: PrizeInput): Promise<number> => database.prizes.update(id, { ...input, imageDataUrl: input.imageDataUrl ?? undefined, name: input.name.trim(), userEditedPrice: true, updatedAt: new Date().toISOString() }),
  remove: (id: string): Promise<void> => database.prizes.delete(id),
}
