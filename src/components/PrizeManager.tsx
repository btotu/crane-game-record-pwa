import { lazy, Suspense, useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Store } from '../models/store'
import { prizeCategories, type Prize, type PrizeCategory } from '../models/prize'
import { prizeService } from '../services/prizeService'
import { imageService } from '../services/imageService'
import { todayKey } from '../services/playService'
import { yahooProductService, type ProductCandidate } from '../services/yahooProductService'

const BarcodeScanner = lazy(() => import('./BarcodeScanner').then(module => ({ default: module.BarcodeScanner })))

interface Props { store: Store; onBack: () => void; onSelectPrize: (prize: Prize) => void }
const errorText = (error: unknown) => error instanceof Error ? error.message : '処理に失敗しました。'

export function PrizeManager({ store, onBack, onSelectPrize }: Props) {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PrizeCategory>('食品')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [editing, setEditing] = useState<Prize | null>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [janCode, setJanCode] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [referenceName, setReferenceName] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [priceCheckedAt, setPriceCheckedAt] = useState(todayKey())
  const [productCandidates, setProductCandidates] = useState<ProductCandidate[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)

  const reload = async () => setPrizes(await prizeService.list())
  useEffect(() => { void prizeService.list().then(setPrizes).catch((e: unknown) => setError(errorText(e))) }, [])
  const reset = () => { setName(''); setCategory('食品'); setPrice(''); setQuantity('1'); setEditing(null); setImageDataUrl(null); setJanCode(''); setReferenceName(''); setReferenceUrl(''); setPriceCheckedAt(todayKey()); setProductCandidates([]) }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    try {
      const unitPrice = Number(price || 0)
      const itemQuantity = Number(quantity)
      const input = { name, category, unitPrice, quantity: itemQuantity, estimatedPrice: unitPrice * itemQuantity, imageDataUrl, janCode, priceReferenceName: referenceName, priceReferenceUrl: referenceUrl, priceCheckedAt }
      if (editing) await prizeService.update(editing.id, input); else await prizeService.create(input)
      setFeedback(editing ? '景品を変更しました。' : '景品を登録しました。'); reset(); await reload()
    } catch (e) { setError(errorText(e)) }
  }
  const startEdit = (prize: Prize) => { const savedQuantity = prize.quantity ?? 1; setEditing(prize); setName(prize.name); setCategory(prize.category); setPrice(String(prize.unitPrice ?? Math.round(prize.estimatedPrice / savedQuantity))); setQuantity(String(savedQuantity)); setImageDataUrl(prize.imageDataUrl ?? null); setJanCode(prize.janCode ?? ''); setReferenceName(prize.priceReferenceName ?? ''); setReferenceUrl(prize.priceReferenceUrl ?? ''); setPriceCheckedAt(prize.priceCheckedAt ?? todayKey()); setProductCandidates([]); setFeedback('') }
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
    setProductCandidates([])
    setScannerOpen(false)
    setError('')
    setFeedback(`バーコード「${code}」を読み取りました。`)
  }, [])
  const searchProducts = async () => {
    try {
      setIsSearchingProducts(true); setError(''); setFeedback('')
      const candidates = await yahooProductService.searchByJan(janCode)
      setProductCandidates(candidates)
      if (candidates.length === 0) setFeedback('このJANコードの商品はYahoo!ショッピングで見つかりませんでした。手入力はそのまま利用できます。')
    } catch (searchError) { setProductCandidates([]); setError(errorText(searchError)) }
    finally { setIsSearchingProducts(false) }
  }
  const applyProduct = (candidate: ProductCandidate) => {
    setName(candidate.name); setPrice(String(candidate.price)); setReferenceName(`Yahoo!ショッピング / ${candidate.sellerName}`); setReferenceUrl(candidate.url); setPriceCheckedAt(todayKey()); setProductCandidates([]); setError(''); setFeedback('商品候補を反映しました。内容を確認してから保存してください。')
  }

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
          <button className="product-search-button" type="button" disabled={isSearchingProducts || !/^(\d{8}|\d{13})$/.test(janCode)} onClick={() => void searchProducts()}>{isSearchingProducts ? 'Yahoo!ショッピングを検索中…' : 'JANコードから商品情報を検索'}</button>
          {productCandidates.length > 0 && <section className="product-candidates"><div><strong>商品候補</strong><span>{productCandidates.length}件</span></div><ul>{productCandidates.map((candidate,index) => <li key={`${candidate.url}-${index}`}><div><strong>{candidate.name}</strong><span>{candidate.sellerName}</span><b>{candidate.price.toLocaleString()}円</b></div><button type="button" onClick={() => applyProduct(candidate)}>この候補を反映</button></li>)}</ul><p>商品情報提供：Yahoo!ショッピング</p></section>}
          <div className="form-row"><div><label htmlFor="category">カテゴリ</label><select id="category" value={category} onChange={e => setCategory(e.target.value as PrizeCategory)}>{prizeCategories.map(item => <option key={item}>{item}</option>)}</select></div>
          <div><label htmlFor="price">1個あたりの参考価格（円）</label><input id="price" type="number" inputMode="numeric" min="0" max="1000000" step="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" /></div></div>
          <div className="quantity-price-row"><label htmlFor="quantity">セット数量</label><input id="quantity" type="number" inputMode="numeric" min="1" max="100" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} /><p><span>合計参考価格</span><strong>{(Number(price || 0) * Number(quantity || 0)).toLocaleString()}円</strong><small>単価 {Number(price || 0).toLocaleString()}円 × {Number(quantity || 0)}個</small></p></div>
          <fieldset className="price-reference-fields"><legend>価格の参考情報（任意）</legend><label htmlFor="reference-name">参考サイト・店舗名</label><input id="reference-name" value={referenceName} onChange={e => setReferenceName(e.target.value)} maxLength={80} placeholder="例：メーカー希望小売価格、○○ストア" /><label htmlFor="reference-url">参考URL</label><input id="reference-url" type="url" inputMode="url" value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)} placeholder="https://..." /><label htmlFor="price-checked-at">価格確認日</label><input id="price-checked-at" type="date" max={todayKey()} value={priceCheckedAt} onChange={e => setPriceCheckedAt(e.target.value)} /></fieldset>
          <div className="form-actions">{editing && <button className="secondary-button" type="button" onClick={reset}>キャンセル</button>}<button className="save-button" type="submit" disabled={isProcessingImage}>{editing ? '変更を保存' : '景品を登録'}</button></div>
        </form>
      </section>
      {error && <p className="feedback error-message" role="alert">{error}</p>}{feedback && <p className="feedback success-message" role="status">{feedback}</p>}
      <section className="store-list-section"><div className="list-heading"><div><h2>登録済み景品</h2><p>すべての店舗で再利用できます</p></div><span>{prizes.length}件</span></div>
        {prizes.length === 0 ? <p className="list-empty">登録済み景品はありません。</p> : <ul className="prize-list">{prizes.map(prize => <li key={prize.id}><button className="prize-select" type="button" onClick={()=>onSelectPrize(prize)}>{prize.imageDataUrl ? <img className="prize-list-photo" src={prize.imageDataUrl} alt="" /> : <div className="prize-photo-placeholder" aria-hidden="true">景</div>}<div className="prize-info"><strong>{prize.name}</strong><span>{prize.category}・参考価格 {prize.estimatedPrice.toLocaleString()}円{(prize.quantity ?? 1) > 1 ? `（${(prize.unitPrice ?? 0).toLocaleString()}円×${prize.quantity}個）` : ''}{prize.priceReferenceName ? `・${prize.priceReferenceName}` : ''}</span></div><span aria-hidden="true">›</span></button><div className="store-actions"><button type="button" onClick={() => startEdit(prize)}>編集</button><button className="delete-button" type="button" onClick={() => void remove(prize)}>削除</button></div></li>)}</ul>}
      </section>
    </main>
    {scannerOpen && <Suspense fallback={<div className="scanner-overlay"><div className="scanner-panel"><p className="list-empty">読取機能を準備しています…</p></div></div>}><BarcodeScanner onDetected={barcodeDetected} onClose={() => setScannerOpen(false)} /></Suspense>}
  </div>
}
