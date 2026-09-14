import { settingRepository } from '../repositories/settingRepository'
export interface Product { name:string; price:number; url:string; sellerName:string; janCode:string }
let busy=false;let nextAt=0
export const productProxyService={
 async settings():Promise<{url:string;token:string}>{const raw=await settingRepository.get('product-proxy');return raw?JSON.parse(raw):{url:'',token:''}},
 async save(url:string,token:string){const u=new URL(url.trim());if(u.protocol!=='https:'||!u.hostname.endsWith('.workers.dev')||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('https://～.workers.dev のURLを入力してください。');token=token.trim();if(token.length<32||token.length>256||!/^[\x21-\x7e]+$/.test(token))throw new Error('接続用キーを32文字以上の半角英数字・記号で入力してください。');await settingRepository.set('product-proxy',JSON.stringify({url:u.origin,token}))},
 async search(value:string,mode:'jan'|'query'):Promise<Product[]>{
  value=value.trim();if(mode==='jan'?!/^(\d{8}|\d{13})$/.test(value):value.length<2||value.length>100)throw new Error('JANは8桁か13桁、商品名は2〜100文字で入力してください。')
  if(busy||Date.now()<nextAt)throw new Error('数秒待ってから検索してください。')
  const s=await this.settings();if(!s.url||!s.token)throw new Error('ホームの設定→商品検索設定で接続設定を保存してください。')
  busy=true;nextAt=Date.now()+2500
  try{const url=new URL('/search',s.url);url.searchParams.set(mode,value);let r:Response;try{r=await fetch(url,{headers:{Authorization:`Bearer ${s.token}`},signal:AbortSignal.timeout(20000),redirect:'error'})}catch{throw new Error('中継サーバーへ接続できません。URL・通信状態を確認し、公開アプリから試してください。')}
   let data;try{data=await r.json()}catch{throw new Error('Workerから想定外の応答がありました。')}
   if(!r.ok)throw new Error(`${typeof data.message==='string'?data.message:'検索に失敗しました。'} (${r.status})`)
   if(!Array.isArray(data.products))throw new Error('商品データの形式が正しくありません。')
   return data.products.filter((p:Product)=>typeof p.name==='string'&&Number.isInteger(p.price)&&p.price>=0&&typeof p.url==='string'&&/^https?:\/\//.test(p.url)).map((p:Product)=>({name:p.name,price:p.price,url:p.url,sellerName:typeof p.sellerName==='string'?p.sellerName:'販売元情報なし',janCode:typeof p.janCode==='string'?p.janCode:''}))
  }finally{busy=false}
 }
}
