export class GridMap{
 constructor(public readonly width:number,public readonly height:number,private readonly blocked=new Set<string>()){}
 key(x:number,y:number){return x+","+y}
 block(x:number,y:number){this.blocked.add(this.key(x,y))}
 isWalkable(x:number,y:number){return x>=0&&y>=0&&x<this.width&&y<this.height&&!this.blocked.has(this.key(x,y))}
}