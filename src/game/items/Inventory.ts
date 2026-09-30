import type {CharacterSheet} from "../character/CharacterSheet";
export const ITEM_LABELS:Record<string,string>={kunai:"Kunai",potion:"Poção de Vida",headband:"Bandana Shinobi",amulet:"Amuleto de Chakra"};
export function hasItem(sheet:CharacterSheet,id:string){return sheet.inventory.includes(id)}
export function addItem(sheet:CharacterSheet,id:string){sheet.inventory.push(id)}
export function removeOne(sheet:CharacterSheet,id:string){const i=sheet.inventory.indexOf(id);if(i<0)return false;sheet.inventory.splice(i,1);return true}
export function usePotion(sheet:CharacterSheet){if(!removeOne(sheet,"potion"))return false;sheet.resources.vida=Math.min(100,sheet.resources.vida+35);return true}
export function equipItem(sheet:CharacterSheet,id:string){
 if(!hasItem(sheet,id))return false;
 if(id==="kunai")sheet.equipment.weapon=id;else if(id==="headband")sheet.equipment.head=id;else if(id==="amulet")sheet.equipment.amulet=id;else return false;
 return true;
}