import { StoreToday } from './components/StoreToday'
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Store } from './models/store'
import { storeService } from './services/storeService'
import { PrizeManager } from './components/PrizeManager'
import { PlayRecorder } from './components/PlayRecorder'
import type { Prize } from './models/prize'
import { HomeHistory } from './components/HomeHistory'
import { VisitDetail } from './components/VisitDetail'
import type { VisitSummary } from './models/visit'
import { HistoryList } from './components/HistoryList'
import { PrizeVisitDetail } from './components/PrizeVisitDetail'
import { StoreStats } from './components/StoreStats'
import { PrizeStats } from './components/PrizeStats'
import { MonthlyStats } from './components/MonthlyStats'
import { HomeMonthlyBudget } from './components/HomeMonthlyBudget'
import { HomeBackupReminder } from './components/HomeBackupReminder'
import { ApproximateEntry } from './components/ApproximateEntry'
import { BackupSettings } from './components/BackupSettings'
import { SettingsMenu } from './components/SettingsMenu'
import { locationService, type CurrentPosition } from './services/locationService'
import { imageService } from './services/imageService'
import { nearbyStoreService, type NearbyStoreCandidate } from './services/nearbyStoreService'
import { ProductApiSettings } from './components/ProductApiSettings'
import { PlayInputSettings } from './components/PlayInputSettings'
import { DeviceStatusSettings } from './components/DeviceStatusSettings'
import './App.css'

