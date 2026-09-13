import { useEffect, useRef, useState } from 'react'
import type { Store } from '../models/store'
import type { Prize } from '../models/prize'
import type { PlayRecord, PlayResult } from '../models/play'
import { playService } from '../services/playService'
import { defaultQuickAmounts, playInputSettingService } from '../services/playInputSettingService'

interface Props { store:Store; prize:Prize; onBack:()=>void; onSaved:()=>void }
export function PlayRecorder({store,prize,onBack,onSaved}:Props) {
  const [amount,setAmount]=useState(0); const [direct,setDirect]=useState(''); const [records,setRecords]=useState<PlayRecord[]>([]); const [quickAmounts,setQuickAmounts]=useState(defaultQuickAmounts); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [saving,setSaving]=useState(false)
  const saveLock=useRef(false)
  useEffect(()=>{ void playService.today(store.id,prize.id).then(setRecords).catch(()=>setError('本日の記録を読み込めませんでした。アプリを再読み込みしてください。')) },[store.id,prize.id])
  useEffect(()=>{ void playInputSettingService.getQuickAmounts().then(setQuickAmounts).catch(()=>setError('金額設定を読み込めませんでした。初期金額で入力できます。')) },[])
  const add=(value:number)=>{ setAmount(current=>current+value); setDirect(''); setError('') }
  const record=async(result:PlayResult)=>{ if(saveLock.current)return;saveLock.current=true;try { setSaving(true); setError(''); const finalAmount=direct===''?amount:Number(direct); await playService.create({storeId:store.id,prizeId:prize.id,amount:finalAmount,result}); setAmount(0); setDirect(''); setMessage(`${result}として記録しました。`); onSaved() } catch(e) { setError(e instanceof Error?e.message:'記録に失敗しました。') } finally { saveLock.current=false;setSaving(false) } }
  const leave=(next:()=>void)=>{ if (saving) return; if (direct!=='' || amount>0) { setError('入力中の使用額が残っています。結果を選んで記録するか、金額をクリアしてください。'); return } next() }
  const total=records.reduce((sum,item)=>sum+item.amount,0); const wins=records.filter(item=>item.result!=='撤退').length
  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={()=>leave(onBack)}>‹</button><div><p className="app-eyebrow">PLAY RECORD</p><h1>プレイを記録</h1></div></header>
    <main className="store-main"><section className="play-context"><span>{store.name}</span><strong>{prize.name}</strong><small>{prize.category}・参考価格 {prize.estimatedPrice.toLocaleString()}円</small></section>
      <section className="amount-card"><p>今回の使用額</p><strong>{(direct===''?amount:Number(direct||0)).toLocaleString()}<small>円</small></strong><div className="quick-buttons">{quickAmounts.map(value=><button type="button" key={value} onClick={()=>add(value)}>+{value.toLocaleString()}円</button>)}</div>
        <label htmlFor="direct-amount">今回の使用額を直接入力</label><input id="direct-amount" type="number" inputMode="numeric" min="1" max="1000000" value={direct} onChange={e=>{setDirect(e.target.value);setAmount(0)}} placeholder="例：1300" />
        <button className="clear-amount" type="button" onClick={()=>{setAmount(0);setDirect('')}}>金額をクリア</button>
      </section>
      <section className="result-card"><h2>結果を選んで記録</h2><div className="result-buttons"><button disabled={saving} type="button" onClick={()=>void record('獲得')}>獲得</button><button disabled={saving} type="button" onClick={()=>void record('撤退')}>撤退</button><button disabled={saving} type="button" onClick={()=>void record('アシスト獲得')}>アシスト獲得</button></div></section>
      {error&&<p className="feedback error-message" role="alert">{error}</p>}{message&&<p className="feedback success-message" role="status">{message}</p>}
      <section className="today-summary"><div><span>この景品の本日使用額</span><strong>{total.toLocaleString()}円</strong></div><div><span>獲得数</span><strong>{wins}個</strong></div><div><span>プレイ記録</span><strong>{records.length}件</strong></div></section>
      {records.length>0&&<ol className="play-history">{[...records].reverse().map((item,index)=><li key={item.id}><span>{records.length-index}回目・{item.result}</span><strong>{item.amount.toLocaleString()}円</strong></li>)}</ol>}
    </main></div>
}
