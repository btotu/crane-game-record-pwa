import { useEffect, useState } from 'react'
import type { Store } from '../models/store'
import type { Prize } from '../models/prize'
import type { PlayRecord, PlayResult } from '../models/play'
import { playService } from '../services/playService'

interface Props { store:Store; prize:Prize; onBack:()=>void }
export function PlayRecorder({store,prize,onBack}:Props) {
  const [amount,setAmount]=useState(0); const [direct,setDirect]=useState(''); const [records,setRecords]=useState<PlayRecord[]>([]); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [saving,setSaving]=useState(false)
  const reload=async()=>setRecords(await playService.today(store.id,prize.id))
  useEffect(()=>{ void playService.today(store.id,prize.id).then(setRecords) },[store.id,prize.id])
  const add=(value:number)=>{ setAmount(current=>current+value); setDirect(''); setError('') }
  const record=async(result:PlayResult)=>{ try { setSaving(true); setError(''); const finalAmount=direct===''?amount:Number(direct); await playService.create({storeId:store.id,prizeId:prize.id,amount:finalAmount,result}); setAmount(0); setDirect(''); setMessage(`${result}として記録しました。`); await reload() } catch(e) { setError(e instanceof Error?e.message:'記録に失敗しました。') } finally { setSaving(false) } }
  const total=records.reduce((sum,item)=>sum+item.amount,0); const wins=records.filter(item=>item.result!=='撤退').length
  return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PLAY RECORD</p><h1>プレイを記録</h1></div></header>
    <main className="store-main"><section className="play-context"><span>{store.name}</span><strong>{prize.name}</strong><small>{prize.category}・参考価格 {prize.estimatedPrice.toLocaleString()}円</small></section>
      <section className="amount-card"><p>今回の使用額</p><strong>{(direct===''?amount:Number(direct||0)).toLocaleString()}<small>円</small></strong><div className="quick-buttons">{[100,200,500].map(value=><button type="button" key={value} onClick={()=>add(value)}>+{value}円</button>)}</div>
        <label htmlFor="direct-amount">今回の使用額を直接入力</label><input id="direct-amount" type="number" inputMode="numeric" min="1" max="1000000" value={direct} onChange={e=>{setDirect(e.target.value);setAmount(0)}} placeholder="例：1300" />
        <button className="clear-amount" type="button" onClick={()=>{setAmount(0);setDirect('')}}>金額をクリア</button>
      </section>
      <section className="result-card"><h2>結果を選んで記録</h2><div className="result-buttons"><button disabled={saving} type="button" onClick={()=>void record('獲得')}>獲得</button><button disabled={saving} type="button" onClick={()=>void record('撤退')}>撤退</button><button disabled={saving} type="button" onClick={()=>void record('アシスト獲得')}>アシスト獲得</button></div></section>
      {error&&<p className="feedback error-message" role="alert">{error}</p>}{message&&<p className="feedback success-message" role="status">{message}</p>}
      <section className="today-summary"><div><span>本日の総使用額</span><strong>{total.toLocaleString()}円</strong></div><div><span>獲得数</span><strong>{wins}個</strong></div><div><span>プレイ記録</span><strong>{records.length}件</strong></div></section>
      {records.length>0&&<ol className="play-history">{[...records].reverse().map((item,index)=><li key={item.id}><span>{records.length-index}回目・{item.result}</span><strong>{item.amount.toLocaleString()}円</strong></li>)}</ol>}
    </main></div>
}
