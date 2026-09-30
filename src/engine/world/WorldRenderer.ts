import Phaser from "phaser";
import type {GridMap} from "./GridMap";
export class WorldRenderer{
 constructor(private readonly scene:Phaser.Scene,private readonly grid:GridMap){}
 draw(tile:(x:number,y:number)=>string){
  for(let y=0;y<this.grid.height;y++)for(let x=0;x<this.grid.width;x++){
   this.scene.add.image(x*32+16,y*32+16,tile(x,y)).setDepth(0);
  }
 }
}