import Phaser from "phaser";
import {BootScene} from "./scenes/BootScene";
import {CharacterCreationScene} from "./scenes/CharacterCreationScene";
import {WorldScene} from "./scenes/WorldScene";
const config:Phaser.Types.Core.GameConfig={type:Phaser.AUTO,parent:"game",width:960,height:608,pixelArt:true,antialias:false,roundPixels:true,backgroundColor:"#1b291f",scene:[BootScene,CharacterCreationScene,WorldScene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}};
new Phaser.Game(config);