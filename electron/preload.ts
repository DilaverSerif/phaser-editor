import { contextBridge, ipcRenderer } from "electron";

export type AppCloseKind = "window" | "quit";

const api = {
  openProject: () => ipcRenderer.invoke("dialog:openProject"),
  readDir: (dir: string) => ipcRenderer.invoke("fs:readDir", dir),
  readFile: (file: string) => ipcRenderer.invoke("fs:readFile", file),
  writeFile: (file: string, content: string) =>
    ipcRenderer.invoke("fs:writeFile", file, content),
  readAsset: (file: string) => ipcRenderer.invoke("fs:readAsset", file),
  onCloseRequest: (callback: (kind: AppCloseKind) => void) => {
    const handler = (_event: unknown, kind: AppCloseKind) => {
      callback(kind === "quit" ? "quit" : "window");
    };
    ipcRenderer.on("app:close-request", handler);
    return () => {
      ipcRenderer.removeListener("app:close-request", handler);
    };
  },
  allowClose: (kind: AppCloseKind) => ipcRenderer.send("app:close-allow", kind),
  cancelClose: () => ipcRenderer.send("app:close-cancel"),
  startPlay: (projectPath: string) =>
    ipcRenderer.invoke("play:start", projectPath) as Promise<
      { ok: true; url: string } | { error: string }
    >,
  stopPlay: () => ipcRenderer.invoke("play:stop") as Promise<{ ok: true }>,
  clearPlaySiteData: () =>
    ipcRenderer.invoke("play:clearSiteData") as Promise<
      { ok: true } | { error: string }
    >,
  collectPlayStats: (webContentsId: number) =>
    ipcRenderer.invoke("play:collectStats", webContentsId),
  playGuestPreloadUrl: () =>
    ipcRenderer.invoke("play:guestPreloadUrl") as Promise<string>,
};

contextBridge.exposeInMainWorld("editor", api);

export type EditorApi = typeof api;
