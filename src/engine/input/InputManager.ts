import Phaser from "phaser";
export type Action="up"|"down"|"left"|"right"|"attack"|"skill1"|"interact"|"element1"|"element2"|"element3"|"save"|"load";
export class InputManager{
 readonly keys:Record<Action,Phaser.Input.Keyboard.Key>;
 constructor(scene:Phaser.Scene){
  const k=scene.input.keyboard!;const key=(code:number)=>k.addKey(code);
  this.keys={up:key(Phaser.Input.Keyboard.KeyCodes.W),down:key(Phaser.Input.Keyboard.KeyCodes.S),left:key(Phaser.Input.Keyboard.KeyCodes.A),right:key(Phaser.Input.Keyboard.KeyCodes.D),attack:key(Phaser.Input.Keyboard.KeyCodes.SPACE),skill1:key(Phaser.Input.Keyboard.KeyCodes.Q),interact:key(Phaser.Input.Keyboard.KeyCodes.F),element1:key(Phaser.Input.Keyboard.KeyCodes.ONE),element2:key(Phaser.Input.Keyboard.KeyCodes.TWO),element3:key(Phaser.Input.Keyboard.KeyCodes.THREE),save:key(Phaser.Input.Keyboard.KeyCodes.P),load:key(Phaser.Input.Keyboard.KeyCodes.O)};
 }
 isDown(a:Action){return this.keys[a].isDown}
 isJustDown(a:Action){return Phaser.Input.Keyboard.JustDown(this.keys[a])}
}