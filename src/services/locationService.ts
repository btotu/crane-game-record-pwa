export interface CurrentPosition {
  latitude: number
  longitude: number
  accuracy: number
}

const errorMessage = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) return '位置情報が許可されていません。Chromeのサイト設定から位置情報を許可してください。'
  if (error.code === error.POSITION_UNAVAILABLE) return '現在地を取得できませんでした。GPSやWi-Fiの状態を確認してください。'
  if (error.code === error.TIMEOUT) return '現在地の取得が時間切れになりました。場所を変えてもう一度お試しください。'
  return '現在地を取得できませんでした。'
}

export const locationService = {
  getCurrent(): Promise<CurrentPosition> {
    if (!navigator.geolocation) return Promise.reject(new Error('このブラウザーは位置情報取得に対応していません。'))

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
        (error) => reject(new Error(errorMessage(error))),
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
      )
    })
  },

  distanceMeters(from: Pick<CurrentPosition, 'latitude' | 'longitude'>, to: Pick<CurrentPosition, 'latitude' | 'longitude'>): number {
    const radians = (degrees: number) => degrees * Math.PI / 180
    const latitudeDelta = radians(to.latitude - from.latitude)
    const longitudeDelta = radians(to.longitude - from.longitude)
    const a = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2
    return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  },
}
