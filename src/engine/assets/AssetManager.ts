import Phaser from "phaser";
import {ASSETS, type AssetManifestEntry} from "./AssetManifest";
export class AssetManager{
 private scene:Phaser.Scene; private status=new Map<string,"queued"|"loaded"|"error">();
 constructor(scene:Phaser.Scene){this.scene=scene}
 preload(){for(const a of ASSETS){this.status.set(a.id,"queued"); if(a.kind==="svg") this.scene.load.svg(a.id,a.path,{width:a.width??32,height:a.height??32});}
   this.scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR,(file:{key:string})=>{if(this.status.has(file.key))this.status.set(file.key,"error")});
   this.scene.load.on(Phaser.Loader.Events.FILE_COMPLETE,(_key:string,_type:string,fileKey:string)=>{if(this.status.has(fileKey))this.status.set(fileKey,"loaded")});
 }
 isLoaded(id:string){return this.status.get(id)==="loaded" || this.scene.textures.exists(id)}
 missingRequired(){return ASSETS.filter(a=>a.required!==false&&!this.isLoaded(a.id)).map(a=>a.id)}
 report(){return Object.fromEntries(this.status.entries())}
}