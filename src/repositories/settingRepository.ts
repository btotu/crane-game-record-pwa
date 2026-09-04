import { database } from '../db/database'

export const settingRepository = {
  async get(key: string): Promise<string | undefined> {
    return (await database.settings.get(key))?.value
  },
  async set(key: string, value: string): Promise<void> {
    await database.settings.put({ key, value, updatedAt: new Date().toISOString() })
  },
  async remove(key: string): Promise<void> {
    await database.settings.delete(key)
  },
}
