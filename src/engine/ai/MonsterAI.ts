export type AIState="idle"|"wander"|"chase"|"attack";
export interface AIMob{grid:{x:number;y:number};alive:boolean}
export class MonsterAI{
 constructor(private readonly bounds:{width:number;height:number}){}
 decide(mob:AIMob,target:{x:number;y:number},walkable:(x:number,y:number)=>boolean,occupied:(x:number,y:number)=>boolean):{state:AIState;dx:number;dy:number}{
  if(!mob.alive)return{state:"idle",dx:0,dy:0};
  const dx=target.x-mob.grid.x,dy=target.y-mob.grid.y,dist=Math.abs(dx)+Math.abs(dy);
  if(dist<=1)return{state:"attack",dx:0,dy:0};
  if(dist<=7){const sx=Math.sign(dx),sy=Math.sign(dy);const candidates:([number,number])[]=Math.abs(dx)>=Math.abs(dy)?[[sx,0],[0,sy]]:[[0,sy],[sx,0]];for(const [mx,my] of candidates)if((mx||my)&&walkable(mob.grid.x+mx,mob.grid.y+my)&&!occupied(mob.grid.x+mx,mob.grid.y+my))return{state:"chase",dx:mx,dy:my};}
  if(Math.random()<0.08){const options:[[number,number],[number,number],[number,number],[number,number]]=[[1,0],[-1,0],[0,1],[0,-1]];const [mx,my]=options[Math.floor(Math.random()*options.length)];if(walkable(mob.grid.x+mx,mob.grid.y+my)&&!occupied(mob.grid.x+mx,mob.grid.y+my))return{state:"wander",dx:mx,dy:my};}
  return{state:"idle",dx:0,dy:0};
 }
}