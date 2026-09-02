export const prizeCategories = ['食品', '雑貨', 'フィギュア', 'ぬいぐるみ', 'その他'] as const
export type PrizeCategory = (typeof prizeCategories)[number]

export interface Prize {
  id: string
  name: string
  category: PrizeCategory
  estimatedPrice: number
  priceSource: 'user'
  userEditedPrice: boolean
  createdAt: string
  updatedAt: string
}

export interface PrizeInput {
  name: string
  category: PrizeCategory
  estimatedPrice: number
}
