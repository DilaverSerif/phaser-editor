import { compileAllToProject } from "../compiler/writeProject";
import { focusDockPanel } from "../layout/dockFocus";
import { useEditorStore } from "../store/store";
import type { EditorApi } from "../../../electron/preload";
import { usePlaySession } from "./playSession";

function editorApi(): EditorApi | undefined {
  return (window as unknown as { editor?: EditorApi }).editor;
}

export async function runPlay() {
  const api = editorApi();
  const state = useEditorStore.getState();
  focusDockPanel("play");
  if (!api?.startPlay || !state.projectPath) {
    usePlaySession.getState().setError("Play yalnızca Electron içinde çalışır.");
    return;
  }
  const session = usePlaySession.getState();
  const keepFrame = session.status === "running" && !!session.url;
  if (!keepFrame) session.setStarting();
  try {
    await compileAllToProject({
      api,
      projectPath: state.projectPath,
      scenes: state.scenes,
      prefabIndex: state.prefabIndex,
    });
    const result = await api.startPlay(state.projectPath);
    if ("error" in result) {
      usePlaySession.getState().setError(result.error);
      return;
    }
    const url = result.url;
    const next = usePlaySession.getState();
    if (keepFrame && next.url === url) {
      next.bumpReload();
    } else {
      next.setRunning(url);
    }
  } catch (err) {
    usePlaySession.getState().setError(err instanceof Error ? err.message : String(err));
  }
}

export async function stopPlay() {
  const api = editorApi();
  try {
    await api?.stopPlay?.();
  } finally {
    usePlaySession.getState().reset();
  }
}

export async function clearPlaySiteData() {
  const api = editorApi();
  if (!api?.clearPlaySiteData) {
    return { error: "Play yalnızca Electron içinde çalışır." };
  }
  const result = await api.clearPlaySiteData();
  if ("error" in result) return result;
  const play = usePlaySession.getState();
  if (play.status === "running" && play.url) play.bumpReload();
  return result;
}

export async function collectPlayStats(webContentsId: number) {
  const api = editorApi();
  if (!api?.collectPlayStats) {
    return { found: false, error: "Play yalnızca Electron içinde çalışır." };
  }
  return api.collectPlayStats(webContentsId);
}

export async function playGuestPreloadUrl() {
  const url = await editorApi()?.playGuestPreloadUrl();
  return url ?? "";
}
