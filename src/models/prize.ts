export const prizeCategories = ['食品', '雑貨', 'フィギュア', 'ぬいぐるみ', 'その他'] as const
export type PrizeCategory = (typeof prizeCategories)[number]

export interface Prize {
  id: string
  name: string
  category: PrizeCategory
  estimatedPrice: number
  unitPrice?: number
  quantity?: number
  priceSource: 'user'
  userEditedPrice: boolean
  imageDataUrl?: string
  janCode?: string
  priceReferenceName?: string
  priceReferenceUrl?: string
  priceCheckedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PrizeInput {
  name: string
  category: PrizeCategory
  estimatedPrice: number
  unitPrice: number
  quantity: number
  imageDataUrl?: string | null
  janCode?: string
  priceReferenceName?: string
  priceReferenceUrl?: string
  priceCheckedAt?: string
}
