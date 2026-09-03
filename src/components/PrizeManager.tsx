import { lazy, Suspense, useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Store } from '../models/store'
import { prizeCategories, type Prize, type PrizeCategory } from '../models/prize'
import { prizeService } from '../services/prizeService'
import { imageService } from '../services/imageService'

const BarcodeScanner = lazy(() => import('./BarcodeScanner').then(module => ({ default: module.BarcodeScanner })))

interface Props { store: Store; onBack: () => void; onSelectPrize: (prize: Prize) => void }
const errorText = (error: unknown) => error instanceof Error ? error.message : '処理に失敗しました。'

export function PrizeManager({ store, onBack, onSelectPrize }: Props) {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PrizeCategory>('食品')
  const [price, setPrice] = useState('')
  const [editing, setEditing] = useState<Prize | null>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [janCode, setJanCode] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  const reload = async () => setPrizes(await prizeService.list())
  useEffect(() => { void prizeService.list().then(setPrizes).catch((e: unknown) => setError(errorText(e))) }, [])
  const reset = () => { setName(''); setCategory('食品'); setPrice(''); setEditing(null); setImageDataUrl(null); setJanCode('') }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    try {
      const input = { name, category, estimatedPrice: Number(price || 0), imageDataUrl, janCode }
      if (editing) await prizeService.update(editing.id, input); else await prizeService.create(input)
      setFeedback(editing ? '景品を変更しました。' : '景品を登録しました。'); reset(); await reload()
    } catch (e) { setError(errorText(e)) }
  }
  const startEdit = (prize: Prize) => { setEditing(prize); setName(prize.name); setCategory(prize.category); setPrice(String(prize.estimatedPrice)); setImageDataUrl(prize.imageDataUrl ?? null); setJanCode(prize.janCode ?? ''); setFeedback('') }
  const remove = async (prize: Prize) => { if (!confirm(`「${prize.name}」を削除しますか？`)) return; await prizeService.remove(prize.id); if (editing?.id === prize.id) reset(); setFeedback('景品を削除しました。'); await reload() }
  const selectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    try { setIsProcessingImage(true); setError(''); setImageDataUrl(await imageService.compressPrizeImage(file)); setFeedback('写真を準備しました。保存ボタンを押すと登録されます。') }
    catch (e) { setError(errorText(e)) }
    finally { setIsProcessingImage(false) }
  }
  const barcodeDetected = useCallback((rawCode: string) => {
    const code = rawCode.replace(/\D/g, '')
    setJanCode(code)
    setScannerOpen(false)
    setError('')
    setFeedback(`バーコード「${code}」を読み取りました。`)
  }, [])

  return <div className="app-shell">
    <header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PRIZE SETUP</p><h1>景品の登録</h1></div></header>
    <main className="store-main">
      <p className="selected-store">プレイ店舗 <strong>{store.name}</strong></p>
      <section className="form-card"><div className="section-heading"><span className="section-number">02</span><div><h2>{editing ? '景品を編集' : '景品を手動登録'}</h2><p>代表写真を1枚保存できます</p></div></div>
        <form onSubmit={submit} className="prize-form">
          <label htmlFor="prize-name">景品名</label><input id="prize-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="例：ポテトチップス 4袋セット" />
          <div className="prize-image-editor">{imageDataUrl ? <img src={imageDataUrl} alt="保存予定の景品写真" /> : <div aria-hidden="true">景品写真なし</div>}<label className="image-select-button">{isProcessingImage ? '画像を処理中…' : '写真を撮影・選択'}<input type="file" accept="image/*" disabled={isProcessingImage} onChange={event => void selectImage(event)} /></label></div>
          {imageDataUrl && <button className="remove-image-button" type="button" onClick={() => setImageDataUrl(null)}>この景品写真を削除</button>}
          <label htmlFor="jan-code">JANコード（任意）</label><div className="barcode-input-row"><input id="jan-code" type="text" inputMode="numeric" value={janCode} onChange={e => setJanCode(e.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="8桁または13桁" /><button type="button" onClick={() => setScannerOpen(true)}>カメラで読取</button></div>
          <div className="form-row"><div><label htmlFor="category">カテゴリ</label><select id="category" value={category} onChange={e => setCategory(e.target.value as PrizeCategory)}>{prizeCategories.map(item => <option key={item}>{item}</option>)}</select></div>
          <div><label htmlFor="price">参考価格（円）</label><input id="price" type="number" inputMode="numeric" min="0" max="1000000" step="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" /></div></div>
          <div className="form-actions">{editing && <button className="secondary-button" type="button" onClick={reset}>キャンセル</button>}<button className="save-button" type="submit" disabled={isProcessingImage}>{editing ? '変更を保存' : '景品を登録'}</button></div>
        </form>
      </section>
      {error && <p className="feedback error-message" role="alert">{error}</p>}{feedback && <p className="feedback success-message" role="status">{feedback}</p>}
      <section className="store-list-section"><div className="list-heading"><div><h2>登録済み景品</h2><p>すべての店舗で再利用できます</p></div><span>{prizes.length}件</span></div>
        {prizes.length === 0 ? <p className="list-empty">登録済みの景品はありません。</p> : <ul className="prize-list">{prizes.map(prize => <li key={prize.id}><button className="prize-select" type="button" onClick={()=>onSelectPrize(prize)}>{prize.imageDataUrl ? <img className="prize-list-photo" src={prize.imageDataUrl} alt="" /> : <div className="prize-photo-placeholder" aria-hidden="true">景</div>}<div className="prize-info"><strong>{prize.name}</strong><span>{prize.category}・参考価格 {prize.estimatedPrice.toLocaleString()}円</span></div><span aria-hidden="true">›</span></button><div className="store-actions"><button type="button" onClick={() => startEdit(prize)}>編集</button><button className="delete-button" type="button" onClick={() => void remove(prize)}>削除</button></div></li>)}</ul>}
      </section>
    </main>
    {scannerOpen && <Suspense fallback={<div className="scanner-overlay"><div className="scanner-panel"><p className="list-empty">読取機能を準備しています…</p></div></div>}><BarcodeScanner onDetected={barcodeDetected} onClose={() => setScannerOpen(false)} /></Suspense>}
  </div>
}
