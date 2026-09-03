import { database } from '../db/database'
import type { Store } from '../models/store'
import type { Prize } from '../models/prize'
import type { PlayRecord } from '../models/play'

interface BackupData { format:'crane-record-backup'; version:1; exportedAt:string; stores:Store[]; prizes:Prize[]; plays:PlayRecord[] }
interface ImportResult { storesAdded:number; prizesAdded:number; playsAdded:number; skipped:number }
const isObject=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null
const hasId=(value:unknown):value is {id:string}=>isObject(value)&&typeof value.id==='string'&&value.id.length>0

export const backupService={
 async export():Promise<BackupData>{const [stores,prizes,plays]=await Promise.all([database.stores.toArray(),database.prizes.toArray(),database.plays.toArray()]);return{format:'crane-record-backup',version:1,exportedAt:new Date().toISOString(),stores,prizes,plays}},
 async import(raw:unknown):Promise<ImportResult>{if(!isObject(raw)||raw.format!=='crane-record-backup'||raw.version!==1||!Array.isArray(raw.stores)||!Array.isArray(raw.prizes)||!Array.isArray(raw.plays))throw new Error('このアプリの有効なバックアップファイルではありません。');const stores=raw.stores.filter(hasId) as Store[];const prizes=raw.prizes.filter(hasId) as Prize[];const plays=raw.plays.filter(hasId) as PlayRecord[];const result={storesAdded:0,prizesAdded:0,playsAdded:0,skipped:0};await database.transaction('rw',database.stores,database.prizes,database.plays,async()=>{for(const item of stores){if(await database.stores.get(item.id)){result.skipped++}else{await database.stores.add(item);result.storesAdded++}}for(const item of prizes){if(await database.prizes.get(item.id)){result.skipped++}else{await database.prizes.add(item);result.prizesAdded++}}for(const item of plays){if(await database.plays.get(item.id)){result.skipped++}else if(await database.stores.get(item.storeId)&&await database.prizes.get(item.prizeId)){await database.plays.add(item);result.playsAdded++}else result.skipped++}});return result}
}
