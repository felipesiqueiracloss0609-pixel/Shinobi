import Phaser from "phaser";
import jutsuData from "../../data/jutsus_demo.json";
import mapData from "../../data/maps/kage_no_sato_01.json";
import {GridMap} from "../engine/world/GridMap";
import {buildGrid} from "../engine/world/MapLoader";
import {WorldRenderer} from "../engine/world/WorldRenderer";
import {MonsterAI} from "../engine/ai/MonsterAI";
import {Player} from "../entities/Player";
import {CombatResolver} from "../game/combat/CombatResolver";
import {GameSession,type SessionSnapshot} from "../game/session/GameSession";
import {awardXp,trainAttribute} from "../game/progression/ProgressionSystem";
import {addItem,equipItem,ITEM_LABELS,usePotion} from "../game/items/Inventory";
import {questLabel,progressQuest} from "../game/quests/QuestSystem";
import {BrowserStorage} from "../platform/browser/BrowserStorage";
import {JutsuSystem} from "../game/jutsu/JutsuSystem";
import type {NinjaClass} from "../game/character/CharacterSheet";

interface Mob{sprite:Phaser.GameObjects.Sprite;grid:{x:number;y:number};hp:number;max:number;atk:number;element:string;name:string;xp:number;alive:boolean;busyUntil:number}
export class WorldScene extends Phaser.Scene{
 private readonly map=mapData;
 private readonly grid=new GridMap(this.map.width,this.map.height);
 private readonly mobs:Mob[]=[];
 private readonly resolver=new CombatResolver();
 private readonly jutsuSystem=new JutsuSystem();
 private readonly ai=new MonsterAI({width:this.map.width,height:this.map.height});
 private player!:Player;private session!:GameSession;
 private hud!:Phaser.GameObjects.Text;private log!:Phaser.GameObjects.Text;private panel?:Phaser.GameObjects.Container;
 private activeElement="katon";private target?:Mob;private attackCooldown=0;private jutsuCooldown=0;private aiTimer=0;
 private inventoryKey!:Phaser.Input.Keyboard.Key;private trainKey!:Phaser.Input.Keyboard.Key;private learnKey!:Phaser.Input.Keyboard.Key;private equipKey!:Phaser.Input.Keyboard.Key;private jutsuPanelKey!:Phaser.Input.Keyboard.Key;private newGameKey!:Phaser.Input.Keyboard.Key;private potionKey!:Phaser.Input.Keyboard.Key;
 constructor(){super("WorldScene")}
 create(){
  buildGrid(this.map,(x,y)=>this.grid.block(x,y));
  new WorldRenderer(this,this.map).draw();
  this.placeObjects();
  const defaults=this.defaultSnapshot();this.session=new GameSession(defaults,new BrowserStorage());this.session.load();
  const s=this.session.snapshot;
  this.player=new Player(this,(x,y)=>this.grid.isWalkable(x,y)&&!this.mobAt(x,y));
  this.player.grid.x=s.position.x;this.player.grid.y=s.position.y;this.player.setPosition(s.position.x*32+16,s.position.y*32+16);
  this.cameras.main.setBounds(0,0,this.map.width*32,this.map.height*32);this.cameras.main.startFollow(this.player,true,.18,.18);
  this.bindKeys();
  this.hud=this.add.text(10,10,"",{fontFamily:"monospace",fontSize:"11px",color:"#eee7d8",backgroundColor:"#151916",padding:{x:6,y:5}}).setScrollFactor(0).setDepth(1000);
  this.log=this.add.text(10,105,"",{fontFamily:"monospace",fontSize:"11px",color:"#cdd4ce",backgroundColor:"#151916",padding:{x:6,y:5},wordWrap:{width:510}}).setScrollFactor(0).setDepth(1000);
  this.add.text(10,575,"WASD/setas • SPACE ataque • Q jutsu • 1/2/3 elemento • T treino • J aprender • I inventário • E equipar • F falar • P salvar • O carregar • K técnicas • N novo",{fontFamily:"monospace",fontSize:"9px",color:"#bec6bf",backgroundColor:"#151916",padding:{x:5,y:4}}).setScrollFactor(0).setDepth(1000);
  this.message(this.map.name+" • Objetivo: "+questLabel(this.session.snapshot.quests)+".");this.message("A IA dos inimigos percebe você até 7 tiles.");
  this.input.on(Phaser.Input.Events.POINTER_DOWN,(pointer:Phaser.Input.Pointer)=>{if(this.panel)return;const tx=Math.floor(pointer.worldX/32),ty=Math.floor(pointer.worldY/32);if(!this.grid.isWalkable(tx,ty)||this.mobAt(tx,ty))return;const dx=tx-this.player.grid.x,dy=ty-this.player.grid.y;if(Math.abs(dx)>=Math.abs(dy)&&dx!==0)this.player.requestStep(Math.sign(dx),0);else if(dy!==0)this.player.requestStep(0,Math.sign(dy))});
 }
 private bindKeys(){const k=this.input.keyboard!;this.inventoryKey=k.addKey(Phaser.Input.Keyboard.KeyCodes.I);this.trainKey=k.addKey(Phaser.Input.Keyboard.KeyCodes.T);this.learnKey=k.addKey(Phaser.Input.Keyboard.KeyCodes.J);this.equipKey=k.addKey(Phaser.Input.Keyboard.KeyCodes.E);this.jutsuPanelKey=k.addKey(Phaser.Input.Keyboard.KeyCodes.K);this.newGameKey=k.addKey(Phaser.Input.Keyboard.KeyCodes.N);this.potionKey=k.addKey(Phaser.Input.Keyboard.KeyCodes.H)}
 private defaultSnapshot():SessionSnapshot{return{version:1,sheet:{level:1,xp:0,xpToNext:100,trainingPoints:3,talentPoints:0,attributes:{ninjutsu:8,taijutsu:5,bukijutsu:5,genjutsu:5,agilidade:5,selo:5,forca:5,energia:5,inteligencia:5,resistencia:5},resources:{vida:100,chakra:70,stamina:70},build:{grade:"academy",classId:"ninjutsu" as NinjaClass,elements:["katon","suiton","fuuton"]},knownJutsus:[],equipment:{},inventory:["kunai","potion"]},position:{x:8,y:24},quests:{slimes:0,ruinsAccepted:false,step:0}}}
 private placeObjects(){
  for(const o of this.map.objects){const obj=this.add.image(o.x*32+16,o.y*32+16,o.texture).setDepth(o.y*10+200);if(o.width&&o.height)obj.setDisplaySize(o.width,o.height)}
  const trees:[[number,number],...Array<[number,number]>]=[[25,15],[29,16],[35,13],[40,17],[45,14],[51,19],[58,16],[62,25],[55,31],[48,34]];
  for(const [x,y] of trees)this.add.image(x*32+16,y*32+8,x%2?"tree":"tree").setDepth(y*10+120);
  const mobs:[string,number,number,string,number,string][]=[["Gosma",26,18,"fuuton",40,"slime"],["Gosma",31,19,"suiton",40,"slime"],["Gosma",37,15,"katon",40,"slime"],["Gosma",42,18,"fuuton",40,"slime"],["Gosma",44,25,"suiton",40,"slime"],["Lobo",41,26,"fuuton",60,"wolf"],["Golem",51,33,"doton",140,"golem"],["Guardião",57,36,"doton",320,"guardian"]];
  for(const m of mobs)this.spawnMob(...m);
 }
 private spawnMob(name:string,x:number,y:number,element:string,hp:number,key:string){const s=this.add.sprite(x*32+16,y*32+16,key).setDepth(y*10+400);if(name==="Guardião")s.setDisplaySize(64,64);this.mobs.push({sprite:s,grid:{x,y},hp,max:hp,atk:name==="Guardião"?18:6,element,name,xp:name==="Guardião"?250:name==="Golem"?100:25,alive:true,busyUntil:0})}
 private mobAt(x:number,y:number,except?:Mob){return this.mobs.some(m=>m.alive&&m!==except&&m.grid.x===x&&m.grid.y===y)}
 private distance(m:Mob){return Math.abs(m.grid.x-this.player.grid.x)+Math.abs(m.grid.y-this.player.grid.y)}
 private nearest(range:number){return this.mobs.filter(m=>m.alive&&this.distance(m)<=range).sort((a,b)=>this.distance(a)-this.distance(b))[0]}
 private attack(){if(this.attackCooldown>0)return;const m=this.target??this.nearest(1);if(!m)return this.message("Nenhum alvo adjacente.");const r=this.resolver.resolve(this.session.snapshot.sheet,{defense:4,element:m.element},15,.95,.08,this.activeElement);this.attackCooldown=650;if(!r.hit){this.message("Ataque básico errou.");return}m.hp-=r.damage;this.effect(m,"fx_hit");this.message("Ataque • "+r.damage+" dano"+(r.critical?" • CRÍTICO":""));if(m.hp<=0)this.defeat(m)}
 private jutsu(){if(this.jutsuCooldown>0)return;const learned=this.jutsuSystem.list(this.session.snapshot.sheet);const m=this.target??this.nearest(4);if(!m)return this.message("Nenhum inimigo em alcance.");const source=learned.find((j:any)=>j.element===this.activeElement)||learned[0];if(!source)return this.message("Aprenda um jutsu com J primeiro.");const cost=Number(source.cost?.chakra??0);if(this.session.snapshot.sheet.resources.chakra<cost)return this.message("Chakra insuficiente.");const r=this.resolver.resolve(this.session.snapshot.sheet,{defense:3,element:m.element},Number(source.combat.power),Number(source.combat.accuracy),Number(source.combat.critBonus??0),this.activeElement);this.jutsuCooldown=Number(source.combat.cooldownMs??950);this.session.snapshot.sheet.resources.chakra-=cost;this.effect(m,"fx_katon");if(r.hit){m.hp-=r.damage;this.message(source.name+" • "+r.damage+" dano • "+r.multiplier.toFixed(2)+"x");if(m.hp<=0)this.defeat(m)}else this.message(source.name+" errou.")}
 private train(){if(trainAttribute(this.session.snapshot.sheet)){progressQuest(this.session.snapshot.quests,this.session.snapshot.sheet);this.message("Treino +1 no atributo primário. Restam "+this.session.snapshot.sheet.trainingPoints+".")}else this.message("Sem pontos de treino disponíveis.")}
 private learnFirstJutsu(){const available=this.jutsuSystem.availableFor(this.session.snapshot.sheet);const source=available.find((j:any)=>j.element===this.activeElement)||available[0];if(!source)return this.message("Nenhum jutsu disponível para os seus requisitos.");const r=this.jutsuSystem.learn(this.session.snapshot.sheet,source.id);if(r.ok){progressQuest(this.session.snapshot.quests,this.session.snapshot.sheet);this.message("Aprendido: "+source.name+" • Q usa a técnica.")}else this.message(r.reason)}
 private defeat(m:Mob){m.alive=false;m.sprite.destroy();const leveled=awardXp(this.session.snapshot.sheet,m.xp);if(Math.random()<.65)addItem(this.session.snapshot.sheet,m.name==="Gosma"?"potion":"kunai");this.session.snapshot.quests.slimes+=m.name==="Gosma"?1:0;progressQuest(this.session.snapshot.quests,this.session.snapshot.sheet);this.message(m.name+" derrotado • +"+m.xp+" XP"+(leveled?" • LEVEL UP!":"")+"."+(m.name==="Gosma"?" Gosmas "+this.session.snapshot.quests.slimes+"/5":""));if(m.name==="Guardião")this.message("Guardião derrotado: vertical slice concluído.")}
 private effect(m:Mob,key:string){const e=this.add.image(m.sprite.x,m.sprite.y-6,key).setDepth(1000);this.tweens.add({targets:e,alpha:0,scale:1.35,duration:220,onComplete:()=>e.destroy()})}
 private interact(){const p=this.player.grid;if(Math.abs(p.x-5)+Math.abs(p.y-24)<=2){this.session.snapshot.quests.step=Math.max(this.session.snapshot.quests.step,1);this.message("MEI: treine com T; aprenda um jutsu com J.");}else if(Math.abs(p.x-14)+Math.abs(p.y-24)<=2){if(this.session.snapshot.quests.slimes>=5){this.session.snapshot.quests.ruinsAccepted=true;this.session.snapshot.quests.step=5;this.message("TOMA: prova entregue. Ruínas liberadas.")}else this.message("TOMA: faltam "+(5-this.session.snapshot.quests.slimes)+" Gosmas.")}else if(Math.abs(p.x-28)+Math.abs(p.y-22)<=2){this.activeElement=this.activeElement==="katon"?"suiton":this.activeElement==="suiton"?"fuuton":"katon";this.message("Santuário: "+this.activeElement.toUpperCase()+" ativo.")}}
 private equipFirstWeapon(){const s=this.session.snapshot.sheet;const id=s.inventory.find(x=>x==="kunai"||x==="headband"||x==="amulet");if(id&&equipItem(s,id))this.message("Equipado: "+ITEM_LABELS[id]);else this.message("Nenhum equipamento equipável.")}
 private toggleInventory(){if(this.panel){this.panel.destroy();this.panel=undefined;return}this.panel=this.add.container(590,55).setScrollFactor(0).setDepth(1200);this.panel.add(this.add.rectangle(0,0,350,420,0x171b17,.97).setOrigin(0).setStrokeStyle(2,0x8e805e));const s=this.session.snapshot.sheet;let text="INVENTÁRIO\\n\\n";s.inventory.forEach((id,i)=>text+=(i+1)+". "+(ITEM_LABELS[id]??id)+"\\n");text+="\\nEquipado\\nArma: "+(ITEM_LABELS[s.equipment.weapon??""]??"—")+"\\nCabeça: "+(ITEM_LABELS[s.equipment.head??""]??"—")+"\\nAmuleto: "+(ITEM_LABELS[s.equipment.amulet??""]??"—")+"\\n\\nE equipa o primeiro compatível\\nI fecha";this.panel.add(this.add.text(18,16,text,{fontFamily:"monospace",fontSize:"11px",color:"#eee7d8",lineSpacing:4,wordWrap:{width:315}}))}
 private toggleJutsuPanel(){if(this.panel){this.panel.destroy();this.panel=undefined;return}this.panel=this.add.container(565,55).setScrollFactor(0).setDepth(1200);this.panel.add(this.add.rectangle(0,0,375,450,0x171b17,.97).setOrigin(0).setStrokeStyle(2,0x8e805e));const known=this.jutsuSystem.list(this.session.snapshot.sheet);let text="TÉCNICAS APRENDIDAS\\n\\n";known.forEach((j:any,i:number)=>text+=(i+1)+". "+j.name+"\\n   "+(j.element??"não elemental")+" • poder "+j.combat.power+" • alcance "+(j.combat.range??1)+"\\n   custo "+JSON.stringify(j.cost)+" • CD "+j.combat.cooldownMs+"ms\\n\\n");if(!known.length)text+="Nenhuma. Pressione J para aprender.\\n";text+="\\nK fecha";this.panel.add(this.add.text(18,16,text,{fontFamily:"monospace",fontSize:"11px",color:"#eee7d8",lineSpacing:4,wordWrap:{width:340}}))}
 private message(t:string){const lines=(this.log?String(this.log.text):"").split("\n").filter(Boolean);lines.push(t);this.log?.setText(lines.slice(-6).join("\n"))}
 private updateAI(time:number,dt:number){
  this.aiTimer+=dt;if(this.aiTimer<650)return;this.aiTimer=0;
  const now=time;
  for(const m of this.mobs){
   if(!m.alive||now<m.busyUntil)continue;
   const decision=this.ai.decide(m,{x:this.player.grid.x,y:this.player.grid.y},(x,y)=>this.grid.isWalkable(x,y), (x,y)=>this.mobAt(x,y,m));
   if(decision.state==="attack"){this.session.snapshot.sheet.resources.vida=Math.max(0,this.session.snapshot.sheet.resources.vida-m.atk);this.message(m.name+" acertou você • -"+m.atk+" HP");if(this.session.snapshot.sheet.resources.vida<=0){this.message("Você caiu. Pressione O para carregar o último save.")}continue}
   if(decision.dx||decision.dy){const nx=m.grid.x+decision.dx,ny=m.grid.y+decision.dy;m.grid.x=nx;m.grid.y=ny;m.busyUntil=now+420;this.tweens.add({targets:m.sprite,x:nx*32+16,y:ny*32+16,duration:280,ease:"Linear"});m.sprite.setDepth(ny*10+400)}
  }
 }
 update(time:number,dt:number){
  this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.jutsuCooldown=Math.max(0,this.jutsuCooldown-dt);
  const c=this.player.getShinobiInput();
  if(c.isJustDown("attack"))this.attack();if(c.isJustDown("skill1"))this.jutsu();if(c.isJustDown("interact"))this.interact();if(c.isJustDown("element1"))this.activeElement="katon";if(c.isJustDown("element2"))this.activeElement="suiton";if(c.isJustDown("element3"))this.activeElement="fuuton";
  if(c.isJustDown("save")){this.session.snapshot.position={...this.player.grid};this.session.saveNow();this.message("Jogo salvo.")}
  if(c.isJustDown("load")){const d=this.session.load();if(d){this.player.grid.x=d.position.x;this.player.grid.y=d.position.y;this.player.setPosition(d.position.x*32+16,d.position.y*32+16);this.message("Jogo carregado.")}}
  if(Phaser.Input.Keyboard.JustDown(this.inventoryKey))this.toggleInventory();if(Phaser.Input.Keyboard.JustDown(this.potionKey)){if(usePotion(this.session.snapshot.sheet))this.message("Poção usada. +35 HP.");else this.message("Você não possui poção.")}if(Phaser.Input.Keyboard.JustDown(this.trainKey))this.train();if(Phaser.Input.Keyboard.JustDown(this.learnKey))this.learnFirstJutsu();if(Phaser.Input.Keyboard.JustDown(this.equipKey))this.equipFirstWeapon();if(Phaser.Input.Keyboard.JustDown(this.jutsuPanelKey))this.toggleJutsuPanel();if(Phaser.Input.Keyboard.JustDown(this.newGameKey))this.scene.start("CharacterCreationScene");
  this.target=this.target&&this.target.alive?this.target:this.nearest(4);this.updateAI(time,dt);
  const s=this.session.snapshot.sheet;this.hud.setText("SHINOBI NO VALE • ENGINE 0.1.1\n"+this.map.name+"\nClasse "+s.build.classId.toUpperCase()+" • "+s.build.grade.toUpperCase()+" • LV "+s.level+" • XP "+s.xp+"/"+s.xpToNext+"\nElemento: "+this.activeElement.toUpperCase()+" • Naturezas "+s.build.elements.length+"/3\nHP "+Math.round(s.resources.vida)+" • Chakra "+Math.round(s.resources.chakra)+" • Stamina "+Math.round(s.resources.stamina)+"\nNin "+s.attributes.ninjutsu+" Tai "+s.attributes.taijutsu+" Buki "+s.attributes.bukijutsu+" Gen "+s.attributes.genjutsu+" • Selo "+s.attributes.selo+"\nTreino "+s.trainingPoints+" • Talentos "+s.talentPoints+" • Jutsus "+s.knownJutsus.length+" • Itens "+s.inventory.length+"\nMISSÃO: "+questLabel(this.session.snapshot.quests)+(s.quests.step===3?" ("+s.quests.slimes+"/5)":""));
 }
}