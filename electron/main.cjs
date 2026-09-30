const { app, BrowserWindow, Menu, session, protocol, net, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "shinobi-base",
    privileges: {
      defaultCsp: "default-src 'self' data: blob:;",
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

let mainWindow;
let importBusy = false;

function basePackPath() {
  return path.join(app.getPath("userData"), "base-pack");
}

function sourceFolderCandidates() {
  const candidates = [
    path.join(path.dirname(process.execPath), "base-source"),
    path.join(process.cwd(), "base-source")
  ];
  return [...new Set(candidates)];
}

function sourceLooksComplete(dir) {
  if (!fs.existsSync(dir)) return false;
  const required = ["MAPA1.otbm", "Tibia.spr", "Tibia.dat", "items.otb"];
  return required.every((name) => fs.existsSync(path.join(dir, name)));
}

function status() {
  const pack = basePackPath();
  return {
    imported: fs.existsSync(path.join(pack, "manifest.json")),
    packPath: pack
  };
}

async function runBaseImport(sourceDir) {
  if (importBusy) throw new Error("A importação da base já está em andamento.");
  importBusy = true;
  try {
    const importer = await import(path.join(__dirname, "base-importer.mjs"));
    const manifest = await importer.importNarutibiaBase({
      sourceDir,
      outputDir: basePackPath(),
      progress: (percent, stage, detail) => {
        mainWindow?.webContents.send("base:progress", { percent, stage, detail });
      }
    });
    return { ok: true, manifest };
  } finally {
    importBusy = false;
  }
}

async function selectAndImportBase() {
  const picked = await dialog.showOpenDialog(mainWindow, {
    title: "Selecionar pasta da base Narutibia",
    properties: ["openDirectory"]
  });

  if (picked.canceled || !picked.filePaths[0]) return { ok: false, canceled: true };
  return runBaseImport(picked.filePaths[0]);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#111813",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, "preload.cjs"),
      spellcheck: false
    }
  });

  Menu.setApplicationMenu(null);

  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  await mainWindow.loadFile(indexPath);
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  protocol.handle("shinobi-base", async (request) => {
    const url = new URL(request.url);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const root = basePackPath();
    const full = path.resolve(root, relative);
    const relativeToRoot = path.relative(root, full);

    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      return new Response("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      return new Response("Not found", { status: 404 });
    }

    return net.fetch(pathToFileURL(full).toString());
  });

  ipcMain.handle("base:status", () => status());

  ipcMain.handle("base:asset-url", (_event, relativePath) => {
    if (typeof relativePath !== "string") throw new Error("Caminho inválido.");
    const clean = relativePath.replaceAll("\\", "/").replace(/^\/+/, "");
    return "shinobi-base:///" + clean.split("/").map(encodeURIComponent).join("/");
  });

  ipcMain.handle("base:import", () => selectAndImportBase());

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  for (const candidate of sourceFolderCandidates()) {
    if (sourceLooksComplete(candidate) && !status().imported) {
      try {
        await runBaseImport(candidate);
      } catch (error) {
        console.error("Auto-import da base falhou:", error);
      }
      break;
    }
  }

  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
