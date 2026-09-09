import { useEffect, useState, type FormEvent } from 'react'
import { defaultQuickAmounts, playInputSettingService } from '../services/playInputSettingService'

interface Props { onBack: () => void }

export function PlayInputSettings({ onBack }: Props) {
  const [amounts, setAmounts] = useState(defaultQuickAmounts.map(String))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void playInputSettingService.getQuickAmounts().then(values => setAmounts(values.map(String)))
  }, [])

  const changeAmount = (index: number, value: string) => {
    setAmounts(current => current.map((amount, amountIndex) => amountIndex === index ? value : amount))
    setMessage('')
    setError('')
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      await playInputSettingService.saveQuickAmounts(amounts.map(Number))
      setMessage('よく使う金額を保存しました。')
    } catch (saveError) {
      setMessage('')
      setError(saveError instanceof Error ? saveError.message : '設定を保存できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    try {
      setSaving(true)
      setError('')
      await playInputSettingService.resetQuickAmounts()
      setAmounts(defaultQuickAmounts.map(String))
      setMessage('初期設定の100円・200円・500円に戻しました。')
    } catch {
      setMessage('')
      setError('初期設定に戻せませんでした。')
    } finally {
      setSaving(false)
    }
  }

  return <div className="app-shell">
    <header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PLAY INPUT</p><h1>記録入力の設定</h1></div></header>
    <main className="store-main">
      <section className="input-setting-card">
        <h2>よく使う金額</h2>
        <p>プレイ記録画面に表示する3つの加算ボタンを設定します。</p>
        <form onSubmit={event => void save(event)}>
          <div className="quick-amount-fields">{amounts.map((amount, index) => <label key={index}>ボタン {index + 1}<span><input type="number" inputMode="numeric" min="1" max="1000000" step="1" value={amount} onChange={event => changeAmount(index, event.target.value)} /><b>円</b></span></label>)}</div>
          <div className="quick-amount-preview"><span>表示例</span><div>{amounts.map((amount, index) => <button type="button" tabIndex={-1} key={index}>+{Number(amount || 0).toLocaleString()}円</button>)}</div></div>
          <button className="save-button" type="submit" disabled={saving}>{saving ? '保存中…' : '設定を保存'}</button>
          <button className="reset-setting-button" type="button" disabled={saving} onClick={() => void reset()}>初期設定に戻す</button>
        </form>
      </section>
      {error && <p className="feedback error-message" role="alert">{error}</p>}
      {message && <p className="feedback success-message" role="status">{message}</p>}
    </main>
  </div>
}
