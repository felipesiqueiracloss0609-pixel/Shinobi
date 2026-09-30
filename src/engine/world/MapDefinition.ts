export interface MapObject{type:string;x:number;y:number;texture:string;width?:number;height?:number}
export interface MapDefinition{version:number;id:string;name:string;width:number;height:number;ground:string[];blockedRects:Array<{x:number;y:number;width:number;height:number}>;objects:MapObject[]}
