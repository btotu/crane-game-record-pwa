import { useEffect, useState } from 'react'
import type { PlayRecord } from '../models/play'
import { prizeCategories, type Prize } from '../models/prize'
import type { Store } from '../models/store'
import { playRepository } from '../repositories/playRepository'
import { prizeService } from '../services/prizeService'
import { storeService } from '../services/storeService'
import { todayKey } from '../services/playService'

interface Props { onBack: () => void; onOpenStores: () => void }
interface Stat { id: string; name: string; category: string; imageDataUrl?: string; spent: number; value: number; wins: number; withdrawals: number; plays: number; stores: Set<string>; lastAt: string }
type Period = 'this-month' | 'last-month' | 'this-year' | 'all' | 'custom'
type SortOrder = 'recent' | 'spent' | 'profit' | 'loss' | 'win-rate'
const yen = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString()}円`
const monthStart = (date: string, offset = 0) => {
  const [year, month] = date.split('-').map(Number)
  const total = year * 12 + month - 1 + offset
  return `${Math.floor(total / 12)}-${String(total % 12 + 1).padStart(2, '0')}-01`
}
const monthEnd = (start: string) => {
  const next = monthStart(start, 1)
  const end = new Date(`${next}T00:00:00`)
  end.setDate(end.getDate() - 1)
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
}

export function PrizeStats({ onBack, onOpenStores }: Props) {
  const [plays, setPlays] = useState<PlayRecord[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [today] = useState(todayKey)
  const [period, setPeriod] = useState<Period>('this-month')
  const [customFrom, setCustomFrom] = useState(monthStart(todayKey()))
  const [customTo, setCustomTo] = useState(todayKey())
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('すべて')
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent')

  useEffect(() => {
    void Promise.all([playRepository.getAll(), prizeService.list(), storeService.list()])
      .then(([savedPlays, savedPrizes, savedStores]) => { setPlays(savedPlays); setPrizes(savedPrizes); setStores(savedStores) })
      .catch(() => setError('景品戦績を読み込めませんでした。'))
      .finally(() => setLoading(false))
  }, [])

  let from = ''
  let to = today
  if (period === 'this-month') from = monthStart(today)
  if (period === 'last-month') { from = monthStart(today, -1); to = monthEnd(from) }
  if (period === 'this-year') from = `${today.slice(0, 4)}-01-01`
  if (period === 'all') to = ''
  if (period === 'custom') { from = customFrom; to = customTo }
  const periodInvalid = period === 'custom' && (!customFrom || !customTo || customFrom > customTo)
  const filteredPlays = periodInvalid ? [] : plays.filter(play => (!from || play.playDate >= from) && (!to || play.playDate <= to))
  const prizeMap = new Map(prizes.map(prize => [prize.id, prize]))
  const storeMap = new Map(stores.map(store => [store.id, store.name]))
  const map = new Map<string, Stat>()
  for (const play of filteredPlays) {
    const prize = prizeMap.get(play.prizeId)
    const won = play.result !== '撤退'
    const current = map.get(play.prizeId)
    if (current) {
      current.spent += play.amount; current.plays++; current.stores.add(play.storeId)
      if (won) { current.wins++; current.value += prize?.estimatedPrice ?? 0 } else current.withdrawals++
      if (play.startedAt > current.lastAt) current.lastAt = play.startedAt
    } else map.set(play.prizeId, { id: play.prizeId, name: prize?.name ?? '削除済みの景品', category: prize?.category ?? '未分類', imageDataUrl: prize?.imageDataUrl, spent: play.amount, value: won ? prize?.estimatedPrice ?? 0 : 0, wins: won ? 1 : 0, withdrawals: won ? 0 : 1, plays: 1, stores: new Set([play.storeId]), lastAt: play.startedAt })
  }
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('ja-JP')
  const stats = [...map.values()].filter(stat =>
    (!normalizedQuery || stat.name.toLocaleLowerCase('ja-JP').includes(normalizedQuery)) &&
    (category === 'すべて' || stat.category === category)
  ).sort((a, b) => {
    if (sortOrder === 'spent') return b.spent - a.spent || b.lastAt.localeCompare(a.lastAt)
    if (sortOrder === 'profit') return (b.value - b.spent) - (a.value - a.spent) || b.lastAt.localeCompare(a.lastAt)
    if (sortOrder === 'loss') return (a.value - a.spent) - (b.value - b.spent) || b.lastAt.localeCompare(a.lastAt)
    if (sortOrder === 'win-rate') return (b.wins / b.plays) - (a.wins / a.plays) || b.plays - a.plays
    return b.lastAt.localeCompare(a.lastAt)
  })
  const filterActive = Boolean(normalizedQuery || category !== 'すべて')
  const totalSpent = stats.reduce((sum, stat) => sum + stat.spent, 0)
  const totalWins = stats.reduce((sum, stat) => sum + stat.wins, 0)
  const totalValue = stats.reduce((sum, stat) => sum + stat.value, 0)
  const totalProfit = totalValue - totalSpent

  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PLAY RESULTS</p><h1>戦績</h1></div></header><main className="store-main">
    <nav className="stats-tabs" aria-label="戦績の種類"><button type="button" onClick={onOpenStores}>店舗別</button><button className="active" type="button" aria-current="page">景品別</button></nav>
    <section className="stats-period"><label htmlFor="prize-stats-period">集計期間</label><select id="prize-stats-period" value={period} onChange={event => setPeriod(event.target.value as Period)}><option value="this-month">今月</option><option value="last-month">先月</option><option value="this-year">今年</option><option value="all">全期間</option><option value="custom">期間を指定</option></select>{period === 'custom' && <div className="stats-date-range"><label>開始日<input type="date" max={today} value={customFrom} onChange={event => setCustomFrom(event.target.value)} /></label><span>～</span><label>終了日<input type="date" max={today} value={customTo} onChange={event => setCustomTo(event.target.value)} /></label></div>}{periodInvalid && <p className="feedback error-message" role="alert">開始日は終了日以前の日付にしてください。</p>}</section>
    {!loading && !error && !periodInvalid && <section className="stats-overall"><div><span>景品</span><strong>{stats.length}種類</strong></div><div><span>総使用額</span><strong>{yen(totalSpent)}</strong></div><div><span>総獲得数</span><strong>{totalWins}個</strong></div><div><span>総損益</span><strong className={totalProfit >= 0 ? 'positive' : 'negative'}>{totalProfit >= 0 ? '+' : ''}{yen(totalProfit)}</strong></div></section>}
    {!loading && !error && !periodInvalid && <section className="stats-filter-panel" aria-label="景品戦績の絞り込み"><label>景品名<input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="景品名で検索" /></label><label>カテゴリ<select value={category} onChange={event => setCategory(event.target.value)}><option value="すべて">すべて</option>{prizeCategories.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label>並べ替え<select value={sortOrder} onChange={event => setSortOrder(event.target.value as SortOrder)}><option value="recent">最近プレイした順</option><option value="spent">使用額が多い順</option><option value="profit">利益が大きい順</option><option value="loss">損失が大きい順</option><option value="win-rate">獲得率が高い順</option></select></label>{filterActive && <button type="button" onClick={() => { setSearchQuery(''); setCategory('すべて') }}>絞り込みを解除</button>}</section>}
    {loading ? <p className="list-empty">集計中…</p> : error ? <p className="feedback error-message" role="alert">{error}</p> : periodInvalid ? null : map.size === 0 ? <p className="list-empty">選択した期間にプレイ記録はありません。</p> : stats.length === 0 ? <p className="list-empty">条件に一致する景品はありません。</p> : <ul className="stats-list prize-stats-list">{stats.map(stat => { const profit = stat.value - stat.spent; const rate = stat.plays ? stat.wins / stat.plays * 100 : 0; const storeNames = [...stat.stores].map(id => storeMap.get(id) ?? '削除済み店舗'); return <li key={stat.id}><div className="stats-title">{stat.imageDataUrl ? <img className="stats-prize-photo" src={stat.imageDataUrl} alt="" /> : <div className="store-avatar prize-avatar" aria-hidden="true">景品</div>}<div><h2>{stat.name}</h2><span>{stat.category}・{stat.plays}プレイ・{stat.stores.size}店舗</span></div></div><dl><div><dt>総使用額</dt><dd>{yen(stat.spent)}</dd></div><div><dt>獲得数</dt><dd>{stat.wins}個</dd></div><div><dt>推定景品総額</dt><dd>{yen(stat.value)}</dd></div><div><dt>総損益</dt><dd className={profit >= 0 ? 'positive' : 'negative'}>{profit >= 0 ? '+' : ''}{yen(profit)}</dd></div><div><dt>撤退数</dt><dd>{stat.withdrawals}件</dd></div><div><dt>獲得率</dt><dd>{rate.toFixed(1)}%</dd></div></dl><p title={storeNames.join('、')}>利用店舗：{storeNames.join('、')}</p></li> })}</ul>}
  </main></div>
}
