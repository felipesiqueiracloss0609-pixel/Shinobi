export interface StorageLike{getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export class SaveManager<T>{
 constructor(private readonly storage:StorageLike,private readonly key:string){}
 save(value:T){this.storage.setItem(this.key,JSON.stringify(value))}
 load():T|null{const raw=this.storage.getItem(this.key);if(!raw)return null;try{return JSON.parse(raw) as T}catch{return null}}
 clear(){this.storage.removeItem(this.key)}
}