import {SaveManager} from "../../engine/persistence/SaveManager";
import type {StorageLike} from "../../platform/Storage";
import type {CharacterSheet} from "../character/CharacterSheet";
export interface SessionSnapshot{sheet:CharacterSheet;position:{x:number;y:number};quests:{slimes:number;ruinsAccepted:boolean;step:number}}
export class GameSession{
 readonly save:SaveManager<SessionSnapshot>;
 constructor(public snapshot:SessionSnapshot,storage:StorageLike){this.save=new SaveManager<SessionSnapshot>(storage,"shinobi-engine-0.1.1")}
 saveNow(){this.save.save(this.snapshot)}
 load(){const data=this.save.load();if(data)this.snapshot=data;return data}
}