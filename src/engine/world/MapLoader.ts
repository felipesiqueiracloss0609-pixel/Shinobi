import type {MapDefinition} from "./MapDefinition";
export function buildGrid(def:MapDefinition,block:(x:number,y:number)=>void){for(const r of def.blockedRects)for(let y=r.y;y<r.y+r.height;y++)for(let x=r.x;x<r.x+r.width;x++)block(x,y)}
export function tileAt(def:MapDefinition,x:number,y:number){return def.ground[y]?.[x]??"g"}
