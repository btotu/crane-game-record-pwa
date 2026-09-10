import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { backupService, type BackupPreview } from '../services/backupService'

interface Props { onBack: () => void }
const dateTime = (value: string) => new Date(value).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })
const safeFilePart = (value: string) => value.trim().replace(/[\\/:*?"<>|\s　]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)

export function BackupSettings({ onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [deviceName, setDeviceName] = useState('')
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [backupAgeDays, setBackupAgeDays] = useState<number | null>(null)
  const [pendingRaw, setPendingRaw] = useState<unknown>(null)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    let active = true
    void backupService.getLocalInfo().then(info => { if (active) { setDeviceName(info.deviceName); setLastBackupAt(info.lastBackupAt); setBackupAgeDays(info.lastBackupAt ? Math.floor((Date.now() - new Date(info.lastBackupAt).getTime()) / 86400000) : null) } })
    return () => { active = false }
  }, [])

  const download = async () => {
    try {
      setWorking(true); setError(''); setMessage('')
      const data = await backupService.export(deviceName)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const label = safeFilePart(deviceName)
      link.download = `crane-record-backup${label ? `-${label}` : ''}-${data.exportedAt.slice(0, 10)}.json`
      link.click(); URL.revokeObjectURL(url)
      await backupService.rememberExport(deviceName, data.exportedAt)
      setLastBackupAt(data.exportedAt)
      setBackupAgeDays(0)
      setMessage(`店舗${data.stores.length}件・景品${data.prizes.length}件・プレイ${data.plays.length}件・設定${data.settings.length}件を書き出しました。`)
    } catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : 'バックアップを書き出せませんでした。') }
    finally { setWorking(false) }
  }

  const inspectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    try { setError(''); setMessage(''); const raw: unknown = JSON.parse(await file.text()); setPendingRaw(raw); setPreview(backupService.inspect(raw)) }
    catch (inspectError) { setPendingRaw(null); setPreview(null); setError(inspectError instanceof Error ? inspectError.message : 'バックアップを読み込めませんでした。') }
  }

  const restore = async () => {
    if (!preview || pendingRaw == null) return
    try {
      setWorking(true); setError('')
      const result = await backupService.import(pendingRaw)
      setPendingRaw(null); setPreview(null)
      setMessage(`復元しました：店舗${result.storesAdded}件・景品${result.prizesAdded}件・プレイ${result.playsAdded}件・設定${result.settingsRestored}件（重複等${result.skipped}件は現在の内容を保持）`)
    } catch (restoreError) { setMessage(''); setError(restoreError instanceof Error ? restoreError.message : 'バックアップを復元できませんでした。') }
    finally { setWorking(false) }
  }

  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">BACKUP</p><h1>バックアップ</h1></div></header><main className="store-main">
    <section className={`backup-status ${backupAgeDays == null || backupAgeDays >= 30 ? 'attention' : ''}`}><strong>{lastBackupAt ? `最終バックアップ：${dateTime(lastBackupAt)}` : 'バックアップはまだ作成されていません'}</strong><small>{backupAgeDays == null ? '本格運用を始める前に、最初のバックアップを作成してください。' : backupAgeDays >= 30 ? `${backupAgeDays}日間バックアップされていません。新しいバックアップをおすすめします。` : '定期的に別の場所へ保管してください。'}</small></section>
    <section className="backup-card"><div className="backup-icon" aria-hidden="true">↓</div><div><h2>完全バックアップ</h2><p>店舗・景品・プレイ記録・入力設定・当日予算を書き出します。Client IDは含みません。</p></div><label className="backup-device-label" htmlFor="backup-device-name">端末名（任意）<input id="backup-device-name" value={deviceName} maxLength={40} onChange={event => setDeviceName(event.target.value)} placeholder="例：自分のスマートフォン" /></label><button type="button" disabled={working} onClick={() => void download()}>{working ? '処理中…' : 'バックアップを書き出す'}</button></section>
    <section className="backup-card"><div className="backup-icon" aria-hidden="true">↑</div><div><h2>バックアップを復元</h2><p>最初に内容を確認し、問題がなければ現在の端末へ追加します。</p></div><button className="secondary-backup" type="button" disabled={working} onClick={() => inputRef.current?.click()}>ファイルを選択</button><input ref={inputRef} className="file-input" type="file" accept="application/json,.json" onChange={event => void inspectFile(event)} /></section>
    {preview && <section className="backup-preview"><div><span>作成日時</span><strong>{dateTime(preview.exportedAt)}</strong></div><div><span>端末名</span><strong>{preview.deviceName || '記載なし'}</strong></div><dl><div><dt>店舗</dt><dd>{preview.stores}件</dd></div><div><dt>景品</dt><dd>{preview.prizes}件</dd></div><div><dt>プレイ</dt><dd>{preview.plays}件</dd></div><div><dt>設定</dt><dd>{preview.settings}件</dd></div></dl>{preview.version === 1 && <p>旧形式のバックアップです。店舗・景品・プレイ記録を復元できます。</p>}<div className="backup-preview-actions"><button type="button" disabled={working} onClick={() => { setPendingRaw(null); setPreview(null) }}>キャンセル</button><button type="button" disabled={working} onClick={() => void restore()}>{working ? '復元中…' : 'この内容を復元'}</button></div></section>}
    <p className="backup-warning">店舗・景品・プレイ記録は、同じIDがある場合に現在の内容を優先します。入力設定と当日予算はバックアップの内容を復元します。</p>
    {error && <p className="feedback error-message" role="alert">{error}</p>}{message && <p className="feedback success-message" role="status">{message}</p>}
  </main></div>
}
