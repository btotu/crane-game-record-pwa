const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_WIDTH = 1200
const MAX_HEIGHT = 800

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image()
  const url = URL.createObjectURL(file)
  image.onload = () => {
    URL.revokeObjectURL(url)
    resolve(image)
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    reject(new Error('この画像を読み込めませんでした。別の画像形式をお試しください。'))
  }
  image.src = url
})

export const imageService = {
  async compressStoreImage(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選択してください。')
    if (file.size > MAX_FILE_BYTES) throw new Error('画像は20MB以下のものを選択してください。')

    const image = await loadImage(file)
    const scale = Math.min(1, MAX_WIDTH / image.naturalWidth, MAX_HEIGHT / image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('画像を処理できませんでした。')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.78)
  },
}
