import type {CharacterSheet} from "../character/CharacterSheet";
import {ElementSystem} from "./ElementSystem";
export interface CombatResult{hit:boolean;critical:boolean;damage:number;multiplier:number}
export class CombatResolver{
 constructor(private readonly elements=new ElementSystem()){}
 resolve(attacker:CharacterSheet,target:{defense:number;element?:string},power:number,accuracy=1,critChance=0,atkElement?:string,rng=Math.random):CombatResult{
  if(rng()>accuracy)return{hit:false,critical:false,damage:0,multiplier:1};
  const critical=rng()<critChance;const primary={taijutsu:"taijutsu",ninjutsu:"ninjutsu",genjutsu:"genjutsu",bukijutsu:"bukijutsu"}[attacker.build.classId] as keyof typeof attacker.attributes;
  const mult=atkElement&&target.element?this.elements.multiplier(atkElement,target.element):1;const raw=power+attacker.attributes[primary]*2+attacker.attributes.selo*0.5;
  return{hit:true,critical,damage:Math.max(1,Math.round(raw*(critical?1.25:1)*mult-target.defense)),multiplier:mult};
 }
}