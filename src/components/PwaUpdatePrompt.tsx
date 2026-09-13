import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return <aside className="pwa-update-prompt" role="status" aria-live="polite">
    <div><strong>新しいバージョンがあります</strong><p>更新すると最新の機能が使えるようになります。保存済みの記録は消えません。</p></div>
    <div><button type="button" onClick={() => setNeedRefresh(false)}>あとで</button><button type="button" onClick={() => void updateServiceWorker(true)}>更新する</button></div>
  </aside>
}
