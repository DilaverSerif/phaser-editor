import { useRef, useState, type PointerEvent } from "react";
import { insertIndexFromX } from "../layout/dockLayout";
import { useEditorStore } from "../store/store";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

export function SceneTabBar() {
  const scenes = useEditorStore((s) => s.scenes);
  const activeFileName = useEditorStore((s) => s.activeFileName);
  const setActiveScene = useEditorStore((s) => s.setActiveScene);
  const closeScene = useEditorStore((s) => s.closeScene);
  const saveScene = useEditorStore((s) => s.saveScene);
  const reorderScenes = useEditorStore((s) => s.reorderScenes);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [pendingClose, setPendingClose] = useState<string | null>(null);
  const drag = useRef<{
    fromIndex: number;
    pointerId: number;
    moved: boolean;
  } | null>(null);

  if (scenes.length === 0) return null;

  const targetIndex = (clientX: number) => {
    const strip = document.querySelector("[data-scene-tabs]");
    if (!strip) return scenes.length;
    const tabs = [...strip.querySelectorAll<HTMLElement>("[data-scene-tab]")];
    return insertIndexFromX(
      tabs.map((tab) => {
        const box = tab.getBoundingClientRect();
        return box.left + box.width / 2;
      }),
      clientX
    );
  };

  const startDrag = (event: PointerEvent<HTMLButtonElement>, fromIndex: number) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { fromIndex, pointerId: event.pointerId, moved: false };
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    drag.current.moved = true;
    setDropIndex(targetIndex(event.clientX));
  };

  const stopDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    drag.current = null;
    setDropIndex(null);
    if (state?.moved) {
      reorderScenes(state.fromIndex, targetIndex(event.clientX));
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const requestClose = (fileName: string) => {
    const scene = scenes.find((item) => item.fileName === fileName);
    if (scene?.dirty) {
      setPendingClose(fileName);
      return;
    }
    closeScene(fileName);
  };

  return (
    <>
      <div className="scene-tabbar" data-scene-tabs>
        {scenes.map((scene, index) => (
          <button
            key={scene.path}
            type="button"
            data-scene-tab={scene.fileName}
            className={`scene-tab${scene.fileName === activeFileName ? " active" : ""}${
              dropIndex === index ? " drop-before" : ""
            }`}
            onClick={() => setActiveScene(scene.fileName)}
            onPointerDown={(event) => startDrag(event, index)}
            onPointerMove={moveDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            title={scene.path}
          >
            <span className="scene-tab-label">{scene.fileName}</span>
            {scene.dirty && <span className="scene-tab-dirty" title="kaydedilmedi">●</span>}
            <span
              className="scene-tab-close"
              title="Kapat"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                requestClose(scene.fileName);
              }}
            >
              ×
            </span>
          </button>
        ))}
      </div>
      {pendingClose && (
        <UnsavedChangesDialog
          message={`${pendingClose} kaydedilmedi. Çıkmadan önce kaydedilsin mi?`}
          onSave={async () => {
            const fileName = pendingClose;
            setPendingClose(null);
            await saveScene(fileName);
            closeScene(fileName);
          }}
          onDiscard={() => {
            closeScene(pendingClose);
            setPendingClose(null);
          }}
          onCancel={() => setPendingClose(null)}
        />
      )}
    </>
  );
}
