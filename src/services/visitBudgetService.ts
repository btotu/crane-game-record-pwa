import { settingRepository } from '../repositories/settingRepository'

const keyFor = (storeId: string, date: string) => `visit-budget:${date}:${storeId}`

export const visitBudgetService = {
  async get(storeId: string, date: string): Promise<number | null> {
    const saved = await settingRepository.get(keyFor(storeId, date))
    if (!saved) return null
    const budget = Number(saved)
    return Number.isInteger(budget) && budget >= 1 && budget <= 1000000 ? budget : null
  },
  async save(storeId: string, date: string, budget: number): Promise<void> {
    if (!Number.isInteger(budget) || budget < 1 || budget > 1000000) {
      throw new Error('予算は1～1,000,000円の整数で入力してください。')
    }
    await settingRepository.set(keyFor(storeId, date), String(budget))
  },
  remove(storeId: string, date: string): Promise<void> {
    return settingRepository.remove(keyFor(storeId, date))
  },
}
