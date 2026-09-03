export type StoreRegistrationSource = 'manual' | 'location'

export interface Store {
  id: string
  name: string
  latitude?: number
  longitude?: number
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
  registrationSource: StoreRegistrationSource
  externalStoreId?: string
  imageSource: 'placeholder' | 'user' | 'external'
  imageDataUrl?: string
}

export interface StoreInput {
  name: string
  latitude?: number | null
  longitude?: number | null
  imageDataUrl?: string | null
  externalStoreId?: string
}
