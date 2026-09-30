import Phaser from "phaser";
import {ASSETS} from "./AssetManifest";

export type AssetStatus="queued"|"loaded"|"error";
export class AssetManager{
  private status=new Map<string,AssetStatus>();
  constructor(private readonly scene:Phaser.Scene){}
  preload(){
    for(const asset of ASSETS){
      this.status.set(asset.id,"queued");
      if(asset.kind==="svg") this.scene.load.svg(asset.id,asset.path,{width:asset.width??32,height:asset.height??32});
    }
    this.scene.load.on(Phaser.Loader.Events.FILE_COMPLETE,(key:string)=>{if(this.status.has(key))this.status.set(key,"loaded")});
    this.scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR,(file:Phaser.Loader.File)=>{if(this.status.has(file.key))this.status.set(file.key,"error")});
  }
  isReady(id:string){return this.status.get(id)==="loaded" || this.scene.textures.exists(id)}
  missingRequired(){return ASSETS.filter(a=>a.required!==false&&!this.isReady(a.id)).map(a=>a.id)}
  report():Record<string,AssetStatus>{return Object.fromEntries(this.status.entries()) as Record<string,AssetStatus>}
}