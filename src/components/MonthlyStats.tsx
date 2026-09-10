import { useEffect, useState } from 'react'
import type { PlayRecord } from '../models/play'
import type { Prize } from '../models/prize'
import { playRepository } from '../repositories/playRepository'
import { prizeService } from '../services/prizeService'
import { todayKey } from '../services/playService'

interface Props { onBack: () => void; onOpenStores: () => void; onOpenPrizes: () => void }
interface MonthStat { month: number; spent: number; value: number; wins: number; withdrawals: number; plays: number }
const yen = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString()}円`

export function MonthlyStats({ onBack, onOpenStores, onOpenPrizes }: Props) {
  const [plays, setPlays] = useState<PlayRecord[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [selectedYear, setSelectedYear] = useState(Number(todayKey().slice(0, 4)))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([playRepository.getAll(), prizeService.list()])
      .then(([savedPlays, savedPrizes]) => { setPlays(savedPlays); setPrizes(savedPrizes) })
      .catch(() => setError('月別戦績を読み込めませんでした。'))
      .finally(() => setLoading(false))
  }, [])

  const currentYear = Number(todayKey().slice(0, 4))
  const recordedYears = plays.map(play => Number(play.playDate.slice(0, 4))).filter(Number.isFinite)
  const years = [...new Set([currentYear, ...recordedYears])].sort((a, b) => b - a)
  const prizeMap = new Map(prizes.map(prize => [prize.id, prize]))
  const map = new Map<number, MonthStat>()
  for (const play of plays.filter(item => Number(item.playDate.slice(0, 4)) === selectedYear)) {
    const month = Number(play.playDate.slice(5, 7))
    const won = play.result !== '撤退'
    const current = map.get(month) ?? { month, spent: 0, value: 0, wins: 0, withdrawals: 0, plays: 0 }
    current.spent += play.amount
    current.plays++
    if (won) { current.wins++; current.value += prizeMap.get(play.prizeId)?.estimatedPrice ?? 0 } else current.withdrawals++
    map.set(month, current)
  }
  const months = [...map.values()].sort((a, b) => b.month - a.month)
  const annualSpent = months.reduce((sum, month) => sum + month.spent, 0)
  const annualValue = months.reduce((sum, month) => sum + month.value, 0)
  const annualWins = months.reduce((sum, month) => sum + month.wins, 0)
  const annualProfit = annualValue - annualSpent

  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PLAY RESULTS</p><h1>戦績</h1></div></header><main className="store-main">
    <nav className="stats-tabs stats-tabs-three" aria-label="戦績の種類"><button type="button" onClick={onOpenStores}>店舗別</button><button type="button" onClick={onOpenPrizes}>景品別</button><button className="active" type="button" aria-current="page">月別推移</button></nav>
    <section className="stats-period"><label htmlFor="monthly-stats-year">集計年</label><select id="monthly-stats-year" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>{years.map(year => <option key={year} value={year}>{year}年</option>)}</select></section>
    {!loading && !error && <section className="stats-overall"><div><span>記録月</span><strong>{months.length}か月</strong></div><div><span>年間使用額</span><strong>{yen(annualSpent)}</strong></div><div><span>年間獲得数</span><strong>{annualWins}個</strong></div><div><span>年間損益</span><strong className={annualProfit >= 0 ? 'positive' : 'negative'}>{annualProfit >= 0 ? '+' : ''}{yen(annualProfit)}</strong></div></section>}
    {loading ? <p className="list-empty">集計中…</p> : error ? <p className="feedback error-message" role="alert">{error}</p> : months.length === 0 ? <p className="list-empty">{selectedYear}年のプレイ記録はありません。</p> : <ul className="monthly-stats-list">{months.map(month => { const profit = month.value - month.spent; const winRate = month.plays ? month.wins / month.plays * 100 : 0; return <li key={month.month}><div className="monthly-stats-heading"><strong>{month.month}月</strong><span>{month.plays}プレイ・獲得率 {winRate.toFixed(1)}%</span></div><dl><div><dt>使用額</dt><dd>{yen(month.spent)}</dd></div><div><dt>獲得数</dt><dd>{month.wins}個</dd></div><div><dt>推定景品総額</dt><dd>{yen(month.value)}</dd></div><div><dt>損益</dt><dd className={profit >= 0 ? 'positive' : 'negative'}>{profit >= 0 ? '+' : ''}{yen(profit)}</dd></div></dl><p>撤退 {month.withdrawals}件</p></li> })}</ul>}
  </main></div>
}
