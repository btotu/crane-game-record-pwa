import type { InputHTMLAttributes } from 'react'
export function MoneyInput(props: InputHTMLAttributes<HTMLInputElement>) {
 const adjust=(input:HTMLInputElement,delta:number)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set?.call(input,String(Math.min(Number(props.max??1000000),Math.max(0,Number(input.value||0)+delta))));input.dispatchEvent(new Event('input',{bubbles:true}))}
 return <span className="money-input"><input {...props} step="any" onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();adjust(e.currentTarget,e.key==='ArrowUp'?100:-100)}}}/><span className="money-controls">{[-100,100].map(delta=><button type="button" key={delta} disabled={props.disabled} onClick={e=>{const input=e.currentTarget.closest('.money-input')?.querySelector('input');if(input)adjust(input,delta)}}>{delta>0?'＋100円':'−100円'}</button>)}</span></span>
}
