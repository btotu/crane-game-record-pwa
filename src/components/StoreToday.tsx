import { MoneyInput } from './MoneyInput'
import { useEffect, useState, type FormEvent } from 'react'
import type { Store } from '../models/store'
import type { Prize } from '../models/prize'
import type { VisitPlayDetail, VisitSummary } from '../models/visit'
import { visitService } from '../services/visitService'
import { prizeService } from '../services/prizeService'
import { todayKey } from '../services/playService'
import { visitBudgetService } from '../services/visitBudgetService'

interface Props { store: Store; onAdd: () => void; onFinish: () => void; onSelect: (prize: Prize) => void; onOpenDetail: (visit:VisitSummary, prizeId:string) => void }
const yen = (value: number) => `${value.toLocaleString()}円`
export function StoreToday({ store, onAdd, onFinish, onSelect, onOpenDetail }: Props) {
  const [plays, setPlays] = useState<VisitPlayDetail[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(todayKey())
  const [budget, setBudget] = useState<number | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [budgetEditing, setBudgetEditing] = useState(false)
  const [budgetMessage, setBudgetMessage] = useState('')
  const [budgetError, setBudgetError] = useState('')
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
  useEffect(() => {
    let active = true
    void visitBudgetService.get(store.id, date).then(savedBudget => {
      if (active) { setBudget(savedBudget); setBudgetInput(savedBudget == null ? '' : String(savedBudget)); setBudgetEditing(false) }
    })
    return () => { active = false }
  }, [store.id, date])
  const spent = plays.reduce((sum, play) => sum + play.amount, 0)
  const value = plays.reduce((sum, play) => sum + play.estimatedValue, 0)
  const wins = plays.filter(play => play.result !== '撤退').length
  const groups = [...new Set(plays.map(play => play.prizeId))].map(id => {
    const items = plays.filter(play => play.prizeId === id)
    return { id, items, prize: prizes.find(prize => prize.id === id), spent: items.reduce((sum, item) => sum + item.amount, 0), value: items.reduce((sum, item) => sum + item.estimatedValue, 0), wins: items.filter(item => item.result !== '撤退').length }
  })
  const saveBudget = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const nextBudget = Number(budgetInput)
      await visitBudgetService.save(store.id, date, nextBudget)
      setBudget(nextBudget)
      setBudgetEditing(false)
      setBudgetError('')
      setBudgetMessage('本日の予算を保存しました。')
    } catch (saveError) {
      setBudgetMessage('')
      setBudgetError(saveError instanceof Error ? saveError.message : '予算を保存できませんでした。')
    }
  }
  const removeBudget = async () => {
    await visitBudgetService.remove(store.id, date)
    setBudget(null)
    setBudgetInput('')
    setBudgetEditing(false)
    setBudgetError('')
    setBudgetMessage('本日の予算を解除しました。')
  }
  const remaining = budget == null ? null : budget - spent
  const budgetRate = budget == null ? 0 : Math.round(spent / budget * 100)
  const openDetail = (prizeId:string) => onOpenDetail({ id:`${date}:${store.id}`, storeId:store.id, storeName:store.name, storeImageDataUrl:store.imageDataUrl, playDate:date, startedAt:plays[0]?.startedAt ?? new Date().toISOString(), totalSpent:spent, estimatedPrizeValue:value, profit:value-spent, acquiredCount:wins, playCount:plays.length, isApproximate:plays.some(play=>play.isApproximate) }, prizeId)
  return <div className="app-shell"><header className="page-header"><div><p className="app-eyebrow">TODAY'S RECORD</p><h1>{store.name}</h1></div></header><main className="store-main">
    <p>{date.replaceAll('-', ' / ')}・当日の店舗記録</p>
    {loading ? <p role="status">記録を読み込み中…</p> : error ? <p role="alert">{error}</p> : <>
      <section className="today-summary"><div><span>本日の使用額</span><strong>{yen(spent)}</strong></div><div><span>本日の獲得数</span><strong>{wins}個</strong></div><div><span>現在の参考損益</span><strong className={value >= spent ? 'positive' : 'negative'}>{value >= spent ? '+' : ''}{yen(value - spent)}</strong></div></section>
      <p>獲得景品の参考価値 {yen(value)} − 使用額 {yen(spent)}。保存済みのプレイを集計しています。</p>
      <section className={`visit-budget-card ${remaining != null && remaining < 0 ? 'over-budget' : ''}`}>
        <div className="visit-budget-heading"><div><span>本日の店舗予算</span>{budget == null ? <strong>未設定</strong> : <strong>{yen(budget)}</strong>}</div>{budget != null && !budgetEditing && <button type="button" onClick={() => { setBudgetInput(String(budget)); setBudgetEditing(true); setBudgetMessage(''); setBudgetError('') }}>変更</button>}</div>
        {budget != null && !budgetEditing && <><progress max={budget} value={Math.min(spent, budget)} aria-label={`予算使用率 ${budgetRate}%`} /><div className="visit-budget-result"><span>使用率 {budgetRate}%</span><strong className={remaining! < 0 ? 'negative' : ''}>{remaining! < 0 ? `予算を${yen(Math.abs(remaining!))}超過` : `残り${yen(remaining!)}`}</strong></div><button className="budget-remove-button" type="button" onClick={() => void removeBudget()}>予算設定を解除</button></>}
        {(budget == null || budgetEditing) && <form className="visit-budget-form" onSubmit={event => void saveBudget(event)}><label htmlFor="visit-budget">予算額</label><div><MoneyInput id="visit-budget" type="number" inputMode="numeric" min="1" max="1000000" step="1" value={budgetInput} onChange={event => setBudgetInput(event.target.value)} placeholder="例：5000" /><span>円</span></div><div className="visit-budget-actions">{budgetEditing && <button type="button" onClick={() => { setBudgetEditing(false); setBudgetInput(String(budget)); setBudgetError('') }}>キャンセル</button>}<button type="submit">{budgetEditing ? '予算を変更' : '予算を設定'}</button></div></form>}
      </section>
      {budgetError && <p className="feedback error-message" role="alert">{budgetError}</p>}{budgetMessage && <p className="feedback success-message" role="status">{budgetMessage}</p>}
      {plays.some(play => play.isApproximate) && <p className="memory-note">概算・うろ覚えの記録を含みます。</p>}
      <button className="primary-wide-button" onClick={onAdd} type="button">＋ プレイを追加</button>
      <h2 className="detail-subtitle">本日の景品別記録</h2>
      {groups.length === 0 && <p className="list-empty">今日はまだ記録がありません。「プレイを追加」から始めてください。</p>}
      {groups.map(group => <section className="result-card" key={group.id}><h2>{group.items[0].prizeName}</h2><p>使用額 {yen(group.spent)}・獲得 {group.wins}個</p><p>参考損益 {group.value >= group.spent ? '+' : ''}{yen(group.value - group.spent)}</p>
        <ul>{group.items.map(item => <li key={item.id}>{new Date(item.startedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}・{item.result}・{yen(item.amount)}{item.isApproximate ? '（概算）' : ''}{item.memo && <p>{item.memo}</p>}</li>)}</ul>
        <div className="today-prize-actions"><button type="button" onClick={() => openDetail(group.id)}>記録を確認・修正</button>{group.prize && <button type="button" onClick={() => onSelect(group.prize!)}>この景品にプレイを追加</button>}</div>
      </section>)}
    </>}
    <button className="primary-wide-button" type="button" onClick={onFinish}>入力完了・ホームへ戻る</button>
  </main></div>
}
