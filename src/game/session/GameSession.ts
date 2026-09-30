import {SaveManager} from "../../engine/persistence/SaveManager";
import type {StorageLike} from "../../platform/Storage";
import type {CharacterSheet} from "../character/CharacterSheet";
export interface SessionSnapshot{version:number;sheet:CharacterSheet;position:{x:number;y:number};quests:{slimes:number;ruinsAccepted:boolean;step:number}}
export class GameSession{
 readonly save:SaveManager<SessionSnapshot>;
 constructor(public snapshot:SessionSnapshot,storage:StorageLike){this.save=new SaveManager<SessionSnapshot>(storage,"shinobi-engine-0.1.1-v1")}
 saveNow(){this.snapshot.version=1;this.save.save(this.snapshot)}
 load(){const data=this.save.load();if(!data)return null;data.version=data.version??1;data.sheet.knownJutsus=data.sheet.knownJutsus??[];data.sheet.inventory=data.sheet.inventory??[];data.sheet.equipment=data.sheet.equipment??{};data.sheet.xp=data.sheet.xp??0;data.sheet.xpToNext=data.sheet.xpToNext??100;data.sheet.trainingPoints=data.sheet.trainingPoints??0;data.sheet.talentPoints=data.sheet.talentPoints??0;data.quests.slimes=data.quests.slimes??0;data.quests.ruinsAccepted=data.quests.ruinsAccepted??false;data.quests.step=data.quests.step??0;this.snapshot=data;return data}
}