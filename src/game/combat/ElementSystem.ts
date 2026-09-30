import elementData from "../../../data/elements.json";
export class ElementSystem{
 multiplier(attacker:string,defender:string){return (elementData.matchups as Record<string,Record<string,number>>)[attacker]?.[defender]??1}
 canLearn(current:string[]){return current.length<(elementData.maxNatureTypesPerCharacter as number)}
}