import type { PrizeInput } from '../models/prize'
import { prizeRepository } from '../repositories/prizeRepository'

const validate = (input: PrizeInput) => {
  if (!input.name.trim()) throw new Error('景品名を入力してください。')
  if (input.name.trim().length > 100) throw new Error('景品名は100文字以内で入力してください。')
  if (!Number.isInteger(input.estimatedPrice) || input.estimatedPrice < 0 || input.estimatedPrice > 1000000) throw new Error('参考価格は0～1,000,000円の整数で入力してください。')
  if (input.janCode && !/^(\d{8}|\d{13})$/.test(input.janCode.trim())) throw new Error('JANコードは8桁または13桁の数字で入力してください。')
}

export const prizeService = {
  list: prizeRepository.getAll,
  create(input: PrizeInput) { validate(input); return prizeRepository.create(input) },
  update(id: string, input: PrizeInput) { validate(input); return prizeRepository.update(id, input) },
  remove: prizeRepository.remove,
}
