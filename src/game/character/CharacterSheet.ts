export interface CharacterAttributes{ninjutsu:number;taijutsu:number;bukijutsu:number;genjutsu:number;agilidade:number;selo:number;forca:number;energia:number;inteligencia:number;resistencia:number}
export interface CharacterResources{vida:number;chakra:number;stamina:number}
export type NinjaClass="taijutsu"|"ninjutsu"|"genjutsu"|"bukijutsu";
export interface CharacterBuild{grade:string;classId:NinjaClass;elements:string[];clan?:string;invocation?:string;sageMode?:string;cursedSeal?:string;gates?:string}
export interface CharacterSheet{level:number;attributes:CharacterAttributes;resources:CharacterResources;build:CharacterBuild}