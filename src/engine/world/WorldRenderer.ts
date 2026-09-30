import Phaser from "phaser";
import type {MapDefinition} from "./MapDefinition";
import {tileAt} from "./MapLoader";
const MAP_TILE_TEXTURE:Record<string,string>={g:"grass",a:"grass_alt",d:"dirt",s:"stone",w:"wall"};
export class WorldRenderer{
 constructor(private readonly scene:Phaser.Scene,private readonly map:MapDefinition){}
 draw(){for(let y=0;y<this.map.height;y++)for(let x=0;x<this.map.width;x++){this.scene.add.image(x*32+16,y*32+16,MAP_TILE_TEXTURE[tileAt(this.map,x,y)]??"grass").setDepth(0);}}
}