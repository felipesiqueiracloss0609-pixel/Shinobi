import fs from "node:fs";
import path from "node:path";
import { OTBMReader } from "@v0rt4c/otbm";

function usage() {
  console.error("Uso: npm run map:export -- <MAPA.otbm> <saida-dir> [chunkSize]");
  process.exit(1);
}

const [, , inputArg, outputArg, chunkArg] = process.argv;
if (!inputArg || !outputArg) usage();

const inputPath = path.resolve(inputArg);
const outputDir = path.resolve(outputArg);
const chunkSize = Math.max(16, Number(chunkArg ?? 64));

if (!Number.isFinite(chunkSize) || chunkSize % 1 !== 0) {
  console.error("chunkSize deve ser um inteiro.");
  process.exit(2);
}
if (!fs.existsSync(inputPath)) {
  console.error("Arquivo não encontrado:", inputPath);
  process.exit(3);
}

const buffer = new Uint8Array(fs.readFileSync(inputPath));
const reader = new OTBMReader(buffer);
const root = reader.getRootNode();
const tiles = reader.getTiles();

fs.mkdirSync(outputDir, { recursive: true });
const chunks = new Map();

function chunkKey(z, cx, cy) {
  return z + "/" + cx + "/" + cy;
}

function compactItem(item) {
  return {
    id: Number(item.id),
    attributes: item.attributes ?? {}
  };
}

function compactTile(tile) {
  const result = {
    x: Number(tile.realX),
    y: Number(tile.realY),
    z: Number(tile.z),
    houseId: Number(tile.houseId ?? 0),
    flags: tile.attributes?.tileFlags ?? {},
    items: (tile.children ?? []).filter(Boolean).map(compactItem)
  };

  return result;
}

for (const tile of tiles) {
  const x = Number(tile.realX);
  const y = Number(tile.realY);
  const z = Number(tile.z);
  const cx = Math.floor(x / chunkSize);
  const cy = Math.floor(y / chunkSize);
  const key = chunkKey(z, cx, cy);

  if (!chunks.has(key)) {
    chunks.set(key, {
      schemaVersion: 1,
      type: "ShinobiMapChunk-v1",
      z,
      chunkX: cx,
      chunkY: cy,
      chunkSize,
      tiles: []
    });
  }

  chunks.get(key).tiles.push(compactTile(tile));
}

const chunkIndex = [];
for (const [key, chunk] of [...chunks.entries()].sort()) {
  const relative = key.split("/").map(Number);
  const [z, cx, cy] = relative;
  const file = path.join(String(z), String(cx), String(cy) + ".json");
  const full = path.join(outputDir, file);

  fs.mkdirSync(path.dirname(full), { recursive: true });
  chunk.tiles.sort((a, b) => a.y - b.y || a.x - b.x);
  fs.writeFileSync(full, JSON.stringify(chunk));

  chunkIndex.push({
    z,
    chunkX: cx,
    chunkY: cy,
    file,
    tiles: chunk.tiles.length
  });
}

const manifest = {
  schemaVersion: 1,
  type: "ShinobiMapManifest-v1",
  sourceFile: path.basename(inputPath),
  sourceBytes: buffer.byteLength,
  otbm: {
    version: root.version,
    width: root.width,
    height: root.height,
    itemMajorVersion: root.itemMajorVersion,
    itemMinorVersion: root.itemMinorVersion
  },
  chunkSize,
  chunks: chunkIndex
};

fs.writeFileSync(
  path.join(outputDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);

console.log("Exportação concluída.");
console.log("Chunks:", chunkIndex.length);
console.log("Saída:", outputDir);
