import type {CharacterSheet} from "../character/CharacterSheet";
export interface Requirements{level?:number;grade?:string;classId?:string;attributes?:Partial<CharacterSheet["attributes"]>;elements?:string[]}
export function meetsRequirements(c:CharacterSheet,r:Requirements){
 if(r.level&&c.level<r.level)return false;if(r.grade&&c.build.grade!==r.grade)return false;if(r.classId&&c.build.classId!==r.classId)return false;
 for(const [k,v] of Object.entries(r.attributes??{}))if((c.attributes[k as keyof CharacterSheet["attributes"]]??0)<(v as number))return false;
 for(const e of r.elements??[])if(!c.build.elements.includes(e))return false;return true;
}