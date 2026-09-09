import { settingRepository } from '../repositories/settingRepository'

const QUICK_AMOUNTS_KEY = 'play-quick-amounts'
export const defaultQuickAmounts = [100, 200, 500]

const isValidAmounts = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every(amount => Number.isInteger(amount) && amount >= 1 && amount <= 1000000) &&
  new Set(value).size === value.length

export const playInputSettingService = {
  async getQuickAmounts(): Promise<number[]> {
    const saved = await settingRepository.get(QUICK_AMOUNTS_KEY)
    if (!saved) return [...defaultQuickAmounts]
    try {
      const parsed: unknown = JSON.parse(saved)
      return isValidAmounts(parsed) ? parsed : [...defaultQuickAmounts]
    } catch {
      return [...defaultQuickAmounts]
    }
  },
  async saveQuickAmounts(amounts: number[]): Promise<void> {
    if (!isValidAmounts(amounts)) throw new Error('金額は重複しない1～1,000,000円の整数を3つ入力してください。')
    await settingRepository.set(QUICK_AMOUNTS_KEY, JSON.stringify(amounts))
  },
  async resetQuickAmounts(): Promise<void> {
    await settingRepository.remove(QUICK_AMOUNTS_KEY)
  },
}
