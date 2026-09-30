import type {CharacterSheet} from "../character/CharacterSheet";
import {ElementSystem} from "./ElementSystem";
export interface CombatResult{hit:boolean;critical:boolean;damage:number;multiplier:number}
export class CombatResolver{
 constructor(private elements=new ElementSystem()){}
 resolve(attacker:CharacterSheet,target:{defense:number;element?:string},power:number,accuracy=1,critChance=0,atkElement?:string):CombatResult{
  const roll=Math.random(); if(roll>accuracy)return{hit:false,critical:false,damage:0,multiplier:1};
  const critical=Math.random()<critChance; const mult=atkElement&&target.element?this.elements.multiplier(atkElement,target.element):1;
  const raw=(power+attacker.attributes.ninjutsu+attacker.attributes.taijutsu+attacker.attributes.bukijutsu+attacker.attributes.genjutsu);
  const damage=Math.max(1,Math.round((raw*(critical?1.25:1)*mult)-target.defense));
  return{hit:true,critical,damage,multiplier:mult};
 } 
}