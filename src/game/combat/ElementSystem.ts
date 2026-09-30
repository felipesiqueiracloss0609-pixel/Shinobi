import elementData from "../../../data/elements.json";
type ElementMap=Record<string,Record<string,number>>;
export class ElementSystem{
 private matchups=elementData.matchups as ElementMap;
 multiplier(attacker:string,defender:string){return this.matchups[attacker]?.[defender]??elementData.defaultMultiplier}
 canLearn(current:string[],candidate:string){return current.includes(candidate)||current.length<(elementData.maxNatureTypesPerCharacter as number)}
}