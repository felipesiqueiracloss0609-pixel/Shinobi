import type {CharacterSheet} from "../character/CharacterSheet";
export interface QuestState{slimes:number;ruinsAccepted:boolean;step:number}
export function progressQuest(state:QuestState,sheet:CharacterSheet){if(state.step===3&&state.slimes>=5)state.step=4;if(state.step===1&&sheet.knownJutsus.length>0)state.step=2}
export function questLabel(state:QuestState){
 return ["Fale com Mei","Treine um atributo","Aprenda seu primeiro jutsu","Derrote 5 Gosmas","Fale com Toma e abra as Ruínas"][state.step]??"Explore";
}