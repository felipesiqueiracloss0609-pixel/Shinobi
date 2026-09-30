import Phaser from "phaser";
import { InputManager } from "../engine/input/InputManager";

interface ChunkEntry {
  z: number;
  chunkX: number;
  chunkY: number;
  image: string;
  logic: string;
  tiles: number;
}

interface BaseManifest {
  type: "ShinobiBasePack-v1";
  map: {
    width: number;
    height: number;
    tileSize: number;
    chunkSize: number;
    recommendedFloor: number;
    recommendedSpawn: { x: number; y: number; z: number };
    floors: { z: number; tiles: number }[];
    chunks: ChunkEntry[];
  };
  sprites: {
    count: number;
    atlases: number;
  };
}

interface RuntimeTile {
  x: number;
  y: number;
  walkable: boolean;
  blocked: boolean;
}

interface LoadedChunk {
  entry: ChunkEntry;
  tiles: Map<string, RuntimeTile>;
}

export class ImportedWorldScene extends Phaser.Scene {
  private manifest!: BaseManifest;
  private actionInput!: InputManager;
  private galleryKey!: Phaser.Input.Keyboard.Key;
  private player!: Phaser.GameObjects.Sprite;
  private gridX = 0;
  private gridY = 0;
  private floor = 7;
  private readonly loadedChunks = new Map<string, LoadedChunk>();
  private ready = false;
  private moveCooldown = 0;
  private hud!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private gallery!: Phaser.GameObjects.Container | undefined;

  constructor() {
    super("ImportedWorldScene");
  }

  async create() {
    this.add.rectangle(480, 304, 960, 608, 0x101610).setScrollFactor(0);
    this.status = this.add.text(480, 290, "Abrindo base gráfica…", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#e6c96e"
    }).setOrigin(0.5);

    try {
      if (!window.shinobiBase) throw new Error("Bridge desktop não disponível.");
      const status = await window.shinobiBase.getStatus();
      if (!status.imported) throw new Error("A base ainda não foi importada.");
      const manifestUrl = await window.shinobiBase.assetUrl("manifest.json");
      const response = await fetch(manifestUrl);
      this.manifest = await response.json() as BaseManifest;
      this.floor = this.manifest.map.recommendedFloor;
      this.gridX = this.manifest.map.recommendedSpawn.x;
      this.gridY = this.manifest.map.recommendedSpawn.y;

      this.actionInput = new InputManager(this);
      this.galleryKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.G);
      this.cameras.main.setBounds(
        0,
        0,
        this.manifest.map.width * this.manifest.map.tileSize,
        this.manifest.map.height * this.manifest.map.tileSize
      );

      await this.loadNearbyChunks();
      this.player = this.add.sprite(
        this.gridX * this.manifest.map.tileSize + 16,
        this.gridY * this.manifest.map.tileSize + 16,
        "player_s_0"
      ).setDepth(5000).setScale(1);

