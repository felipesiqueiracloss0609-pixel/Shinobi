import fs from "node:fs";
import path from "node:path";
import { OTBMReader } from "@v0rt4c/otbm";

function usage() {
  console.error("Uso: npm run map:inspect -- <MAPA.otbm> [saida.json]");
  process.exit(1);
}

const [, , inputArg, outputArg] = process.argv;
if (!inputArg) usage();

const inputPath = path.resolve(inputArg);
if (!fs.existsSync(inputPath)) {
  console.error("Arquivo não encontrado:", inputPath);
  process.exit(2);
}

const buffer = new Uint8Array(fs.readFileSync(inputPath));
const reader = new OTBMReader(buffer);
const root = reader.getRootNode();
const tiles = reader.getTiles();

const itemCounts = new Map();
const floors = new Map();
let itemTotal = 0;
let houseTiles = 0;
let waypointCount = 0;
let townCount = 0;

for (const tile of tiles) {
  const z = Number(tile.z);
  floors.set(z, (floors.get(z) ?? 0) + 1);

  const isHouseTile = "houseId" in tile && Number(tile.houseId) > 0;
  if (isHouseTile) houseTiles++;

  for (const child of tile.children ?? []) {
    if (!child || typeof child !== "object") continue;
    const id = Number(child.id);
    if (!Number.isFinite(id)) continue;
    itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1);
    itemTotal++;
  }
}

try {
  waypointCount = reader.getWaypoints().length;
} catch {
  waypointCount = 0;
}

try {
  townCount = reader.getTowns().length;
} catch {
  townCount = 0;
}

const uniqueItemIds = [...itemCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([id, count]) => ({ id, count }));

const report = {
  schemaVersion: 1,
  source: {
    file: path.basename(inputPath),
    bytes: buffer.byteLength
  },
  otbm: {
    version: root.version,
    width: root.width,
    height: root.height,
    itemMajorVersion: root.itemMajorVersion,
    itemMinorVersion: root.itemMinorVersion
  },
  content: {
    tiles: tiles.length,
    itemInstances: itemTotal,
    uniqueItemIds: uniqueItemIds.length,
    houseTiles,
    waypoints: waypointCount,
    towns: townCount
  },
  floors: [...floors.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([z, count]) => ({ z, tiles: count })),
  topItems: uniqueItemIds.slice(0, 200),
  integration: {
    authoringFormat: "OTBM",
    runtimeFormat: "ShinobiMapChunk-v1",
    recommendedChunkSize: 64,
    note: "Não colocar Tibia.dat/Tibia.spr/items.otb no repositório do jogo; usar os arquivos apenas como fonte local de importação/referência."
  }
};

if (outputArg) {
  const outputPath = path.resolve(outputArg);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
  console.log("Relatório salvo em:", outputPath);
} else {
  console.log(JSON.stringify(report, null, 2));
}
