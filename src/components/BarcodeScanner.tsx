import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { BrowserMultiFormatOneDReader, type IScannerControls } from '@zxing/browser'

interface Props {
  onDetected: (code: string) => void
  onClose: () => void
}

const cameraError = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'カメラが許可されていません。Chromeのサイト設定からカメラを許可してください。'
  if (error instanceof DOMException && error.name === 'NotFoundError') return '利用できるカメラが見つかりませんでした。'
  return 'カメラを開始できませんでした。画像からの読取または手入力をお試しください。'
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState('')
  const [readingImage, setReadingImage] = useState(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatOneDReader()
    let active = true
    void reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      videoRef.current ?? undefined,
      (result, _error, controls) => {
        if (!active || !result) return
        controls.stop()
        onDetected(result.getText())
      },
    ).then(controls => { if (active) controlsRef.current = controls; else controls.stop() })
      .catch(errorValue => { if (active) setError(cameraError(errorValue)) })

    return () => { active = false; controlsRef.current?.stop() }
  }, [onDetected])

  const readImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    try {
      setReadingImage(true)
      setError('')
      const result = await new BrowserMultiFormatOneDReader().decodeFromImageUrl(url)
      controlsRef.current?.stop()
      onDetected(result.getText())
    } catch {
      setError('画像からバーコードを読み取れませんでした。バーコードを大きく、正面から撮影した画像をお試しください。')
    } finally {
      URL.revokeObjectURL(url)
      setReadingImage(false)
    }
  }

  return <div className="scanner-overlay" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
    <div className="scanner-panel">
      <div className="scanner-heading"><div><p>JAN CODE</p><h2 id="scanner-title">バーコードを読み取る</h2></div><button type="button" onClick={onClose} aria-label="読取画面を閉じる">×</button></div>
      <div className="scanner-preview"><video ref={videoRef} muted playsInline /><div aria-hidden="true" /></div>
      <p className="scanner-guide">バーコード全体を中央の枠内へ合わせてください。</p>
      {error && <p className="feedback error-message" role="alert">{error}</p>}
      <label className="scanner-file-button">{readingImage ? '画像を解析中…' : 'バーコード画像から読み取る'}<input type="file" accept="image/*" disabled={readingImage} onChange={event => void readImage(event)} /></label>
      <button className="scanner-cancel" type="button" onClick={onClose}>キャンセル</button>
    </div>
  </div>
}
