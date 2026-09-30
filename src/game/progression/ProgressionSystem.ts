import type {CharacterSheet} from "../character/CharacterSheet";
export function xpForLevel(level:number){return 100+(level-1)*75}
export function awardXp(sheet:CharacterSheet,xp:number){sheet.xp+=xp;let leveled=0;while(sheet.xp>=sheet.xpToNext){sheet.xp-=sheet.xpToNext;sheet.level++;sheet.trainingPoints+=3;sheet.talentPoints+=1;sheet.xpToNext=xpForLevel(sheet.level);leveled++}return leveled}
export function primaryAttribute(classId:CharacterSheet["build"]["classId"]){return ({taijutsu:"taijutsu",ninjutsu:"ninjutsu",genjutsu:"genjutsu",bukijutsu:"bukijutsu"} as const)[classId]}
export function trainAttribute(sheet:CharacterSheet){if(sheet.trainingPoints<=0)return false;sheet.attributes[primaryAttribute(sheet.build.classId)]++;sheet.trainingPoints--;return true}