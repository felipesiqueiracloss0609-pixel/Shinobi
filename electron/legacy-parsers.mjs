import fs from "node:fs";

const FE = 0xFE;
const FF = 0xFF;
const FD = 0xFD;

class Cursor {
  constructor(buffer) {
    this.buffer = buffer;
    this.position = 0;
  }
  u8() {
    if (this.position >= this.buffer.length) throw new Error("EOF");
    return this.buffer[this.position++];
  }
  u16() {
    const v = this.buffer.readUInt16LE(this.position);
    this.position += 2;
    return v;
  }
  u32() {
    const v = this.buffer.readUInt32LE(this.position);
    this.position += 4;
    return v;
  }
  e8() {
    const a = this.u8();
    if (a === FD && this.position < this.buffer.length) {
      const b = this.buffer[this.position];
      if (b === FE || b === FF || b === FD) return this.u8();
    }
    return a;
  }
  eu16() {
    return this.e8() | (this.e8() << 8);
  }
  eu32() {
    return (this.e8()) |
      (this.e8() << 8) |
      (this.e8() << 16) |
      (this.e8() * 0x1000000);
  }
}

function findSpecial(buffer, from) {
  let escaped = false;
  for (let i = from; i < buffer.length; i++) {
    const b = buffer[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (b === FD) {
      if (i + 1 < buffer.length && (buffer[i + 1] === FE || buffer[i + 1] === FF || buffer[i + 1] === FD)) {
        escaped = true;
        continue;
      }
    }
    if (b === FE || b === FF) return i;
  }
  return buffer.length;
}

export function parseOTB(buffer) {
  const rootStart = findSpecial(buffer, 0);
  if (rootStart >= buffer.length || buffer[rootStart] !== FE) {
    throw new Error("OTB: nó raiz não encontrada.");
  }

  const root = new Cursor(buffer);
  root.position = rootStart + 1;
  root.position += 5;
  root.u8();
  root.eu16();
  const itemsMajorVersion = root.eu32();
  const itemsMinorVersion = root.eu32();
  const itemsBuildNumber = root.eu32();

  if (itemsMajorVersion < 1 || itemsMajorVersion > 3) {
    throw new Error("OTB: versão major não suportada: " + itemsMajorVersion);
  }

  const items = [];
  let pos = root.position;

  while (pos < buffer.length) {
    const start = findSpecial(buffer, pos);
    if (start >= buffer.length) break;
    if (buffer[start] !== FE) break;

    const end = findSpecial(buffer, start + 1);
    if (end >= buffer.length || buffer[end] !== FF) {
      throw new Error("OTB: nó sem terminador em " + start);
    }

    const c = new Cursor(buffer);
    c.position = start + 1;

    const group = c.u8();
    if (group === 14) {
      pos = end + 1;
      continue;
    }

    const flags = c.eu32();
    let serverId = 0;
    let clientId = 0;

    while (c.position < end) {
      const attr = c.u8();
      const dataLength = c.eu16();
      const payloadStart = c.position;
      const payloadEnd = Math.min(end, payloadStart + dataLength);

      if (attr === 16) {
        serverId = c.eu16();
      } else if (attr === 17) {
        clientId = c.eu16();
      }

      c.position = payloadEnd;
    }

    if (serverId > 0 && clientId > 0) {
      items.push({ serverId, clientId, group, flags });
    }

    pos = end + 1;
  }

  return {
    itemsMajorVersion,
    itemsMinorVersion,
    itemsBuildNumber,
    items
  };
}

const DAT_SIGNATURE_VERSIONS = new Map([
  ["3DFF4B2A", 710],
  ["3FD4FB91", 713],
  ["3FDF40C6", 721],
  ["404E1C14", 724],
  ["411A6233", 730],
  ["41BF619C", 740],
  ["42F81973", 750],
  ["437B2B8F", 755],
  ["439D5A33", 760]
]);

export function detectDatVersion(datBuffer, otfiPath) {
  const signature = datBuffer.readUInt32LE(0).toString(16).toUpperCase().padStart(8, "0");
  if (DAT_SIGNATURE_VERSIONS.has(signature)) return { version: DAT_SIGNATURE_VERSIONS.get(signature), source: "signature", signature };

  if (otfiPath && fs.existsSync(otfiPath)) {
    const text = fs.readFileSync(otfiPath).toString("utf8");
    const patterns = [
      /(?:clientVersion|version|protocolVersion)\D{0,32}(\d{3,4})/i,
      /\b(\d{3,4})\b/
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const version = Number(match[1]);
        if (version >= 700 && version <= 1500) return { version, source: "otfi", signature };
      }
    }
  }

  return { version: 860, source: "fallback-860", signature };
}

