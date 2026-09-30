import type {CharacterSheet} from "../character/CharacterSheet";
export interface QuestState{slimes:number;ruinsAccepted:boolean;step:number}
export function progressQuest(state:QuestState,sheet:CharacterSheet){
 if(state.step===0)return;
 if(state.step===1&&sheet.knownJutsus.length===0)return;
 if(state.step===1&&sheet.knownJutsus.length>0)state.step=3;
 if(state.step===2&&sheet.knownJutsus.length>0)state.step=3;
 if(state.step===3&&state.slimes>=5)state.step=4;
}
export function questLabel(state:QuestState){
 return ["Fale com Mei","Treine um atributo","Aprenda seu primeiro jutsu","Derrote 5 Gosmas","Fale com Toma","Explore as Ruínas"][state.step]??"Explore";
}