import type { VisitSummary } from '../models/visit'
import { playRepository } from '../repositories/playRepository'
import { prizeService } from './prizeService'
import { storeService } from './storeService'

export const visitService = { async list():Promise<VisitSummary[]> {
  const [plays,stores,prizes]=await Promise.all([playRepository.getAll(),storeService.list(),prizeService.list()])
  const storeMap=new Map(stores.map(item=>[item.id,item])); const prizeMap=new Map(prizes.map(item=>[item.id,item])); const grouped=new Map<string,VisitSummary>()
  for(const play of plays){ const key=`${play.playDate}:${play.storeId}`; const won=play.result!=='撤退'; const value=won?(prizeMap.get(play.prizeId)?.estimatedPrice??0):0; const current=grouped.get(key)
    if(current){current.totalSpent+=play.amount;current.estimatedPrizeValue+=value;current.profit=current.estimatedPrizeValue-current.totalSpent;current.acquiredCount+=won?1:0;current.playCount+=1;if(play.startedAt<current.startedAt)current.startedAt=play.startedAt}
    else grouped.set(key,{id:key,storeId:play.storeId,storeName:storeMap.get(play.storeId)?.name??'削除済み店舗',playDate:play.playDate,startedAt:play.startedAt,totalSpent:play.amount,estimatedPrizeValue:value,profit:value-play.amount,acquiredCount:won?1:0,playCount:1}) }
  return [...grouped.values()].sort((a,b)=>b.startedAt.localeCompare(a.startedAt))
} }
