import { priceBasisOptions, type PrizeInput } from '../models/prize'
import { prizeRepository } from '../repositories/prizeRepository'
import { playRepository } from '../repositories/playRepository'

const validate = (input: PrizeInput) => {
  if (!input.name.trim()) throw new Error('景品名を入力してください。')
  if (input.name.trim().length > 100) throw new Error('景品名は100文字以内で入力してください。')
  if (!Number.isInteger(input.estimatedPrice) || input.estimatedPrice < 0 || input.estimatedPrice > 1000000) throw new Error('参考価格は0～1,000,000円の整数で入力してください。')
  if (!Number.isInteger(input.unitPrice) || input.unitPrice < 0 || input.unitPrice > 1000000) throw new Error('単価は0～1,000,000円の整数で入力してください。')
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 100) throw new Error('数量は1～100個の整数で入力してください。')
  if (input.estimatedPrice !== input.unitPrice * input.quantity) throw new Error('参考価格の計算結果が一致しません。')
  if (!priceBasisOptions.includes(input.priceBasis)) throw new Error('価格の評価方法を選択してください。')
  if (input.manufacturer && input.manufacturer.trim().length > 80) throw new Error('メーカー名は80文字以内で入力してください。')
  if (input.contentDescription && input.contentDescription.trim().length > 80) throw new Error('内容量・サイズは80文字以内で入力してください。')
  if (input.janCode && !/^(\d{8}|\d{13})$/.test(input.janCode.trim())) throw new Error('JANコードは8桁または13桁の数字で入力してください。')
  if (input.priceReferenceName && input.priceReferenceName.trim().length > 80) throw new Error('参考サイト名は80文字以内で入力してください。')
  if (input.priceReferenceUrl) {
    try {
      const url = new URL(input.priceReferenceUrl.trim())
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
    } catch {
      throw new Error('参考URLは http:// または https:// から始まる有効なURLを入力してください。')
    }
  }
}

export const prizeService = {
  list: prizeRepository.getAll,
  create(input: PrizeInput) { validate(input); return prizeRepository.create(input) },
  update(id: string, input: PrizeInput) { validate(input); return prizeRepository.update(id, input) },
  async remove(id: string) {
    const playCount = await playRepository.countByPrize(id)
    if (playCount > 0) throw new Error(`この景品には${playCount}件のプレイ記録があるため削除できません。景品名や価格の変更は「編集」を使用してください。`)
    return prizeRepository.remove(id)
  },
}
