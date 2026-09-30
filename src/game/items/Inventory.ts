import type {CharacterSheet} from "../character/CharacterSheet";
export const ITEM_LABELS:Record<string,string>={kunai:"Kunai",potion:"Poção de Vida",headband:"Bandana Shinobi",amulet:"Amuleto de Chakra"};
export function hasItem(sheet:CharacterSheet,id:string){return sheet.inventory.includes(id)}
export function addItem(sheet:CharacterSheet,id:string){sheet.inventory.push(id)}
export function equipItem(sheet:CharacterSheet,id:string){
 if(!hasItem(sheet,id))return false;
 if(id==="kunai")sheet.equipment.weapon=id;else if(id==="headband")sheet.equipment.head=id;else if(id==="amulet")sheet.equipment.amulet=id;else return false;
 return true;
}