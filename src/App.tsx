import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Store } from './models/store'
import { storeService } from './services/storeService'
import { PrizeManager } from './components/PrizeManager'
import { PlayRecorder } from './components/PlayRecorder'
import type { Prize } from './models/prize'
import './App.css'

type Screen = 'home' | 'stores' | 'select-store' | 'prizes' | 'play'
type PendingFeature = 'memory' | 'history' | null

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '処理中に問題が発生しました。'

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null)
  const [storeName, setStoreName] = useState('')
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [pendingFeature, setPendingFeature] = useState<PendingFeature>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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

  const openStores = () => {
    setPendingFeature(null)
    setMessage('')
    setError('')
    setScreen('stores')
  }

  const openPlay = () => {
    setPendingFeature(null)
    setMessage('')
    setError('')
    setScreen(stores.length === 0 ? 'stores' : 'select-store')
  }

  const showPendingMessage = (feature: Exclude<PendingFeature, null>) => {
    setPendingFeature(feature)
    setMessage('')
  }

  const resetForm = () => {
    setStoreName('')
    setEditingStore(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setIsSaving(true)
      setError('')
      if (editingStore) {
        await storeService.update(editingStore.id, { name: storeName })
        setMessage('店舗名を変更しました。')
      } else {
        await storeService.create({ name: storeName })
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
    setMessage('')
    setError('')
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

  if (screen === 'play' && selectedStore && selectedPrize) {
    return <PlayRecorder store={selectedStore} prize={selectedPrize} onBack={() => setScreen('prizes')} />
  }

  if (screen === 'prizes' && selectedStore) {
    return <PrizeManager store={selectedStore} onBack={() => setScreen('select-store')} onSelectPrize={(prize) => { setSelectedPrize(prize); setScreen('play') }} />
  }

  if (screen === 'select-store') {
    return (
      <div className="app-shell">
        <header className="page-header"><button className="back-button" type="button" onClick={() => setScreen('home')}>‹</button><div><p className="app-eyebrow">START PLAY</p><h1>店舗を選択</h1></div></header>
        <main className="store-main">
          <p className="step-description">今回プレイする店舗を選んでください。</p>
          <ul className="selection-list">
            {stores.map((store) => <li key={store.id}><button type="button" onClick={() => { setSelectedStore(store); setScreen('prizes') }}><span className="store-avatar" aria-hidden="true">店</span><strong>{store.name}</strong><span aria-hidden="true">›</span></button></li>)}
          </ul>
          <button className="secondary-wide-button" type="button" onClick={openStores}>店舗を追加・編集</button>
        </main>
      </div>
    )
  }

  if (screen === 'stores') {
    return (
      <div className="app-shell">
        <header className="page-header">
          <button className="back-button" type="button" onClick={() => setScreen('home')} aria-label="ホームへ戻る">‹</button>
          <div><p className="app-eyebrow">STORE SETTINGS</p><h1>店舗の登録</h1></div>
        </header>

        <main className="store-main">
          <section className="form-card" aria-labelledby="store-form-title">
            <div className="section-heading">
              <span className="section-number">01</span>
              <div><h2 id="store-form-title">{editingStore ? '店舗名を編集' : '新しい店舗を登録'}</h2><p>Phase 1では店舗名を手入力します</p></div>
            </div>
            <form onSubmit={handleSubmit}>
              <label htmlFor="store-name">店舗名</label>
              <input id="store-name" name="storeName" type="text" value={storeName} onChange={(event) => setStoreName(event.target.value)} maxLength={80} placeholder="例：GiGO ○○店" autoComplete="off" />
              <div className="form-actions">
                {editingStore && <button className="secondary-button" type="button" onClick={resetForm}>キャンセル</button>}
                <button className="save-button" type="submit" disabled={isSaving}>{isSaving ? '保存中…' : editingStore ? '変更を保存' : '店舗を登録'}</button>
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
                    <div className="store-avatar" aria-hidden="true">店</div>
                    <div className="store-info"><strong>{store.name}</strong><span>手動登録</span></div>
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
        <button className="icon-button" type="button" aria-label="店舗設定" onClick={openStores}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" /><path d="M19.4 13.5a7.9 7.9 0 0 0 .05-1.5 7.9 7.9 0 0 0-.05-1.5l1.65-1.28-1.7-2.94-1.94.78a7.8 7.8 0 0 0-2.6-1.5L14.5 3.5h-3.4l-.31 2.06a7.8 7.8 0 0 0-2.6 1.5l-1.94-.78-1.7 2.94L6.2 10.5a7.9 7.9 0 0 0-.05 1.5 7.9 7.9 0 0 0 .05 1.5l-1.65 1.28 1.7 2.94 1.94-.78a7.8 7.8 0 0 0 2.6 1.5l.31 2.06h3.4l.31-2.06a7.8 7.8 0 0 0 2.6-1.5l1.94.78 1.7-2.94L19.4 13.5Z" /></svg>
        </button>
      </header>
      <main className="app-main">
        <section className="empty-history" aria-labelledby="empty-title">
          <div className="machine-illustration" aria-hidden="true"><svg viewBox="0 0 120 120"><rect x="23" y="12" width="74" height="96" rx="15" /><path d="M23 74h74M37 74v34M83 74v34" /><path d="M60 27v18m-12-9h24" /><path d="M50 45c0 8 4 13 10 13s10-5 10-13" /><circle cx="45" cy="89" r="5" /><path d="M61 90h21" /></svg></div>
          <p className="empty-kicker">最初のプレイを記録しましょう</p><h2 id="empty-title">まだプレイ記録がありません</h2>
          <p className="empty-description">店舗と景品を登録すると、使用金額や損益をここですぐに確認できます。</p>
          <button className="primary-button" type="button" onClick={openPlay}><span aria-hidden="true">＋</span>最初の記録を追加</button>
        </section>
        {pendingFeature && <p className="status-message" role="status">{pendingFeature === 'memory' ? 'うろ覚え記入は後のステップで追加します。' : '履歴一覧は記録機能の追加後に利用できます。'}</p>}
      </main>
      <nav className="bottom-actions" aria-label="主な操作">
        <button type="button" onClick={openPlay}><span className="action-icon" aria-hidden="true">＋</span><span>プレイを記録</span></button>
        <button type="button" onClick={() => showPendingMessage('memory')}><span className="action-icon" aria-hidden="true">≒</span><span>うろ覚え記入</span></button>
        <button type="button" onClick={() => showPendingMessage('history')}><span className="action-icon" aria-hidden="true">☷</span><span>履歴一覧</span></button>
      </nav>
    </div>
  )
}

export default App
