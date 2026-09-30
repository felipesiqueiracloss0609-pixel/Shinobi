import Phaser from "phaser";
import {AssetManager} from "../engine/assets/AssetManager";
import {BrowserStorage} from "../platform/browser/BrowserStorage";
export class BootScene extends Phaser.Scene{
 private assets!:AssetManager;
 constructor(){super("BootScene")}
 preload(){
  this.add.rectangle(480,304,560,100,0x151b16).setStrokeStyle(1,0x777777);
  this.add.text(250,270,"SHINOBI NO VALE",{fontFamily:"monospace",fontSize:"24px",color:"#e6c96e"});
  const status=this.add.text(250,310,"Carregando asset pipeline… 0%",{fontFamily:"monospace",fontSize:"12px",color:"#c4ccc5"});
  this.load.on(Phaser.Loader.Events.PROGRESS,(p:number)=>status.setText("Carregando asset pipeline… "+Math.round(p*100)+"%"));
  this.assets=new AssetManager(this);this.assets.preload();
 }
 create(){
  const missing=this.assets.missingRequired();
  if(missing.length){this.add.text(250,335,"Assets ausentes: "+missing.join(", "),{fontFamily:"monospace",fontSize:"9px",color:"#ef7777"});return}
  const storage=new BrowserStorage();this.registry.set("assetReport",this.assets.report());
  this.scene.start(storage.getItem("shinobi-engine-0.1.1")?"WorldScene":"CharacterCreationScene");
 }
}