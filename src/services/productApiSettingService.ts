import { settingRepository } from '../repositories/settingRepository'

const YAHOO_CLIENT_ID_KEY = 'yahoo-shopping-client-id'

export const productApiSettingService = {
  getYahooClientId(): Promise<string | undefined> {
    return settingRepository.get(YAHOO_CLIENT_ID_KEY)
  },
  async saveYahooClientId(value: string): Promise<void> {
    const normalized = value.trim()
    if (normalized.length < 10 || normalized.length > 200) throw new Error('Client IDを正しく入力してください。')
    await settingRepository.set(YAHOO_CLIENT_ID_KEY, normalized)
  },
  removeYahooClientId(): Promise<void> {
    return settingRepository.remove(YAHOO_CLIENT_ID_KEY)
  },
}
