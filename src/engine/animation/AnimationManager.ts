import Phaser from "phaser";
export class AnimationManager{
 constructor(private scene:Phaser.Scene){}
 create(key:string,frames:string[],frameRate=8,repeat=-1){
  if(this.scene.anims.exists(key))return;
  this.scene.anims.create({key,frames:frames.map(textureKey=>({key:textureKey})),frameRate,repeat});
 }
 createPlayerWalk(){
  for(const [dir,start] of [["s",0],["n",4],["e",8],["w",12] ] as const){
   this.create(`player-walk-${dir}`,Array.from({length:4},(_,j)=>`player_${dir}_${j}`),8,-1);
  }
 }
}