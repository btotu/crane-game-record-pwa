export type PlayResult = '獲得' | '撤退' | 'アシスト獲得'
export interface PlayRecord { id:string; storeId:string; prizeId:string; playDate:string; startedAt:string; endedAt:string; amount:number; result:PlayResult; memo:string; isApproximate:boolean }
export interface PlayInput { storeId:string; prizeId:string; amount:number; result:PlayResult }
export interface ApproximatePlayInput extends PlayInput { playDate:string; playTime:string }
