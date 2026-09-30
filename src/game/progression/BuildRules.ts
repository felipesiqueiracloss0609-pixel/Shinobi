import rules from "../../../data/specializations.json";
export type BuildPath="clan"|"chakra_gates"|"sage_mode"|"cursed_seal"|"summon";
export function canChoosePath(active:BuildPath[],candidate:BuildPath){
 if(active.includes(candidate))return true;
 return !(rules.mutualExclusions as BuildPath[][]).some(pair=>pair.includes(candidate)&&pair.some(x=>x!==candidate&&active.includes(x)));
}