export type AssetKind="svg";
export interface AssetManifestEntry{ id:string; path:string; kind:AssetKind; width?:number; height?:number; required?:boolean; }
export const ASSETS:AssetManifestEntry[]=[
{id:"grass",path:"assets/tiles/grass.svg",kind:"svg",required:true},{id:"grass_alt",path:"assets/tiles/grass_alt.svg",kind:"svg",required:true},
{id:"dirt",path:"assets/tiles/dirt.svg",kind:"svg",required:true},{id:"stone",path:"assets/tiles/stone.svg",kind:"svg",required:true},
{id:"wall",path:"assets/tiles/wall.svg",kind:"svg",required:true},{id:"roof",path:"assets/tiles/roof.svg",kind:"svg",required:true},{id:"door",path:"assets/tiles/door.svg",kind:"svg",required:true},
{id:"tree",path:"assets/tiles/tree.svg",kind:"svg",required:true},{id:"bush",path:"assets/tiles/bush.svg",kind:"svg",required:true},
{id:"ruin_gate",path:"assets/tiles/ruin_gate.svg",kind:"svg",required:true},{id:"mei",path:"assets/npcs/mei.svg",kind:"svg",required:true},{id:"toma",path:"assets/npcs/toma.svg",kind:"svg",required:true},{id:"sage",path:"assets/npcs/sage.svg",kind:"svg",required:true},
{id:"slime",path:"assets/creatures/slime.svg",kind:"svg",required:true},{id:"wolf",path:"assets/creatures/wolf.svg",kind:"svg",required:true},{id:"golem",path:"assets/creatures/golem.svg",kind:"svg",required:true},{id:"guardian",path:"assets/creatures/guardian.svg",kind:"svg",required:true},
{id:"kunai",path:"assets/items/kunai.svg",kind:"svg",required:true},{id:"potion",path:"assets/items/potion.svg",kind:"svg",required:true},
{id:"fx_katon",path:"assets/effects/katon.svg",kind:"svg",required:true},{id:"fx_suiton",path:"assets/effects/suiton.svg",kind:"svg",required:true},{id:"fx_fuuton",path:"assets/effects/fuuton.svg",kind:"svg",required:true},{id:"fx_doton",path:"assets/effects/doton.svg",kind:"svg",required:true},{id:"fx_raiton",path:"assets/effects/raiton.svg",kind:"svg",required:true},{id:"fx_critical",path:"assets/effects/critical.svg",kind:"svg",required:true},{id:"fx_hit",path:"assets/effects/hit.svg",kind:"svg",required:true},
...Array.from({length:16},(_,i)=>({id:`player_${Math.floor(i/4)===0?"s":Math.floor(i/4)===1?"n":Math.floor(i/4)===2?"e":"w"}_${i%4}`,path:`assets/characters/player_${["s","n","e","w"][Math.floor(i/4)]}_${i%4}.svg`,kind:"svg" as const,width:32,height:32,required:true}))
];