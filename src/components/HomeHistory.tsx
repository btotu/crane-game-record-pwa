import { useEffect, useRef, useState } from 'react'
import type { VisitSummary } from '../models/visit'
import { visitService } from '../services/visitService'
interface Props { onStart:()=>void; onOpen:(visit:VisitSummary)=>void }
const yen=(value:number)=>`${value<0?'−':''}${Math.abs(value).toLocaleString()}円`
const dateLabel=(summary:VisitSummary)=>new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(summary.startedAt))
export function HomeHistory({onStart,onOpen}:Props){const [items,setItems]=useState<VisitSummary[]>([]);const [index,setIndex]=useState(0);const [loading,setLoading]=useState(true);const startX=useRef<number|null>(null);const swiped=useRef(false)
 useEffect(()=>{void visitService.list().then(setItems).finally(()=>setLoading(false))},[])
 const move=(next:number)=>setIndex(Math.max(0,Math.min(items.length-1,next)))
 if(loading)return <p className="list-empty">履歴を読み込んでいます…</p>
 if(items.length===0)return <section className="empty-history" aria-labelledby="empty-title"><div className="machine-illustration" aria-hidden="true"><svg viewBox="0 0 120 120"><rect x="23" y="12" width="74" height="96" rx="15"/><path d="M23 74h74M37 74v34M83 74v34M60 27v18m-12-9h24M50 45c0 8 4 13 10 13s10-5 10-13"/><circle cx="45" cy="89" r="5"/><path d="M61 90h21"/></svg></div><p className="empty-kicker">最初のプレイを記録しましょう</p><h2 id="empty-title">まだプレイ記録がありません</h2><p className="empty-description">店舗と景品を登録すると、使用金額や損益をここですぐに確認できます。</p><button className="primary-button" type="button" onClick={onStart}><span aria-hidden="true">＋</span>最初の記録を追加</button></section>
 const item=items[index]
 return <section className="history-carousel"><article className="visit-card" role="button" tabIndex={0} onClick={()=>{if(!swiped.current)onOpen(item);swiped.current=false}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onOpen(item)}} onTouchStart={e=>{startX.current=e.touches[0].clientX;swiped.current=false}} onTouchEnd={e=>{if(startX.current===null)return;const dx=e.changedTouches[0].clientX-startX.current;if(Math.abs(dx)>45){swiped.current=true;move(index+(dx>0?1:-1))}startX.current=null}}>
   <div className="store-placeholder" aria-hidden="true"><span>GAME CENTER</span><strong>{item.storeName.slice(0,1)}</strong></div><div className="visit-body"><time>{dateLabel(item)}</time><h2>{item.storeName}</h2><div className="visit-money"><div><span>使用金額</span><strong>{yen(item.totalSpent)}</strong></div><div><span>損益</span><strong className={item.profit>=0?'positive':'negative'}>{item.profit>=0?'+':''}{yen(item.profit)}</strong></div></div><p>推定景品総額 {yen(item.estimatedPrizeValue)}・獲得 {item.acquiredCount}個</p></div></article>
   <div className="carousel-controls"><button type="button" disabled={index>=items.length-1} onClick={()=>move(index+1)} aria-label="古い履歴">‹</button><span>{index+1} / {items.length}</span><button type="button" disabled={index===0} onClick={()=>move(index-1)} aria-label="新しい履歴">›</button></div><p className="swipe-hint">右へスワイプで古い記録、左へスワイプで新しい記録</p>
 </section>}
