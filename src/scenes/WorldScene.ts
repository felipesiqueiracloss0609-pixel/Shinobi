import Phaser from "phaser";
import elements from "../../data/elements.json";
import jutsus from "../../data/jutsus_demo.json";
import attributes from "../../data/attributes.json";
import {GridMap} from "../engine/world/GridMap";
import {WorldRenderer} from "../engine/world/WorldRenderer";
import {Player} from "../entities/Player";
import {CombatResolver} from "../game/combat/CombatResolver";
import {GameSession,type SessionSnapshot} from "../game/session/GameSession";

interface Mob{sprite:Phaser.GameObjects.Sprite;grid:{x:number;y:number};hp:number;max:number;atk:number;element:string;name:string;xp:number;alive:boolean}

export class WorldScene extends Phaser.Scene{
 private readonly grid=new GridMap(64,48);private player!:Player;private mobs:Mob[]=[];private readonly resolver=new CombatResolver();private session!:GameSession;
 private hud!:Phaser.GameObjects.Text;private log!:Phaser.GameObjects.Text;private target?:Mob;private activeElement="katon";private attackCooldown=0;private jutsuCooldown=0;
 constructor(){super("WorldScene")}
 create(){
  this.buildCollision();
  new WorldRenderer(this,this.grid).draw((x,y)=>this.terrain(x,y));
  this.placeObjects();
  const defaults=this.defaultSnapshot();this.session=new GameSession(defaults);const saved=this.session.load();const start=saved?.position??defaults.position;
  this.player=new Player(this,(x,y)=>this.grid.isWalkable(x,y)&&!this.mobAt(x,y));this.player.grid.x=start.x;this.player.grid.y=start.y;this.player.setPosition(start.x*32+16,start.y*32+16);
  this.cameras.main.setBounds(0,0,2048,1536);this.cameras.main.startFollow(this.player,true,.18,.18);
  this.hud=this.add.text(10,10,"",{fontFamily:"monospace",fontSize:"11px",color:"#e8e5d8",backgroundColor:"#151916",padding:{x:6,y:5}}).setScrollFactor(0).setDepth(1000);
  this.log=this.add.text(10,80,"",{fontFamily:"monospace",fontSize:"11px",color:"#d0d5cf",backgroundColor:"#151916",padding:{x:6,y:5},wordWrap:{width:470}}).setScrollFactor(0).setDepth(1000);
  this.add.text(10,575,"WASD/setas • SPACE ataque • Q jutsu • 1/2/3 elemento • F interagir • P salvar • O carregar",{fontFamily:"monospace",fontSize:"10px",color:"#c3c9c1",backgroundColor:"#151916",padding:{x:5,y:4}}).setScrollFactor(0).setDepth(1000);
  this.message("ENGINE 0.1.1 online. Fonte de gameplay: estrutura Naruto Game + regras próprias.");
  this.message("Mei: tarefas e progressão. Toma: requisitos de graduação/Ruínas.");
  this.input.on(Phaser.Input.Events.POINTER_DOWN,(pointer:Phaser.Input.Pointer)=>{const worldX=pointer.worldX,worldY=pointer.worldY;const tx=Math.floor(worldX/32),ty=Math.floor(worldY/32);if(this.grid.isWalkable(tx,ty)&&!this.mobAt(tx,ty)){const dx=Math.sign(tx-this.player.grid.x),dy=Math.sign(ty-this.player.grid.y);if(Math.abs(tx-this.player.grid.x)>=Math.abs(ty-this.player.grid.y))this.tryStep(dx,0);else this.tryStep(0,dy);}});
 }
 private defaultSnapshot():SessionSnapshot{return{sheet:{level:1,attributes:{ninjutsu:8,taijutsu:4,bukijutsu:2,genjutsu:2,agilidade:5,selo:4,forca:4,energia:5,inteligencia:6,resistencia:5},resources:{vida:100,chakra:70,stamina:60},build:{grade:"academy",classId:"ninjutsu",elements:["katon","suiton","fuuton"]}},position:{x:8,y:24},quests:{slimes:0,ruinsAccepted:false}}}
 private terrain(x:number,y:number):"grass"|"grass_alt"|"dirt"|"stone"|"wall"{if(x===0||y===0||x===63||y===47)return"wall";if(x>=3&&x<=20&&y>=16&&y<=31&&(x===3||x===20||y===16||y===31))return"wall";if((y===23||y===24)&&x<35)return x%2?"dirt":"grass_alt";if(x>48&&y>30)return"stone";return(x+y)%9===0?"grass_alt":"grass"}
 private buildCollision(){for(let x=0;x<64;x++){this.grid.block(x,0);this.grid.block(x,47)}for(let y=0;y<48;y++){this.grid.block(0,y);this.grid.block(63,y)}for(let x=3;x<=20;x++){this.grid.block(x,16);this.grid.block(x,31)}for(let y=16;y<=31;y++){this.grid.block(3,y);this.grid.block(20,y)}this.grid.block(11,31);this.grid.block(12,31);this.grid.block(20,23);this.grid.block(20,24)}
 private placeObjects(){
  this.add.image(55*32+32,35*32+16,"ruin_gate").setDepth(200);
  this.add.image(5*32+16,24*32+16,"mei").setDepth(250);
  this.add.image(14*32+16,24*32+16,"toma").setDepth(250);
  this.add.image(28*32+16,22*32+16,"sage").setDepth(250);
  const mobs:[string,number,number,string,number][]=[["Gosma",26,18,"fuuton",40],["Gosma",31,19,"suiton",40],["Gosma",37,15,"katon",40],["Lobo",41,26,"fuuton",60],["Golem",51,33,"doton",140],["Guardião",57,36,"doton",320]];
  for(const m of mobs)this.spawnMob(m[0],m[1],m[2],m[3],m[4]);
 }
 private spawnMob(name:string,x:number,y:number,element:string,hp:number){const key=name==="Gosma"?"slime":name==="Lobo"?"wolf":name==="Golem"?"golem":"guardian";const s=this.add.sprite(x*32+16,y*32+16,key).setDepth(70+y);if(name==="Guardião")s.setDisplaySize(64,64);this.mobs.push({sprite:s,grid:{x,y},hp,max:hp,atk:name==="Guardião"?18:6,element,name,xp:name==="Guardião"?250:name==="Golem"?100:25,alive:true})}
 private mobAt(x:number,y:number){return this.mobs.some(m=>m.alive&&m.grid.x===x&&m.grid.y===y)}
 private tryStep(dx:number,dy:number){if(!this.player.isMoving()&&(dx!==0||dy!==0))this.player.requestStep(dx,dy)}
 private nearest(range:number){return this.mobs.filter(m=>m.alive&&this.distance(m)<=range).sort((a,b)=>this.distance(a)-this.distance(b))[0]}
 private distance(m:Mob){return Math.abs(m.grid.x-this.player.grid.x)+Math.abs(m.grid.y-this.player.grid.y)}
 private attack(){if(this.attackCooldown>0)return;const m=this.target??this.nearest(1);if(!m)return this.message("Nenhum alvo adjacente.");const res=this.resolver.resolve(this.session.snapshot.sheet,{defense:4,element:m.element},15,.95,.08,this.activeElement);this.attackCooldown=650;if(!res.hit){this.message("Ataque básico errou.");return}m.hp-=res.damage;this.addEffect(m,"fx_hit");this.message("Ataque • "+res.damage+" dano"+(res.critical?" • CRÍTICO":""));if(m.hp<=0)this.defeat(m)}
 private jutsu(){if(this.jutsuCooldown>0)return;const m=this.target??this.nearest(4);if(!m)return this.message("Nenhum inimigo em alcance.");const source=(jutsus.jutsus as Array<any>).find(j=>j.element===this.activeElement)||jutsus.jutsus[0];const res=this.resolver.resolve(this.session.snapshot.sheet,{defense:3,element:m.element},Number(source.combat.power),Number(source.combat.accuracy),Number(source.combat.critBonus??0),this.activeElement);this.jutsuCooldown=950;this.session.snapshot.sheet.resources.chakra=Math.max(0,this.session.snapshot.sheet.resources.chakra-Number(source.cost.chakra??0));this.addEffect(m,"fx_katon");if(res.hit){m.hp-=res.damage;this.message(source.name+" • "+res.damage+" dano • matchup "+res.multiplier.toFixed(2)+"x");if(m.hp<=0)this.defeat(m)}else this.message(source.name+" errou.")}
 private defeat(m:Mob){m.alive=false;m.sprite.destroy();this.session.snapshot.quests.slimes+=m.name==="Gosma"?1:0;this.message(m.name+" derrotado • +"+m.xp+" XP");if(m.name==="Gosma"&&this.session.snapshot.quests.slimes>=5)this.message("Tarefa concluída: 5 Gosmas.");if(m.name==="Guardião")this.message("Guardião derrotado. Vertical slice concluído.")}
 private addEffect(m:Mob,key:string){const e=this.add.image(m.sprite.x,m.sprite.y-6,key).setDepth(500);this.tweens.add({targets:e,alpha:0,scaleX:1.4,scaleY:1.4,duration:240,onComplete:()=>e.destroy()})}
 private interact(){const p=this.player.grid;if(Math.abs(p.x-5)+Math.abs(p.y-24)<=2)this.message("MEI: comece pelas tarefas; atributos influenciam jutsus e combate.");else if(Math.abs(p.x-14)+Math.abs(p.y-24)<=2){this.session.snapshot.quests.ruinsAccepted=true;this.message("TOMA: Ruínas liberadas para a vertical slice.");}else if(Math.abs(p.x-28)+Math.abs(p.y-22)<=2){this.activeElement=this.activeElement==="katon"?"suiton":this.activeElement==="suiton"?"fuuton":"katon";this.message("Santuário: afinidade ativa = "+this.activeElement.toUpperCase());}}
 private message(t:string){const old=this.log?String(this.log.text):"";const lines=old.split("\n").filter(Boolean);lines.push(t);this.log?.setText(lines.slice(-5).join("\n"))}
 update(_time:number,dt:number){this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.jutsuCooldown=Math.max(0,this.jutsuCooldown-dt);const input=this.player.controls();if(input.isJustDown("attack"))this.attack();if(input.isJustDown("skill1"))this.jutsu();if(input.isJustDown("interact"))this.interact();if(input.isJustDown("element1"))this.activeElement="katon";if(input.isJustDown("element2"))this.activeElement="suiton";if(input.isJustDown("element3"))this.activeElement="fuuton";if(input.isJustDown("save")){this.session.snapshot.position={...this.player.grid};this.session.saveNow();this.message("Jogo salvo.");}if(input.isJustDown("load")){if(this.session.load()){this.player.grid.x=this.session.snapshot.position.x;this.player.grid.y=this.session.snapshot.position.y;this.player.setPosition(this.player.grid.x*32+16,this.player.grid.y*32+16);this.message("Jogo carregado.")}}this.target=this.target&&this.target.alive?this.target:this.nearest(4);const sheet=this.session.snapshot.sheet;this.hud.setText("SHINOBI NO VALE • ENGINE 0.1.1\nClasse Ninjutsu • Graduação "+sheet.build.grade+" • Level "+sheet.level+"\nElemento: "+this.activeElement.toUpperCase()+" • Elementos ativos: "+sheet.build.elements.length+"/3\nNin "+sheet.attributes.ninjutsu+"  Tai "+sheet.attributes.taijutsu+"  Selo "+sheet.attributes.selo+"\nVida "+Math.round(sheet.resources.vida)+" • Chakra "+Math.round(sheet.resources.chakra)+" • Stamina "+Math.round(sheet.resources.stamina)+"\nGosmas: "+sheet.resources.vida.toFixed(0)+"? • Quest: "+this.session.snapshot.quests.slimes+"/5");}
}