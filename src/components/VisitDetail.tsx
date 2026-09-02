import { useEffect,useState } from 'react'
import type { VisitPlayDetail,VisitSummary } from '../models/visit'
import { visitService } from '../services/visitService'
interface Props{visit:VisitSummary;onBack:()=>void;onOpenPrize:(prizeId:string)=>void}
const yen=(n:number)=>`${n.toLocaleString()}円`;const time=(iso:string)=>new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit'}).format(new Date(iso))
export function VisitDetail({visit,onBack,onOpenPrize}:Props){const [plays,setPlays]=useState<VisitPlayDetail[]>([]);const [error,setError]=useState('');useEffect(()=>{void visitService.details(visit.storeId,visit.playDate).then(setPlays).catch(()=>setError('詳細を読み込めませんでした。'))},[visit])
 const groups=(['獲得','撤退','アシスト獲得'] as const).map(result=>({result,items:plays.filter(item=>item.result===result)}))
 const totalSpent=plays.reduce((sum,item)=>sum+item.amount,0);const totalValue=plays.reduce((sum,item)=>sum+item.estimatedValue,0);const profit=totalValue-totalSpent
 return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">VISIT DETAIL</p><h1>来店詳細</h1></div></header><main className="store-main">
  <section className="detail-hero"><time>{visit.playDate.replaceAll('-',' / ')}</time><h2>{visit.storeName}</h2><div><span>総使用額<strong>{yen(totalSpent)}</strong></span><span>推定景品総額<strong>{yen(totalValue)}</strong></span><span>損益<strong className={profit>=0?'positive':'negative'}>{profit>=0?'+':''}{yen(profit)}</strong></span></div></section>
  {error&&<p className="feedback error-message">{error}</p>}{groups.map(group=><section className="result-group" key={group.result}><div className="result-heading"><h3>{group.result}</h3><span>{group.items.length}件</span></div>{group.items.length===0?<p className="group-empty">該当する記録はありません。</p>:<ul>{group.items.map(item=><li key={item.id}><button className="detail-prize-button" type="button" onClick={()=>onOpenPrize(item.prizeId)}><div><strong>{item.prizeName}</strong><span>{item.category}・{time(item.startedAt)}</span></div><div><strong>{yen(item.amount)}</strong><span>参考価値 {yen(item.estimatedValue)}</span></div><b aria-hidden="true">›</b></button></li>)}</ul>}</section>)}
 </main></div>}
