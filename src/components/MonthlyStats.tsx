import { MoneyInput } from './MoneyInput'
import { useEffect, useState, type FormEvent } from 'react'
import type { PlayRecord } from '../models/play'
import type { Prize } from '../models/prize'
import { playRepository } from '../repositories/playRepository'
import { prizeService } from '../services/prizeService'
import { todayKey } from '../services/playService'
import { monthlyBudgetService } from '../services/monthlyBudgetService'

interface Props { onBack: () => void; onOpenStores: () => void; onOpenPrizes: () => void }
interface MonthStat { month: number; spent: number; value: number; wins: number; withdrawals: number; plays: number }
const yen = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString()}円`

export function MonthlyStats({ onBack, onOpenStores, onOpenPrizes }: Props) {
  const [plays, setPlays] = useState<PlayRecord[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [selectedYear, setSelectedYear] = useState(Number(todayKey().slice(0, 4)))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [budget, setBudget] = useState<number | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [budgetMessage, setBudgetMessage] = useState('')
  const [budgetError, setBudgetError] = useState('')

  const currentMonthKey = todayKey().slice(0, 7)

  useEffect(() => {
    void Promise.all([playRepository.getAll(), prizeService.list()])
      .then(([savedPlays, savedPrizes]) => { setPlays(savedPlays); setPrizes(savedPrizes) })
      .catch(() => setError('月別戦績を読み込めませんでした。'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void monthlyBudgetService.get(currentMonthKey).then(saved => {
      setBudget(saved)
      setBudgetInput(saved == null ? '' : String(saved))
    }).catch(() => setBudgetError('月間予算を読み込めませんでした。'))
  }, [currentMonthKey])

  const saveBudget = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const nextBudget = Number(budgetInput)
      await monthlyBudgetService.save(currentMonthKey, nextBudget)
      setBudget(nextBudget)
      setBudgetMessage('今月の予算を保存しました。')
      setBudgetError('')
    } catch (saveError) {
      setBudgetMessage('')
      setBudgetError(saveError instanceof Error ? saveError.message : '月間予算を保存できませんでした。')
    }
  }

  const removeBudget = async () => {
    await monthlyBudgetService.remove(currentMonthKey)
    setBudget(null)
    setBudgetInput('')
    setBudgetMessage('今月の予算設定を解除しました。')
    setBudgetError('')
  }

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
    if (won) { current.wins++; current.value += play.estimatedPriceAtPlay ?? prizeMap.get(play.prizeId)?.estimatedPrice ?? 0 } else current.withdrawals++
    map.set(month, current)
  }
  const months = [...map.values()].sort((a, b) => b.month - a.month)
  const annualSpent = months.reduce((sum, month) => sum + month.spent, 0)
  const annualValue = months.reduce((sum, month) => sum + month.value, 0)
  const annualWins = months.reduce((sum, month) => sum + month.wins, 0)
  const annualProfit = annualValue - annualSpent
  const currentMonth = map.get(Number(currentMonthKey.slice(5, 7)))
  const currentMonthSpent = currentMonth?.spent ?? 0
  const budgetRemaining = budget == null ? null : budget - currentMonthSpent
  const budgetRate = budget == null ? 0 : Math.round(currentMonthSpent / budget * 100)

  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PLAY RESULTS</p><h1>戦績</h1></div></header><main className="store-main">
    <nav className="stats-tabs stats-tabs-three" aria-label="戦績の種類"><button type="button" onClick={onOpenStores}>店舗別</button><button type="button" onClick={onOpenPrizes}>景品別</button><button className="active" type="button" aria-current="page">月別推移</button></nav>
    <section className="stats-period"><label htmlFor="monthly-stats-year">集計年</label><select id="monthly-stats-year" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>{years.map(year => <option key={year} value={year}>{year}年</option>)}</select></section>
    {!loading && !error && <section className="stats-overall"><div><span>記録月</span><strong>{months.length}か月</strong></div><div><span>年間使用額</span><strong>{yen(annualSpent)}</strong></div><div><span>年間獲得数</span><strong>{annualWins}個</strong></div><div><span>年間損益</span><strong className={annualProfit >= 0 ? 'positive' : 'negative'}>{annualProfit >= 0 ? '+' : ''}{yen(annualProfit)}</strong></div></section>}
    {selectedYear === currentYear && !loading && !error && <section className={`monthly-budget-card ${budgetRemaining != null && budgetRemaining < 0 ? 'over-budget' : ''}`}><div className="monthly-budget-heading"><div><span>{Number(currentMonthKey.slice(5, 7))}月の予算</span><strong>{budget == null ? '未設定' : yen(budget)}</strong></div>{budget != null && <button type="button" onClick={() => void removeBudget()}>解除</button>}</div>{budget != null && <><progress max={budget} value={Math.min(currentMonthSpent, budget)} aria-label={`月間予算使用率 ${budgetRate}%`} /><div className="monthly-budget-result"><span>使用額 {yen(currentMonthSpent)}・使用率 {budgetRate}%</span><strong className={budgetRemaining! < 0 ? 'negative' : ''}>{budgetRemaining! < 0 ? `${yen(Math.abs(budgetRemaining!))}超過` : `残り${yen(budgetRemaining!)}`}</strong></div></>}<form onSubmit={event => void saveBudget(event)}><label htmlFor="monthly-budget">{budget == null ? '月間予算を設定' : '予算額を変更'}</label><div><MoneyInput id="monthly-budget" type="number" inputMode="numeric" min="1" max="10000000" step="1" value={budgetInput} onChange={event => setBudgetInput(event.target.value)} placeholder="例：30000" /><span>円</span></div><button type="submit">{budget == null ? '予算を設定' : '変更を保存'}</button></form>{budgetError && <p className="feedback error-message" role="alert">{budgetError}</p>}{budgetMessage && <p className="feedback success-message" role="status">{budgetMessage}</p>}</section>}
    {loading ? <p className="list-empty">集計中…</p> : error ? <p className="feedback error-message" role="alert">{error}</p> : months.length === 0 ? <p className="list-empty">{selectedYear}年のプレイ記録はありません。</p> : <ul className="monthly-stats-list">{months.map(month => { const profit = month.value - month.spent; const winRate = month.plays ? month.wins / month.plays * 100 : 0; return <li key={month.month}><div className="monthly-stats-heading"><strong>{month.month}月</strong><span>{month.plays}プレイ・獲得率 {winRate.toFixed(1)}%</span></div><dl><div><dt>使用額</dt><dd>{yen(month.spent)}</dd></div><div><dt>獲得数</dt><dd>{month.wins}個</dd></div><div><dt>推定景品総額</dt><dd>{yen(month.value)}</dd></div><div><dt>損益</dt><dd className={profit >= 0 ? 'positive' : 'negative'}>{profit >= 0 ? '+' : ''}{yen(profit)}</dd></div></dl><p>撤退 {month.withdrawals}件</p></li> })}</ul>}
  </main></div>
}
