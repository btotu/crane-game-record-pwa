import { useEffect, useState } from 'react'
import { productApiSettingService } from '../services/productApiSettingService'

interface Props { onBack: () => void }
export function ProductApiSettings({ onBack }: Props) {
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { void productApiSettingService.getYahooClientId().then(value => setSaved(Boolean(value))) }, [])
  const remove = async () => {
    if (!confirm('この端末に保存したClient IDを削除しますか？')) return
    await productApiSettingService.removeYahooClientId(); setSaved(false); setMessage('Client IDを削除しました。')
  }

  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PRODUCT API</p><h1>商品検索設定</h1></div></header><main className="store-main">
    <section className="api-setting-card paused"><span>準備中</span><h2>Yahoo!ショッピング商品検索</h2><p>ブラウザから直接接続すると通信制限とClient ID公開の問題があるため、現在は検索機能を停止しています。安全に中継する外部サーバーを用意した段階で再開できます。</p></section>
    <section className="api-saved-status"><strong>Client ID</strong><span>{saved ? 'この端末に保存済みです' : '保存されていません'}</span><small>保存済みのIDは検索再開に備えて、そのまま保管できます。JSONバックアップには含まれません。</small>{saved && <button className="api-key-remove" type="button" onClick={() => void remove()}>保存済みClient IDを削除</button>}</section>
    {message && <p className="feedback success-message" role="status">{message}</p>}
  </main></div>
}
