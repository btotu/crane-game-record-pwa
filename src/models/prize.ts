export const prizeCategories = ['食品', '雑貨', 'フィギュア', 'ぬいぐるみ', 'その他'] as const
export type PrizeCategory = (typeof prizeCategories)[number]
export const priceBasisOptions = ['市販商品価格', 'プライズ品の市場相場', 'その他の手入力'] as const
export type PriceBasis = (typeof priceBasisOptions)[number]

export interface Prize {
  id: string
  name: string
  category: PrizeCategory
  estimatedPrice: number
  unitPrice?: number
  quantity?: number
  priceSource: 'user' | 'yahoo'
  userEditedPrice: boolean
  priceBasis?: PriceBasis
  manufacturer?: string
  contentDescription?: string
  imageDataUrl?: string
  janCode?: string
  priceReferenceName?: string
  priceReferenceUrl?: string
  priceCheckedAt?: string
  createdAt: string
  updatedAt: string
  isArchived?: boolean
}

export interface PrizeInput {
  name: string
  category: PrizeCategory
  estimatedPrice: number
  unitPrice: number
  quantity: number
  priceSource: 'user' | 'yahoo'
  userEditedPrice: boolean
  priceBasis: PriceBasis
  manufacturer?: string
  contentDescription?: string
  imageDataUrl?: string | null
  janCode?: string
  priceReferenceName?: string
  priceReferenceUrl?: string
  priceCheckedAt?: string
}
