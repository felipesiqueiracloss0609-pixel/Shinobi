import Phaser from "phaser";
import jutsuData from "../../data/jutsus_demo.json";
import {GridMap} from "../engine/world/GridMap";
import {WorldRenderer} from "../engine/world/WorldRenderer";
import {Player} from "../entities/Player";
import {CombatResolver} from "../game/combat/CombatResolver";
import {GameSession,type SessionSnapshot} from "../game/session/GameSession";
import {awardXp,trainAttribute} from "../game/progression/ProgressionSystem";
import {addItem,equipItem,ITEM_LABELS} from "../game/items/Inventory";
import {questLabel,progressQuest} from "../game/quests/QuestSystem";
import {BrowserStorage} from "../platform/browser/BrowserStorage";
import {JutsuSystem} from "../game/jutsu/JutsuSystem";
import type {NinjaClass} from "../game/character/CharacterSheet";

interface Mob{sprite:Phaser.GameObjects.Sprite;grid:{x:number;y:number};hp:number;max:number;atk:number;element:string;name:string;xp:number;alive:boolean}

export class WorldScene extends Phaser.Scene{
 private readonly grid=new GridMap(64,48);
 private player!:Player;
 private readonly mobs:Mob[]=[];
 private readonly resolver=new CombatResolver();
 private readonly jutsuSystem=new JutsuSystem();
 private session!:GameSession;
 private hud!:Phaser.GameObjects.Text;
 private log!:Phaser.GameObjects.Text;
 private panel?:Phaser.GameObjects.Container;
 private activeElement="katon";
 private target?:Mob;
 private attackCooldown=0;
 private jutsuCooldown=0;
 private inventoryKey!:Phaser.Input.Keyboard.Key;
 private trainKey!:Phaser.Input.Keyboard.Key;
 private learnKey!:Phaser.Input.Keyboard.Key;
 private equipKey!:Phaser.Input.Keyboard.Key;
 private jutsuPanelKey!:Phaser.Input.Keyboard.Key;
 private newGameKey!:Phaser.Input.Keyboard.Key;

 constructor(){super("WorldScene")}

