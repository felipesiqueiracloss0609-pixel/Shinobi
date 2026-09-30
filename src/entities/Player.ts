import Phaser from "phaser";
import {AnimationManager} from "../engine/animation/AnimationManager";
export class Player extends Phaser.GameObjects.Sprite{
 readonly grid={x:8,y:24};private moving=false;private targetX=0;private targetY=0;private readonly speed=210;
 constructor(scene:Phaser.Scene,private readonly canMove:(x:number,y:number)=>boolean){super(scene,8*32+16,24*32+16,"player_s_0");scene.add.existing(this);this.setOrigin(.5,.78).setDepth(100);new AnimationManager(scene).createPlayerWalk();}
 requestStep(dx:number,dy:number){if(this.moving||(dx===0&&dy===0))return;const nx=this.grid.x+dx,ny=this.grid.y+dy;if(!this.canMove(nx,ny))return;this.grid.x=nx;this.grid.y=ny;this.targetX=nx*32+16;this.targetY=ny*32+16;this.moving=true;const dir=Math.abs(dx)>=Math.abs(dy)?(dx>0?"e":"w"):(dy>0?"s":"n");this.play("player-walk-"+dir,true)}
 preUpdate(time:number,delta:number){super.preUpdate(time,delta);if(this.moving){const step=this.speed*delta/1000;const nx=Math.abs(this.targetX-this.x)<=step?this.targetX:this.x+Math.sign(this.targetX-this.x)*step;const ny=Math.abs(this.targetY-this.y)<=step?this.targetY:this.y+Math.sign(this.targetY-this.y)*step;this.setPosition(nx,ny);if(nx===this.targetX&&ny===this.targetY){this.moving=false;this.stop()}}this.setDepth(this.grid.y*10+20)}
 isMoving(){return this.moving}
}