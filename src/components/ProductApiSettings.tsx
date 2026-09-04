import { useEffect, useState, type FormEvent } from 'react'
import { productApiSettingService } from '../services/productApiSettingService'

interface Props { onBack: () => void }
const errorText = (error: unknown) => error instanceof Error ? error.message : '設定を保存できませんでした。'

export function ProductApiSettings({ onBack }: Props) {
  const [clientId, setClientId] = useState('')
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { void productApiSettingService.getYahooClientId().then(value => { setClientId(value ?? ''); setSaved(Boolean(value)) }) }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try { setSaving(true); setError(''); await productApiSettingService.saveYahooClientId(clientId); setSaved(true); setMessage('Client IDをこの端末へ保存しました。') }
    catch (saveError) { setError(errorText(saveError)); setMessage('') }
    finally { setSaving(false) }
  }
  const remove = async () => {
    if (!confirm('この端末に保存したClient IDを削除しますか？')) return
    await productApiSettingService.removeYahooClientId(); setClientId(''); setSaved(false); setError(''); setMessage('Client IDを削除しました。')
  }

  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PRODUCT API</p><h1>商品検索設定</h1></div></header><main className="store-main">
    <section className="api-setting-card"><h2>Yahoo!ショッピング商品検索</h2><p>JANコードから商品名、販売価格、商品ページを検索するために使用します。</p><a href="https://e.developer.yahoo.co.jp/dashboard/" target="_blank" rel="noreferrer">Yahoo!デベロッパーの管理画面を開く</a></section>
    <form className="api-key-form" onSubmit={submit}><label htmlFor="yahoo-client-id">Client ID（アプリケーションID）</label><input id="yahoo-client-id" type="password" value={clientId} onChange={event => setClientId(event.target.value)} autoComplete="off" placeholder="発行されたClient IDを貼り付け" /><small>この端末内にだけ保存され、JSONバックアップには含まれません。</small><button type="submit" disabled={saving}>{saving ? '保存中…' : saved ? 'Client IDを更新' : 'Client IDを保存'}</button>{saved && <button className="api-key-remove" type="button" onClick={() => void remove()}>保存済みClient IDを削除</button>}</form>
    {error && <p className="feedback error-message" role="alert">{error}</p>}{message && <p className="feedback success-message" role="status">{message}</p>}
  </main></div>
}
