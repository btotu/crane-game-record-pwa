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
      latitude: input.latitude ?? undefined,
      longitude: input.longitude ?? undefined,
      createdAt: now,
      updatedAt: now,
      registrationSource: input.latitude != null && input.longitude != null ? 'location' : 'manual',
      imageSource: input.imageDataUrl ? 'user' : 'placeholder',
      imageDataUrl: input.imageDataUrl ?? undefined,
      externalStoreId: input.externalStoreId,
    }

    await database.stores.add(store)
    return store
  },

  async update(id: string, input: StoreInput): Promise<void> {
    await database.stores.update(id, {
      name: normalizeName(input.name),
      latitude: input.latitude ?? undefined,
      longitude: input.longitude ?? undefined,
      registrationSource: input.latitude != null && input.longitude != null ? 'location' : 'manual',
      imageSource: input.imageDataUrl ? 'user' : 'placeholder',
      imageDataUrl: input.imageDataUrl ?? undefined,
      updatedAt: new Date().toISOString(),
    })
  },

  async remove(id: string): Promise<void> {
    await database.stores.delete(id)
  },

  async setArchived(id:string,isArchived:boolean):Promise<void>{
    await database.stores.update(id,{isArchived,updatedAt:new Date().toISOString()})
  },
}
