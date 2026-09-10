import { settingRepository } from '../repositories/settingRepository'

const keyFor = (month: string) => `monthly-budget:${month}`

export const monthlyBudgetService = {
  async get(month: string): Promise<number | null> {
    const saved = await settingRepository.get(keyFor(month))
    if (!saved) return null
    const budget = Number(saved)
    return Number.isInteger(budget) && budget >= 1 && budget <= 10000000 ? budget : null
  },
  async save(month: string, budget: number): Promise<void> {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('対象月が正しくありません。')
    if (!Number.isInteger(budget) || budget < 1 || budget > 10000000) throw new Error('月間予算は1～10,000,000円の整数で入力してください。')
    await settingRepository.set(keyFor(month), String(budget))
  },
  remove(month: string): Promise<void> {
    return settingRepository.remove(keyFor(month))
  },
}
