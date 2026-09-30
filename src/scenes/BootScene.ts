import Phaser from "phaser";
import {AssetManager} from "../engine/assets/AssetManager";
import {BrowserStorage} from "../platform/browser/BrowserStorage";

export class BootScene extends Phaser.Scene {
  private assets!: AssetManager;
  private choiceText!: Phaser.GameObjects.Text;
  private busy = false;

  constructor() {
    super("BootScene");
  }

  preload() {
    this.add.rectangle(480, 304, 620, 150, 0x151b16).setStrokeStyle(1, 0x777777);
    this.add.text(250, 254, "SHINOBI NO VALE", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#e6c96e"
    });

    const status = this.add.text(250, 294, "Preparando cliente… 0%", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#c4ccc5"
    });

    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) =>
      status.setText("Preparando cliente… " + Math.round(p * 100) + "%")
    );

    this.assets = new AssetManager(this);
    this.assets.preload();
  }

  create() {
    const missing = this.assets.missingRequired();
    if (missing.length) {
      this.add.text(250, 325, "ERRO DE ASSET: " + missing.join(", "), {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ef7777"
      });
      return;
    }

    this.registry.set("assetReport", this.assets.report());
    this.choiceText = this.add.text(250, 325, "Verificando base gráfica…", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#cdd4ce",
      wordWrap: { width: 500 }
    });

    void this.resolveStartMode();
  }

  private async resolveStartMode() {
    const normalStart = () => {
      const storage = new BrowserStorage();
      this.scene.start(
        storage.getItem("shinobi-engine-0.1.1-v1")
          ? "WorldScene"
          : "CharacterCreationScene"
      );
    };

    if (!window.shinobiBase) {
      this.choiceText.setText("F2 importa a base gráfica • ENTER inicia a demo");
      this.input.keyboard?.once("keydown-F2", () => void this.importBase());
      this.input.keyboard?.once("keydown-ENTER", normalStart);
      return;
    }

    const current = await window.shinobiBase.getStatus();
    if (current.imported) {
      this.choiceText.setText("Base gráfica encontrada. Abrindo mapa real…");
      this.scene.start("ImportedWorldScene");
      return;
    }

    this.choiceText.setText(
      "BASE GRÁFICA NÃO IMPORTADA\n\nF2  Importar MAPA1 + DAT + SPR + OTB\nENTER  Iniciar demo atual"
    );

    this.input.keyboard?.once("keydown-F2", () => void this.importBase());
    this.input.keyboard?.once("keydown-ENTER", normalStart);
  }

  private async importBase() {
    if (this.busy || !window.shinobiBase) return;
    this.busy = true;

    const off = window.shinobiBase.onProgress((p) => {
      this.choiceText.setText(
        Math.round(p.percent) + "% • " + p.stage + "\n" + p.detail
      );
    });

    try {
      const result = await window.shinobiBase.importBase();
      off();
      if (result.canceled) {
        this.choiceText.setText("Importação cancelada. F2 tenta novamente.");
        this.busy = false;
        this.input.keyboard?.once("keydown-F2", () => void this.importBase());
        return;
      }

      if (!result.ok) throw new Error("Importação não concluída.");
      this.choiceText.setText("Base gráfica pronta. Recarregando cliente…");
      this.time.delayedCall(500, () => this.scene.restart());
    } catch (error) {
      off();
      this.busy = false;
      this.choiceText.setText(
        "FALHA NA IMPORTAÇÃO\n" +
        String(error instanceof Error ? error.message : error) +
        "\n\nF2 tenta novamente • ENTER usa demo"
      );
      this.input.keyboard?.once("keydown-F2", () => void this.importBase());
    }
  }
}