type Screen = 'store-today' | 'home' | 'stores' | 'select-store' | 'prizes' | 'prize-settings' | 'play' | 'visit-detail' | 'history-list' | 'prize-detail' | 'store-stats' | 'prize-stats' | 'monthly-stats' | 'approximate' | 'settings' | 'backup' | 'product-api-settings' | 'play-input-settings' | 'device-status-settings'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '処理中に問題が発生しました。'
const normalizeDuplicateName = (value: string) => value.trim().replace(/[\s　]+/g, '').toLocaleLowerCase('ja-JP')

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null)
  const [selectedVisit, setSelectedVisit] = useState<VisitSummary | null>(null)
  const [detailOrigin, setDetailOrigin] = useState<'home'|'history-list'>('home')
  const [selectedVisitPrizeId,setSelectedVisitPrizeId]=useState<string|null>(null)
  const [prizeDetailOrigin,setPrizeDetailOrigin]=useState<'visit-detail'|'store-today'>('visit-detail')
  const [playOrigin,setPlayOrigin]=useState<'prizes'|'prize-detail'|'store-today'>('prizes')
  const [storeOrigin,setStoreOrigin]=useState<'home'|'select-store'|'settings'>('home')
  const [backupOrigin,setBackupOrigin]=useState<'home'|'settings'>('settings')
  const [storeName, setStoreName] = useState('')
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [storePosition, setStorePosition] = useState<CurrentPosition | null>(null)
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [storeImageDataUrl, setStoreImageDataUrl] = useState<string | null>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [nearbyCandidates, setNearbyCandidates] = useState<NearbyStoreCandidate[]>([])
  const [isSearchingNearby, setIsSearchingNearby] = useState(false)

  const loadStores = useCallback(async () => {
    try {
      setStores(await storeService.list())
      setError('')
    } catch (loadError) {
      setError(`店舗を読み込めませんでした。${getErrorMessage(loadError)}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    void storeService
      .list()
      .then((savedStores) => {
        if (isActive) setStores(savedStores)
      })
      .catch((loadError: unknown) => {
        if (isActive) setError(`店舗を読み込めませんでした。${getErrorMessage(loadError)}`)
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const openStores = (origin:'home'|'select-store'|'settings'='home') => {
    setStoreOrigin(origin)
    setMessage('')
    setError('')
    setScreen('stores')
  }

  const openPlay = () => {
    setMessage('')
    setError('')
    if (stores.length === 0) setStoreOrigin('home')
    setScreen(stores.length === 0 ? 'stores' : 'select-store')
  }

  const resetForm = () => {
    setStoreName('')
    setEditingStore(null)
    setStorePosition(null)
    setStoreImageDataUrl(null)
  }

  const storeFormDirty = editingStore
    ? storeName !== editingStore.name || storeImageDataUrl !== (editingStore.imageDataUrl ?? null) || storePosition?.latitude !== editingStore.latitude || storePosition?.longitude !== editingStore.longitude
    : Boolean(storeName || storeImageDataUrl || storePosition)

  const leaveStoreSettings = () => {
    if (storeFormDirty && !window.confirm('入力中の店舗情報を破棄して戻りますか？')) return
    resetForm()
    setMessage('')
    setError('')
    setScreen(storeOrigin)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const duplicateStore = stores.find(store => store.id !== editingStore?.id && normalizeDuplicateName(store.name) === normalizeDuplicateName(storeName) && normalizeDuplicateName(storeName).length > 0)
    if (duplicateStore && !window.confirm(`同じ店舗名「${duplicateStore.name}」がすでに登録されています。別の店舗として保存しますか？`)) return
    try {
      setIsSaving(true)
      setError('')
      if (editingStore) {
        await storeService.update(editingStore.id, { name: storeName, latitude: storePosition?.latitude ?? null, longitude: storePosition?.longitude ?? null, imageDataUrl: storeImageDataUrl })
        setMessage('店舗名を変更しました。')
      } else {
        await storeService.create({ name: storeName, latitude: storePosition?.latitude, longitude: storePosition?.longitude, imageDataUrl: storeImageDataUrl })
        setMessage('店舗を登録しました。')
      }
      resetForm()
      await loadStores()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (store: Store) => {
    setEditingStore(store)
    setStoreName(store.name)
    setStorePosition(store.latitude != null && store.longitude != null ? { latitude: store.latitude, longitude: store.longitude, accuracy: 0 } : null)
    setStoreImageDataUrl(store.imageDataUrl ?? null)
    setMessage('')
    setError('')
  }

  const selectStoreImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setIsProcessingImage(true)
      setError('')
      setStoreImageDataUrl(await imageService.compressStoreImage(file))
      setMessage('画像を準備しました。「店舗を登録」または「変更を保存」で保存してください。')
    } catch (imageError) {
      setError(getErrorMessage(imageError))
    } finally {
      setIsProcessingImage(false)
    }
  }

  const locate = async (target: 'store' | 'selection') => {
    try {
      setIsLocating(true)
      setError('')
      const position = await locationService.getCurrent()
      if (target === 'store') {
        setStorePosition(position)
        setMessage(`現在地を取得しました（精度 約${Math.round(position.accuracy)}m）。店舗を保存すると位置情報も保存されます。`)
      } else {
        setCurrentPosition(position)
      }
    } catch (locationError) {
      setError(getErrorMessage(locationError))
    } finally {
      setIsLocating(false)
    }
  }

  const storesWithDistance = stores.map((store) => ({
    store,
    distance: currentPosition && store.latitude != null && store.longitude != null
      ? locationService.distanceMeters(currentPosition, { latitude: store.latitude, longitude: store.longitude })
      : null,
  })).sort((a, b) => {
    if (!currentPosition) {
      const aUsedAt = a.store.lastUsedAt ?? a.store.createdAt
      const bUsedAt = b.store.lastUsedAt ?? b.store.createdAt
      return bUsedAt.localeCompare(aUsedAt)
    }
    if (a.distance == null) return b.distance == null ? 0 : 1
    if (b.distance == null) return -1
    return a.distance - b.distance
  })

  const searchNearbyStores = async () => {
    try {
      setIsSearchingNearby(true)
      setError('')
      const position = await locationService.getCurrent()
      setCurrentPosition(position)
      const candidates = await nearbyStoreService.search(position)
      const registeredExternalIds = new Set(stores.map(store => store.externalStoreId).filter(Boolean))
      const registeredNames = new Set(stores.map(store => store.name.trim().toLocaleLowerCase('ja-JP')))
      const unregistered = candidates.filter(candidate => !registeredExternalIds.has(candidate.externalStoreId) && !registeredNames.has(candidate.name.trim().toLocaleLowerCase('ja-JP')))
      setNearbyCandidates(unregistered)
      setMessage(unregistered.length === 0 ? '周辺5kmに未登録の店舗候補は見つかりませんでした。必要な店舗は手動で登録できます。' : '')
    } catch (searchError) {
      setNearbyCandidates([])
      setError(getErrorMessage(searchError))
    } finally {
      setIsSearchingNearby(false)
    }
  }

  const selectNearbyStore = async (candidate: NearbyStoreCandidate) => {
    try {
      setIsSaving(true)
      setError('')
      const store = await storeService.create({ name: candidate.name, latitude: candidate.latitude, longitude: candidate.longitude, externalStoreId: candidate.externalStoreId })
      setStores(current => [store, ...current])
      setSelectedStore(store)
      setScreen('store-today')
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteStore = async (store: Store) => {
    if (!window.confirm(`「${store.name}」を削除しますか？`)) return
    try {
      setError('')
      await storeService.remove(store.id)
      if (editingStore?.id === store.id) resetForm()
      setMessage('店舗を削除しました。')
      await loadStores()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    }
  }

  if (screen === 'store-today' && selectedStore) return <StoreToday store={selectedStore} onAdd={() => setScreen('prizes')} onFinish={() => setScreen('home')} onSelect={(prize) => { setSelectedPrize(prize); setPlayOrigin('store-today'); setScreen('play') }} onOpenDetail={(visit,prizeId)=>{setSelectedVisit(visit);setSelectedVisitPrizeId(prizeId);setPrizeDetailOrigin('store-today');setScreen('prize-detail')}} />

  if (screen === 'play' && selectedStore && selectedPrize) {
    return <PlayRecorder store={selectedStore} prize={selectedPrize} onBack={() => setScreen(playOrigin)} onSaved={() => setScreen('store-today')} />
  }

  if (screen === 'visit-detail' && selectedVisit) {
    return <VisitDetail visit={selectedVisit} onBack={() => setScreen(detailOrigin)} onOpenPrize={(id)=>{setSelectedVisitPrizeId(id);setPrizeDetailOrigin('visit-detail');setScreen('prize-detail')}} />
  }

  if(screen==='prize-detail'&&selectedVisit&&selectedVisitPrizeId)return <PrizeVisitDetail visit={selectedVisit} prizeId={selectedVisitPrizeId} onBack={()=>setScreen(prizeDetailOrigin)} onAdd={(prize)=>{const store=stores.find(item=>item.id===selectedVisit.storeId);if(!store)return;setSelectedStore(store);setSelectedPrize(prize);setPlayOrigin('prize-detail');setScreen('play')}} />

  if (screen === 'history-list') return <HistoryList onBack={() => setScreen('home')} onOpen={(visit) => { setSelectedVisit(visit); setDetailOrigin('history-list'); setScreen('visit-detail') }} />
  if (screen === 'store-stats') return <StoreStats onBack={() => setScreen('home')} onOpenPrizes={() => setScreen('prize-stats')} onOpenMonthly={() => setScreen('monthly-stats')} />
  if (screen === 'prize-stats') return <PrizeStats onBack={() => setScreen('home')} onOpenStores={() => setScreen('store-stats')} onOpenMonthly={() => setScreen('monthly-stats')} />
  if (screen === 'monthly-stats') return <MonthlyStats onBack={() => setScreen('home')} onOpenStores={() => setScreen('store-stats')} onOpenPrizes={() => setScreen('prize-stats')} />
  if (screen === 'approximate') return <ApproximateEntry onBack={() => setScreen('home')} />
  if (screen === 'settings') return <SettingsMenu onBack={() => setScreen('home')} onStores={() => openStores('settings')} onPrizes={() => setScreen('prize-settings')} onPlayInput={() => setScreen('play-input-settings')} onDeviceStatus={() => setScreen('device-status-settings')} onProductApi={() => setScreen('product-api-settings')} onBackup={() => { setBackupOrigin('settings'); setScreen('backup') }} />
  if (screen === 'backup') return <BackupSettings onBack={() => setScreen(backupOrigin)} />
  if (screen === 'product-api-settings') return <ProductApiSettings onBack={() => setScreen('settings')} />
  if (screen === 'prize-settings') return <PrizeManager mode="manage" onBack={() => setScreen('settings')} />
  if (screen === 'play-input-settings') return <PlayInputSettings onBack={() => setScreen('settings')} />
  if (screen === 'device-status-settings') return <DeviceStatusSettings onBack={() => setScreen('settings')} />

  if (screen === 'prizes' && selectedStore) {
    return <PrizeManager store={selectedStore} onBack={() => setScreen('store-today')} onSelectPrize={(prize) => { setSelectedPrize(prize); setPlayOrigin('prizes'); setScreen('play') }} />
  }

  if (screen === 'select-store') {
    return (
      <div className="app-shell">
        <header className="page-header"><button className="back-button" type="button" onClick={() => setScreen('home')}>‹</button><div><p className="app-eyebrow">START PLAY</p><h1>店舗を選択</h1></div></header>
        <main className="store-main">
          <p className="step-description">今回プレイする店舗を選んでください。</p>
          <button className="location-wide-button" type="button" disabled={isLocating} onClick={() => void locate('selection')}>{isLocating ? '現在地を取得中…' : currentPosition ? '現在地を更新' : '現在地から近い店舗を表示'}</button>
          {currentPosition && <p className="location-status">位置情報を保存済みの店舗を、現在地から近い順に表示しています。</p>}
          {error && <p className="feedback error-message" role="alert">{error}</p>}
          {message && <p className="feedback success-message" role="status">{message}</p>}
          {stores.length > 0 && <div className="nearby-heading"><strong>登録済み店舗</strong><span>{currentPosition ? '近い順' : '最近利用した順'}</span></div>}
          <ul className="selection-list">
            {storesWithDistance.map(({store,distance}) => <li key={store.id}><button type="button" onClick={() => { setSelectedStore(store); setScreen('store-today') }}>{store.imageDataUrl ? <img className="store-list-photo" src={store.imageDataUrl} alt="" /> : <span className="store-avatar" aria-hidden="true">店</span>}<strong>{store.name}{distance != null && <small>{distance < 1000 ? `約${Math.round(distance / 10) * 10}m` : `約${(distance / 1000).toFixed(1)}km`}</small>}</strong><span aria-hidden="true">›</span></button></li>)}
          </ul>
          <section className="nearby-search-section">
            <button className="nearby-search-button" type="button" disabled={isSearchingNearby} onClick={() => void searchNearbyStores()}>{isSearchingNearby ? '周辺を検索中…' : '周辺5kmの未登録店舗を検索'}</button>
            {nearbyCandidates.length > 0 && <><div className="nearby-heading"><strong>周辺の店舗候補</strong><span>{nearbyCandidates.length}件</span></div><ul className="nearby-candidate-list">{nearbyCandidates.map(candidate => <li key={candidate.externalStoreId}><div><strong>{candidate.name}</strong><span>{candidate.distanceMeters < 1000 ? `約${Math.round(candidate.distanceMeters / 10) * 10}m` : `約${(candidate.distanceMeters / 1000).toFixed(1)}km`}</span></div><button type="button" disabled={isSaving} onClick={() => void selectNearbyStore(candidate)}>登録して選択</button></li>)}</ul></>}
            <p className="osm-attribution">候補データ © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></p>
          </section>
          <button className="secondary-wide-button" type="button" onClick={() => openStores('select-store')}>店舗を追加・編集</button>
        </main>
      </div>
    )
  }

  if (screen === 'stores') {
    return (
      <div className="app-shell">
        <header className="page-header">
          <button className="back-button" type="button" onClick={leaveStoreSettings} aria-label="前の画面へ戻る">‹</button>
          <div><p className="app-eyebrow">STORE SETTINGS</p><h1>店舗の登録</h1></div>
        </header>

        <main className="store-main">
          <section className="form-card" aria-labelledby="store-form-title">
            <div className="section-heading">
              <span className="section-number">01</span>
              <div><h2 id="store-form-title">{editingStore ? '店舗情報を編集' : '新しい店舗を登録'}</h2><p>店舗名と位置情報を端末に保存します</p></div>
            </div>
            <form onSubmit={handleSubmit}>
              <label htmlFor="store-name">店舗名</label>
              <input id="store-name" name="storeName" type="text" value={storeName} onChange={(event) => setStoreName(event.target.value)} maxLength={80} placeholder="例：GiGO ○○店" autoComplete="off" />
              {stores.some(store => store.id !== editingStore?.id && normalizeDuplicateName(store.name) === normalizeDuplicateName(storeName) && normalizeDuplicateName(storeName).length > 0) && <aside className="duplicate-store-warning" aria-live="polite"><strong>同じ名前の店舗が登録されています</strong><span>既存の店舗を利用する場合は、新しく登録する必要はありません。</span></aside>}
              <div className="store-image-editor">
                {storeImageDataUrl ? <img src={storeImageDataUrl} alt="保存予定の店舗画像" /> : <div aria-hidden="true">店舗画像なし</div>}
                <label className="image-select-button">{isProcessingImage ? '画像を処理中…' : '写真を撮影・選択'}<input type="file" accept="image/*" disabled={isProcessingImage} onChange={event => void selectStoreImage(event)} /></label>
              </div>
              {storeImageDataUrl && <button className="clear-location-button" type="button" onClick={() => setStoreImageDataUrl(null)}>保存する店舗画像を削除</button>}
              <div className="store-location-row">
                <button type="button" disabled={isLocating} onClick={() => void locate('store')}>{isLocating ? '取得中…' : storePosition ? '現在地を取り直す' : '現在地を店舗位置にする'}</button>
                {storePosition ? <span>位置情報あり{storePosition.accuracy > 0 ? `・精度 約${Math.round(storePosition.accuracy)}m` : ''}</span> : <span>位置情報なし</span>}
              </div>
              {storePosition && <button className="clear-location-button" type="button" onClick={() => setStorePosition(null)}>保存する位置情報を解除</button>}
              <div className="form-actions">
                {editingStore && <button className="secondary-button" type="button" onClick={resetForm}>キャンセル</button>}
                <button className="save-button" type="submit" disabled={isSaving || isProcessingImage}>{isSaving ? '保存中…' : editingStore ? '変更を保存' : '店舗を登録'}</button>
              </div>
            </form>
          </section>

          {error && <p className="feedback error-message" role="alert">{error}</p>}
          {message && <p className="feedback success-message" role="status">{message}</p>}

          <section className="store-list-section" aria-labelledby="store-list-title">
            <div className="list-heading"><div><h2 id="store-list-title">登録済み店舗</h2><p>この端末に保存されています</p></div><span>{stores.length}件</span></div>
            {isLoading ? (
              <p className="list-empty">読み込み中…</p>
            ) : stores.length === 0 ? (
              <p className="list-empty">登録済みの店舗はありません。</p>
            ) : (
              <ul className="store-list">
                {stores.map((store) => (
                  <li key={store.id}>
                    {store.imageDataUrl ? <img className="store-list-photo" src={store.imageDataUrl} alt="" /> : <div className="store-avatar" aria-hidden="true">店</div>}
                    <div className="store-info"><strong>{store.name}</strong><span>{store.latitude != null && store.longitude != null ? '位置情報あり' : '位置情報なし'}</span></div>
                    <div className="store-actions">
                      <button type="button" onClick={() => startEditing(store)}>編集</button>
                      <button className="delete-button" type="button" onClick={() => void deleteStore(store)}>削除</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div><p className="app-eyebrow">CRANE PLAY LOG</p><h1>クレーン記録</h1></div>
        <button className="icon-button" type="button" aria-label="設定" onClick={() => setScreen('settings')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" /><path d="M19.4 13.5a7.9 7.9 0 0 0 .05-1.5 7.9 7.9 0 0 0-.05-1.5l1.65-1.28-1.7-2.94-1.94.78a7.8 7.8 0 0 0-2.6-1.5L14.5 3.5h-3.4l-.31 2.06a7.8 7.8 0 0 0-2.6 1.5l-1.94-.78-1.7 2.94L6.2 10.5a7.9 7.9 0 0 0-.05 1.5 7.9 7.9 0 0 0 .05 1.5l-1.65 1.28 1.7 2.94 1.94-.78a7.8 7.8 0 0 0 2.6 1.5l.31 2.06h3.4l.31-2.06a7.8 7.8 0 0 0 2.6-1.5l1.94.78 1.7-2.94L19.4 13.5Z" /></svg>
        </button>
      </header>
      <main className="app-main">
        <HomeBackupReminder onOpen={() => { setBackupOrigin('home'); setScreen('backup') }} />
        <HomeMonthlyBudget onOpen={() => setScreen('monthly-stats')} />
        <HomeHistory onStart={openPlay} onOpen={(visit) => { setSelectedVisit(visit); setDetailOrigin('home'); setScreen('visit-detail') }} />
      </main>
      <nav className="bottom-actions" aria-label="主な操作">
        <button type="button" onClick={openPlay}><span className="action-icon" aria-hidden="true">＋</span><span>プレイを記録</span></button>
        <button type="button" onClick={() => setScreen('approximate')}><span className="action-icon" aria-hidden="true">≒</span><span>うろ覚え記入</span></button>
        <button type="button" onClick={() => setScreen('history-list')}><span className="action-icon" aria-hidden="true">☷</span><span>履歴一覧</span></button>
        <button type="button" onClick={() => setScreen('store-stats')}><span className="action-icon" aria-hidden="true">▥</span><span>戦績</span></button>
      </nav>
    </div>
  )
}

export default App
