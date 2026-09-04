import { productApiSettingService } from './productApiSettingService'

interface YahooHit {
  name?: string
  price?: number
  url?: string
  janCode?: string
  seller?: { name?: string }
}

interface YahooResponse { hits?: YahooHit[] }

export interface ProductCandidate {
  name: string
  price: number
  url: string
  sellerName: string
  janCode: string
}

export const yahooProductService = {
  async searchByJan(janCode: string): Promise<ProductCandidate[]> {
    if (!/^(\d{8}|\d{13})$/.test(janCode)) throw new Error('JANコードは8桁または13桁で入力してください。')
    const clientId = await productApiSettingService.getYahooClientId()
    if (!clientId) throw new Error('設定画面でYahoo!ショッピングのClient IDを保存してください。')

    const parameters = new URLSearchParams({ appid: clientId, jan_code: janCode, results: '10' })
    let response: Response
    try {
      response = await fetch(`https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?${parameters}`)
    } catch {
      throw new Error('Yahoo!ショッピングへ接続できませんでした。通信状態を確認してください。')
    }
    if (response.status === 401 || response.status === 403) throw new Error('Client IDが無効、または商品検索APIを利用できない設定です。')
    if (response.status === 429) throw new Error('検索回数の制限に達しました。少し待ってから再度お試しください。')
    if (!response.ok) throw new Error('商品情報を取得できませんでした。しばらく待って再度お試しください。')

    const data = await response.json() as YahooResponse
    return (data.hits ?? []).flatMap((hit): ProductCandidate[] => {
      if (!hit.name || typeof hit.price !== 'number' || !hit.url) return []
      return [{ name: hit.name, price: hit.price, url: hit.url, sellerName: hit.seller?.name ?? 'Yahoo!ショッピング', janCode: hit.janCode || janCode }]
    })
  },
}
