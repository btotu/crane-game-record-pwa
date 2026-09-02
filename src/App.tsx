import { useState } from 'react'
import './App.css'

type PendingFeature = 'record' | 'memory' | 'history' | null

const pendingMessages: Record<Exclude<PendingFeature, null>, string> = {
  record: 'プレイ記録は次のステップで追加します。',
  memory: 'うろ覚え記入は後のステップで追加します。',
  history: '履歴一覧は記録機能の追加後に利用できます。',
}

function App() {
  const [pendingFeature, setPendingFeature] = useState<PendingFeature>(null)
  const showPendingMessage = (feature: Exclude<PendingFeature, null>) => setPendingFeature(feature)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div><p className="app-eyebrow">CRANE PLAY LOG</p><h1>クレーン記録</h1></div>
        <button className="icon-button" type="button" aria-label="設定（準備中）" onClick={() => showPendingMessage('history')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" /><path d="M19.4 13.5a7.9 7.9 0 0 0 .05-1.5 7.9 7.9 0 0 0-.05-1.5l1.65-1.28-1.7-2.94-1.94.78a7.8 7.8 0 0 0-2.6-1.5L14.5 3.5h-3.4l-.31 2.06a7.8 7.8 0 0 0-2.6 1.5l-1.94-.78-1.7 2.94L6.2 10.5a7.9 7.9 0 0 0-.05 1.5 7.9 7.9 0 0 0 .05 1.5l-1.65 1.28 1.7 2.94 1.94-.78a7.8 7.8 0 0 0 2.6 1.5l.31 2.06h3.4l.31-2.06a7.8 7.8 0 0 0 2.6-1.5l1.94.78 1.7-2.94L19.4 13.5Z" /></svg>
        </button>
      </header>

      <main className="app-main">
        <section className="empty-history" aria-labelledby="empty-title">
          <div className="machine-illustration" aria-hidden="true"><svg viewBox="0 0 120 120"><rect x="23" y="12" width="74" height="96" rx="15" /><path d="M23 74h74M37 74v34M83 74v34" /><path d="M60 27v18m-12-9h24" /><path d="M50 45c0 8 4 13 10 13s10-5 10-13" /><circle cx="45" cy="89" r="5" /><path d="M61 90h21" /></svg></div>
          <p className="empty-kicker">最初のプレイを記録しましょう</p>
          <h2 id="empty-title">まだプレイ記録がありません</h2>
          <p className="empty-description">店舗と景品を登録すると、使用金額や損益をここですぐに確認できます。</p>
          <button className="primary-button" type="button" onClick={() => showPendingMessage('record')}><span aria-hidden="true">＋</span>最初の記録を追加</button>
        </section>
        {pendingFeature && <p className="status-message" role="status">{pendingMessages[pendingFeature]}</p>}
      </main>

      <nav className="bottom-actions" aria-label="主な操作">
        <button type="button" onClick={() => showPendingMessage('record')}><span className="action-icon" aria-hidden="true">＋</span><span>プレイを記録</span></button>
        <button type="button" onClick={() => showPendingMessage('memory')}><span className="action-icon" aria-hidden="true">≒</span><span>うろ覚え記入</span></button>
        <button type="button" onClick={() => showPendingMessage('history')}><span className="action-icon" aria-hidden="true">☷</span><span>履歴一覧</span></button>
      </nav>
    </div>
  )
}

export default App
