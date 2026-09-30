import Phaser from "phaser";
import {buildDemoTextures} from "../render/DemoTextureFactory";
export class BootScene extends Phaser.Scene{constructor(){super("BootScene")}create(){this.add.text(24,24,"SHINOBI NO VALE — ENGINE 0.1",{fontFamily:"monospace",fontSize:"18px",color:"#e6c96e"});buildDemoTextures(this);this.scene.start("WorldScene")}}