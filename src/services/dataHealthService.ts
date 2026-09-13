import { playRepository } from '../repositories/playRepository'
import { prizeService } from './prizeService'
import { storeService } from './storeService'
import { todayKey } from './playService'

export interface DataHealthResult {
  stores: number
  prizes: number
  plays: number
  orphanedStores: number
  orphanedPrizes: number
  invalidPlays: number
}

export const dataHealthService = {
  async check(): Promise<DataHealthResult> {
    const [stores, prizes, plays] = await Promise.all([storeService.list(), prizeService.list(), playRepository.getAll()])
    const storeIds = new Set(stores.map(store => store.id))
    const prizeIds = new Set(prizes.map(prize => prize.id))
    const validResults = new Set(['獲得', '撤退', 'アシスト獲得'])
    const orphanedStores = plays.filter(play => !storeIds.has(play.storeId)).length
    const orphanedPrizes = plays.filter(play => !prizeIds.has(play.prizeId)).length
    const invalidPlays = plays.filter(play =>
      !Number.isInteger(play.amount) || play.amount < 1 || play.amount > 1000000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(play.playDate) || Number.isNaN(new Date(`${play.playDate}T00:00:00`).getTime()) || play.playDate > todayKey() ||
      !validResults.has(play.result) || Number.isNaN(new Date(play.startedAt).getTime()) ||
      !Number.isInteger(play.estimatedPriceAtPlay) || (play.estimatedPriceAtPlay ?? -1) < 0
    ).length
    return { stores: stores.length, prizes: prizes.length, plays: plays.length, orphanedStores, orphanedPrizes, invalidPlays }
  },
}
