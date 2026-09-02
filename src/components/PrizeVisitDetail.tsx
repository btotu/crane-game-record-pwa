import { useEffect,useState } from 'react'
import type { Prize } from '../models/prize'
import type { VisitPlayDetail,VisitSummary } from '../models/visit'
import { prizeService } from '../services/prizeService'
import { todayKey } from '../services/playService'
import { visitService } from '../services/visitService'
interface Props{visit:VisitSummary;prizeId:string;onBack:()=>void;onAdd:(prize:Prize)=>void}
const yen=(n:number)=>`${n.toLocaleString()}円`;const clock=(iso:string)=>new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit'}).format(new Date(iso))
export function PrizeVisitDetail({visit,prizeId,onBack,onAdd}:Props){const [prize,setPrize]=useState<Prize|null>(null);const [plays,setPlays]=useState<VisitPlayDetail[]>([]);useEffect(()=>{void Promise.all([prizeService.list(),visitService.details(visit.storeId,visit.playDate)]).then(([prizes,all])=>{setPrize(prizes.find(item=>item.id===prizeId)??null);setPlays(all.filter(item=>item.prizeId===prizeId))})},[visit,prizeId]);const spent=plays.reduce((s,p)=>s+p.amount,0);const won=plays.filter(p=>p.result!=='撤退').length;const value=plays.reduce((s,p)=>s+p.estimatedValue,0);const isToday=visit.playDate===todayKey()
 return <div className="app-shell"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹</button><div><p className="app-eyebrow">PRIZE DETAIL</p><h1>景品詳細</h1></div></header><main className="store-main"><section className="prize-detail-hero"><p>{visit.playDate.replaceAll('-',' / ')}・{visit.storeName}</p><h2>{prize?.name??plays[0]?.prizeName??'景品'}</h2><span>{prize?.category??plays[0]?.category}</span></section><section className="today-summary"><div><span>総使用額</span><strong>{yen(spent)}</strong></div><div><span>獲得数</span><strong>{won}個</strong></div><div><span>損益</span><strong>{value-spent>=0?'+':''}{yen(value-spent)}</strong></div></section>
 <h3 className="detail-subtitle">この日のプレイ履歴</h3><ol className="play-history">{plays.map((play,index)=><li key={play.id}><span>{index+1}回目・{clock(play.startedAt)}・{play.result}</span><strong>{yen(play.amount)}</strong></li>)}</ol>
 {isToday&&prize?<button className="primary-wide-button" type="button" onClick={()=>onAdd(prize)}>この景品にプレイを追加</button>:<p className="past-notice">過去日の記録は閲覧・確認のみ可能です。現在日のプレイは追加されません。</p>}</main></div>}
