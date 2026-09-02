import type { Store, StoreInput } from '../models/store'
import { storeRepository } from '../repositories/storeRepository'

const validateStoreName = (name: string) => {
  const normalizedName = name.trim()
  if (!normalizedName) throw new Error('店舗名を入力してください。')
  if (normalizedName.length > 80) throw new Error('店舗名は80文字以内で入力してください。')
}

export const storeService = {
  list(): Promise<Store[]> {
    return storeRepository.getAll()
  },

  create(input: StoreInput): Promise<Store> {
    validateStoreName(input.name)
    return storeRepository.create(input)
  },

  update(id: string, input: StoreInput): Promise<void> {
    validateStoreName(input.name)
    return storeRepository.update(id, input)
  },

  remove(id: string): Promise<void> {
    return storeRepository.remove(id)
  },
}
