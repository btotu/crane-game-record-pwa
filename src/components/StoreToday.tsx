import { useEffect, useState } from 'react'
import type { Store } from '../models/store'
import type { Prize } from '../models/prize'
import type { VisitPlayDetail } from '../models/visit'
import { visitService } from '../services/visitService'
import { prizeService } from '../services/prizeService'
import { todayKey } from '../services/playService'

interface Props { store: Store; onAdd: () => void; onFinish: () => void; onSelect: (prize: Prize) => void }
const yen = (value: number) => `${value.toLocaleString()}円`
export function StoreToday({ store, onAdd, onFinish, onSelect }: Props) {
  const [plays, setPlays] = useState<VisitPlayDetail[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(todayKey())
  useEffect(() => {
    const refreshDate = () => setDate(todayKey())
    const timer = window.setInterval(refreshDate, 30000)
    window.addEventListener('focus', refreshDate)
    return () => { clearInterval(timer); window.removeEventListener('focus', refreshDate) }
  }, [])
  useEffect(() => {
    let active = true
    void Promise.all([visitService.details(store.id, date), prizeService.list()]).then(([items, catalog]) => {
      if (active) { setPlays(items); setPrizes(catalog); setLoading(false) }
    }).catch(() => { if (active) { setError('当日の記録を読み込めませんでした。'); setLoading(false) } })
    return () => { active = false }
  }, [store.id, date])
  const spent = plays.reduce((sum, play) => sum + play.amount, 0)
  const value = plays.reduce((sum, play) => sum + play.estimatedValue, 0)
  const wins = plays.filter(play => play.result !== '撤退').length
  const groups = [...new Set(plays.map(play => play.prizeId))].map(id => {
    const items = plays.filter(play => play.prizeId === id)
    return { id, items, prize: prizes.find(prize => prize.id === id), spent: items.reduce((sum, item) => sum + item.amount, 0), value: items.reduce((sum, item) => sum + item.estimatedValue, 0), wins: items.filter(item => item.result !== '撤退').length }
  })
  return <div className="app-shell"><header className="page-header"><div><p className="app-eyebrow">TODAY'S RECORD</p><h1>{store.name}</h1></div></header><main className="store-main">
    <p>{date.replaceAll('-', ' / ')}・当日の店舗記録</p>
    {loading ? <p role="status">記録を読み込み中…</p> : error ? <p role="alert">{error}</p> : <>
      <section className="today-summary"><div><span>本日の使用額</span><strong>{yen(spent)}</strong></div><div><span>本日の獲得数</span><strong>{wins}個</strong></div><div><span>現在の参考損益</span><strong className={value >= spent ? 'positive' : 'negative'}>{value >= spent ? '+' : ''}{yen(value - spent)}</strong></div></section>
      <p>獲得景品の参考価値 {yen(value)} − 使用額 {yen(spent)}。保存済みのプレイを集計しています。</p>
      {plays.some(play => play.isApproximate) && <p className="memory-note">概算・うろ覚えの記録を含みます。</p>}
      <button className="primary-wide-button" onClick={onAdd} type="button">＋ プレイを追加</button>
      <h2 className="detail-subtitle">本日の景品別記録</h2>
      {groups.length === 0 && <p className="list-empty">今日はまだ記録がありません。「プレイを追加」から始めてください。</p>}
      {groups.map(group => <section className="result-card" key={group.id}><h2>{group.items[0].prizeName}</h2><p>使用額 {yen(group.spent)}・獲得 {group.wins}個</p><p>参考損益 {group.value >= group.spent ? '+' : ''}{yen(group.value - group.spent)}</p>
        <ul>{group.items.map(item => <li key={item.id}>{new Date(item.startedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}・{item.result}・{yen(item.amount)}{item.isApproximate ? '（概算）' : ''}{item.memo && <p>{item.memo}</p>}</li>)}</ul>
        {group.prize && <button className="secondary-wide-button" type="button" onClick={() => onSelect(group.prize!)}>この景品にプレイを追加</button>}
      </section>)}
    </>}
    <button className="primary-wide-button" type="button" onClick={onFinish}>入力完了・ホームへ戻る</button>
  </main></div>
}
