import type {CharacterSheet} from "../character/CharacterSheet";
import {SaveManager} from "../../engine/persistence/SaveManager";
const storage={getItem:(k:string)=>window.localStorage.getItem(k),setItem:(k:string,v:string)=>window.localStorage.setItem(k,v),removeItem:(k:string)=>window.localStorage.removeItem(k)};
export interface SessionSnapshot{sheet:CharacterSheet;position:{x:number;y:number};quests:{slimes:number;ruinsAccepted:boolean}}
export class GameSession{
 readonly save=new SaveManager<SessionSnapshot>(storage,"shinobi-engine-0.1.1");
 constructor(public snapshot:SessionSnapshot){}
 saveNow(){this.save.save(this.snapshot)}
 load(){const data=this.save.load();if(data)this.snapshot=data;return data}
}