import { locationService, type CurrentPosition } from './locationService'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const SEARCH_RADIUS_METERS = 5000

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: { name?: string; 'name:ja'?: string; branch?: string }
}

interface OverpassResponse { elements?: OverpassElement[] }

export interface NearbyStoreCandidate {
  externalStoreId: string
  name: string
  latitude: number
  longitude: number
  distanceMeters: number
}

export const nearbyStoreService = {
  async search(position: CurrentPosition): Promise<NearbyStoreCandidate[]> {
    const query = `[out:json][timeout:15];nwr["leisure"~"^(amusement_arcade|video_arcade)$"](around:${SEARCH_RADIUS_METERS},${position.latitude},${position.longitude});out center tags;`
    let response: Response
    try {
      response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } })
    } catch {
      throw new Error('周辺店舗サービスへ接続できませんでした。通信状態を確認するか、店舗を手動登録してください。')
    }
    if (!response.ok) throw new Error('周辺店舗サービスが混雑しています。しばらく待って再度検索するか、店舗を手動登録してください。')

    const data = await response.json() as OverpassResponse
    return (data.elements ?? []).flatMap((element): NearbyStoreCandidate[] => {
      const latitude = element.lat ?? element.center?.lat
      const longitude = element.lon ?? element.center?.lon
      const name = element.tags?.['name:ja'] ?? element.tags?.name ?? element.tags?.branch
      if (latitude == null || longitude == null || !name) return []
      return [{
        externalStoreId: `osm:${element.type}:${element.id}`,
        name,
        latitude,
        longitude,
        distanceMeters: locationService.distanceMeters(position, { latitude, longitude }),
      }]
    }).sort((a, b) => a.distanceMeters - b.distanceMeters)
  },
}
