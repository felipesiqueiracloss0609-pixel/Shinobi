import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { read } from "@v0rt4c/spr";

function usage() {
  console.error("Uso: npm run assets:extract-spr -- <Tibia.spr> <saida-dir> [inicio] [fim]");
  process.exit(1);
}

const [, , sprArg, outArg, fromArg, toArg] = process.argv;
if (!sprArg || !outArg) usage();

const sprPath = path.resolve(sprArg);
const outDir = path.resolve(outArg);
const from = fromArg ? Math.max(1, Number(fromArg)) : 1;
const to = toArg ? Math.max(from, Number(toArg)) : Number.MAX_SAFE_INTEGER;

if (!fs.existsSync(sprPath)) {
  console.error("SPR não encontrado:", sprPath);
  process.exit(2);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const body = Buffer.concat([t, data]);
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  t.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(body), 8 + data.length);
  return result;
}

function rgbaToPng(rgba, width = 32, height = 32) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, row + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from("\x89PNG\r\n\x1a\n", "binary"),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function safeSpriteFile(id) {
  return String(id).padStart(6, "0") + ".png";
}

const data = new Uint8Array(fs.readFileSync(sprPath));
let parsed;
try {
  parsed = read(data);
} catch (err) {
  console.error("Não foi possível interpretar o SPR com @v0rt4c/spr.");
  console.error(String(err));
  console.error("Esse parser suporta SPR dos clientes 3.0 até 10.56; para formatos fora dessa faixa, use ObjectBuilder Studio ou Assets And Map Editor.");
  process.exit(3);
}

fs.mkdirSync(outDir, { recursive: true });

const selected = parsed.sprites.filter(s => s.id >= from && s.id <= to);
const manifest = {
  schemaVersion: 1,
  type: "ShinobiLegacySpriteManifest-v1",
  sourceFile: path.basename(sprPath),
  sourceBytes: data.byteLength,
  signature: parsed.signature,
  declaredCount: parsed.count,
  exportedCount: selected.length,
  range: { from, to: Math.min(to, parsed.count) },
  canvas: { width: 32, height: 32 },
  sprites: []
};

for (const sprite of selected) {
  const file = safeSpriteFile(sprite.id);
  fs.writeFileSync(path.join(outDir, file), rgbaToPng(sprite.rgba, 32, 32));
  manifest.sprites.push({ id: sprite.id, file });
}

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);

console.log("SPR interpretado.");
console.log("Assinatura:", parsed.signature);
console.log("Sprites declarados:", parsed.count);
console.log("Exportados:", selected.length);
console.log("Saída:", outDir);
