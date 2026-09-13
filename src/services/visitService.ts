import type { VisitPlayDetail, VisitSummary } from '../models/visit'
import { playRepository } from '../repositories/playRepository'
import { prizeService } from './prizeService'
import { storeService } from './storeService'

export const visitService = { async list():Promise<VisitSummary[]> {
  const [plays,stores,prizes]=await Promise.all([playRepository.getAll(),storeService.list(),prizeService.list()])
  const storeMap=new Map(stores.map(item=>[item.id,item])); const prizeMap=new Map(prizes.map(item=>[item.id,item])); const grouped=new Map<string,VisitSummary>()
  for(const play of plays){ const key=`${play.playDate}:${play.storeId}`; const won=play.result!=='撤退'; const value=won?(play.estimatedPriceAtPlay??prizeMap.get(play.prizeId)?.estimatedPrice??0):0; const current=grouped.get(key)
    if(current){current.totalSpent+=play.amount;current.estimatedPrizeValue+=value;current.profit=current.estimatedPrizeValue-current.totalSpent;current.acquiredCount+=won?1:0;current.playCount+=1;current.isApproximate ||= play.isApproximate;if(play.startedAt<current.startedAt)current.startedAt=play.startedAt}
    else { const store=storeMap.get(play.storeId); grouped.set(key,{id:key,storeId:play.storeId,storeName:store?.name??'削除済み店舗',storeImageDataUrl:store?.imageDataUrl,playDate:play.playDate,startedAt:play.startedAt,totalSpent:play.amount,estimatedPrizeValue:value,profit:value-play.amount,acquiredCount:won?1:0,playCount:1,isApproximate:play.isApproximate}) } }
  return [...grouped.values()].sort((a,b)=>b.startedAt.localeCompare(a.startedAt))
}, async details(storeId:string,playDate:string):Promise<VisitPlayDetail[]>{const [plays,prizes]=await Promise.all([playRepository.forVisit(storeId,playDate),prizeService.list()]);const map=new Map(prizes.map(item=>[item.id,item]));return plays.map(play=>{const prize=map.get(play.prizeId);const savedPrice=play.estimatedPriceAtPlay??prize?.estimatedPrice??0;return{id:play.id,prizeId:play.prizeId,prizeName:prize?.name??'削除済み景品',prizeImageDataUrl:prize?.imageDataUrl,category:prize?.category??'その他',amount:play.amount,result:play.result,startedAt:play.startedAt,estimatedValue:play.result==='撤退'?0:savedPrice,estimatedPriceAtPlay:savedPrice,memo:play.memo??'',isApproximate:play.isApproximate}})} }