 create(){
  this.buildCollision();
  new WorldRenderer(this,this.grid).draw((x,y)=>this.terrain(x,y));
  this.placeObjects();

  const defaults=this.defaultSnapshot();
  this.session=new GameSession(defaults,new BrowserStorage());
  this.session.load();

  const s=this.session.snapshot;
  this.player=new Player(this,(x,y)=>this.grid.isWalkable(x,y)&&!this.mobAt(x,y));
  this.player.grid.x=s.position.x;
  this.player.grid.y=s.position.y;
  this.player.setPosition(s.position.x*32+16,s.position.y*32+16);

  this.cameras.main.setBounds(0,0,2048,1536);
  this.cameras.main.startFollow(this.player,true,.18,.18);

  this.inventoryKey=this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I);
  this.trainKey=this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T);
  this.learnKey=this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J);
  this.equipKey=this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  this.jutsuPanelKey=this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K);
  this.newGameKey=this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.N);

  this.hud=this.add.text(10,10,"",{fontFamily:"monospace",fontSize:"11px",color:"#eee7d8",backgroundColor:"#151916",padding:{x:6,y:5}}).setScrollFactor(0).setDepth(1000);
  this.log=this.add.text(10,105,"",{fontFamily:"monospace",fontSize:"11px",color:"#cdd4ce",backgroundColor:"#151916",padding:{x:6,y:5},wordWrap:{width:510}}).setScrollFactor(0).setDepth(1000);
  this.add.text(10,575,"WASD/setas • SPACE ataque • Q jutsu • 1/2/3 elemento • T treino • J aprender • I inventário • E equipar • F falar • P salvar • O carregar • K técnicas • N novo",{fontFamily:"monospace",fontSize:"9px",color:"#bec6bf",backgroundColor:"#151916",padding:{x:5,y:4}}).setScrollFactor(0).setDepth(1000);

  this.message("Bem-vindo. Objetivo: "+questLabel(s.quests)+".");
  this.message("Mei está na vila; Toma guarda o acesso às Ruínas.");

  this.input.on(Phaser.Input.Events.POINTER_DOWN,(pointer:Phaser.Input.Pointer)=>{
   if(this.panel)return;
   const tx=Math.floor(pointer.worldX/32),ty=Math.floor(pointer.worldY/32);
   if(!this.grid.isWalkable(tx,ty)||this.mobAt(tx,ty))return;
   const dx=tx-this.player.grid.x,dy=ty-this.player.grid.y;
   if(Math.abs(dx)>=Math.abs(dy))this.player.requestStep(Math.sign(dx),0);
   else if(dy!==0)this.player.requestStep(0,Math.sign(dy));
  });
 }

 private defaultSnapshot():SessionSnapshot{
  return{version:1,sheet:{
   level:1,xp:0,xpToNext:100,trainingPoints:3,talentPoints:0,
   attributes:{ninjutsu:8,taijutsu:5,bukijutsu:5,genjutsu:5,agilidade:5,selo:5,forca:5,energia:5,inteligencia:5,resistencia:5},
   resources:{vida:100,chakra:70,stamina:70},
   build:{grade:"academy",classId:"ninjutsu" as NinjaClass,elements:["katon","suiton","fuuton"]},
   knownJutsus:[],equipment:{},inventory:["kunai","potion"]
  },position:{x:8,y:24},quests:{slimes:0,ruinsAccepted:false,step:0}}
 }

 private terrain(x:number,y:number):"grass"|"grass_alt"|"dirt"|"stone"|"wall"{
  if(x===0||y===0||x===63||y===47)return"wall";
  if(x>=3&&x<=20&&y>=16&&y<=31&&(x===3||x===20||y===16||y===31))return"wall";
  if((y===23||y===24)&&x<35)return x%2?"dirt":"grass_alt";
  if(x>48&&y>30)return"stone";
  return(x+y)%9===0?"grass_alt":"grass";
 }

 private buildCollision(){
  for(let x=0;x<64;x++){this.grid.block(x,0);this.grid.block(x,47)}
  for(let y=0;y<48;y++){this.grid.block(0,y);this.grid.block(63,y)}
  for(let x=3;x<=20;x++){this.grid.block(x,16);this.grid.block(x,31)}
  for(let y=16;y<=31;y++){this.grid.block(3,y);this.grid.block(20,y)}
 }

 private placeObjects(){
  this.add.image(55*32+32,35*32+16,"ruin_gate").setDepth(200);
  this.add.image(5*32+16,24*32+16,"mei").setDepth(250);
  this.add.image(14*32+16,24*32+16,"toma").setDepth(250);
  this.add.image(28*32+16,22*32+16,"sage").setDepth(250);
  const mobs:[string,number,number,string,number,string][]=[
   ["Gosma",26,18,"fuuton",40,"slime"],["Gosma",31,19,"suiton",40,"slime"],["Gosma",37,15,"katon",40,"slime"],
   ["Gosma",42,18,"fuuton",40,"slime"],["Gosma",44,25,"suiton",40,"slime"],["Lobo",41,26,"fuuton",60,"wolf"],
   ["Golem",51,33,"doton",140,"golem"],["Guardião",57,36,"doton",320,"guardian"]
  ];
  for(const m of mobs)this.spawnMob(...m);
 }

 private spawnMob(name:string,x:number,y:number,element:string,hp:number,key:string){
  const s=this.add.sprite(x*32+16,y*32+16,key).setDepth(70+y);
  if(name==="Guardião")s.setDisplaySize(64,64);
  this.mobs.push({sprite:s,grid:{x,y},hp,max:hp,atk:name==="Guardião"?18:6,element,name,xp:name==="Guardião"?250:name==="Golem"?100:25,alive:true});
 }

 private mobAt(x:number,y:number){return this.mobs.some(m=>m.alive&&m.grid.x===x&&m.grid.y===y)}
 private distance(m:Mob){return Math.abs(m.grid.x-this.player.grid.x)+Math.abs(m.grid.y-this.player.grid.y)}
 private nearest(range:number){return this.mobs.filter(m=>m.alive&&this.distance(m)<=range).sort((a,b)=>this.distance(a)-this.distance(b))[0]}

 private attack(){
  if(this.attackCooldown>0)return;
  const m=this.target??this.nearest(1);
  if(!m){this.message("Nenhum alvo adjacente.");return}
  const r=this.resolver.resolve(this.session.snapshot.sheet,{defense:4,element:m.element},15,.95,.08,this.activeElement);
  this.attackCooldown=650;
  if(!r.hit){this.message("Ataque básico errou.");return}
  m.hp-=r.damage;this.effect(m,"fx_hit");
  this.message("Ataque • "+r.damage+" dano"+(r.critical?" • CRÍTICO":""));
  if(m.hp<=0)this.defeat(m);
 }

 private jutsu(){
  if(this.jutsuCooldown>0)return;
  const learned=this.jutsuSystem.list(this.session.snapshot.sheet);
  const m=this.target??this.nearest(4);
  if(!m){this.message("Nenhum inimigo em alcance.");return}
  const source=learned.find((j:any)=>j.element===this.activeElement)||learned[0];
  if(!source){this.message("Aprenda um jutsu com J primeiro.");return}
  const cost=Number(source.cost?.chakra??0);
  if(this.session.snapshot.sheet.resources.chakra<cost){this.message("Chakra insuficiente.");return}
  const r=this.resolver.resolve(this.session.snapshot.sheet,{defense:3,element:m.element},Number(source.combat.power),Number(source.combat.accuracy),Number(source.combat.critBonus??0),this.activeElement);
  this.jutsuCooldown=Number(source.combat.cooldownMs??950);
  this.session.snapshot.sheet.resources.chakra-=cost;
  this.effect(m,"fx_katon");
  if(r.hit){m.hp-=r.damage;this.message(source.name+" • "+r.damage+" dano • "+r.multiplier.toFixed(2)+"x");if(m.hp<=0)this.defeat(m)}
  else this.message(source.name+" errou.");
 }

 private train(){
  if(trainAttribute(this.session.snapshot.sheet)){progressQuest(this.session.snapshot.quests,this.session.snapshot.sheet);this.message("Treino concluído. Atributo primário +1. Pontos restantes: "+this.session.snapshot.sheet.trainingPoints)}
  else this.message("Sem pontos de treino disponíveis.");
 }

 private learnFirstJutsu(){
  progressQuest(this.session.snapshot.quests,this.session.snapshot.sheet);
  const available=this.jutsuSystem.availableFor(this.session.snapshot.sheet);
  const source=available.find((j:any)=>j.element===this.activeElement)||available[0];
  if(!source){this.message("Nenhum jutsu disponível para seus requisitos.");return}
  const r=this.jutsuSystem.learn(this.session.snapshot.sheet,source.id);
  if(r.ok){progressQuest(this.session.snapshot.quests,this.session.snapshot.sheet);this.message("Jutsu aprendido: "+source.name+". Pressione Q para usar.")}
  else this.message(r.reason);
 }

 private defeat(m:Mob){
  m.alive=false;m.sprite.destroy();
  const leveled=awardXp(this.session.snapshot.sheet,m.xp);
  if(Math.random()<.65)addItem(this.session.snapshot.sheet,m.name==="Gosma"?"potion":"kunai");
  this.session.snapshot.quests.slimes+=m.name==="Gosma"?1:0;
  progressQuest(this.session.snapshot.quests,this.session.snapshot.sheet);
  this.message(m.name+" derrotado • +"+m.xp+" XP"+(leveled?" • LEVEL UP!":"")+"."+(m.name==="Gosma"?" Gosmas "+this.session.snapshot.quests.slimes+"/5":""));
  if(m.name==="Guardião")this.message("Guardião derrotado: fim da vertical slice de combate.");
 }

 private effect(m:Mob,key:string){const e=this.add.image(m.sprite.x,m.sprite.y-6,key).setDepth(500);this.tweens.add({targets:e,alpha:0,scale:1.35,duration:220,onComplete:()=>e.destroy()})}

 private interact(){
  const p=this.player.grid;
  if(Math.abs(p.x-5)+Math.abs(p.y-24)<=2){this.session.snapshot.quests.step=Math.max(this.session.snapshot.quests.step,1);this.message("MEI: T treina seu atributo principal. J aprende um jutsu quando os requisitos forem atendidos.")}
  else if(Math.abs(p.x-14)+Math.abs(p.y-24)<=2){
   if(this.session.snapshot.quests.slimes>=5){this.session.snapshot.quests.ruinsAccepted=true;this.session.snapshot.quests.step=4;this.message("TOMA: prova entregue. As Ruínas foram liberadas.")}
   else this.message("TOMA: derrote 5 Gosmas e volte com a prova.")
  }else if(Math.abs(p.x-28)+Math.abs(p.y-22)<=2){
   this.activeElement=this.activeElement==="katon"?"suiton":this.activeElement==="suiton"?"fuuton":"katon";
   this.message("Santuário: elemento ativo "+this.activeElement.toUpperCase()+".")
  }
 }

 private equipFirstWeapon(){
  const sheet=this.session.snapshot.sheet;
  const id=sheet.inventory.find(x=>x==="kunai"||x==="headband"||x==="amulet");
  if(id&&equipItem(sheet,id))this.message("Equipado: "+ITEM_LABELS[id]);
  else this.message("Nenhum equipamento equipável.");
 }

 private toggleInventory(){
  if(this.panel){this.panel.destroy();this.panel=undefined;return}
  this.panel=this.add.container(590,55).setScrollFactor(0).setDepth(1200);
  this.panel.add(this.add.rectangle(0,0,350,420,0x171b17,.97).setOrigin(0).setStrokeStyle(2,0x8e805e));
  let text="INVENTÁRIO\n\n";
  this.session.snapshot.sheet.inventory.forEach((id,i)=>{text+=(i+1)+". "+(ITEM_LABELS[id]??id)+"\n"});
  text+="\nEquipado:\n  Arma: "+(ITEM_LABELS[this.session.snapshot.sheet.equipment.weapon??""]??"—")+"\n  Cabeça: "+(ITEM_LABELS[this.session.snapshot.sheet.equipment.head??""]??"—")+"\n  Amuleto: "+(ITEM_LABELS[this.session.snapshot.sheet.equipment.amulet??""]??"—")+"\n\nE equipa o primeiro item compatível\nI fecha";
  this.panel.add(this.add.text(18,16,text,{fontFamily:"monospace",fontSize:"11px",color:"#eee7d8",lineSpacing:4,wordWrap:{width:315}}));
 }

 private toggleJutsuPanel(){
  if(this.panel){this.panel.destroy();this.panel=undefined;return}
  this.panel=this.add.container(565,55).setScrollFactor(0).setDepth(1200);
  this.panel.add(this.add.rectangle(0,0,375,450,0x171b17,.97).setOrigin(0).setStrokeStyle(2,0x8e805e));
  const known=this.jutsuSystem.list(this.session.snapshot.sheet);
  let text="TÉCNICAS APRENDIDAS\n\n";
  known.forEach((j:any,i:number)=>{text+=(i+1)+". "+j.name+"\n   "+(j.element??"não elemental")+" • poder "+j.combat.power+" • alcance "+(j.combat.range??1)+"\n   custo "+JSON.stringify(j.cost)+" • CD "+j.combat.cooldownMs+"ms\n\n"});
  if(!known.length)text+="Nenhuma. J aprende a primeira técnica.\n";
  text+="\nAtivo: "+this.activeElement.toUpperCase()+"\nK fecha";
  this.panel.add(this.add.text(18,16,text,{fontFamily:"monospace",fontSize:"11px",color:"#eee7d8",lineSpacing:4,wordWrap:{width:340}}));
 }

 private message(t:string){
  const lines=(this.log?String(this.log.text):"").split("\n").filter(Boolean);
  lines.push(t);this.log?.setText(lines.slice(-6).join("\n"));
 }

 update(_time:number,dt:number){
  this.attackCooldown=Math.max(0,this.attackCooldown-dt);
  this.jutsuCooldown=Math.max(0,this.jutsuCooldown-dt);
  const c=this.player.controls();
  if(c.isJustDown("attack"))this.attack();
  if(c.isJustDown("skill1"))this.jutsu();
  if(c.isJustDown("interact"))this.interact();
  if(c.isJustDown("element1"))this.activeElement="katon";
  if(c.isJustDown("element2"))this.activeElement="suiton";
  if(c.isJustDown("element3"))this.activeElement="fuuton";
  if(c.isJustDown("save")){this.session.snapshot.position={...this.player.grid};this.session.saveNow();this.message("Jogo salvo.")}
  if(c.isJustDown("load")){const d=this.session.load();if(d){this.player.grid.x=d.position.x;this.player.grid.y=d.position.y;this.player.setPosition(d.position.x*32+16,d.position.y*32+16);this.message("Jogo carregado.")}}
  if(Phaser.Input.Keyboard.JustDown(this.inventoryKey))this.toggleInventory();
  if(Phaser.Input.Keyboard.JustDown(this.trainKey))this.train();
  if(Phaser.Input.Keyboard.JustDown(this.learnKey))this.learnFirstJutsu();
  if(Phaser.Input.Keyboard.JustDown(this.equipKey))this.equipFirstWeapon();
  if(Phaser.Input.Keyboard.JustDown(this.jutsuPanelKey))this.toggleJutsuPanel();
  if(Phaser.Input.Keyboard.JustDown(this.newGameKey))this.scene.start("CharacterCreationScene");
  this.target=this.target&&this.target.alive?this.target:this.nearest(4);

  const s=this.session.snapshot.sheet;
  this.hud.setText("SHINOBI NO VALE • ENGINE 0.1.1\nClasse "+s.build.classId.toUpperCase()+" • "+s.build.grade.toUpperCase()+" • LV "+s.level+" • XP "+s.xp+"/"+s.xpToNext+"\nElemento: "+this.activeElement.toUpperCase()+" • Naturezas "+s.build.elements.length+"/3\nHP "+Math.round(s.resources.vida)+" • Chakra "+Math.round(s.resources.chakra)+" • Stamina "+Math.round(s.resources.stamina)+"\nNin "+s.attributes.ninjutsu+" Tai "+s.attributes.taijutsu+" Buki "+s.attributes.bukijutsu+" Gen "+s.attributes.genjutsu+" • Selo "+s.attributes.selo+"\nTreino "+s.trainingPoints+" • Talentos "+s.talentPoints+" • Jutsus "+s.knownJutsus.length+" • Inventário "+s.inventory.length+"\nMISSÃO: "+questLabel(s.quests)+(s.quests.step===3?" ("+s.quests.slimes+"/5)":""));
 }
}