function normalizeDatAttr(attr, version) {
  if (version >= 1000) {
    if (attr === 16) return 253;
    if (attr > 16) return attr - 1;
    return attr;
  }
  if (version >= 860) return attr;
  if (version >= 780) {
    if (attr === 8) return 254;
    if (attr > 8) return attr - 1;
  }
  return attr;
}

function parseMarket(c) {
  c.u16(); c.u16(); c.u16();
  const len = c.u16();
  c.position += len;
  c.u16(); c.u16();
}

function readThing(c, clientId, version, sprite32) {
  const flags = {};
  const spriteIds = [];

  while (true) {
    if (c.position >= c.buffer.length) throw new Error("DAT: EOF antes do fim dos atributos do item " + clientId);
    let attr = normalizeDatAttr(c.u8(), version);
    if (attr === 255) break;

    switch (attr) {
      case 0:
        flags.ground = true;
        flags.groundSpeed = c.u16();
        break;
      case 1: flags.groundBorder = true; break;
      case 2: flags.onBottom = true; break;
      case 3: flags.onTop = true; break;
      case 4: flags.container = true; break;
      case 5: flags.stackable = true; break;
      case 6: flags.forceUse = true; break;
      case 7: flags.multiUse = true; break;
      case 8: flags.writable = true; flags.writableLength = c.u16(); break;
      case 9: flags.writableOnce = true; flags.writableOnceLength = c.u16(); break;
      case 10: flags.fluidContainer = true; break;
      case 11: flags.fluid = true; break;
      case 12: flags.unpassable = true; break;
      case 13: flags.unmovable = true; break;
      case 14: flags.blockMissile = true; break;
      case 15: flags.blockPathfinder = true; break;
      case 16: flags.pickupable = true; break;
      case 17: flags.hangable = true; break;
      case 18: flags.hookSouth = true; break;
      case 19: flags.hookEast = true; break;
      case 20: flags.rotatable = true; break;
      case 21:
        flags.lightLevel = c.u16();
        flags.lightColor = c.u16();
        break;
      case 22: flags.dontHide = true; break;
      case 23: flags.floorChange = true; break;
      case 24:
        flags.offsetX = c.u16();
        flags.offsetY = c.u16();
        break;
      case 25:
        flags.elevation = c.u16();
        break;
      case 26: flags.lyingCorpse = true; break;
      case 27: flags.alwaysAnimate = true; break;
      case 28: flags.minimapColor = c.u16(); break;
      case 29: flags.lensHelp = c.u16(); break;
      case 30: flags.fullGround = true; break;
      case 31: break;
      case 32: flags.cloth = c.u16(); break;
      case 33:
        flags.market = true;
        parseMarket(c);
        break;
      case 34: flags.usable = c.u16(); break;
      case 35: flags.wrapable = true; break;
      case 36: flags.unwrapable = true; break;
      case 37: flags.topEffect = true; break;
      case 252: flags.floorChange = true; break;
      case 253: flags.noMoveAnimation = true; break;
      case 254: flags.chargeable = true; break;
      default:
        throw new Error("DAT: atributo desconhecido " + attr + " no item " + clientId + " para versão " + version);
    }
  }

  const width = c.u8();
  const height = c.u8();
  const realSize = (width > 1 || height > 1) ? c.u8() : 32;
  const layers = c.u8();
  const patternX = c.u8();
  const patternY = c.u8();
  const patternZ = version >= 755 ? c.u8() : 1;
  const animations = c.u8();

  const total = width * height * layers * patternX * patternY * patternZ * animations;
  for (let i = 0; i < total; i++) {
    if (version >= 1000 || sprite32) spriteIds.push(c.u32());
    else spriteIds.push(c.u16());
  }

  return {
    id: clientId,
    width,
    height,
    realSize,
    layers,
    patternX,
    patternY,
    patternZ,
    animations,
    spriteIds,
    flags
  };
}

