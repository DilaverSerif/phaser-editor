import { TRANSFORM_HOTKEYS } from "./model/transformGizmo";
import { useEditorStore, hasDirtyScenes } from "./store/store";
import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { CanvasView } from "./components/CanvasView";
import { DockWorkspace } from "./components/DockWorkspace";
import { SceneTabBar } from "./components/SceneTabBar";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function App() {
  const projectPath = useEditorStore((s) => s.projectPath);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ap = params.get("autoproj");
    const as = params.get("autoscene");
    if (ap) {
      (async () => {
        try {
          await useEditorStore.getState().openProject(ap);
          if (as) await useEditorStore.getState().openScenePath(as);
        } catch (e) {
          console.error("[autopen] ERROR", e);
        }
      })();
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (!mod) {
        const tool = TRANSFORM_HOTKEYS[key];
        if (tool) {
          event.preventDefault();
          useEditorStore.getState().setTransformTool(tool);
        }
        return;
      }
      if (key === "s") {
        event.preventDefault();
        void useEditorStore.getState().saveActiveScene();
        return;
      }
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        useEditorStore.getState().redo();
        return;
      }
      if (key === "z") {
        event.preventDefault();
        useEditorStore.getState().undo();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        useEditorStore.getState().redo();
      }
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      if (!hasDirtyScenes(useEditorStore.getState())) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  if (!projectPath) {
    return (
      <div className="welcome">
        <h1>Phaser Editor</h1>
        <p>Phaser Editor 2D uyumlu sahne + prefab editoru</p>
        <OpenButton />
      </div>
    );
  }

  return (
    <div className="app">
      <Toolbar />
      <SceneTabBar />
      <div className="workspace">
        <CanvasView />
        <DockWorkspace />
      </div>
    </div>
  );
}

function OpenButton() {
  const openProject = useEditorStore((s) => s.openProject);
  const api = (window as any).editor;
  return (
    <button
      className="btn primary"
      onClick={async () => {
        if (!api) {
          alert("Editor sadece Electron icinde calisir.");
          return;
        }
        const p = await api.openProject();
        if (p) await openProject(p);
      }}
    >
      Proje Klasörü Aç
    </button>
  );
}
