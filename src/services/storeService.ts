import type { Store, StoreInput } from '../models/store'
import { storeRepository } from '../repositories/storeRepository'
import { playRepository } from '../repositories/playRepository'

const validateStoreName = (name: string) => {
  const normalizedName = name.trim()
  if (!normalizedName) throw new Error('店舗名を入力してください。')
  if (normalizedName.length > 80) throw new Error('店舗名は80文字以内で入力してください。')
}

export const storeService = {
  list(): Promise<Store[]> {
    return storeRepository.getAll()
  },

  async listActive():Promise<Store[]>{
    return (await storeRepository.getAll()).filter(store=>!store.isArchived)
  },

  create(input: StoreInput): Promise<Store> {
    validateStoreName(input.name)
    return storeRepository.create(input)
  },

  update(id: string, input: StoreInput): Promise<void> {
    validateStoreName(input.name)
    return storeRepository.update(id, input)
  },

  async remove(id: string): Promise<void> {
    const playCount = await playRepository.countByStore(id)
    if (playCount > 0) throw new Error(`この店舗には${playCount}件のプレイ記録があるため削除できません。店舗名や写真の変更は「編集」を使用してください。`)
    return storeRepository.remove(id)
  },

  setArchived(id:string,isArchived:boolean):Promise<void>{
    return storeRepository.setArchived(id,isArchived)
  },
}
