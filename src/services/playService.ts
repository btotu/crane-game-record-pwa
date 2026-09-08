import type { ApproximatePlayInput, PlayInput, PlayUpdateInput } from '../models/play'
import { playRepository } from '../repositories/playRepository'
export const todayKey = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-') }
export const playService = {
  create(input:PlayInput) { if (!Number.isInteger(input.amount)||input.amount<=0||input.amount>1000000) throw new Error('使用額は1～1,000,000円の整数で入力してください。'); return playRepository.create(input) },
  today: (storeId:string, prizeId:string) => playRepository.forToday(storeId,prizeId,todayKey()),
  createApproximate(input:ApproximatePlayInput){if(!input.storeId||!input.prizeId)throw new Error('店舗と景品を選択してください。');if(!input.playDate||!input.playTime||Number.isNaN(new Date(`${input.playDate}T${input.playTime}:00`).getTime()))throw new Error('日付と時刻を正しく入力してください。');if(new Date(`${input.playDate}T${input.playTime}:00`).getTime()>Date.now())throw new Error('未来の日時は登録できません。');if(!Number.isInteger(input.amount)||input.amount<=0||input.amount>1000000)throw new Error('概算金額は1～1,000,000円の整数で入力してください。');return playRepository.createApproximate(input)},
  update(id:string,input:PlayUpdateInput){const dateTime=new Date(`${input.playDate}T${input.playTime}:00`);if(!input.playDate||!input.playTime||Number.isNaN(dateTime.getTime()))throw new Error('日付と時刻を正しく入力してください。');if(dateTime.getTime()>Date.now())throw new Error('未来の日時は登録できません。');if(!Number.isInteger(input.amount)||input.amount<=0||input.amount>1000000)throw new Error('使用額は1～1,000,000円の整数で入力してください。');if(input.memo.trim().length>200)throw new Error('メモは200文字以内で入力してください。');return playRepository.update(id,input)},
  remove: playRepository.remove,
}
