import { database } from '../db/database'
import type { Store, StoreInput } from '../models/store'

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ')

export const storeRepository = {
  async getAll(): Promise<Store[]> {
    return database.stores.orderBy('createdAt').reverse().toArray()
  },

  async create(input: StoreInput): Promise<Store> {
    const now = new Date().toISOString()
    const store: Store = {
      id: crypto.randomUUID(),
      name: normalizeName(input.name),
      createdAt: now,
      updatedAt: now,
      registrationSource: 'manual',
      imageSource: 'placeholder',
    }

    await database.stores.add(store)
    return store
  },

  async update(id: string, input: StoreInput): Promise<void> {
    await database.stores.update(id, {
      name: normalizeName(input.name),
      updatedAt: new Date().toISOString(),
    })
  },

  async remove(id: string): Promise<void> {
    await database.stores.delete(id)
  },
}
