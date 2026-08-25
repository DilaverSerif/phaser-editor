import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { startPlay, stopPlay } from "./playVite";

app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

let win: BrowserWindow | null = null;
let allowClose = false;
let awaitingRenderer = false;

function askRendererToClose(kind: "window" | "quit") {
  if (!win || win.webContents.isDestroyed()) {
    allowClose = true;
    if (kind === "quit") app.quit();
    return;
  }
  if (awaitingRenderer && kind !== "quit") return;
  awaitingRenderer = true;
  win.webContents.send("app:close-request", kind);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  win.on("close", (event) => {
    if (allowClose) return;
    event.preventDefault();
    askRendererToClose("window");
  });

  win.on("closed", () => {
    win = null;
    awaitingRenderer = false;
    if (process.platform === "darwin") allowClose = false;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    let url = process.env.VITE_DEV_SERVER_URL;
    if (process.env.AUTOPEN_PROJECT) {
      url += `?autoproj=${encodeURIComponent(process.env.AUTOPEN_PROJECT)}&autoscene=${encodeURIComponent(
        process.env.AUTOPEN_SCENE || ""
      )}`;
    }
    win.loadURL(url);
  } else {
    const html = pathToFileURL(path.join(__dirname, "../dist/index.html"));
    if (process.env.AUTOPEN_PROJECT) {
      html.search = new URLSearchParams({
        autoproj: process.env.AUTOPEN_PROJECT,
        autoscene: process.env.AUTOPEN_SCENE || "",
      }).toString();
    }
    win.loadURL(html.href);
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("dialog:openProject", async () => {
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: "Proje klasörünü seç",
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("fs:readDir", async (_e, dir: string) => {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      return entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      }));
    } catch (err) {
      return { error: String(err) };
    }
  });

  ipcMain.handle("fs:readFile", async (_e, file: string) => {
    try {
      return await fs.promises.readFile(file, "utf-8");
    } catch (err) {
      return { error: String(err) };
    }
  });

  ipcMain.handle("fs:writeFile", async (_e, file: string, content: string) => {
    try {
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.writeFile(file, content, "utf-8");
      return { ok: true };
    } catch (err) {
      return { error: String(err) };
    }
  });

  ipcMain.handle("fs:readAsset", async (_e, file: string) => {
    try {
      const data = await fs.promises.readFile(file);
      const ext = path.extname(file).toLowerCase();
      const mime =
        ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
          ? "image/gif"
          : "image/png";
      return `data:${mime};base64,${data.toString("base64")}`;
    } catch (err) {
      return { error: String(err) };
    }
  });

  ipcMain.on("app:close-allow", (_event, kind?: "window" | "quit") => {
    allowClose = true;
    awaitingRenderer = false;
    if (kind === "quit" || process.platform !== "darwin") {
      app.quit();
      return;
    }
    win?.close();
  });

  ipcMain.on("app:close-cancel", () => {
    awaitingRenderer = false;
  });

  ipcMain.handle("play:start", async (_event, projectPath: string) => {
    return startPlay(projectPath);
  });

  ipcMain.handle("play:stop", async () => {
    stopPlay();
    return { ok: true };
  });
});

app.on("before-quit", (event) => {
  if (allowClose) {
    stopPlay();
    return;
  }
  if (!win || win.webContents.isDestroyed()) return;
  event.preventDefault();
  askRendererToClose("quit");
});

app.on("will-quit", () => {
  stopPlay();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
