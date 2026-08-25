import { useState } from "react";
import { useEditorStore, hasDirtyScenes } from "../store/store";
import { compileAllToProject } from "../compiler/writeProject";
import { getActiveEditorScene } from "../phaser/editorController";
import type { TransformTool } from "../model/transformGizmo";
import { usePlaySession } from "../play/playSession";
import { runPlay, stopPlay } from "../play/runPlay";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

export function Toolbar() {
  const openProject = useEditorStore((s) => s.openProject);
  const newScene = useEditorStore((s) => s.newScene);
  const saveActiveScene = useEditorStore((s) => s.saveActiveScene);
  const saveAllDirtyScenes = useEditorStore((s) => s.saveAllDirtyScenes);
  const revertActiveScene = useEditorStore((s) => s.revertActiveScene);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const activeFileName = useEditorStore((s) => s.activeFileName);
  const scenes = useEditorStore((s) => s.scenes);
  const animsDirty = useEditorStore((s) => !!s.animsWorking?.dirty);
  const zoom = useEditorStore((s) => s.zoom);
  const transformTool = useEditorStore((s) => s.transformTool);
  const setTransformTool = useEditorStore((s) => s.setTransformTool);
  const [pendingProject, setPendingProject] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const playStatus = usePlaySession((s) => s.status);
  const projectPath = useEditorStore((s) => s.projectPath);

  const active = scenes.find((scene) => scene.fileName === activeFileName);
  const canSave = !!active?.dirty || animsDirty;
  const canRevert = !!active?.dirty && !!active.lastSaved;
  const canUndo = (active?.history.past.length ?? 0) > 0;
  const canRedo = (active?.history.future.length ?? 0) > 0;

  const pickProject = async () => {
    const api = (window as any).editor;
    if (!api) return;
    const path = await api.openProject();
    if (path) await openProject(path);
  };

  const handleOpenProject = async () => {
    if (hasDirtyScenes(useEditorStore.getState())) {
      setPendingProject(true);
      return;
    }
    await pickProject();
  };

  const handleCompile = async () => {
    const api = (window as any).editor;
    const st = useEditorStore.getState();
    if (!api || !st.projectPath) return;
    await compileAllToProject({
      api,
      projectPath: st.projectPath,
      scenes: st.scenes,
      prefabIndex: st.prefabIndex,
    });
    alert("Derlendi: proje/src altina yazildi.");
  };

  const handlePlay = () => {
    if (hasDirtyScenes(useEditorStore.getState())) {
      setPendingPlay(true);
      return;
    }
    void runPlay();
  };

  return (
    <div className="toolbar">
      <span className="title">Phaser Editor</span>
      <button className="btn" onClick={() => void handleOpenProject()}>Proje Aç</button>
      <button className="btn" onClick={() => {
        const n = prompt("Sahne adı:", "Level");
        if (n) newScene(n, "SCENE");
      }}>Yeni Sahne</button>
      <button className="btn" onClick={() => {
        const n = prompt("Prefab adı:", "Dragon");
        if (n) newScene(n, "PREFAB");
      }}>Yeni Prefab</button>
      <button className="btn" disabled={!canSave} onClick={() => saveActiveScene()}>Kaydet</button>
      <button
        className="btn"
        disabled={!canRevert}
        title="Son kaydedilen haline don"
        onClick={() => revertActiveScene()}
      >
        Kaydedilene dön
      </button>
      <button className="btn" disabled={!scenes.length} onClick={() => void handleCompile()}>Derle (TS)</button>
      <button
        className="btn"
        disabled={!projectPath || playStatus === "starting"}
        onClick={() => void handlePlay()}
      >
        Oyna
      </button>
      <button
        className="btn"
        disabled={playStatus === "idle"}
        onClick={() => void stopPlay()}
      >
        Durdur
      </button>
      <div className="tool-group" role="group" aria-label="Transform">
        {TOOL_BUTTONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tool-btn${transformTool === item.id ? " active" : ""}`}
            title={`${item.title} (${item.hotkey})`}
            onClick={() => setTransformTool(item.id)}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <span className="spacer" />
      <button className="btn" disabled={!canUndo} onClick={() => undo()}>Undo</button>
      <button className="btn" disabled={!canRedo} onClick={() => redo()}>Redo</button>
      <span className="spacer" />
      <button className="btn small" title="Uzaklaştir" onClick={() => getActiveEditorScene()?.zoomOut()}>−</button>
      <span className="zoom">{Math.round(zoom * 100)}%</span>
      <button className="btn small" title="Yakinlaştir" onClick={() => getActiveEditorScene()?.zoomIn()}>+</button>
      <button className="btn small" title="Zoom sifirla" onClick={() => getActiveEditorScene()?.zoomReset()}>⤢</button>
      {activeFileName && <span className="active">{activeFileName}</span>}
      {pendingProject && (
        <UnsavedChangesDialog
          message="Kaydedilmemiş sahne değişiklikleri var. Yeni proje açılmadan kaydedilsin mi?"
          onSave={async () => {
            setPendingProject(false);
            await saveAllDirtyScenes();
            await pickProject();
          }}
          onDiscard={async () => {
            setPendingProject(false);
            await pickProject();
          }}
          onCancel={() => setPendingProject(false)}
        />
      )}
      {pendingPlay && (
        <UnsavedChangesDialog
          message="Kaydedilmemiş değişiklikler var. Oynamadan önce kaydedilsin mi?"
          onSave={async () => {
            setPendingPlay(false);
            await saveAllDirtyScenes();
            await runPlay();
          }}
          onDiscard={async () => {
            setPendingPlay(false);
            await runPlay();
          }}
          onCancel={() => setPendingPlay(false)}
        />
      )}
    </div>
  );
}

const TOOL_BUTTONS: { id: TransformTool; title: string; hotkey: string; icon: JSX.Element }[] = [
  { id: "pan", title: "El", hotkey: "Q", icon: <IconHand /> },
  { id: "position", title: "Position", hotkey: "W", icon: <IconMove /> },
  { id: "rotate", title: "Rotate", hotkey: "E", icon: <IconRotate /> },
  { id: "scale", title: "Scale", hotkey: "R", icon: <IconScale /> },
];

function iconProps() {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function IconHand() {
  return (
    <svg {...iconProps()}>
      <path d="M6 7.2V3.4a1 1 0 0 1 2 0V7M8 7V2.8a1 1 0 0 1 2 0V7M10 7.2V4.2a1 1 0 0 1 2 0V9c0 2.4-1.6 4.2-4 4.2S4 11.4 4 9V6.2a1 1 0 0 1 2 0V8" />
    </svg>
  );
}

function IconMove() {
  return (
    <svg {...iconProps()}>
      <path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" />
    </svg>
  );
}

function IconRotate() {
  return (
    <svg {...iconProps()}>
      <path d="M12.5 7A4.5 4.5 0 1 1 8 3.5" />
      <path d="M8 1.8v3.4h3.2" />
    </svg>
  );
}

function IconScale() {
  return (
    <svg {...iconProps()}>
      <rect x="5" y="5" width="6" height="6" />
      <path d="M2.5 2.5 5 5M13.5 2.5 11 5M2.5 13.5 5 11M13.5 13.5 11 11" />
    </svg>
  );
}
