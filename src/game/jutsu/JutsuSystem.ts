import jutsuData from "../../../data/jutsus_demo.json";
import type {CharacterSheet} from "../character/CharacterSheet";
export interface LearnResult{ok:boolean;reason:string;jutsuId?:string}
export class JutsuSystem{
 private readonly data=jutsuData.jutsus as any[];
 list(sheet:CharacterSheet){return sheet.knownJutsus.map(id=>this.data.find(j=>j.id===id)).filter(Boolean)}
 availableFor(sheet:CharacterSheet){return this.data.filter(j=>this.meets(sheet,j))}
 find(id:string){return this.data.find(j=>j.id===id)}
 learn(sheet:CharacterSheet,jutsuId:string):LearnResult{
  if(sheet.knownJutsus.includes(jutsuId))return{ok:false,reason:"Jutsu já aprendido."};
  const j=this.find(jutsuId);if(!j)return{ok:false,reason:"Jutsu inexistente."};
  if(!this.meets(sheet,j))return{ok:false,reason:"Requisitos não atendidos."};
  sheet.knownJutsus.push(jutsuId);return{ok:true,reason:"Jutsu aprendido.",jutsuId};
 }
 private meets(sheet:CharacterSheet,j:any){
  const req=j.requirements??{};if(sheet.level<(req.level??1))return false;
  if(req.classId&&req.classId!==sheet.build.classId)return false;
  if(req.allowedClasses&&!req.allowedClasses.includes(sheet.build.classId))return false;
  for(const [k,v] of Object.entries(req.attributes??{}))if((sheet.attributes[k as keyof CharacterSheet["attributes"]]??0)<(v as number))return false;
  if(j.element&&!sheet.build.elements.includes(j.element))return false;return true;
 }
}