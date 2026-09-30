import fs from "node:fs";
import path from "node:path";
import { OTBMReader } from "@v0rt4c/otbm";
import { OTBReader } from "@v0rt4c/otb";
import { read as readSpr } from "@v0rt4c/spr";
import { DatReader } from "@v0rt4c/dat";

const [, , rootArg, outputArg] = process.argv;
if (!rootArg) {
  console.error("Uso: npm run assets:import-source-set -- <diretorio> [saida-dir]");
  process.exit(1);
}

const root = path.resolve(rootArg);
const out = path.resolve(outputArg ?? path.join(root, "exports"));
fs.mkdirSync(out, { recursive: true });

function pick(names) {
  for (const n of names) {
    const p = path.join(root, n);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const otbmPath = pick(["MAPA1.otbm", "map.otbm"]);
const otbPath = pick(["items.otb"]);
const sprPath = pick(["Tibia.spr", "tibia.spr"]);
const datPath = pick(["Tibia.dat", "tibia.dat"]);
const housePath = pick(["MAPA1-house.xml", "map-house.xml"]);
const spawnPath = pick(["MAPA1-spawn.xml", "map-spawn.xml"]);

const report = {
  schemaVersion: 1,
  type: "ShinobiSourceSet-v1",
  sourceRoot: root,
  generatedAt: new Date().toISOString(),
  files: {},
  otbm: null,
  otb: null,
  spr: null,
  dat: null,
  sidecars: {
    house: housePath ? path.basename(housePath) : null,
    spawn: spawnPath ? path.basename(spawnPath) : null
  }
};

if (otbmPath) {
  const buffer = new Uint8Array(fs.readFileSync(otbmPath));
  try {
    const reader = new OTBMReader(buffer);
    const rootNode = reader.getRootNode();
    const tiles = reader.getTiles();
    const floors = new Map();
    const itemCounts = new Map();
    for (const tile of tiles) {
      const z = Number(tile.z);
      floors.set(z, (floors.get(z) ?? 0) + 1);
      for (const item of tile.children ?? []) {
        const id = Number(item.id);
        itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1);
      }
    }
    report.otbm = {
      version: rootNode.version,
      width: rootNode.width,
      height: rootNode.height,
      itemMajorVersion: rootNode.itemMajorVersion,
      itemMinorVersion: rootNode.itemMinorVersion,
      tiles: tiles.length,
      floors: [...floors.entries()].sort((a,b)=>a[0]-b[0]).map(([z,count])=>({z,count})),
      uniqueItemIds: itemCounts.size,
      topItemIds: [...itemCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 300).map(([id,count])=>({id,count}))
    };
    fs.writeFileSync(path.join(out, "map-root.json"), JSON.stringify(report.otbm, null, 2) + "\n");
  } catch (err) {
    report.otbm = { error: String(err) };
  }
} else {
  report.otbm = { error: "MAPA1.otbm não encontrado" };
}

if (otbPath) {
  try {
    const data = new Uint8Array(fs.readFileSync(otbPath));
    const parsed = new OTBReader(data).parse();
    const items = parsed.children ?? [];
    report.otb = {
      items: items.length,
      itemsMajorVersion: parsed.itemsMajorVersion,
      itemsMinorVersion: parsed.itemsMinorVersion,
      itemsBuildNumber: parsed.itemsBuildNumber,
      sample: items.slice(0, 20).map(item => ({
        serverId: item.serverId,
        clientId: item.clientId,
        type: item.type,
        group: item.group,
        flags: item.flags,
        attributes: item.attributes
      }))
    };
    fs.writeFileSync(path.join(out, "items-summary.json"), JSON.stringify(report.otb, null, 2) + "\n");
  } catch (err) {
    report.otb = { error: String(err) };
  }
} else {
  report.otb = { error: "items.otb não encontrado" };
}

if (sprPath) {
  try {
    const data = new Uint8Array(fs.readFileSync(sprPath));
    const parsed = readSpr(data);
    report.spr = {
      signature: parsed.signature,
      declaredCount: parsed.count,
      parsedCount: parsed.sprites.length,
      firstIds: parsed.sprites.slice(0, 50).map(s => s.id),
      lastIds: parsed.sprites.slice(-20).map(s => s.id)
    };
  } catch (err) {
    report.spr = { error: String(err), note: "Tente ObjectBuilder Studio ou Assets And Map Editor para variantes fora do suporte do parser." };
  }
} else {
  report.spr = { error: "Tibia.spr não encontrado" };
}

if (datPath) {
  try {
    const data = fs.readFileSync(datPath);
    const parsed = DatReader(data).parse();
    const jsonPath = path.join(out, "Tibia.parsed.json");
    fs.writeFileSync(jsonPath, JSON.stringify(parsed, null, 2) + "\n");
    report.dat = {
      parsed: true,
      output: path.basename(jsonPath),
      topLevelKeys: Object.keys(parsed)
    };
  } catch (err) {
    report.dat = {
      parsed: false,
      error: String(err),
      note: "O parser @v0rt4c/dat cobre 7.40–7.72. Para versões fora dessa faixa, use ObjectBuilder Studio/Assets And Map Editor."
    };
  }
} else {
  report.dat = { error: "Tibia.dat não encontrado" };
}

for (const [kind, p] of Object.entries({otbm:otbmPath,otb:otbPath,spr:sprPath,dat:datPath,house:housePath,spawn:spawnPath})) {
  report.files[kind] = p ? {name:path.basename(p), bytes:fs.statSync(p).size} : null;
}

fs.writeFileSync(path.join(out, "source-set-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log("Source set processado.");
console.log(JSON.stringify(report, null, 2));
