import Phaser from "phaser";
import classes from "../../data/classes.json";
import elements from "../../data/elements.json";
import type {NinjaClass} from "../game/character/CharacterSheet";
import type {SessionSnapshot} from "../game/session/GameSession";
import {BrowserStorage} from "../platform/browser/BrowserStorage";

export class CharacterCreationScene extends Phaser.Scene{
 private selectedClass:NinjaClass="ninjutsu";
 private selected:string[]=["katon","suiton","fuuton"];
 private status!:Phaser.GameObjects.Text;
 constructor(){super("CharacterCreationScene")}
 create(){
  this.cameras.main.setBackgroundColor("#151813");
  this.add.text(70,45,"CRIAÇÃO DE PERSONAGEM",{fontFamily:"monospace",fontSize:"24px",color:"#e6c96e"});
  this.add.text(70,82,"Escolha uma classe e exatamente 3 naturezas de chakra.",{fontFamily:"monospace",fontSize:"13px",color:"#c9d0c8"});
  this.add.text(70,130,"CLASSE",{fontFamily:"monospace",fontSize:"15px",color:"#e6c96e"});
  (classes.classes as Array<any>).forEach((c,i)=>this.button(70+i*175,160,c.label,()=>{this.selectedClass=c.id;this.refresh()}));
  this.add.text(70,235,"NATUREZAS",{fontFamily:"monospace",fontSize:"15px",color:"#e6c96e"});
  (elements.elements as Array<any>).filter(e=>e.tier==="basic").forEach((e,i)=>this.button(70+i*150,265,e.label,()=>{if(this.selected.includes(e.id))this.selected=this.selected.filter(x=>x!==e.id);else if(this.selected.length<3)this.selected.push(e.id);this.refresh()}));
  this.status=this.add.text(70,350,"",{fontFamily:"monospace",fontSize:"13px",color:"#d8ddd5",backgroundColor:"#222721",padding:{x:10,y:8}});
  this.button(70,445,"CRIAR PERSONAGEM",()=>this.createCharacter());this.refresh();
 }
 private button(x:number,y:number,label:string,cb:()=>void){
  const box=this.add.rectangle(x,y,150,42,0x2f362e).setOrigin(0).setStrokeStyle(1,0x7f806d).setInteractive({useHandCursor:true});
  const t=this.add.text(x+10,y+11,label,{fontFamily:"monospace",fontSize:"12px",color:"#eee8d5"});
  box.on("pointerdown",cb);t.setInteractive({useHandCursor:true}).on("pointerdown",cb);
 }
 private refresh(){this.status.setText("Classe: "+this.selectedClass.toUpperCase()+"\nNaturezas: "+this.selected.map(x=>x.toUpperCase()).join(", ")+"\nA escolha das naturezas limita os jutsus elementais disponíveis.");}
 private createCharacter(){
  if(this.selected.length!==3){this.status.setText("Escolha exatamente 3 naturezas.");return}
  const cls=this.selectedClass;
  const base={ninjutsu:5,taijutsu:5,bukijutsu:5,genjutsu:5,agilidade:5,selo:5,forca:5,energia:5,inteligencia:5,resistencia:5};
  const primary=cls==="ninjutsu"?"ninjutsu":cls==="taijutsu"?"taijutsu":cls==="genjutsu"?"genjutsu":"bukijutsu";base[primary]+=3;
  const snap:SessionSnapshot={version:1,sheet:{level:1,xp:0,xpToNext:100,trainingPoints:3,talentPoints:0,attributes:base,resources:{vida:100,chakra:70,stamina:70},build:{grade:"academy",classId:cls,elements:[...this.selected]},knownJutsus:[],equipment:{},inventory:["kunai","potion"]},position:{x:8,y:24},quests:{slimes:0,ruinsAccepted:false,step:0}};
  new BrowserStorage().setItem("shinobi-engine-0.1.1-v1",JSON.stringify(snap));this.scene.start("WorldScene");
 }
}