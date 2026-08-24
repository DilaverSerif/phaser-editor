import { contextBridge, ipcRenderer } from "electron";

const api = {
  openProject: () => ipcRenderer.invoke("dialog:openProject"),
  readDir: (dir: string) => ipcRenderer.invoke("fs:readDir", dir),
  readFile: (file: string) => ipcRenderer.invoke("fs:readFile", file),
  writeFile: (file: string, content: string) =>
    ipcRenderer.invoke("fs:writeFile", file, content),
  readAsset: (file: string) => ipcRenderer.invoke("fs:readAsset", file),
};

contextBridge.exposeInMainWorld("editor", api);

export type EditorApi = typeof api;
