import { ProductSearch } from './ProductSearch'
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Store } from '../models/store'
import { priceBasisOptions, prizeCategories, type PriceBasis, type Prize, type PrizeCategory } from '../models/prize'
import { prizeService } from '../services/prizeService'
import { imageService } from '../services/imageService'
import { todayKey } from '../services/playService'
import type { PlayRecord } from '../models/play'
import { playRepository } from '../repositories/playRepository'

const BarcodeScanner = lazy(() => import('./BarcodeScanner').then(module => ({ default: module.BarcodeScanner })))

interface Props { store?: Store; onBack: () => void; onSelectPrize?: (prize: Prize) => void; mode?: 'select' | 'manage' }
const errorText = (error: unknown) => error instanceof Error ? error.message : '処理に失敗しました。'
const normalizeName = (value: string) => value.trim().replace(/[\s　]+/g, '').toLocaleLowerCase('ja-JP')

export function PrizeManager({ store, onBack, onSelectPrize, mode = 'select' }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'すべて' | PrizeCategory>('すべて')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PrizeCategory>('食品')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [priceSource, setPriceSource] = useState<'user' | 'yahoo'>('user')
  const [userEditedPrice, setUserEditedPrice] = useState(true)
  const [priceBasis, setPriceBasis] = useState<PriceBasis>('市販商品価格')
  const [manufacturer, setManufacturer] = useState('')
  const [contentDescription, setContentDescription] = useState('')
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
  const [plays, setPlays] = useState<PlayRecord[]>([])
  const [quickMode, setQuickMode] = useState<'recent' | 'frequent'>('recent')
  const saveLock = useRef(false)

  const managementMode = mode === 'manage'
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('ja-JP')
  const availablePrizes=managementMode?prizes:prizes.filter(prize=>!prize.isArchived)
  const filteredPrizes = availablePrizes.filter(prize => {
    const categoryMatches = categoryFilter === 'すべて' || prize.category === categoryFilter
    const searchTarget = [prize.name, prize.manufacturer, prize.contentDescription, prize.janCode]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('ja-JP')
    return categoryMatches && (!normalizedQuery || searchTarget.includes(normalizedQuery))
  })
  const filterActive = normalizedQuery.length > 0 || categoryFilter !== 'すべて'
  const normalizedPrizeName = normalizeName(name)
  const similarNamePrizes = normalizedPrizeName.length >= 2
    ? prizes.filter(prize => prize.id !== editing?.id && normalizeName(prize.name).includes(normalizedPrizeName)).slice(0, 5)
    : []
  const exactNameMatch = similarNamePrizes.some(prize => normalizeName(prize.name) === normalizedPrizeName)
  const duplicateJanPrize = janCode.length >= 8 ? prizes.find(prize => prize.id !== editing?.id && prize.janCode === janCode) : undefined
  const storePlays = store ? plays.filter(play => play.storeId === store.id) : plays
  const rankingSource = storePlays.length > 0 ? storePlays : plays
  const prizeMap = new Map(availablePrizes.map(prize => [prize.id, prize]))
  const recentPrizes = [...rankingSource].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).reduce<Prize[]>((items, play) => {
    const prize = prizeMap.get(play.prizeId)
    if (prize && !items.some(item => item.id === prize.id) && items.length < 4) items.push(prize)
    return items
  }, [])
  const playCounts = rankingSource.reduce((counts, play) => counts.set(play.prizeId, (counts.get(play.prizeId) ?? 0) + 1), new Map<string, number>())
  const frequentPrizes = [...playCounts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => prizeMap.get(id)).filter((prize): prize is Prize => Boolean(prize)).slice(0, 4)
  const quickPrizes = quickMode === 'recent' ? recentPrizes : frequentPrizes

  const reload = async () => setPrizes(await prizeService.list())
  useEffect(() => { void Promise.all([prizeService.list(), playRepository.getAll()]).then(([savedPrizes, savedPlays]) => { setPrizes(savedPrizes); setPlays(savedPlays) }).catch((e: unknown) => setError(errorText(e))) }, [])
  const reset = () => { setName(''); setCategory('食品'); setPrice(''); setQuantity('1'); setPriceSource('user'); setUserEditedPrice(true); setPriceBasis('市販商品価格'); setManufacturer(''); setContentDescription(''); setEditing(null); setImageDataUrl(null); setJanCode(''); setReferenceName(''); setReferenceUrl(''); setPriceCheckedAt(todayKey()) }
  const formDirty = editing ? (() => {
    const savedQuantity = editing.quantity ?? 1
    return name !== editing.name || category !== editing.category || price !== String(editing.unitPrice ?? Math.round(editing.estimatedPrice / savedQuantity)) || quantity !== String(savedQuantity) || manufacturer !== (editing.manufacturer ?? '') || contentDescription !== (editing.contentDescription ?? '') || imageDataUrl !== (editing.imageDataUrl ?? null) || janCode !== (editing.janCode ?? '') || priceBasis !== (editing.priceBasis ?? (editing.category === 'フィギュア' || editing.category === 'ぬいぐるみ' ? 'プライズ品の市場相場' : 'その他の手入力')) || referenceName !== (editing.priceReferenceName ?? '') || referenceUrl !== (editing.priceReferenceUrl ?? '') || priceCheckedAt !== (editing.priceCheckedAt ?? todayKey())
  })() : Boolean(name || price || manufacturer || contentDescription || imageDataUrl || janCode || referenceName || referenceUrl || category !== '食品' || quantity !== '1' || priceBasis !== '市販商品価格')
  const closeForm = () => {
    if (formDirty && !confirm('入力中の景品情報を破棄して、景品選択画面へ戻りますか？')) return
    reset(); setFormOpen(false); setError(''); setFeedback(''); window.scrollTo(0, 0)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saveLock.current) return
    const duplicateReasons = [exactNameMatch ? '同じ景品名' : '', duplicateJanPrize ? `同じJANコード（${duplicateJanPrize.name}）` : ''].filter(Boolean)
    if (duplicateReasons.length > 0 && !confirm(`${duplicateReasons.join('と')}が登録済みです。それでも別の景品として保存しますか？`)) return
    saveLock.current = true; setSaving(true); setError('')
    try {
      const unitPrice = Number(price || 0)
      const itemQuantity = Number(quantity)
      const input = { name, category, unitPrice, quantity: itemQuantity, estimatedPrice: unitPrice * itemQuantity, priceSource, userEditedPrice, priceBasis, manufacturer, contentDescription, imageDataUrl, janCode, priceReferenceName: referenceName, priceReferenceUrl: referenceUrl, priceCheckedAt }
      if (editing) await prizeService.update(editing.id, input); else await prizeService.create(input)
      setFeedback(editing ? '景品を変更しました。' : '景品を登録しました。'); reset(); await reload(); setFormOpen(false); window.scrollTo(0, 0)
    } catch (e) { setError(errorText(e)) } finally { saveLock.current = false; setSaving(false) }
  }
  const startEdit = (prize: Prize) => { setFormOpen(true); setError(''); window.scrollTo(0, 0); const savedQuantity = prize.quantity ?? 1; setEditing(prize); setName(prize.name); setCategory(prize.category); setPrice(String(prize.unitPrice ?? Math.round(prize.estimatedPrice / savedQuantity))); setQuantity(String(savedQuantity)); setPriceSource(prize.priceSource ?? 'user'); setUserEditedPrice(prize.userEditedPrice ?? true); setPriceBasis(prize.priceBasis ?? (prize.category === 'フィギュア' || prize.category === 'ぬいぐるみ' ? 'プライズ品の市場相場' : 'その他の手入力')); setManufacturer(prize.manufacturer ?? ''); setContentDescription(prize.contentDescription ?? ''); setImageDataUrl(prize.imageDataUrl ?? null); setJanCode(prize.janCode ?? ''); setReferenceName(prize.priceReferenceName ?? ''); setReferenceUrl(prize.priceReferenceUrl ?? ''); setPriceCheckedAt(prize.priceCheckedAt ?? todayKey()); setFeedback('') }
  const remove = async (prize: Prize) => { if (!confirm(`「${prize.name}」を削除しますか？`)) return; try { setError(''); await prizeService.remove(prize.id); if (editing?.id === prize.id) reset(); setFeedback('景品を削除しました。'); await reload() } catch (e) { setFeedback(''); setError(errorText(e)) } }
  const toggleArchived=async(prize:Prize)=>{try{setError('');await prizeService.setArchived(prize.id,!prize.isArchived);setFeedback(prize.isArchived?'景品を利用中に戻しました。':'景品を利用停止にしました。過去の履歴は残ります。');await reload()}catch(e){setFeedback('');setError(errorText(e))}}
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
    <header className="page-header"><button className="back-button" type="button" onClick={() => { if (formOpen) closeForm(); else onBack() }}>‹</button><div><p className="app-eyebrow">{managementMode ? 'PRIZE SETTINGS' : 'PRIZE SETUP'}</p><h1>{formOpen ? editing ? '景品を編集' : '景品を新規登録' : managementMode ? '景品の登録・編集' : '景品を選択'}</h1></div></header>
    <main className="store-main">
      {store && <p className="selected-store">プレイ店舗 <strong>{store.name}</strong></p>}
      {formOpen && <section className="form-card"><div className="section-heading"><span className="section-number">02</span><div><h2>{editing ? '景品を編集' : '景品を手動登録'}</h2><p>代表写真を1枚保存できます</p></div></div>
        <form onSubmit={submit} className="prize-form">
          <label htmlFor="prize-name">景品名</label><input id="prize-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="例：ポテトチップス 4袋セット" autoComplete="off" />
          {similarNamePrizes.length > 0 && <aside className={`prize-name-suggestions ${exactNameMatch ? 'exact-match' : ''}`} aria-live="polite"><strong>{exactNameMatch ? '同じ名前の景品が登録されています' : '似た名前の登録済み景品'}</strong><ul>{similarNamePrizes.map(prize => <li key={prize.id}><span>{prize.name}</span><small>{prize.category}{prize.manufacturer ? `・${prize.manufacturer}` : ''}</small></li>)}</ul><p>{exactNameMatch ? '同じ景品であれば新規登録せず、一覧から既存の景品を利用できます。' : '入力を続けて一致しなくなると、この候補は消えます。'}</p></aside>}
          <div className="form-row"><div><label htmlFor="manufacturer">メーカー名（任意）</label><input id="manufacturer" value={manufacturer} onChange={e => setManufacturer(e.target.value)} maxLength={80} placeholder="例：カルビー" /></div><div><label htmlFor="content-description">内容量・サイズ（任意）</label><input id="content-description" value={contentDescription} onChange={e => setContentDescription(e.target.value)} maxLength={80} placeholder="例：60g、約20cm" /></div></div>
          <div className="prize-image-editor">{imageDataUrl ? <img src={imageDataUrl} alt="保存予定の景品写真" /> : <div aria-hidden="true">景品写真なし</div>}<label className="image-select-button">{isProcessingImage ? '画像を処理中…' : '写真を撮影・選択'}<input type="file" accept="image/*" disabled={isProcessingImage} onChange={event => void selectImage(event)} /></label></div>
          {imageDataUrl && <button className="remove-image-button" type="button" onClick={() => setImageDataUrl(null)}>この景品写真を削除</button>}
          <label htmlFor="jan-code">JANコード（任意）</label><div className="barcode-input-row"><input id="jan-code" type="text" inputMode="numeric" value={janCode} onChange={e => setJanCode(e.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="8桁または13桁" /><button type="button" onClick={() => setScannerOpen(true)}>カメラで読取</button></div>
          {duplicateJanPrize && <aside className="prize-name-suggestions exact-match" aria-live="polite"><strong>同じJANコードの景品が登録されています</strong><ul><li><span>{duplicateJanPrize.name}</span><small>{duplicateJanPrize.category}{duplicateJanPrize.manufacturer ? `・${duplicateJanPrize.manufacturer}` : ''}</small></li></ul><p>同じ商品であれば、新規登録せず既存の景品を利用できます。</p></aside>}
          <ProductSearch jan={janCode} name={name} onSelect={p=>{setName(p.name.slice(0,100));setPrice(String(p.price));setQuantity('1');setPriceSource('yahoo');setUserEditedPrice(false);setReferenceName(p.sellerName.slice(0,80));setReferenceUrl(p.url);setPriceCheckedAt(todayKey());setJanCode(p.janCode||'');setPriceBasis('市販商品価格')}}/>
          <div className="form-row"><div><label htmlFor="category">カテゴリ</label><select id="category" value={category} onChange={e => { const next = e.target.value as PrizeCategory; setCategory(next); setPriceBasis(next === 'フィギュア' || next === 'ぬいぐるみ' ? 'プライズ品の市場相場' : next === 'その他' ? 'その他の手入力' : '市販商品価格') }}>{prizeCategories.map(item => <option key={item}>{item}</option>)}</select></div>
          <div><label htmlFor="price">1個あたりの参考価格（円）</label><input id="price" type="number" inputMode="numeric" min="0" max="1000000" step="1" value={price} onChange={e => { setPrice(e.target.value); setPriceSource('user'); setUserEditedPrice(true) }} placeholder="0" /></div></div>
          <p className={`price-origin ${userEditedPrice ? 'edited' : 'automatic'}`}>{userEditedPrice ? 'ユーザー編集価格' : 'Yahoo!ショッピング取得価格'}</p>
          <label htmlFor="price-basis">価格の評価方法</label><select id="price-basis" value={priceBasis} onChange={e => setPriceBasis(e.target.value as PriceBasis)}>{priceBasisOptions.map(item => <option key={item}>{item}</option>)}</select>
          {priceBasis === 'プライズ品の市場相場' && <p className="market-price-note">販売価格や買取価格は変動するため、確認時点の参考値として記録します。</p>}
          <div className="quantity-price-row"><label htmlFor="quantity">セット数量</label><input id="quantity" type="number" inputMode="numeric" min="1" max="100" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} /><p><span>合計参考価格</span><strong>{(Number(price || 0) * Number(quantity || 0)).toLocaleString()}円</strong><small>単価 {Number(price || 0).toLocaleString()}円 × {Number(quantity || 0)}個</small></p></div>
          <fieldset className="price-reference-fields"><legend>価格の参考情報（任意）</legend><label htmlFor="reference-name">参考サイト・店舗名</label><input id="reference-name" value={referenceName} onChange={e => setReferenceName(e.target.value)} maxLength={80} placeholder="例：メーカー希望小売価格、○○ストア" /><label htmlFor="reference-url">参考URL</label><input id="reference-url" type="url" inputMode="url" value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)} placeholder="https://..." /><label htmlFor="price-checked-at">価格確認日</label><input id="price-checked-at" type="date" max={todayKey()} value={priceCheckedAt} onChange={e => setPriceCheckedAt(e.target.value)} /></fieldset>
          <div className="form-actions"><button className="secondary-button" type="button" disabled={saving} onClick={closeForm}>景品選択へ戻る</button><button className="save-button" type="submit" disabled={isProcessingImage || saving}>{editing ? '変更を保存' : '景品を登録'}</button></div>
        </form>
      </section>}
      {error && <p className="feedback error-message" role="alert">{error}</p>}{feedback && <p className="feedback success-message" role="status">{feedback}</p>}
      {!formOpen && <><p>{managementMode ? '登録済み景品の確認、追加、編集、削除ができます。' : 'プレイする景品を選んで、使用額と結果の入力へ進んでください。'}</p>
      {!managementMode && rankingSource.length > 0 && <section className="quick-prize-panel"><div className="quick-prize-heading"><div><strong>すぐ選べる景品</strong><small>{storePlays.length > 0 ? `${store?.name}での記録` : 'すべての店舗での記録'}</small></div><div role="group" aria-label="景品の表示順"><button className={quickMode === 'recent' ? 'active' : ''} type="button" onClick={() => setQuickMode('recent')}>最近</button><button className={quickMode === 'frequent' ? 'active' : ''} type="button" onClick={() => setQuickMode('frequent')}>よく使う</button></div></div><div className="quick-prize-list">{quickPrizes.map(prize => <button key={prize.id} type="button" onClick={() => onSelectPrize?.(prize)}>{prize.imageDataUrl ? <img src={prize.imageDataUrl} alt="" /> : <span aria-hidden="true">景</span>}<strong>{prize.name}</strong>{quickMode === 'frequent' && <small>{playCounts.get(prize.id)}回</small>}</button>)}</div></section>}
      <button className="primary-wide-button" type="button" onClick={() => { reset(); setError(''); setFeedback(''); setFormOpen(true); window.scrollTo(0, 0) }}>＋ 景品を新規登録</button>
      <section className="prize-filter-panel" aria-label="景品の絞り込み">
        <label htmlFor="prize-search">景品を検索</label>
        <input id="prize-search" type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="景品名・メーカー名で検索" />
        <label htmlFor="prize-category-filter">カテゴリ</label>
        <select id="prize-category-filter" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as 'すべて' | PrizeCategory)}><option value="すべて">すべてのカテゴリ</option>{prizeCategories.map(item => <option key={item} value={item}>{item}</option>)}</select>
        {filterActive && <button type="button" onClick={() => { setSearchQuery(''); setCategoryFilter('すべて') }}>絞り込みを解除</button>}
      </section>
      <section className="store-list-section"><div className="list-heading"><div><h2>登録済み景品</h2><p>{managementMode?'利用停止しても過去の履歴は残ります':'すべての店舗で再利用できます'}</p></div><span>{filterActive ? `${filteredPrizes.length} / ${availablePrizes.length}件` : `${availablePrizes.length}件`}</span></div>
        {availablePrizes.length === 0 ? <p className="list-empty">{managementMode?'登録済み景品はありません。':'利用できる景品がありません。設定から利用再開できます。'}</p> : filteredPrizes.length === 0 ? <p className="list-empty">条件に一致する景品はありません。検索語やカテゴリを変更してください。</p> : <ul className="prize-list">{filteredPrizes.map(prize => <li className={prize.isArchived?'archived-item':''} key={prize.id}><button className="prize-select" type="button" onClick={() => managementMode ? startEdit(prize) : onSelectPrize?.(prize)}>{prize.imageDataUrl ? <img className="prize-list-photo" src={prize.imageDataUrl} alt="" /> : <div className="prize-photo-placeholder" aria-hidden="true">景</div>}<div className="prize-info"><strong>{prize.name}{prize.isArchived&&<small className="archive-badge">利用停止中</small>}</strong>{(prize.manufacturer || prize.contentDescription) && <small className="prize-product-meta">{[prize.manufacturer, prize.contentDescription].filter(Boolean).join(' ・ ')}</small>}<span>{prize.category}・参考価格 {prize.estimatedPrice.toLocaleString()}円{(prize.quantity ?? 1) > 1 ? `（${(prize.unitPrice ?? 0).toLocaleString()}円×${prize.quantity}個）` : ''}{prize.priceReferenceName ? `・${prize.priceReferenceName}` : ''}</span><small className="price-basis-label">{prize.priceBasis ?? (prize.category === 'フィギュア' || prize.category === 'ぬいぐるみ' ? 'プライズ品の市場相場' : 'その他の手入力')}</small><em className={`price-origin-badge ${(prize.userEditedPrice ?? true) ? 'edited' : 'automatic'}`}>{(prize.userEditedPrice ?? true) ? 'ユーザー編集価格' : '自動取得価格'}</em></div><span aria-hidden="true">›</span></button><div className="store-actions">{!managementMode&&<button type="button" onClick={() => startEdit(prize)}>編集</button>}{managementMode&&<button type="button" onClick={()=>void toggleArchived(prize)}>{prize.isArchived?'利用再開':'利用停止'}</button>}<button className="delete-button" type="button" onClick={() => void remove(prize)}>削除</button></div></li>)}</ul>}
      </section></>}
    </main>
    {scannerOpen && <Suspense fallback={<div className="scanner-overlay"><div className="scanner-panel"><p className="list-empty">読取機能を準備しています…</p></div></div>}><BarcodeScanner onDetected={barcodeDetected} onClose={() => setScannerOpen(false)} /></Suspense>}
  </div>
}
