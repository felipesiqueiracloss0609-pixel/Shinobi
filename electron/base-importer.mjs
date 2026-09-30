import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const TILE_SIZE = 32;
const DEFAULT_CHUNK_SIZE = 64;
const ATLAS_GRID = 16;
const ATLAS_SIZE = TILE_SIZE * ATLAS_GRID;
const ATLAS_SLOTS = ATLAS_GRID * ATLAS_GRID;

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
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(scanlines, row + 1);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(scanlines, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

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
    otb: findSource(sourceDir, ["items.otb", "items.otb.xml"]),
  };

  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(
      "A pasta selecionada precisa conter MAPA1.otbm, Tibia.spr, Tibia.dat e items.otb. Ausentes: " +
      missing.join(", ")
    );
  }
  return required;
}

function copyOptionalSidecars(sourceDir, outputDir) {
  for (const name of ["MAPA1-house.xml", "MAPA1-spawn.xml", "Tibia.otfi", "items.otbm"]) {
    const source = path.join(sourceDir, name);
    if (fileExists(source)) fs.copyFileSync(source, path.join(outputDir, "source", name));
  }
}

function alphaBlend(dst, dstIndex, src, srcIndex) {
  const sa = src[srcIndex + 3];
  if (sa === 0) return;

  if (sa === 255) {
    dst[dstIndex] = src[srcIndex];
    dst[dstIndex + 1] = src[srcIndex + 1];
    dst[dstIndex + 2] = src[srcIndex + 2];
    dst[dstIndex + 3] = 255;
    return;
  }

  const da = dst[dstIndex + 3];
  const saF = sa / 255;
  const daF = da / 255;
  const outA = saF + daF * (1 - saF);
  if (outA <= 0) {
    dst[dstIndex + 3] = 0;
    return;
  }

  dst[dstIndex] = Math.round((src[srcIndex] * saF + dst[dstIndex] * daF * (1 - saF)) / outA);
  dst[dstIndex + 1] = Math.round((src[srcIndex + 1] * saF + dst[dstIndex + 1] * daF * (1 - saF)) / outA);
  dst[dstIndex + 2] = Math.round((src[srcIndex + 2] * saF + dst[dstIndex + 2] * daF * (1 - saF)) / outA);
  dst[dstIndex + 3] = Math.round(outA * 255);
}

function blit32(canvas, width, x, y, rgba, offsetX = 0, offsetY = 0) {
  const startX = Math.round(x + offsetX);
  const startY = Math.round(y + offsetY);
  for (let sy = 0; sy < TILE_SIZE; sy++) {
    const dy = startY + sy;
    if (dy < 0 || dy >= width) continue;
    for (let sx = 0; sx < TILE_SIZE; sx++) {
      const dx = startX + sx;
      if (dx < 0 || dx >= width) continue;
      const si = (sy * TILE_SIZE + sx) * 4;
      const di = (dy * width + dx) * 4;
      alphaBlend(canvas, di, rgba, si);
    }
  }
}

function thingSpriteId(thing) {
  return Number(thing?.spriteIds?.[0] ?? 0);
}

function thingSummary(thing) {
  if (!thing) return null;
  return {
    id: Number(thing.id),
    spriteIds: Array.from(thing.spriteIds ?? []).map(Number),
    texture: thing.texture ?? null,
    flags: thing.flags ?? {}
  };
}

