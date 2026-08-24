import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
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
    let fileUrl = `file://${path.join(__dirname, "../dist/index.html")}`;
    if (process.env.AUTOPEN_PROJECT) {
      fileUrl += `?autoproj=${encodeURIComponent(process.env.AUTOPEN_PROJECT)}&autoscene=${encodeURIComponent(
        process.env.AUTOPEN_SCENE || ""
      )}`;
    }
    win.loadURL(fileUrl);
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
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