export function parseDatItems(buffer, versionInfo) {
  const signature = buffer.readUInt32LE(0).toString(16).toUpperCase().padStart(8, "0");
  const countItems = buffer.readUInt16LE(4);
  const countLooktypes = buffer.readUInt16LE(6);
  const countEffects = buffer.readUInt16LE(8);
  const countMissiles = buffer.readUInt16LE(10);

  const version = Number(versionInfo.version);
  if (!Number.isFinite(version)) throw new Error("DAT: versão inválida.");

  const sprite32 = version >= 1100;
  const c = new Cursor(buffer);
  c.position = 12;
  const items = new Map();

  for (let i = 0; i < countItems; i++) {
    const clientId = 100 + i;
    const item = readThing(c, clientId, version, sprite32);
    items.set(clientId, item);
  }

  return {
    signature,
    version,
    counts: { items: countItems, looktypes: countLooktypes, effects: countEffects, missiles: countMissiles },
    items
  };
}

function decodeSpriteRle(buffer, offset, useAlpha) {
  const c = new Cursor(buffer);
  c.position = offset;

  c.position += 3;
  const dataSize = c.u16();
  const dataEnd = c.position + dataSize;
  if (dataEnd > buffer.length) throw new Error("SPR: dados de sprite fora do arquivo.");

  const rgba = new Uint8Array(32 * 32 * 4);
  let writePos = 0;
  let readPos = c.position;

  while (readPos < dataEnd && writePos < rgba.length) {
    const transparent = buffer.readUInt16LE(readPos);
    const colored = buffer.readUInt16LE(readPos + 2);
    readPos += 4;

    for (let i = 0; i < transparent && writePos < rgba.length; i++) {
      rgba[writePos + 3] = 0;
      writePos += 4;
    }

    const bytesPerPixel = useAlpha ? 4 : 3;
    const need = colored * bytesPerPixel;
    if (readPos + need > dataEnd) throw new Error("SPR: RLE truncado.");

    for (let i = 0; i < colored && writePos < rgba.length; i++) {
      rgba[writePos] = buffer[readPos++];
      rgba[writePos + 1] = buffer[readPos++];
      rgba[writePos + 2] = buffer[readPos++];
      rgba[writePos + 3] = useAlpha ? buffer[readPos++] : 255;
      writePos += 4;
    }
  }

  return rgba;
}

