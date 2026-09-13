import { useEffect, useState } from 'react'
import { playRepository } from '../repositories/playRepository'
import { backupService } from '../services/backupService'

interface Props { onOpen: () => void }
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export function HomeBackupReminder({ onOpen }: Props) {
  const [message, setMessage] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    void Promise.all([backupService.getLocalInfo(), playRepository.getAll()]).then(([info, plays]) => {
      if (plays.length === 0) return
      if (!info.lastBackupAt) { setMessage('まだバックアップが作成されていません。'); return }
      const lastBackup = new Date(info.lastBackupAt).getTime()
      if (!Number.isFinite(lastBackup) || Date.now() - lastBackup >= THIRTY_DAYS) setMessage('前回のバックアップから30日以上経過しています。')
    }).catch(() => undefined)
  }, [])

  if (!message || dismissed) return null

  return <aside className="home-backup-reminder" role="status">
    <button className="home-reminder-close" type="button" aria-label="バックアップ案内を閉じる" onClick={() => setDismissed(true)}>×</button>
    <div><span aria-hidden="true">保</span><div><strong>記録を安全に保管しましょう</strong><p>{message}</p></div></div>
    <button className="home-reminder-action" type="button" onClick={onOpen}>バックアップ画面へ</button>
  </aside>
}
