import Phaser from "phaser";
import classes from "../../data/classes.json";
import elements from "../../data/elements.json";
import type {NinjaClass} from "../game/character/CharacterSheet";
import type {SessionSnapshot} from "../game/session/GameSession";
import {BrowserStorage} from "../platform/browser/BrowserStorage";
export class CharacterCreationScene extends Phaser.Scene{
 private selectedClass:NinjaClass="ninjutsu";private selected:string[]=["katon","suiton","fuuton"];private name="Shinobi";private status!:Phaser.GameObjects.Text;
 constructor(){super("CharacterCreationScene")}
 create(){
  this.cameras.main.setBackgroundColor("#151813");
  this.add.text(70,45,"CRIAÇÃO DE PERSONAGEM",{fontFamily:"monospace",fontSize:"24px",color:"#e6c96e"});
  this.add.text(70,82,"O personagem é construído por classe + atributos + até 3 naturezas.",{fontFamily:"monospace",fontSize:"13px",color:"#c9d0c8"});
  this.add.text(70,125,"Nome:",{fontFamily:"monospace",fontSize:"14px",color:"#e1e0d5"});
  this.add.text(70,148,this.name,{fontFamily:"monospace",fontSize:"18px",color:"#ffffff",backgroundColor:"#282d27",padding:{x:8,y:6}});
  this.add.text(70,195,"CLASSE",{fontFamily:"monospace",fontSize:"15px",color:"#e6c96e"});
  (classes.classes as Array<any>).forEach((c,i)=>this.button(70+i*175,225,c.label,()=>{this.selectedClass=c.id;this.refresh()}));
  this.add.text(70,290,"NATUREZAS DE CHAKRA — escolha até 3",{fontFamily:"monospace",fontSize:"15px",color:"#e6c96e"});
  (elements.elements as Array<any>).filter(e=>e.tier==="basic").forEach((e,i)=>this.button(70+i*150,320,e.label,()=>{if(this.selected.includes(e.id))this.selected=this.selected.filter(x=>x!==e.id);else if(this.selected.length<3)this.selected.push(e.id);this.refresh()}));
  this.status=this.add.text(70,405,"",{fontFamily:"monospace",fontSize:"13px",color:"#d8ddd5",backgroundColor:"#222721",padding:{x:10,y:8}});
  this.button(70,480,"CRIAR PERSONAGEM",()=>this.createCharacter());
  this.refresh();
 }
 private button(x:number,y:number,label:string,cb:()=>void){const box=this.add.rectangle(x,y,150,42,0x2f362e).setOrigin(0).setStrokeStyle(1,0x7f806d).setInteractive({useHandCursor:true});const t=this.add.text(x+10,y+11,label,{fontFamily:"monospace",fontSize:"12px",color:"#eee8d5"}).setInteractive({useHandCursor:true});box.on("pointerdown",cb);t.on("pointerdown",cb)}
 private refresh(){this.status.setText("Classe: "+this.selectedClass.toUpperCase()+"\nNaturezas: "+this.selected.map(x=>x.toUpperCase()).join(", ")+"\nVocê começará como Acadêmico. Os atributos poderão ser treinados e os jutsus aprendidos mediante requisitos.")}
 private createCharacter(){
  if(this.selected.length!==3){this.status.setText("Escolha exatamente 3 naturezas para iniciar.");return}
  const cls=this.selectedClass;
  const base={ninjutsu:5,taijutsu:5,bukijutsu:5,genjutsu:5,agilidade:5,selo:5,forca:5,energia:5,inteligencia:5,resistencia:5};
  const primary=cls==="ninjutsu"?"ninjutsu":cls==="taijutsu"?"taijutsu":cls==="genjutsu"?"genjutsu":"bukijutsu";base[primary]+=3;
  const snap:SessionSnapshot={sheet:{level:1,xp:0,xpToNext:100,trainingPoints:3,talentPoints:0,attributes:base,resources:{vida:100,chakra:70,stamina:70},build:{grade:"academy",classId:cls,elements:[...this.selected]},knownJutsus:[],equipment:{}},position:{x:8,y:24},quests:{slimes:0,ruinsAccepted:false,step:0},inventory:["kunai","potion"]};
  new BrowserStorage().setItem("shinobi-engine-0.1.1",JSON.stringify(snap));this.scene.start("WorldScene");
 }
}