export async function importNarutibiaBase({ sourceDir, outputDir, progress = () => {} }) {
  const source = assertSources(sourceDir);
  ensureDir(outputDir);
  ensureDir(path.join(outputDir, "sprites"));
  ensureDir(path.join(outputDir, "maps"));
  ensureDir(path.join(outputDir, "source"));
  copyOptionalSidecars(sourceDir, outputDir);

  progress(3, "Lendo OTB server", "items.otb");
  const { OTBReader } = await import("@v0rt4c/ot-otb");
  const otbRoot = new OTBReader(new Uint8Array(fs.readFileSync(source.otb))).parse();
  const serverToClient = new Map();
  for (const item of otbRoot.children ?? []) {
    const serverId = Number(item.serverId);
    const clientId = Number(item.clientId);
    if (Number.isFinite(serverId) && Number.isFinite(clientId)) {
      serverToClient.set(serverId, clientId);
    }
  }

  progress(7, "Lendo DAT do cliente", "Tibia.dat");
  const { DatReader } = await import("@v0rt4c/dat");
  const datReader = DatReader(new Uint8Array(fs.readFileSync(source.dat)));
  const datRoot = datReader.parse();
  const datItems = Array.isArray(datRoot.items) ? datRoot.items : [];
  const datById = new Map(datItems.map((thing) => [Number(thing.id), thing]));

  progress(12, "Lendo SPR", "Tibia.spr");
  const { read: readSpr } = await import("@v0rt4c/spr");
  const sprBytes = new Uint8Array(fs.readFileSync(source.spr));
  let lastSprProgress = 0;
  const spr = readSpr(sprBytes, (info) => {
    const local = Number(info.progressPercent ?? 0);
    if (local >= lastSprProgress + 5 || local >= 99) {
      lastSprProgress = local;
      progress(12 + Math.round(local * 0.18), "Extraindo sprites", Math.round(local) + "%");
    }
  });
  const sprites = Array.isArray(spr?.sprites) ? spr.sprites : [];
  if (!sprites.length) throw new Error("Tibia.spr foi lido, mas nenhum sprite foi encontrado.");

  const spriteById = new Map(sprites.map((sprite) => [Number(sprite.id), sprite.rgba]));
  const spriteAtlases = [];
  const spriteManifest = { version: 1, tileSize: TILE_SIZE, atlasSize: ATLAS_SIZE, atlases: [], sprites: {} };

  progress(32, "Gerando biblioteca visual", sprites.length + " sprites");
  let atlasPixels = null;
  let atlasIndex = -1;

  const flushAtlas = () => {
    if (!atlasPixels || atlasIndex < 0) return;
    const file = "atlas-" + String(atlasIndex).padStart(4, "0") + ".png";
    fs.writeFileSync(path.join(outputDir, "sprites", file), encodePngRGBA(ATLAS_SIZE, ATLAS_SIZE, atlasPixels));
    spriteAtlases.push(file);
    atlasPixels = null;
  };

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const id = Number(sprite.id);
    const slot = ((id - 1) % ATLAS_SLOTS + ATLAS_SLOTS) % ATLAS_SLOTS;
    const sheet = Math.floor((id - 1) / ATLAS_SLOTS);
    if (sheet !== atlasIndex) {
      flushAtlas();
      atlasIndex = sheet;
      atlasPixels = new Uint8Array(ATLAS_SIZE * ATLAS_SIZE * 4);
    }

    const cellX = (slot % ATLAS_GRID) * TILE_SIZE;
    const cellY = Math.floor(slot / ATLAS_GRID) * TILE_SIZE;
    const rgba = sprite.rgba;
    for (let sy = 0; sy < TILE_SIZE; sy++) {
      const dstOffset = ((cellY + sy) * ATLAS_SIZE + cellX) * 4;
      const srcOffset = sy * TILE_SIZE * 4;
      Buffer.from(rgba.buffer, rgba.byteOffset + srcOffset, TILE_SIZE * 4).copy(Buffer.from(atlasPixels.buffer, atlasPixels.byteOffset + dstOffset, TILE_SIZE * 4));
    }

    spriteManifest.sprites[id] = {
      atlas: "sprites/" + "atlas-" + String(sheet).padStart(4, "0") + ".png",
      frame: slot,
      x: cellX,
      y: cellY,
      width: TILE_SIZE,
      height: TILE_SIZE
    };

    if (i % 250 === 0) {
      progress(32 + Math.round((i / sprites.length) * 18), "Gerando biblioteca visual", (i + 1) + "/" + sprites.length);
    }
  }
  flushAtlas();

  spriteManifest.atlases = spriteAtlases.map((file) => ({
    file: "sprites/" + file,
    width: ATLAS_SIZE,
    height: ATLAS_SIZE,
    frames: ATLAS_SLOTS
  }));
  writeJson(path.join(outputDir, "sprites", "manifest.json"), spriteManifest);

  progress(52, "Lendo mapa OTBM", path.basename(source.map));
  const { OTBMReader } = await import("@v0rt4c/otbm");
  const mapBytes = new Uint8Array(fs.readFileSync(source.map));
  const otbm = new OTBMReader(mapBytes);
  const root = otbm.getRootNode();
  const tiles = otbm.getTiles();

  const itemVisuals = {};
  for (const [serverId, clientId] of serverToClient.entries()) {
    const thing = datById.get(clientId);
    if (!thing) continue;
    itemVisuals[serverId] = {
      clientId,
      spriteId: thingSpriteId(thing),
      spriteIds: Array.from(thing.spriteIds ?? []).map(Number),
      texture: thing.texture ?? null,
      flags: thing.flags ?? {}
    };
  }
  writeJson(path.join(outputDir, "item-visual-map.json"), itemVisuals);

  const floorStats = new Map();
  const chunkMap = new Map();
  let unresolvedItems = 0;
  let renderedItems = 0;

  function getChunk(z, x, y) {
    const cx = Math.floor(x / DEFAULT_CHUNK_SIZE);
    const cy = Math.floor(y / DEFAULT_CHUNK_SIZE);
    const key = z + "/" + cx + "/" + cy;
    let chunk = chunkMap.get(key);
    if (!chunk) {
      chunk = { z, chunkX: cx, chunkY: cy, tiles: new Map(), tileCount: 0 };
      chunkMap.set(key, chunk);
    }
    return chunk;
  }

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const x = Number(tile.realX ?? tile.x);
    const y = Number(tile.realY ?? tile.y);
    const z = Number(tile.z);
    if (![x, y, z].every(Number.isFinite)) continue;

    floorStats.set(z, (floorStats.get(z) ?? 0) + 1);
    const chunk = getChunk(z, x, y);
    const tileKey = x + "," + y;
    let tileOut = chunk.tiles.get(tileKey);
    if (!tileOut) {
      tileOut = {
        x, y, z,
        houseId: Number(tile.houseId ?? 0),
        walkable: false,
        hasGround: false,
        blocked: false,
        items: []
      };
      chunk.tiles.set(tileKey, tileOut);
      chunk.tileCount++;
    }

    for (const child of tile.children ?? []) {
      const serverId = Number(child.id);
      const visual = itemVisuals[serverId];
      if (!visual) {
        unresolvedItems++;
        tileOut.items.push({ serverId, resolved: false });
        continue;
      }

      const thing = datById.get(Number(visual.clientId));
      const spriteId = thingSpriteId(thing);
      const sprite = spriteById.get(spriteId);
      const hasGround = Boolean(thing?.flags?.ground);
      const blocked = Boolean(thing?.flags?.unpassable || thing?.flags?.blockPathfinder);

      tileOut.items.push({
        serverId,
        clientId: Number(visual.clientId),
        spriteId,
        ground: hasGround,
        blocked
      });

      if (hasGround) tileOut.hasGround = true;
      if (blocked) tileOut.blocked = true;
      if (sprite) renderedItems++;
    }

    tileOut.walkable = tileOut.hasGround && !tileOut.blocked;

    if (i % 5000 === 0) {
      progress(52 + Math.round((i / tiles.length) * 28), "Convertendo mapa", (i + 1) + "/" + tiles.length + " tiles");
    }
  }

  progress(81, "Renderizando mapa", chunkMap.size + " chunks");

  const chunkIndex = [];
  let chunkCounter = 0;

  for (const [key, chunk] of [...chunkMap.entries()].sort()) {
    const [z, cx, cy] = key.split("/").map(Number);
    const pixels = new Uint8Array(DEFAULT_CHUNK_SIZE * TILE_SIZE * DEFAULT_CHUNK_SIZE * TILE_SIZE * 4);
    const orderedTiles = [...chunk.tiles.values()].sort((a, b) => a.y - b.y || a.x - b.x);

    for (const tile of orderedTiles) {
      const ox = (tile.x - cx * DEFAULT_CHUNK_SIZE) * TILE_SIZE;
      const oy = (tile.y - cy * DEFAULT_CHUNK_SIZE) * TILE_SIZE;
      for (const item of tile.items) {
        if (!item.resolved) continue;
        const thing = datById.get(item.clientId);
        const spriteId = Number(item.spriteId);
        const sprite = spriteById.get(spriteId);
        if (!sprite) continue;
        const dx = Number(thing?.flags?.hasOffset?.offsetX ?? 0);
        const dy = Number(thing?.flags?.hasOffset?.offsetY ?? 0);
        blit32(pixels, DEFAULT_CHUNK_SIZE * TILE_SIZE, ox, oy, sprite, dx, dy);
      }
    }

    const relDir = path.join(String(z), String(cx));
    const relPng = path.join("maps", relDir, String(cy) + ".png");
    const relJson = path.join("maps", relDir, String(cy) + ".json");
    const pngPath = path.join(outputDir, relPng);
    const jsonPath = path.join(outputDir, relJson);
    ensureDir(path.dirname(pngPath));

    fs.writeFileSync(pngPath, encodePngRGBA(DEFAULT_CHUNK_SIZE * TILE_SIZE, DEFAULT_CHUNK_SIZE * TILE_SIZE, pixels));
    writeJson(jsonPath, {
      version: 1,
      type: "ShinobiMapChunk-v1",
      z, chunkX: cx, chunkY: cy, chunkSize: DEFAULT_CHUNK_SIZE,
      tiles: orderedTiles
    });

    chunkIndex.push({
      z, chunkX: cx, chunkY: cy,
      image: relPng.replaceAll(path.sep, "/"),
      logic: relJson.replaceAll(path.sep, "/"),
      tiles: orderedTiles.length
    });

    chunkCounter++;
    if (chunkCounter % 10 === 0) {
      progress(81 + Math.round((chunkCounter / chunkMap.size) * 16), "Renderizando mapa", chunkCounter + "/" + chunkMap.size + " chunks");
    }
  }

  const floorEntries = [...floorStats.entries()].sort((a, b) => b[1] - a[1]).map(([z, tilesCount]) => ({ z, tiles: tilesCount }));
  const recommendedFloor = floorEntries[0]?.z ?? 7;
  const recommendedTiles = tiles.filter((t) => Number(t.z) === recommendedFloor);
  const cx = recommendedTiles.length
    ? recommendedTiles.reduce((sum, t) => sum + Number(t.realX ?? t.x), 0) / recommendedTiles.length
    : 0;
  const cy = recommendedTiles.length
    ? recommendedTiles.reduce((sum, t) => sum + Number(t.realY ?? t.y), 0) / recommendedTiles.length
    : 0;

  let spawn = { x: Math.round(cx), y: Math.round(cy), z: recommendedFloor };
  let bestDist = Infinity;
  for (const tile of recommendedTiles) {
    const x = Number(tile.realX ?? tile.x);
    const y = Number(tile.realY ?? tile.y);
    const chunk = chunkMap.get(recommendedFloor + "/" + Math.floor(x / DEFAULT_CHUNK_SIZE) + "/" + Math.floor(y / DEFAULT_CHUNK_SIZE));
    const candidate = chunk?.tiles.get(x + "," + y);
    if (!candidate || !candidate.walkable) continue;
    const dist = Math.abs(x - cx) + Math.abs(y - cy);
    if (dist < bestDist) {
      bestDist = dist;
      spawn = { x, y, z: recommendedFloor };
    }
  }

  const manifest = {
    version: 1,
    type: "ShinobiBasePack-v1",
    source: {
      map: path.basename(source.map),
      dat: path.basename(source.dat),
      spr: path.basename(source.spr),
      otb: path.basename(source.otb),
      otbmBytes: mapBytes.byteLength
    },
    map: {
      width: Number(root.width),
      height: Number(root.height),
      otbmVersion: Number(root.version),
      itemMajorVersion: Number(root.itemMajorVersion),
      itemMinorVersion: Number(root.itemMinorVersion),
      chunkSize: DEFAULT_CHUNK_SIZE,
      tileSize: TILE_SIZE,
      floors: floorEntries,
      recommendedFloor,
      recommendedSpawn: spawn,
      chunks: chunkIndex,
      unresolvedItemInstances: unresolvedItems
    },
    sprites: {
      count: sprites.length,
      atlases: spriteManifest.atlases.length,
      manifest: "sprites/manifest.json"
    },
    stats: {
      otbmTiles: tiles.length,
      renderedItemInstances: renderedItems,
      uniqueServerIdsMapped: Object.keys(itemVisuals).length,
      datItems: datItems.length,
      otbItems: otbRoot.children?.length ?? 0
    }
  };

  writeJson(path.join(outputDir, "manifest.json"), manifest);
  writeJson(path.join(outputDir, "source-profile.json"), {
    dat: { items: datItems.length, signature: datRoot.signature ?? null },
    otb: {
      items: otbRoot.children?.length ?? 0,
      major: otbRoot.itemsMajorVersion ?? null,
      minor: otbRoot.itemsMinorVersion ?? null,
      build: otbRoot.itemsBuildNumber ?? null
    },
    spr: { signature: spr.signature ?? null, count: sprites.length },
    map: {
      version: root.version,
      width: root.width,
      height: root.height,
      itemMajorVersion: root.itemMajorVersion,
      itemMinorVersion: root.itemMinorVersion
    }
  });

  progress(100, "Importação concluída", "Base pronta em " + outputDir);
  return manifest;
}