      this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
      this.hud = this.add.text(12, 12, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#f2ead7",
        backgroundColor: "#151a15",
        padding: { x: 6, y: 5 }
      }).setScrollFactor(0).setDepth(6000);

      this.add.text(948, 12, "G", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#e6c96e"
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(6000);

      this.status.destroy();
      this.ready = true;
      this.updateHud();
    } catch (error) {
      this.status.setText(
        "Não foi possível abrir a base gráfica.\n\n" +
        String(error instanceof Error ? error.message : error)
      );
      this.status.setColor("#ef7777");
    }
  }

  private async loadNearbyChunks() {
    const chunkSize = this.manifest.map.chunkSize;
    const centerX = Math.floor(this.gridX / chunkSize);
    const centerY = Math.floor(this.gridY / chunkSize);
    const candidates = this.manifest.map.chunks.filter((entry) =>
      entry.z === this.floor &&
      Math.abs(entry.chunkX - centerX) <= 2 &&
      Math.abs(entry.chunkY - centerY) <= 2
    );

    const queue = candidates.filter((entry) => !this.loadedChunks.has(this.chunkKey(entry)));
    for (const entry of queue) {
      this.load.image(
        this.textureKey(entry),
        await window.shinobiBase!.assetUrl(entry.image)
      );
    }

    if (queue.length) {
      await new Promise<void>((resolve, reject) => {
        const complete = () => {
          this.load.off(Phaser.Loader.Events.COMPLETE, complete);
          this.load.off(Phaser.Loader.Events.LOAD_ERROR, fail);
          resolve();
        };
        const fail = () => {
          this.load.off(Phaser.Loader.Events.COMPLETE, complete);
          this.load.off(Phaser.Loader.Events.LOAD_ERROR, fail);
          reject(new Error("Falha ao carregar um chunk gráfico."));
        };
        this.load.once(Phaser.Loader.Events.COMPLETE, complete);
        this.load.once(Phaser.Loader.Events.LOAD_ERROR, fail);
        this.load.start();
      });
    }

    for (const entry of queue) {
      const logicUrl = await window.shinobiBase!.assetUrl(entry.logic);
      const response = await fetch(logicUrl);
      const logic = await response.json() as { tiles: RuntimeTile[] };
      this.loadedChunks.set(this.chunkKey(entry), {
        entry,
        tiles: new Map(logic.tiles.map((tile) => [tile.x + "," + tile.y, tile]))
      });

      this.add.image(
        entry.chunkX * chunkSize * this.manifest.map.tileSize,
        entry.chunkY * chunkSize * this.manifest.map.tileSize,
        this.textureKey(entry)
      ).setOrigin(0).setDepth(0);
    }
  }

  private textureKey(entry: ChunkEntry) {
    return "base_chunk_" + entry.z + "_" + entry.chunkX + "_" + entry.chunkY;
  }

  private chunkKey(entry: ChunkEntry) {
    return entry.z + "/" + entry.chunkX + "/" + entry.chunkY;
  }

  private tileAt(x: number, y: number): RuntimeTile | undefined {
    const cs = this.manifest.map.chunkSize;
    const cx = Math.floor(x / cs);
    const cy = Math.floor(y / cs);
    return this.loadedChunks.get(this.floor + "/" + cx + "/" + cy)?.tiles.get(x + "," + y);
  }

  private async tryMove(dx: number, dy: number) {
    if (!this.ready || this.moveCooldown > 0) return;
    const nx = this.gridX + dx;
    const ny = this.gridY + dy;

    const tile = this.tileAt(nx, ny);
    if (!tile?.walkable || tile.blocked) return;

    this.moveCooldown = 120;
    this.gridX = nx;
    this.gridY = ny;
    const ts = this.manifest.map.tileSize;
    this.tweens.add({
      targets: this.player,
      x: nx * ts + 16,
      y: ny * ts + 16,
      duration: 100,
      ease: "Linear"
    });

    const nearBoundary =
      Math.abs(nx - Math.floor(nx / this.manifest.map.chunkSize) * this.manifest.map.chunkSize) <= 2 ||
      Math.abs(ny - Math.floor(ny / this.manifest.map.chunkSize) * this.manifest.map.chunkSize) <= 2;

    if (nearBoundary) {
      await this.loadNearbyChunks();
    }

    this.updateHud();
  }

  private updateHud() {
    if (!this.hud) return;
    this.hud.setText(
      "SHINOBI NO VALE • BASE REAL\n" +
      "Mapa gráfico importado • Floor " + this.floor +
      "\nPosição " + this.gridX + ", " + this.gridY +
      "\nSprites importados: " + this.manifest.sprites.count +
      "\nWASD/setas mover • G galeria"
    );
  }

  private async toggleGallery() {
    if (this.gallery) {
      this.gallery.destroy();
      this.gallery = undefined;
      return;
    }

    this.gallery = this.add.container(0, 0).setScrollFactor(0).setDepth(6500);
    this.gallery.add(
      this.add.rectangle(130, 80, 250, 135, 0x111611, 0.95)
        .setStrokeStyle(1, 0x8e805e)
    );
    this.gallery.add(
      this.add.text(20, 20, "BIBLIOTECA SPR", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e6c96e"
      })
    );

    if (!window.shinobiBase) return;

    const spriteManifestUrl = await window.shinobiBase.assetUrl("sprites/manifest.json");
    const response = await fetch(spriteManifestUrl);
    const spriteManifest = await response.json() as {
      count: number;
      atlasSize: number;
      grid: number;
      spritesPerAtlas: number;
      atlases: { file: string }[];
    };

    const ids = Array.from({ length: Math.min(24, spriteManifest.count) }, (_, index) => index + 1);
    const atlasKeys = new Set<string>();

    for (const id of ids) {
      const atlasIndex = Math.floor((id - 1) / spriteManifest.spritesPerAtlas);
      const atlasFile = spriteManifest.atlases[atlasIndex]?.file;
      if (atlasFile) atlasKeys.add(atlasFile);
    }

    for (const atlas of atlasKeys) {
      const key = "gallery_" + atlas.replace(/[^a-z0-9]/gi, "_");
      if (!this.textures.exists(key)) {
        this.load.image(key, await window.shinobiBase.assetUrl(atlas));
      }
    }

    if (atlasKeys.size) {
      await new Promise<void>((resolve, reject) => {
        const complete = () => {
          this.load.off(Phaser.Loader.Events.COMPLETE, complete);
          this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
          resolve();
        };
        const fail = () => {
          this.load.off(Phaser.Loader.Events.COMPLETE, complete);
          this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
          reject(new Error("Falha ao carregar a biblioteca SPR."));
        };
        if (this.load.isLoading()) {
          this.load.once(Phaser.Loader.Events.COMPLETE, complete);
          this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
        } else {
          this.load.once(Phaser.Loader.Events.COMPLETE, complete);
          this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
          this.load.start();
        }
      });
    }

    let index = 0;
    for (const id of ids) {
      const atlasIndex = Math.floor((id - 1) / spriteManifest.spritesPerAtlas);
      const slot = (id - 1) % spriteManifest.spritesPerAtlas;
      const atlasFile = spriteManifest.atlases[atlasIndex].file;
      const key = "gallery_" + atlasFile.replace(/[^a-z0-9]/gi, "_");
      const cell = 32;
      const x = 20 + (index % 8) * 29;
      const y = 47 + Math.floor(index / 8) * 28;
      const image = this.add.image(x, y, key)
        .setOrigin(0)
        .setCrop((slot % spriteManifest.grid) * cell, Math.floor(slot / spriteManifest.grid) * cell, cell, cell)
        .setDisplaySize(26, 26);
      this.gallery.add(image);
      index++;
    }

    this.gallery.add(this.add.text(20, 118, "G fecha", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#c4ccc5"
    }));
  }

  update(_time: number, dt: number) {
    if (!this.ready || !this.actionInput) return;
    this.moveCooldown = Math.max(0, this.moveCooldown - dt);

    if (!this.player || !this.player.active) return;
    if (Phaser.Input.Keyboard.JustDown(this.galleryKey)) this.toggleGallery();
    if (this.actionInput.isJustDown("up")) this.tryMove(0, -1);
    else if (this.actionInput.isJustDown("down")) this.tryMove(0, 1);
    else if (this.actionInput.isJustDown("left")) this.tryMove(-1, 0);
    else if (this.actionInput.isJustDown("right")) this.tryMove(1, 0);
  }
}
