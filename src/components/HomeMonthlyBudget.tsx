import { useEffect, useState } from 'react'
import { playRepository } from '../repositories/playRepository'
import { monthlyBudgetService } from '../services/monthlyBudgetService'
import { todayKey } from '../services/playService'

interface Props { onOpen: () => void }
const yen = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString()}円`

export function HomeMonthlyBudget({ onOpen }: Props) {
  const [budget, setBudget] = useState<number | null>(null)
  const [spent, setSpent] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const monthKey = todayKey().slice(0, 7)

  useEffect(() => {
    void Promise.all([monthlyBudgetService.get(monthKey), playRepository.getAll()])
      .then(([savedBudget, plays]) => {
        setBudget(savedBudget)
        setSpent(plays.filter(play => play.playDate.startsWith(monthKey)).reduce((sum, play) => sum + play.amount, 0))
      })
      .finally(() => setLoaded(true))
  }, [monthKey])

  if (!loaded || budget == null) return null
  const remaining = budget - spent
  const rate = Math.round(spent / budget * 100)

  return <button className={`home-monthly-budget ${remaining < 0 ? 'over-budget' : ''}`} type="button" onClick={onOpen}>
    <div className="home-budget-heading"><div><span>今月の予算</span><strong>{yen(budget)}</strong></div><b aria-hidden="true">›</b></div>
    <progress max={budget} value={Math.min(spent, budget)} aria-label={`月間予算使用率 ${rate}%`} />
    <div className="home-budget-result"><span>使用額 {yen(spent)}・{rate}%</span><strong className={remaining < 0 ? 'negative' : ''}>{remaining < 0 ? `${yen(Math.abs(remaining))}超過` : `残り${yen(remaining)}`}</strong></div>
  </button>
}
