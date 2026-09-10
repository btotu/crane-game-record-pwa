import { useEffect, useState } from 'react'
import type { VisitSummary } from '../models/visit'
import { visitService } from '../services/visitService'
import { todayKey } from '../services/playService'

interface Props { onBack: () => void; onOpenPrizes: () => void; onOpenMonthly: () => void }
interface Stat { id: string; name: string; spent: number; profit: number; wins: number; plays: number; visits: number; lastAt: string }
type Period = 'this-month' | 'last-month' | 'this-year' | 'all' | 'custom'
type SortOrder = 'recent' | 'spent' | 'profit' | 'loss' | 'withdrawal-rate'
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

export function StoreStats({ onBack, onOpenPrizes, onOpenMonthly }: Props) {
  const [visits, setVisits] = useState<VisitSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [today] = useState(todayKey)
  const [period, setPeriod] = useState<Period>('this-month')
  const [customFrom, setCustomFrom] = useState(monthStart(todayKey()))
  const [customTo, setCustomTo] = useState(todayKey())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent')

  useEffect(() => {
    void visitService.list().then(setVisits).catch(() => setError('店舗戦績を読み込めませんでした。')).finally(() => setLoading(false))
  }, [])

  let from = ''
  let to = today
  if (period === 'this-month') from = monthStart(today)
  if (period === 'last-month') { from = monthStart(today, -1); to = monthEnd(from) }
  if (period === 'this-year') from = `${today.slice(0, 4)}-01-01`
  if (period === 'all') to = ''
  if (period === 'custom') { from = customFrom; to = customTo }
  const periodInvalid = period === 'custom' && (!customFrom || !customTo || customFrom > customTo)
  const filteredVisits = periodInvalid ? [] : visits.filter(visit => (!from || visit.playDate >= from) && (!to || visit.playDate <= to))

  const map = new Map<string, Stat>()
  for (const visit of filteredVisits) {
    const current = map.get(visit.storeId)
    if (current) {
      current.spent += visit.totalSpent; current.profit += visit.profit; current.wins += visit.acquiredCount; current.plays += visit.playCount; current.visits++
      if (visit.startedAt > current.lastAt) current.lastAt = visit.startedAt
    } else map.set(visit.storeId, { id: visit.storeId, name: visit.storeName, spent: visit.totalSpent, profit: visit.profit, wins: visit.acquiredCount, plays: visit.playCount, visits: 1, lastAt: visit.startedAt })
  }
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('ja-JP')
  const stats = [...map.values()].filter(stat => !normalizedQuery || stat.name.toLocaleLowerCase('ja-JP').includes(normalizedQuery)).sort((a, b) => {
    if (sortOrder === 'spent') return b.spent - a.spent || b.lastAt.localeCompare(a.lastAt)
    if (sortOrder === 'profit') return b.profit - a.profit || b.lastAt.localeCompare(a.lastAt)
    if (sortOrder === 'loss') return a.profit - b.profit || b.lastAt.localeCompare(a.lastAt)
    if (sortOrder === 'withdrawal-rate') return ((b.plays - b.wins) / b.plays) - ((a.plays - a.wins) / a.plays) || b.plays - a.plays
    return b.lastAt.localeCompare(a.lastAt)
  })
  const visibleStoreIds = new Set(stats.map(stat => stat.id))
  const visibleVisits = filteredVisits.filter(visit => visibleStoreIds.has(visit.storeId))
  const totalSpent = visibleVisits.reduce((sum, visit) => sum + visit.totalSpent, 0)
  const totalWins = visibleVisits.reduce((sum, visit) => sum + visit.acquiredCount, 0)
  const totalProfit = visibleVisits.reduce((sum, visit) => sum + visit.profit, 0)

  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PLAY RESULTS</p><h1>戦績</h1></div></header><main className="store-main">
    <nav className="stats-tabs stats-tabs-three" aria-label="戦績の種類"><button className="active" type="button" aria-current="page">店舗別</button><button type="button" onClick={onOpenPrizes}>景品別</button><button type="button" onClick={onOpenMonthly}>月別推移</button></nav>
    <section className="stats-period"><label htmlFor="stats-period">集計期間</label><select id="stats-period" value={period} onChange={event => setPeriod(event.target.value as Period)}><option value="this-month">今月</option><option value="last-month">先月</option><option value="this-year">今年</option><option value="all">全期間</option><option value="custom">期間を指定</option></select>{period === 'custom' && <div className="stats-date-range"><label>開始日<input type="date" max={today} value={customFrom} onChange={event => setCustomFrom(event.target.value)} /></label><span>～</span><label>終了日<input type="date" max={today} value={customTo} onChange={event => setCustomTo(event.target.value)} /></label></div>}{periodInvalid && <p className="feedback error-message" role="alert">開始日は終了日以前の日付にしてください。</p>}</section>
    {!loading && !error && !periodInvalid && <section className="stats-overall"><div><span>来店</span><strong>{visibleVisits.length}回</strong></div><div><span>総使用額</span><strong>{yen(totalSpent)}</strong></div><div><span>総獲得数</span><strong>{totalWins}個</strong></div><div><span>総損益</span><strong className={totalProfit >= 0 ? 'positive' : 'negative'}>{totalProfit >= 0 ? '+' : ''}{yen(totalProfit)}</strong></div></section>}
    {!loading && !error && !periodInvalid && <section className="stats-filter-panel store-stats-filter" aria-label="店舗戦績の検索と並べ替え"><label>店舗名<input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="店舗名で検索" /></label><label>並べ替え<select value={sortOrder} onChange={event => setSortOrder(event.target.value as SortOrder)}><option value="recent">最近来店した順</option><option value="spent">使用額が多い順</option><option value="profit">利益が大きい順</option><option value="loss">損失が大きい順</option><option value="withdrawal-rate">撤退率が高い順</option></select></label>{normalizedQuery && <button type="button" onClick={() => setSearchQuery('')}>検索を解除</button>}</section>}
    {loading ? <p className="list-empty">集計中…</p> : error ? <p className="feedback error-message" role="alert">{error}</p> : periodInvalid ? null : map.size === 0 ? <p className="list-empty">選択した期間にプレイ記録はありません。</p> : stats.length === 0 ? <p className="list-empty">条件に一致する店舗はありません。</p> : <ul className="stats-list">{stats.map(stat => { const withdrawals = stat.plays - stat.wins; const rate = stat.plays ? withdrawals / stat.plays * 100 : 0; return <li key={stat.id}><div className="stats-title"><div className="store-avatar" aria-hidden="true">店</div><div><h2>{stat.name}</h2><span>来店 {stat.visits}回・プレイ {stat.plays}件</span></div></div><dl><div><dt>総使用額</dt><dd>{yen(stat.spent)}</dd></div><div><dt>総獲得個数</dt><dd>{stat.wins}個</dd></div><div><dt>総損益</dt><dd className={stat.profit >= 0 ? 'positive' : 'negative'}>{stat.profit >= 0 ? '+' : ''}{yen(stat.profit)}</dd></div><div><dt>撤退率</dt><dd>{rate.toFixed(1)}%</dd></div></dl><p>撤退 {withdrawals}件 ÷ 全プレイ {stat.plays}件</p></li> })}</ul>}
  </main></div>
}
