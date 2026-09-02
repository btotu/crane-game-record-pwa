import type { PlayInput } from '../models/play'
import { playRepository } from '../repositories/playRepository'
export const todayKey = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-') }
export const playService = {
  create(input:PlayInput) { if (!Number.isInteger(input.amount)||input.amount<=0||input.amount>1000000) throw new Error('使用額は1～1,000,000円の整数で入力してください。'); return playRepository.create(input) },
  today: (storeId:string, prizeId:string) => playRepository.forToday(storeId,prizeId,todayKey()),
}
