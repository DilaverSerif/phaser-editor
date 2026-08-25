const { ipcRenderer, webFrame } = require("electron");

ipcRenderer.on("play:collect-stats", async (_event, code) => {
  try {
    const raw = await webFrame.executeJavaScriptInIsolatedWorld(0, [
      { code: String(code || "") },
    ]);
    ipcRenderer.sendToHost("play-stats", raw);
  } catch (err) {
    ipcRenderer.sendToHost("play-stats", {
      found: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
