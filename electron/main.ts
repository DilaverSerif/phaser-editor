import { app, BrowserWindow, dialog, ipcMain, session, webContents } from "electron";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { COLLECT_PLAY_STATS } from "../src/editor/play/playStats";
import { PLAY_PARTITION } from "./playPartition";
import { PLAY_HOST, PLAY_PORT, startPlay, stopPlay } from "./playVite";

function isPlayGuestUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === PLAY_HOST && parsed.port === String(PLAY_PORT);
  } catch {
    return false;
  }
}

function copyPlayGuestPreload() {
  const dest = path.join(__dirname, "playGuestPreload.cjs");
  const src = path.join(__dirname, "../electron/playGuestPreload.cjs");
  if (fs.existsSync(src)) fs.copyFileSync(src, dest);
}

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
  copyPlayGuestPreload();
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

  ipcMain.handle("play:clearSiteData", async () => {
    try {
      const playSession = session.fromPartition(PLAY_PARTITION);
      await playSession.clearCache();
      await playSession.clearStorageData();
      return { ok: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle("play:guestPreloadUrl", () => {
    copyPlayGuestPreload();
    const dest = path.join(__dirname, "playGuestPreload.cjs");
    if (!fs.existsSync(dest)) return "";
    return pathToFileURL(dest).href;
  });

  ipcMain.handle("play:collectStats", async (_event, webContentsId: number) => {
    if (typeof webContentsId !== "number") {
      return { found: false, error: "webview id yok" };
    }
    const guest = webContents.fromId(webContentsId);
    if (!guest || guest.isDestroyed()) {
      return { found: false, error: "guest yok" };
    }
    if (!isPlayGuestUrl(guest.getURL())) {
      return { found: false, error: "Play guest değil" };
    }
    try {
      return await guest.executeJavaScriptInIsolatedWorld(0, [
        { code: COLLECT_PLAY_STATS },
      ]);
    } catch (err) {
      return { found: false, error: err instanceof Error ? err.message : String(err) };
    }
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