export function createSprSource(buffer) {
  if (buffer.length < 8) throw new Error("SPR: arquivo muito pequeno.");

  const isBmp = buffer[0] === 0x42 && buffer[1] === 0x4D;
  if (isBmp) return createBmpSource(buffer);

  const signature = buffer.readUInt32LE(0);
  const count16 = buffer.readUInt16LE(4);
  const offset16 = 6;
  const first16 = count16 > 0 && offset16 + count16 * 4 + 4 <= buffer.length
    ? buffer.readUInt32LE(offset16)
    : 0;

  const count32 = buffer.readUInt32LE(4);
  const offset32 = 8;
  const first32 = count32 > 0 && offset32 + count32 * 4 + 4 <= buffer.length
    ? buffer.readUInt32LE(offset32)
    : 0;

  const score = (count, indexOffset, first) => {
    let value = 0;
    if (count > 0 && count < 0x1000000) value += 2;
    if (indexOffset + count * 4 <= buffer.length) value += 4;
    if (first === 0 || (first >= indexOffset + count * 4 && first < buffer.length)) value += 5;
    return value;
  };

  const use32 = score(count32, offset32, first32) > score(count16, offset16, first16);
  const count = use32 ? count32 : count16;
  const indexOffset = use32 ? offset32 : offset16;
  const alphaPreference = use32 ? true : false;

  if (!count || indexOffset + count * 4 > buffer.length) {
    throw new Error("SPR: cabeçalho/índice incompatível. Assinatura 0x" + signature.toString(16));
  }

  let useAlpha = alphaPreference;
  const probeId = Math.min(1, count);
  const probeOffset = buffer.readUInt32LE(indexOffset + (probeId - 1) * 4);
  if (probeOffset > 0 && probeOffset + 5 <= buffer.length) {
    try { decodeSpriteRle(buffer, probeOffset, false); }
    catch { useAlpha = true; }
  }

  return {
    kind: "spr",
    signature,
    count,
    getRGBA(id) {
      if (id < 1 || id > count) return null;
      const offset = buffer.readUInt32LE(indexOffset + (id - 1) * 4);
      if (offset === 0) return new Uint8Array(32 * 32 * 4);
      try {
        return decodeSpriteRle(buffer, offset, useAlpha);
      } catch (firstError) {
        return decodeSpriteRle(buffer, offset, !useAlpha);
      }
    }
  };
}

function createBmpSource(buffer) {
  const pixelOffset = buffer.readUInt32LE(10);
  const headerSize = buffer.readUInt32LE(14);
  const width = buffer.readInt32LE(18);
  const heightRaw = buffer.readInt32LE(22);
  const planes = buffer.readUInt16LE(26);
  const bpp = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);

  if (planes !== 1 || compression !== 0 || (bpp !== 24 && bpp !== 32)) {
    throw new Error("BMP não suportado. Esperado BI_RGB 24/32bpp.");
  }
  if (Math.abs(width) % 32 !== 0 || Math.abs(heightRaw) % 32 !== 0) {
    throw new Error("BMP de sprites precisa ter largura/altura múltiplas de 32. Recebido " + width + "x" + heightRaw + ".");
  }

  const widthAbs = Math.abs(width);
  const heightAbs = Math.abs(heightRaw);
  const rowStride = Math.floor((widthAbs * bpp + 31) / 32) * 4;
  const cols = widthAbs / 32;
  const rows = heightAbs / 32;
  const count = cols * rows;
  const bottomUp = heightRaw > 0;

  return {
    kind: "bmp-sheet",
    signature: "BM",
    count,
    width: widthAbs,
    height: heightAbs,
    getRGBA(id) {
      if (id < 1 || id > count) return null;
      const index = id - 1;
      const cellX = index % cols;
      const cellY = Math.floor(index / cols);
      const rgba = new Uint8Array(32 * 32 * 4);

      for (let y = 0; y < 32; y++) {
        const sourceRow = bottomUp ? (heightAbs - 1 - (cellY * 32 + y)) : (cellY * 32 + y);
        const base = pixelOffset + sourceRow * rowStride + cellX * 32 * (bpp / 8);
        for (let x = 0; x < 32; x++) {
          const p = base + x * (bpp / 8);
          const o = (y * 32 + x) * 4;
          rgba[o] = buffer[p + 2];
          rgba[o + 1] = buffer[p + 1];
          rgba[o + 2] = buffer[p];
          const a = bpp === 32 ? buffer[p + 3] : 255;
          rgba[o + 3] = a || ((rgba[o] | rgba[o + 1] | rgba[o + 2]) ? 255 : 0);
        }
      }

      return rgba;
    }
  };
}
