import fs from "node:fs";
import path from "node:path";

const [, , rootArg, outputArg] = process.argv;
if (!rootArg) {
  console.error("Uso: npm run assets:inspect -- <diretorio-do-pacote> [saida.json]");
  console.error("Exemplo: npm run assets:inspect -- C:\\ShinobiAuthoring");
  process.exit(1);
}

const root = path.resolve(rootArg);
if (!fs.existsSync(root)) {
  console.error("Diretório não encontrado:", root);
  process.exit(2);
}

const candidates = {
  otbm: ["MAPA1.otbm", "map.otbm"],
  house: ["MAPA1-house.xml", "map-house.xml"],
  spawn: ["MAPA1-spawn.xml", "map-spawn.xml"],
  otb: ["items.otb", "items.otbm"],
  dat: ["Tibia.dat", "tibia.dat"],
  spr: ["Tibia.spr", "tibia.spr"],
  otfi: ["Tibia.otfi", "tibia.otfi"]
};

function locate(names) {
  for (const name of names) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function fileInfo(file) {
  if (!file) return null;
  const s = fs.statSync(file);
  const b = Buffer.alloc(Math.min(32, s.size));
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, b, 0, b.length, 0);
  fs.closeSync(fd);
  return {
    name: path.basename(file),
    path: file,
    bytes: s.size,
    first32Hex: b.toString("hex"),
    first32Ascii: b.toString("ascii").replace(/[^\x20-\x7E]/g, ".")
  };
}

const files = Object.fromEntries(
  Object.entries(candidates).map(([kind, names]) => [kind, fileInfo(locate(names))])
);

const report = {
  schemaVersion: 2,
  root,
  generatedAt: new Date().toISOString(),
  files,
  notes: [
    "Este relatório não modifica os arquivos-fonte.",
    "Client assets originais devem permanecer fora do repositório do jogo.",
    "A interpretação semântica completa é feita pelos parsers específicos de OTBM/OTB/DAT/SPR."
  ]
};

if (outputArg) {
  const out = path.resolve(outputArg);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log("Relatório:", out);
} else {
  console.log(JSON.stringify(report, null, 2));
}
