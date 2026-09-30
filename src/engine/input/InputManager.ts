import Phaser from "phaser";
export type Action="up"|"down"|"left"|"right"|"attack"|"skill1"|"interact"|"element1"|"element2"|"element3"|"element4";
export class InputManager{
 readonly keys:Record<Action,Phaser.Input.Keyboard.Key>;
 constructor(scene:Phaser.Scene){
  const k=scene.input.keyboard!; const add=(codes:string|string[])=>k.addKey(codes);
  this.keys={up:add(["W","UP"]),down:add(["S","DOWN"]),left:add(["A","LEFT"]),right:add(["D","RIGHT"]),attack:add("SPACE"),skill1:add("Q"),interact:add("F"),element1:add("ONE"),element2:add("TWO"),element3:add("THREE"),element4:add("FOUR")} as Record<Action,Phaser.Input.Keyboard.Key>;
 }
 isDown(action:Action){return this.keys[action].isDown}
}