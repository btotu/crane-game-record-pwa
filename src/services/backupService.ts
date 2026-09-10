import { database } from '../db/database'
import type { Store } from '../models/store'
import type { Prize } from '../models/prize'
import type { PlayRecord } from '../models/play'
import type { AppSetting } from '../models/appSetting'
import { settingRepository } from '../repositories/settingRepository'

const LAST_BACKUP_KEY = 'last-backup-at'
const DEVICE_NAME_KEY = 'backup-device-name'
const isSafeSettingKey = (key: string) => key === 'play-quick-amounts' || key.startsWith('visit-budget:') || key.startsWith('monthly-budget:')

interface BackupDataV1 { format: 'crane-record-backup'; version: 1; exportedAt: string; stores: Store[]; prizes: Prize[]; plays: PlayRecord[] }
interface BackupDataV2 { format: 'crane-record-backup'; version: 2; exportedAt: string; deviceName?: string; stores: Store[]; prizes: Prize[]; plays: PlayRecord[]; settings: AppSetting[] }
type BackupData = BackupDataV1 | BackupDataV2
export interface BackupPreview { version: number; exportedAt: string; deviceName?: string; stores: number; prizes: number; plays: number; settings: number }
export interface ImportResult { storesAdded: number; prizesAdded: number; playsAdded: number; settingsRestored: number; skipped: number }

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const hasId = (value: unknown): value is { id: string } => isObject(value) && typeof value.id === 'string' && value.id.length > 0
const isSetting = (value: unknown): value is AppSetting => isObject(value) && typeof value.key === 'string' && typeof value.value === 'string' && typeof value.updatedAt === 'string' && isSafeSettingKey(value.key)

const parse = (raw: unknown): BackupData => {
  if (!isObject(raw) || raw.format !== 'crane-record-backup' || (raw.version !== 1 && raw.version !== 2) || typeof raw.exportedAt !== 'string' || !Array.isArray(raw.stores) || !Array.isArray(raw.prizes) || !Array.isArray(raw.plays)) throw new Error('このアプリの有効なバックアップファイルではありません。')
  if (raw.version === 2 && !Array.isArray(raw.settings)) throw new Error('バックアップの設定データを確認できません。')
  return raw as unknown as BackupData
}

export const backupService = {
  async export(deviceName: string): Promise<BackupDataV2> {
    const [stores, prizes, plays, settings] = await Promise.all([database.stores.toArray(), database.prizes.toArray(), database.plays.toArray(), database.settings.filter(setting => isSafeSettingKey(setting.key)).toArray()])
    const normalizedDeviceName = deviceName.trim()
    return { format: 'crane-record-backup', version: 2, exportedAt: new Date().toISOString(), ...(normalizedDeviceName ? { deviceName: normalizedDeviceName } : {}), stores, prizes, plays, settings }
  },
  inspect(raw: unknown): BackupPreview {
    const data = parse(raw)
    if (Number.isNaN(new Date(data.exportedAt).getTime())) throw new Error('バックアップの作成日時が不正です。')
    return { version: data.version, exportedAt: data.exportedAt, deviceName: data.version === 2 ? data.deviceName : undefined, stores: data.stores.filter(hasId).length, prizes: data.prizes.filter(hasId).length, plays: data.plays.filter(hasId).length, settings: data.version === 2 ? data.settings.filter(isSetting).length : 0 }
  },
  async import(raw: unknown): Promise<ImportResult> {
    const data = parse(raw)
    const stores = data.stores.filter(hasId) as Store[]
    const prizes = data.prizes.filter(hasId) as Prize[]
    const plays = data.plays.filter(hasId) as PlayRecord[]
    const settings = data.version === 2 ? data.settings.filter(isSetting) : []
    const result: ImportResult = { storesAdded: 0, prizesAdded: 0, playsAdded: 0, settingsRestored: 0, skipped: 0 }
    await database.transaction('rw', database.stores, database.prizes, database.plays, database.settings, async () => {
      for (const item of stores) { if (await database.stores.get(item.id)) result.skipped++; else { await database.stores.add(item); result.storesAdded++ } }
      for (const item of prizes) { if (await database.prizes.get(item.id)) result.skipped++; else { await database.prizes.add(item); result.prizesAdded++ } }
      for (const item of plays) { if (await database.plays.get(item.id)) result.skipped++; else if (await database.stores.get(item.storeId) && await database.prizes.get(item.prizeId)) { await database.plays.add(item); result.playsAdded++ } else result.skipped++ }
      for (const setting of settings) { await database.settings.put(setting); result.settingsRestored++ }
    })
    return result
  },
  async getLocalInfo(): Promise<{ deviceName: string; lastBackupAt: string | null }> {
    const [deviceName, lastBackupAt] = await Promise.all([settingRepository.get(DEVICE_NAME_KEY), settingRepository.get(LAST_BACKUP_KEY)])
    return { deviceName: deviceName ?? '', lastBackupAt: lastBackupAt ?? null }
  },
  async rememberExport(deviceName: string, exportedAt: string): Promise<void> {
    const normalizedDeviceName = deviceName.trim()
    if (normalizedDeviceName.length > 40) throw new Error('端末名は40文字以内で入力してください。')
    if (normalizedDeviceName) await settingRepository.set(DEVICE_NAME_KEY, normalizedDeviceName); else await settingRepository.remove(DEVICE_NAME_KEY)
    await settingRepository.set(LAST_BACKUP_KEY, exportedAt)
  },
}
