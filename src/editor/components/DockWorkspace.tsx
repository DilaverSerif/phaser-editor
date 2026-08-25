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
  type StripRect,
  PANEL_TITLES,
  detachTab,
  hitTabStrip,
  tabBoxHitsStrip,
  loadFrames,
  mergeFrame,
  moveTab,
  saveFrames,
} from "../layout/dockLayout";
import { setDockFocusHandler } from "../layout/dockFocus";
import { AnimationPanel } from "./AnimationPanel";
import { AssetBrowser } from "./AssetBrowser";
import { HierarchyPanel } from "./HierarchyPanel";
import { Inspector } from "./Inspector";
import { PlayPanel } from "./PlayPanel";
import { PrefabPanel } from "./PrefabPanel";
import { ProjectPanel } from "./ProjectPanel";
import { usePlaySession } from "../play/playSession";

const panels: Record<PanelId, ReactNode> = {
  hierarchy: <HierarchyPanel />,
  project: <ProjectPanel />,
  prefab: <PrefabPanel />,
  inspector: <Inspector />,
  assets: <AssetBrowser />,
  animation: <AnimationPanel />,
  play: <PlayPanel />,
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
  const playRunning = usePlaySession((s) => s.status === "running");
  const [frames, setFrames] = useState<DockFrame[]>(() => loadFrames());
  const [focusedId, setFocusedId] = useState(frames[0]?.id ?? "");
  const [drop, setDrop] = useState<{ frameId: string; index: number } | null>(null);
  const [ghost, setGhost] = useState<{ title: string; x: number; y: number } | null>(null);
  const tabDrag = useRef<TabDrag | null>(null);
  const frameDrag = useRef<FrameDrag | null>(null);
  const dropRef = useRef<{ frameId: string; index: number } | null>(null);
  const framesRef = useRef(frames);
  framesRef.current = frames;

  useEffect(() => {
    const timer = window.setTimeout(() => saveFrames(frames), 200);
    return () => window.clearTimeout(timer);
  }, [frames]);

  useEffect(() => {
    setDockFocusHandler((panelId) => {
      setFrames((current) => {
        const next = current.map((frame) =>
          frame.tabs.includes(panelId)
            ? { ...frame, active: panelId, minimized: false }
            : frame
        );
        const frame = next.find((item) => item.tabs.includes(panelId));
        if (frame) setFocusedId(frame.id);
        return next;
      });
    });
    return () => setDockFocusHandler(null);
  }, []);

  const updateFrame = (id: string, patch: Partial<DockFrame>) => {
    setFrames((current) =>
      current.map((frame) => (frame.id === id ? { ...frame, ...patch } : frame))
    );
  };

  const readStrips = (): StripRect[] =>
    [...document.querySelectorAll<HTMLElement>("[data-tab-strip]")].map((strip) => {
      const box = strip.getBoundingClientRect();
      const tabs = [...strip.querySelectorAll<HTMLElement>("[data-tab-id]")];
      return {
        frameId: strip.dataset.tabStrip ?? "",
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        tabMids: tabs.map((tab) => {
          const tabBox = tab.getBoundingClientRect();
          return tabBox.left + tabBox.width / 2;
        }),
        tabBoxes: tabs.map((tab) => {
          const tabBox = tab.getBoundingClientRect();
          return {
            left: tabBox.left,
            top: tabBox.top,
            right: tabBox.right,
            bottom: tabBox.bottom,
          };
        }),
      };
    });

  const dropTarget = (
    clientX: number,
    clientY: number,
    ignoreFrameId?: string,
    draggedFrameId?: string,
    predicted?: { x: number; y: number }
  ) => {
    let strips = readStrips();
    if (draggedFrameId && predicted) {
      const frame = framesRef.current.find((item) => item.id === draggedFrameId);
      if (frame) {
        const dx = predicted.x - frame.x;
        const dy = predicted.y - frame.y;
        strips = strips.map((strip) =>
          strip.frameId !== draggedFrameId
            ? strip
            : {
                ...strip,
                left: strip.left + dx,
                right: strip.right + dx,
                top: strip.top + dy,
                bottom: strip.bottom + dy,
                tabMids: strip.tabMids.map((mid) => mid + dx),
                tabBoxes: strip.tabBoxes.map((tab) => ({
                  ...tab,
                  left: tab.left + dx,
                  right: tab.right + dx,
                  top: tab.top + dy,
                  bottom: tab.bottom + dy,
                })),
              }
        );
      }
    }
    const others = strips.filter((strip) => strip.frameId !== ignoreFrameId);
    if (draggedFrameId) {
      const dragged = strips.find((strip) => strip.frameId === draggedFrameId);
      if (dragged) return tabBoxHitsStrip(dragged.tabBoxes, others);
      return null;
    }
    return hitTabStrip(strips, clientX, clientY, ignoreFrameId);
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
    let nextX: number | undefined;
    let nextY: number | undefined;
    if (moving && framesRef.current.some((frame) => frame.id === moving.frameId)) {
      nextX = Math.max(0, moving.x + event.clientX - moving.pointerX);
      nextY = Math.max(0, moving.y + event.clientY - moving.pointerY);
      updateFrame(moving.frameId, { x: nextX, y: nextY });
    }
    if (tab?.moved || moving) {
      const ignoreId = tab?.fromFrameId ?? moving?.frameId;
      const target = dropTarget(
        event.clientX,
        event.clientY,
        ignoreId,
        moving?.frameId,
        nextX !== undefined && nextY !== undefined ? { x: nextX, y: nextY } : undefined
      );
      dropRef.current = target;
      setDrop(target);
      if (tab?.moved) {
        setGhost({
          title: PANEL_TITLES[tab.panelId],
          x: event.clientX + 10,
          y: event.clientY + 10,
        });
      }
    }
  };

  const onPointerUp = (event: ReactPointerEvent) => {
    const tab = tabDrag.current;
    const moving = frameDrag.current;
    const target = dropRef.current;
    if (tab?.moved && target) {
      setFrames((current) => moveTab(current, tab.panelId, target.frameId, target.index));
      setFocusedId(target.frameId);
    } else if (
      tab?.moved &&
      !target &&
      framesRef.current.find((frame) => frame.id === tab.fromFrameId)?.tabs.length !== 1
    ) {
      setFrames((current) =>
        detachTab(current, tab.panelId, {
          x: Math.max(0, event.clientX - 40),
          y: Math.max(0, event.clientY - 16),
        })
      );
    } else if (moving && target && target.frameId !== moving.frameId) {
      setFrames((current) => mergeFrame(current, moving.frameId, target.frameId, target.index));
      setFocusedId(target.frameId);
    }
    tabDrag.current = null;
    frameDrag.current = null;
    dropRef.current = null;
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
            className={`dock-tabstrip${drop?.frameId === frame.id ? " drop-target" : ""}`}
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
              {frame.tabs.map((panelId) => {
                const active = panelId === frame.active;
                const keepPlay = playRunning && panelId === "play";
                return (
                  <div
                    key={panelId}
                    className={`dock-page${keepPlay && !active ? " dock-page-offscreen" : ""}`}
                    hidden={!active && !keepPlay}
                  >
                    {panels[panelId]}
                  </div>
                );
              })}
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
