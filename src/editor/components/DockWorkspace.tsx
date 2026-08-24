import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  type DockFrame,
  type PanelId,
  PANEL_TITLES,
  detachTab,
  insertIndexFromX,
  loadFrames,
  moveTab,
  saveFrames,
} from "../layout/dockLayout";
import { AnimationPanel } from "./AnimationPanel";
import { AssetBrowser } from "./AssetBrowser";
import { HierarchyPanel } from "./HierarchyPanel";
import { Inspector } from "./Inspector";
import { PrefabPanel } from "./PrefabPanel";
import { ProjectPanel } from "./ProjectPanel";

const panels: Record<PanelId, ReactNode> = {
  hierarchy: <HierarchyPanel />,
  project: <ProjectPanel />,
  prefab: <PrefabPanel />,
  inspector: <Inspector />,
  assets: <AssetBrowser />,
  animation: <AnimationPanel />,
};

type TabDrag = {
  panelId: PanelId;
  fromFrameId: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

type FrameDrag = {
  frameId: string;
  pointerId: number;
  pointerX: number;
  pointerY: number;
  x: number;
  y: number;
};

export function DockWorkspace() {
  const [frames, setFrames] = useState<DockFrame[]>(() => loadFrames());
  const [focusedId, setFocusedId] = useState(frames[0]?.id ?? "");
  const [drop, setDrop] = useState<{ frameId: string; index: number } | null>(null);
  const [ghost, setGhost] = useState<{ title: string; x: number; y: number } | null>(null);
  const tabDrag = useRef<TabDrag | null>(null);
  const frameDrag = useRef<FrameDrag | null>(null);
  const framesRef = useRef(frames);
  framesRef.current = frames;

  useEffect(() => {
    const timer = window.setTimeout(() => saveFrames(frames), 200);
    return () => window.clearTimeout(timer);
  }, [frames]);

  const updateFrame = (id: string, patch: Partial<DockFrame>) => {
    setFrames((current) =>
      current.map((frame) => (frame.id === id ? { ...frame, ...patch } : frame))
    );
  };

  const stripTarget = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    const strip = el?.closest("[data-tab-strip]") as HTMLElement | null;
    if (!strip) return null;
    const frameId = strip.dataset.tabStrip;
    if (!frameId) return null;
    const tabs = [...strip.querySelectorAll<HTMLElement>("[data-tab-id]")];
    const mids = tabs.map((tab) => {
      const box = tab.getBoundingClientRect();
      return box.left + box.width / 2;
    });
    return { frameId, index: insertIndexFromX(mids, clientX) };
  };

  const startFrameDrag = (
    event: ReactPointerEvent,
    frame: DockFrame
  ) => {
    if (event.button !== 0) return;
    setFocusedId(frame.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    frameDrag.current = {
      frameId: frame.id,
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: frame.x,
      y: frame.y,
    };
  };

  const onTabPointerDown = (
    event: ReactPointerEvent,
    frame: DockFrame,
    panelId: PanelId
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setFocusedId(frame.id);
    updateFrame(frame.id, { active: panelId });
    event.currentTarget.setPointerCapture(event.pointerId);
    tabDrag.current = {
      panelId,
      fromFrameId: frame.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    if (frame.tabs.length === 1) {
      frameDrag.current = {
        frameId: frame.id,
        pointerId: event.pointerId,
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: frame.x,
        y: frame.y,
      };
    }
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    const tab = tabDrag.current;
    const moving = frameDrag.current;
    if (tab && (Math.abs(event.clientX - tab.startX) > 4 || Math.abs(event.clientY - tab.startY) > 4)) {
      tab.moved = true;
    }
    if (tab?.moved) {
      const target = stripTarget(event.clientX, event.clientY);
      setDrop(target);
      setGhost({
        title: PANEL_TITLES[tab.panelId],
        x: event.clientX + 10,
        y: event.clientY + 10,
      });
      const overOther = target && target.frameId !== tab.fromFrameId;
      const solo =
        framesRef.current.find((frame) => frame.id === tab.fromFrameId)?.tabs.length === 1;
      if (overOther) {
        frameDrag.current = null;
      } else if (solo && !frameDrag.current) {
        const frame = framesRef.current.find((item) => item.id === tab.fromFrameId);
        if (frame) {
          frameDrag.current = {
            frameId: frame.id,
            pointerId: event.pointerId,
            pointerX: event.clientX,
            pointerY: event.clientY,
            x: frame.x,
            y: frame.y,
          };
        }
      }
    }
    if (moving && framesRef.current.some((f) => f.id === moving.frameId)) {
      updateFrame(moving.frameId, {
        x: Math.max(0, moving.x + event.clientX - moving.pointerX),
        y: Math.max(0, moving.y + event.clientY - moving.pointerY),
      });
    }
  };

  const onPointerUp = (event: ReactPointerEvent) => {
    const tab = tabDrag.current;
    const target = tab?.moved ? stripTarget(event.clientX, event.clientY) : null;
    if (tab?.moved && target) {
      setFrames((current) => moveTab(current, tab.panelId, target.frameId, target.index));
      setFocusedId(target.frameId);
    } else if (tab?.moved && !target && framesRef.current.find((f) => f.id === tab.fromFrameId)?.tabs.length !== 1) {
      setFrames((current) =>
        detachTab(current, tab.panelId, {
          x: Math.max(0, event.clientX - 40),
          y: Math.max(0, event.clientY - 16),
        })
      );
    }
    tabDrag.current = null;
    frameDrag.current = null;
    setDrop(null);
    setGhost(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <>
      {frames.map((frame) => (
        <section
          key={frame.id}
          className={`floating-window dock-frame${frame.minimized ? " minimized" : ""}`}
          style={{
            left: frame.x,
            top: frame.y,
            width: frame.width,
            height: frame.minimized ? "auto" : frame.height,
            zIndex: focusedId === frame.id ? 20 : 10,
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            setFocusedId(frame.id);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            className="dock-tabstrip"
            data-tab-strip={frame.id}
            onPointerDown={(event) => startFrameDrag(event, frame)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="dock-tabs">
              {frame.tabs.map((panelId, index) => (
                <button
                  key={panelId}
                  type="button"
                  data-tab-id={panelId}
                  className={`dock-tab${frame.active === panelId ? " active" : ""}${
                    drop?.frameId === frame.id && drop.index === index ? " drop-before" : ""
                  }`}
                  onPointerDown={(event) => onTabPointerDown(event, frame, panelId)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  {PANEL_TITLES[panelId]}
                </button>
              ))}
              {drop?.frameId === frame.id && drop.index === frame.tabs.length && (
                <span className="dock-drop-end" />
              )}
            </div>
            <button
              className="window-button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => updateFrame(frame.id, { minimized: !frame.minimized })}
              title={frame.minimized ? "Pencereyi ac" : "Pencereyi daralt"}
            >
              {frame.minimized ? "+" : "-"}
            </button>
          </div>
          {!frame.minimized && (
            <div className="window-content">
              {frame.tabs.map((panelId) => (
                <div
                  key={panelId}
                  className="dock-page"
                  hidden={panelId !== frame.active}
                >
                  {panels[panelId]}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
      {ghost && (
        <div className="dock-ghost" style={{ left: ghost.x, top: ghost.y }}>
          {ghost.title}
        </div>
      )}
    </>
  );
}
