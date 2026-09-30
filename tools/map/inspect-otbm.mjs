import fs from "node:fs";
import path from "node:path";
import { OTBMReader } from "@v0rt4c/otbm";
import { OTBReader } from "@v0rt4c/otb";

function usage() {
  console.error("Uso: npm run map:inspect -- <MAPA.otbm> [saida.json] [items.otb]");
  process.exit(1);
}

const [, , inputArg, outputArg, otbArg] = process.argv;
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

let serverItems = null;
if (otbArg) {
  const otbPath = path.resolve(otbArg);
  if (!fs.existsSync(otbPath)) {
    console.error("items.otb não encontrado:", otbPath);
    process.exit(3);
  }
  try {
    serverItems = new OTBReader(new Uint8Array(fs.readFileSync(otbPath))).parse();
  } catch (err) {
    console.error("Falha ao interpretar items.otb:", String(err));
  }
}

const itemCounts = new Map();
const enrichedItems = new Map();
const floors = new Map();
let itemTotal = 0;
let houseTiles = 0;

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

    if (serverItems && !enrichedItems.has(id)) {
      const item = serverItems.getItemByServerId?.(id);
      if (item) {
        enrichedItems.set(id, {
          serverId: item.serverId,
          clientId: item.clientId,
          type: item.type,
          group: item.group,
          flags: item.flags,
          attributes: item.attributes
        });
      }
    }
  }
}

function collectByMethod(methodName) {
  try {
    return typeof reader[methodName] === "function" ? reader[methodName]() : [];
  } catch {
    return [];
  }
}

const waypoints = collectByMethod("getWaypoints");
const towns = collectByMethod("getTowns");

const uniqueItemIds = [...itemCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([id, count]) => ({
    id,
    count,
    ...(enrichedItems.get(id) ?? {})
  }));

const report = {
  schemaVersion: 2,
  source: {
    file: path.basename(inputPath),
    bytes: buffer.byteLength,
    itemsOtb: otbArg ? path.basename(path.resolve(otbArg)) : null
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
    enrichedItemIds: enrichedItems.size,
    houseTiles,
    waypoints: waypoints.length,
    towns: towns.length
  },
  floors: [...floors.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([z, count]) => ({ z, tiles: count })),
  topItems: uniqueItemIds.slice(0, 500),
  ways: waypoints.map(w => ({
    name: w.name,
    attributes: w.attributes
  })),
  towns,
  integration: {
    authoringFormat: "OTBM",
    runtimeFormat: "ShinobiMapChunk-v1",
    recommendedChunkSize: 64,
    note: "IDs de origem são mantidos para auditoria; o renderer final usará assetId próprio do Shinobi no Vale."
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
