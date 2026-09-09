import { useCallback, useEffect, useState } from 'react'

type CheckState = 'checking' | 'ok' | 'attention' | 'unknown'
interface StatusItem { label: string; detail: string; state: CheckState }

const permissionLabel = (state: PermissionState): Pick<StatusItem, 'detail' | 'state'> => {
  if (state === 'granted') return { detail: '許可されています', state: 'ok' }
  if (state === 'denied') return { detail: 'ブロックされています', state: 'attention' }
  return { detail: '使用時に確認されます', state: 'unknown' }
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString()} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function DeviceStatusSettings({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<StatusItem[]>([])
  const [checking, setChecking] = useState(true)

  const check = useCallback(async () => {
    setChecking(true)
    const next: StatusItem[] = []

    const checkPermission = async (name: 'geolocation' | 'camera', label: string) => {
      if (!navigator.permissions?.query) {
        next.push({ label, detail: 'このブラウザでは状態を直接確認できません', state: 'unknown' })
        return
      }
      try {
        const permission = await navigator.permissions.query({ name: name as PermissionName })
        next.push({ label, ...permissionLabel(permission.state) })
      } catch {
        next.push({ label, detail: '使用時にブラウザで確認してください', state: 'unknown' })
      }
    }

    await checkPermission('geolocation', '位置情報')
    await checkPermission('camera', 'カメラ')

    next.push({
      label: 'ネットワーク',
      detail: navigator.onLine ? 'オンラインです' : '現在オフラインです',
      state: navigator.onLine ? 'ok' : 'unknown',
    })

    const serviceWorkerReady = 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller)
    next.push({
      label: 'オフライン準備',
      detail: serviceWorkerReady ? '必要な機能が準備されています' : 'オンラインで一度起動すると準備されます',
      state: serviceWorkerReady ? 'ok' : 'attention',
    })

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    next.push({
      label: 'アプリの起動方法',
      detail: standalone ? 'インストールしたアプリとして起動中です' : 'ブラウザ内で起動中です',
      state: standalone ? 'ok' : 'unknown',
    })

    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        const usage = estimate.usage ?? 0
        const quota = estimate.quota ?? 0
        next.push({
          label: '端末内の保存領域',
          detail: quota > 0 ? `${formatBytes(usage)} 使用中・上限の目安 ${formatBytes(quota)}` : `${formatBytes(usage)} 使用中`,
          state: 'ok',
        })
      } catch {
        next.push({ label: '端末内の保存領域', detail: '容量を確認できませんでした', state: 'unknown' })
      }
    } else {
      next.push({ label: '端末内の保存領域', detail: 'このブラウザでは容量を確認できません', state: 'unknown' })
    }

    setItems(next)
    setChecking(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void check() }, 0)
    return () => window.clearTimeout(timer)
  }, [check])

  return <div className="app-shell">
    <header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">DEVICE STATUS</p><h1>端末・権限の確認</h1></div></header>
    <main className="store-main">
      <p className="step-description">この画面では現在の状態だけを確認します。カメラや位置情報の許可画面は表示しません。</p>
      {checking ? <p className="list-empty">端末の状態を確認しています…</p> : <ul className="device-status-list">{items.map(item => <li key={item.label}><span className={`device-status-mark ${item.state}`} aria-hidden="true">{item.state === 'ok' ? '✓' : item.state === 'attention' ? '!' : 'i'}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div></li>)}</ul>}
      <button className="secondary-wide-button" type="button" disabled={checking} onClick={() => void check()}>状態を再確認</button>
      <p className="device-status-note">「ブロックされています」と表示された場合は、Chromeのアドレス欄付近にあるサイト設定から権限を変更できます。</p>
    </main>
  </div>
}
