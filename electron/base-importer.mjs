import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseOTB, parseDatItems, detectDatVersion, createSprSource } from "./legacy-parsers.mjs";

const TILE_SIZE = 32;
const CHUNK_SIZE = 32;
const ATLAS_GRID = 64;
const ATLAS_SIZE = TILE_SIZE * ATLAS_GRID;
const ATLAS_SLOTS = ATLAS_GRID * ATLAS_GRID;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function fileExists(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

function findSource(sourceDir, candidates) {
  for (const name of candidates) {
    const candidate = path.join(sourceDir, name);
    if (fileExists(candidate)) return candidate;
  }
  return null;
}

function assertSources(sourceDir) {
  const required = {
    map: findSource(sourceDir, ["MAPA1.otbm", "map.otbm"]),
    spr: findSource(sourceDir, ["Tibia.spr", "tibia.spr"]),
    dat: findSource(sourceDir, ["Tibia.dat", "tibia.dat"]),
    otb: findSource(sourceDir, ["items.otb", "items.otb.xml"])
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(
      "A pasta precisa conter MAPA1.otbm, Tibia.spr, Tibia.dat e items.otb. Ausentes: " +
      missing.join(", ")
    );
  }

  return required;
}

function copyOptionalSidecars(sourceDir, outputDir) {
  for (const name of ["MAPA1-house.xml", "MAPA1-spawn.xml", "Tibia.otfi", "items.otbm"]) {
    const source = path.join(sourceDir, name);
    if (fileExists(source)) {
      fs.copyFileSync(source, path.join(outputDir, "source", name));
    }
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const body = Buffer.concat([name, data]);
  const out = Buffer.alloc(8 + body.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 4 + body.length);
  return out;
}

function encodePngRGBA(width, height, rgba) {
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    scanlines[row] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride)
      .copy(scanlines, row + 1);
  }

  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(scanlines, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function alphaBlend(dst, di, src, si) {
  const sa = src[si + 3];
  if (sa === 0) return;

  if (sa === 255) {
    dst[di] = src[si];
    dst[di + 1] = src[si + 1];
    dst[di + 2] = src[si + 2];
    dst[di + 3] = 255;
    return;
  }

  const da = dst[di + 3];
  const saF = sa / 255;
  const daF = da / 255;
  const outA = saF + daF * (1 - saF);

  if (outA <= 0) {
    dst[di + 3] = 0;
    return;
  }

  dst[di] = Math.round((src[si] * saF + dst[di] * daF * (1 - saF)) / outA);
  dst[di + 1] = Math.round((src[si + 1] * saF + dst[di + 1] * daF * (1 - saF)) / outA);
  dst[di + 2] = Math.round((src[si + 2] * saF + dst[di + 2] * daF * (1 - saF)) / outA);
  dst[di + 3] = Math.round(outA * 255);
}

function blitSprite(canvas, canvasWidth, x, y, rgba, offsetX = 0, offsetY = 0) {
  const startX = Math.round(x + offsetX);
  const startY = Math.round(y + offsetY);

  for (let sy = 0; sy < TILE_SIZE; sy++) {
    const dy = startY + sy;
    if (dy < 0 || dy >= canvasWidth) continue;

    for (let sx = 0; sx < TILE_SIZE; sx++) {
      const dx = startX + sx;
      if (dx < 0 || dx >= canvasWidth) continue;

      const si = (sy * TILE_SIZE + sx) * 4;
      const di = (dy * canvasWidth + dx) * 4;
      alphaBlend(canvas, di, rgba, si);
    }
  }
}

function thingInfo(datItem) {
  if (!datItem) return null;

  const firstSprite = Number(datItem.spriteIds?.[0] ?? 0);
  return {
    id: Number(datItem.id),
    width: Number(datItem.width ?? 1),
    height: Number(datItem.height ?? 1),
    layers: Number(datItem.layers ?? 1),
    patternX: Number(datItem.patternX ?? 1),
    patternY: Number(datItem.patternY ?? 1),
    patternZ: Number(datItem.patternZ ?? 1),
    animations: Number(datItem.animations ?? 1),
    spriteIds: Array.from(datItem.spriteIds ?? []).map(Number),
    firstSprite,
    flags: datItem.flags ?? {}
  };
}

function renderThingFirstFrame(canvas, canvasWidth, originX, originY, datItem, sprSource) {
  if (!datItem) return 0;

  const width = Math.max(1, Number(datItem.width ?? 1));
  const height = Math.max(1, Number(datItem.height ?? 1));
  const layer = 0;
  const base = 0;
  let rendered = 0;

  for (let h = 0; h < height; h++) {
    for (let w = 0; w < width; w++) {
      const spriteIndex = h * width + w;

      const spriteId = Number(datItem.spriteIds?.[spriteIndex] ?? 0);
      const rgba = sprSource.getRGBA(spriteId);
      if (!rgba) continue;

      // OTB/Tibia multi-tile objects are anchored at the bottom-right tile.
      const dx = -(width - 1 - w) * TILE_SIZE + Number(datItem.flags.offsetX ?? 0);
      const dy = -(height - 1 - h) * TILE_SIZE + Number(datItem.flags.offsetY ?? 0);

      blitSprite(canvas, canvasWidth, originX + dx, originY + dy, rgba);
      rendered++;
    }
  }

  return rendered;
}

function chunkKey(z, cx, cy) {
  return z + "/" + cx + "/" + cy;
}

function cleanPath(value) {
  return value.replaceAll(path.sep, "/");
}

export async function importNarutibiaBase({ sourceDir, outputDir, progress = () => {} }) {
  const source = assertSources(sourceDir);

  ensureDir(outputDir);
  ensureDir(path.join(outputDir, "sprites"));
  ensureDir(path.join(outputDir, "maps"));
  ensureDir(path.join(outputDir, "source"));
  copyOptionalSidecars(sourceDir, outputDir);

  progress(2, "Lendo OTB", path.basename(source.otb));
  const otb = parseOTB(new Uint8Array(fs.readFileSync(source.otb)));

  const serverToClient = new Map();
  for (const item of otb.items) {
    serverToClient.set(Number(item.serverId), Number(item.clientId));
  }

  const otfiPath = path.join(sourceDir, "Tibia.otfi");
  progress(6, "Detectando versão DAT", fileExists(otfiPath) ? "Tibia.otfi" : "fallback");

  const datBuffer = fs.readFileSync(source.dat);
  const versionInfo = detectDatVersion(datBuffer, otfiPath);

  progress(9, "Lendo DAT", "cliente " + versionInfo.version);
  const dat = parseDatItems(datBuffer, versionInfo);

  progress(16, "Lendo biblioteca SPR", path.basename(source.spr));
  const sprBuffer = fs.readFileSync(source.spr);
  const spr = createSprSource(sprBuffer);

  progress(20, "Gerando atlas de sprites", spr.count + " sprites");

  const spritesDir = path.join(outputDir, "sprites");
  const atlases = [];
  const atlasMeta = {
    schemaVersion: 1,
    type: "ShinobiSpriteLibrary-v1",
    sourceKind: spr.kind,
    signature: typeof spr.signature === "number"
      ? "0x" + spr.signature.toString(16).toUpperCase()
      : spr.signature,
    count: spr.count,
    tileSize: TILE_SIZE,
    atlasSize: ATLAS_SIZE,
    grid: ATLAS_GRID,
    spritesPerAtlas: ATLAS_SLOTS,
    atlases: []
  };

  let atlasPixels = null;
  let atlasNumber = -1;

  const flushAtlas = () => {
    if (!atlasPixels || atlasNumber < 0) return;
    const file = "atlas-" + String(atlasNumber).padStart(4, "0") + ".png";
    fs.writeFileSync(
      path.join(spritesDir, file),
      encodePngRGBA(ATLAS_SIZE, ATLAS_SIZE, atlasPixels)
    );
    atlases.push(file);
    atlasPixels = null;
  };

  for (let id = 1; id <= spr.count; id++) {
    const sheet = Math.floor((id - 1) / ATLAS_SLOTS);
    const slot = (id - 1) % ATLAS_SLOTS;

    if (sheet !== atlasNumber) {
      flushAtlas();
      atlasNumber = sheet;
      atlasPixels = new Uint8Array(ATLAS_SIZE * ATLAS_SIZE * 4);
    }

    const rgba = spr.getRGBA(id);
    if (rgba) {
      const cellX = (slot % ATLAS_GRID) * TILE_SIZE;
      const cellY = Math.floor(slot / ATLAS_GRID) * TILE_SIZE;
      for (let sy = 0; sy < TILE_SIZE; sy++) {
        const sourceStart = sy * TILE_SIZE * 4;
        const targetStart = ((cellY + sy) * ATLAS_SIZE + cellX) * 4;
        Buffer.from(rgba.buffer, rgba.byteOffset + sourceStart, TILE_SIZE * 4)
          .copy(Buffer.from(atlasPixels.buffer, atlasPixels.byteOffset + targetStart, TILE_SIZE * 4));
      }
    }

    if (id % 500 === 0 || id === spr.count) {
      progress(
        20 + Math.round((id / spr.count) * 22),
        "Gerando atlas de sprites",
        id + "/" + spr.count
      );
    }
  }

  flushAtlas();

  atlasMeta.atlases = atlases.map((file, index) => ({
    index,
    file: "sprites/" + file,
    width: ATLAS_SIZE,
    height: ATLAS_SIZE
  }));

  writeJson(path.join(spritesDir, "manifest.json"), atlasMeta);

  progress(44, "Lendo mapa OTBM", path.basename(source.map));

  const { OTBMReader } = await import("@v0rt4c/otbm");
  const mapBuffer = new Uint8Array(fs.readFileSync(source.map));
  const mapReader = new OTBMReader(mapBuffer);
  const root = mapReader.getRootNode();
  const tiles = mapReader.getTiles();

  progress(50, "Montando vínculo item → sprite", otb.items.length + " itens");
  const itemVisuals = {};

  for (const item of otb.items) {
    const clientId = Number(item.clientId);
    const datItem = dat.items.get(clientId);
    if (!datItem) continue;

    itemVisuals[String(item.serverId)] = {
      serverId: Number(item.serverId),
      clientId,
      thing: thingInfo(datItem),
      otbFlags: Number(item.flags ?? 0)
    };
  }

  writeJson(path.join(outputDir, "item-visual-map.json"), itemVisuals);

  const floorStats = new Map();
  const chunkMap = new Map();
  let unresolved = 0;
  let rendered = 0;

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const x = Number(tile.realX ?? tile.x);
    const y = Number(tile.realY ?? tile.y);
    const z = Number(tile.z);

    if (![x, y, z].every(Number.isFinite)) continue;

    floorStats.set(z, (floorStats.get(z) ?? 0) + 1);

    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const key = chunkKey(z, cx, cy);

    let chunk = chunkMap.get(key);
    if (!chunk) {
      chunk = {
        z,
        chunkX: cx,
        chunkY: cy,
        tiles: new Map()
      };
      chunkMap.set(key, chunk);
    }

    const tileKey = x + "," + y;
    let outputTile = chunk.tiles.get(tileKey);

    if (!outputTile) {
      outputTile = {
        x,
        y,
        z,
        houseId: Number(tile.houseId ?? 0),
        walkable: false,
        blocked: false,
        ground: false,
        items: []
      };
      chunk.tiles.set(tileKey, outputTile);
    }

    for (const child of tile.children ?? []) {
      const serverId = Number(child.id);
      let visual = itemVisuals[String(serverId)];

      // Fallback for malformed/incomplete OTB mappings.
      if (!visual) {
        const directDat = dat.items.get(serverId);
        if (directDat) {
          visual = {
            serverId,
            clientId: serverId,
            thing: thingInfo(directDat),
            otbFlags: 0
          };
        }
      }

      if (!visual) {
        unresolved++;
        outputTile.items.push({ serverId, resolved: false });
        continue;
      }

      const datItem = dat.items.get(Number(visual.clientId));
      const flags = datItem?.flags ?? {};
      const isGround = Boolean(flags.ground);
      const blocked = Boolean(flags.unpassable || flags.blockPathfinder);

      outputTile.items.push({
        serverId,
        clientId: Number(visual.clientId),
        spriteId: Number(datItem?.spriteIds?.[0] ?? 0),
        width: Number(datItem?.width ?? 1),
        height: Number(datItem?.height ?? 1),
        ground: isGround,
        blocked
      });

      if (isGround) outputTile.ground = true;
      if (blocked) outputTile.blocked = true;
    }

    outputTile.walkable = outputTile.ground && !outputTile.blocked;

    if (i % 5000 === 0 || i === tiles.length - 1) {
      progress(
        50 + Math.round((i / Math.max(1, tiles.length)) * 26),
        "Convertendo mapa real",
        (i + 1) + "/" + tiles.length + " tiles"
      );
    }
  }

  progress(77, "Renderizando mapa real", chunkMap.size + " chunks");

  const chunkIndex = [];
  let index = 0;

  for (const [key, chunk] of [...chunkMap.entries()].sort()) {
    const [z, cx, cy] = key.split("/").map(Number);
    const pixels = new Uint8Array(CHUNK_SIZE * TILE_SIZE * CHUNK_SIZE * TILE_SIZE * 4);
    const orderedTiles = [...chunk.tiles.values()].sort((a, b) => a.y - b.y || a.x - b.x);
    const canvasWidth = CHUNK_SIZE * TILE_SIZE;

    for (const tile of orderedTiles) {
      const originX = (tile.x - cx * CHUNK_SIZE) * TILE_SIZE;
      const originY = (tile.y - cy * CHUNK_SIZE) * TILE_SIZE;

      for (const item of tile.items) {
        if (!item.clientId) continue;
        const datItem = dat.items.get(Number(item.clientId));
        rendered += renderThingFirstFrame(
          pixels,
          canvasWidth,
          originX,
          originY,
          datItem,
          spr
        );
      }
    }

    const dir = path.join(mapsDirFor(outputDir, z, cx));
    const imageFile = String(cy).padStart(5, "0") + ".png";
    const logicFile = String(cy).padStart(5, "0") + ".json";

    ensureDir(dir);
    fs.writeFileSync(
      path.join(dir, imageFile),
      encodePngRGBA(canvasWidth, canvasWidth, pixels)
    );

    writeJson(path.join(dir, logicFile), {
      schemaVersion: 1,
      type: "ShinobiMapChunk-v1",
      z,
      chunkX: cx,
      chunkY: cy,
      chunkSize: CHUNK_SIZE,
      tileSize: TILE_SIZE,
      tiles: orderedTiles
    });

    chunkIndex.push({
      z,
      chunkX: cx,
      chunkY: cy,
      image: cleanPath(path.relative(outputDir, path.join(dir, imageFile))),
      logic: cleanPath(path.relative(outputDir, path.join(dir, logicFile))),
      tiles: orderedTiles.length
    });

    index++;
    if (index % 10 === 0 || index === chunkMap.size) {
      progress(
        77 + Math.round((index / Math.max(1, chunkMap.size)) * 20),
        "Renderizando mapa real",
        index + "/" + chunkMap.size + " chunks"
      );
    }
  }

  const floors = [...floorStats.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([z, count]) => ({ z, tiles: count }));

  const recommendedFloor = floors[0]?.z ?? 7;
  const recommendedTiles = tiles.filter((tile) => Number(tile.z) === recommendedFloor);

  const averageX = recommendedTiles.length
    ? recommendedTiles.reduce((sum, tile) => sum + Number(tile.realX ?? tile.x), 0) / recommendedTiles.length
    : 0;

  const averageY = recommendedTiles.length
    ? recommendedTiles.reduce((sum, tile) => sum + Number(tile.realY ?? tile.y), 0) / recommendedTiles.length
    : 0;

  let spawn = {
    x: Math.round(averageX),
    y: Math.round(averageY),
    z: recommendedFloor
  };

  let bestDistance = Infinity;

  for (const tile of recommendedTiles) {
    const x = Number(tile.realX ?? tile.x);
    const y = Number(tile.realY ?? tile.y);
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const chunk = chunkMap.get(chunkKey(recommendedFloor, cx, cy));
    const candidate = chunk?.tiles.get(x + "," + y);

    if (!candidate?.walkable) continue;

    const distance = Math.abs(x - averageX) + Math.abs(y - averageY);
    if (distance < bestDistance) {
      bestDistance = distance;
      spawn = { x, y, z: recommendedFloor };
    }
  }

  const mapManifest = {
    schemaVersion: 1,
    type: "ShinobiBasePack-v1",
    source: {
      map: path.basename(source.map),
      dat: path.basename(source.dat),
      spr: path.basename(source.spr),
      otb: path.basename(source.otb),
      otfi: fileExists(otfiPath) ? path.basename(otfiPath) : null,
      mapBytes: mapBuffer.byteLength,
      sprBytes: sprBuffer.byteLength
    },
    client: {
      version: versionInfo.version,
      versionSource: versionInfo.source,
      datSignature: versionInfo.signature,
      sprKind: spr.kind,
      sprSignature: typeof spr.signature === "number"
        ? "0x" + spr.signature.toString(16).toUpperCase()
        : spr.signature,
      sprCount: spr.count
    },
    map: {
      width: Number(root.width),
      height: Number(root.height),
      otbmVersion: Number(root.version),
      itemMajorVersion: Number(root.itemMajorVersion),
      itemMinorVersion: Number(root.itemMinorVersion),
      chunkSize: CHUNK_SIZE,
      tileSize: TILE_SIZE,
      floors,
      recommendedFloor,
      recommendedSpawn: spawn,
      chunks: chunkIndex,
      unresolvedItemInstances: unresolved
    },
    sprites: {
      count: spr.count,
      atlases: atlases.length,
      manifest: "sprites/manifest.json"
    },
    stats: {
      otbmTiles: tiles.length,
      otbItems: otb.items.length,
      datItems: dat.items.size,
      mappedServerIds: Object.keys(itemVisuals).length,
      renderedSpritePieces: rendered
    }
  };

  writeJson(path.join(outputDir, "manifest.json"), mapManifest);

  writeJson(path.join(outputDir, "source-profile.json"), {
    clientVersion: versionInfo,
    dat: dat.counts,
    otb: {
      items: otb.items.length,
      major: otb.itemsMajorVersion,
      minor: otb.itemsMinorVersion,
      build: otb.itemsBuildNumber
    },
    spr: {
      kind: spr.kind,
      signature: typeof spr.signature === "number"
        ? "0x" + spr.signature.toString(16).toUpperCase()
        : spr.signature,
      count: spr.count,
      bytes: sprBuffer.byteLength
    },
    map: {
      version: root.version,
      width: root.width,
      height: root.height,
      itemMajorVersion: root.itemMajorVersion,
      itemMinorVersion: root.itemMinorVersion
    }
  });

  progress(100, "Importação concluída", "Base gráfica pronta");
  return mapManifest;
}

function mapsDirFor(outputDir, z, cx) {
  return path.join(outputDir, "maps", String(z), String(cx));
}
