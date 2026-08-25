export type PanelId =
  | "hierarchy"
  | "project"
  | "prefab"
  | "inspector"
  | "assets"
  | "animation"
  | "play";

export interface DockFrame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tabs: PanelId[];
  active: PanelId;
  minimized: boolean;
}

export const PANEL_TITLES: Record<PanelId, string> = {
  hierarchy: "Hierarchy",
  project: "Project Files",
  prefab: "Objects & Prefabs",
  inspector: "Inspector",
  assets: "Assets",
  animation: "Animation",
  play: "Play",
};

export const ALL_PANEL_IDS: PanelId[] = [
  "hierarchy",
  "project",
  "prefab",
  "inspector",
  "assets",
  "animation",
  "play",
];

export const DOCK_STORAGE_KEY = "phaser-editor.dock-v1";

export function defaultFrames(): DockFrame[] {
  return [
    frame("f-hierarchy", 12, 12, 320, 360, "hierarchy"),
    frame("f-project", 12, 384, 320, 430, "project"),
    frame("f-prefab", 344, 384, 320, 300, "prefab"),
    frame("f-inspector", 1072, 12, 316, 802, "inspector"),
    frame("f-assets", 676, 384, 384, 430, "assets"),
    frame("f-animation", 344, 12, 720, 320, "animation"),
    frame("f-play", 360, 200, 760, 520, "play"),
  ];
}

function frame(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  panel: PanelId
): DockFrame {
  return { id, x, y, width, height, tabs: [panel], active: panel, minimized: false };
}

export function reorderItems<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex > list.length
  ) {
    return list;
  }
  const next = list.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function insertIndexFromX(
  mids: number[],
  clientX: number
): number {
  for (let i = 0; i < mids.length; i++) {
    if (clientX < mids[i]) return i;
  }
  return mids.length;
}

export interface TabBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface StripRect {
  frameId: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  tabMids: number[];
  tabBoxes: TabBox[];
}

function pointInStrip(strip: StripRect, clientX: number, clientY: number) {
  return (
    clientX >= strip.left &&
    clientX <= strip.right &&
    clientY >= strip.top &&
    clientY <= strip.bottom
  );
}

function boxesOverlap(a: TabBox, b: TabBox) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function hitTabStrip(
  strips: StripRect[],
  clientX: number,
  clientY: number,
  ignoreFrameId?: string
): { frameId: string; index: number } | null {
  const others = strips.filter((strip) => strip.frameId !== ignoreFrameId);
  const self = ignoreFrameId
    ? strips.filter((strip) => strip.frameId === ignoreFrameId)
    : [];
  for (const strip of [...others, ...self]) {
    if (pointInStrip(strip, clientX, clientY)) {
      return { frameId: strip.frameId, index: insertIndexFromX(strip.tabMids, clientX) };
    }
  }
  return null;
}

/** Sekme isim kutusu hedef seridin uzerine binince birlestir. Serit temasi yetmez. */
export function tabBoxHitsStrip(
  boxes: TabBox[],
  strips: StripRect[]
): { frameId: string; index: number } | null {
  for (const strip of strips) {
    const target: TabBox = {
      left: strip.left,
      top: strip.top,
      right: strip.right,
      bottom: strip.bottom,
    };
    for (const box of boxes) {
      if (!boxesOverlap(box, target)) continue;
      const x = (box.left + box.right) / 2;
      return { frameId: strip.frameId, index: insertIndexFromX(strip.tabMids, x) };
    }
  }
  return null;
}

export function normalizeFrames(input: DockFrame[]): DockFrame[] {
  const seen = new Set<PanelId>();
  const cleaned: DockFrame[] = [];
  for (const raw of input) {
    const tabs = (raw.tabs ?? []).filter((id) => {
      if (!ALL_PANEL_IDS.includes(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (tabs.length === 0) continue;
    cleaned.push({
      id: raw.id || `f-${tabs[0]}`,
      x: Math.max(0, Number(raw.x) || 0),
      y: Math.max(0, Number(raw.y) || 0),
      width: Math.max(220, Number(raw.width) || 280),
      height: Math.max(120, Number(raw.height) || 240),
      tabs,
      active: tabs.includes(raw.active) ? raw.active : tabs[0],
      minimized: !!raw.minimized,
    });
  }
  for (const id of ALL_PANEL_IDS) {
    if (seen.has(id)) continue;
    const fallback = defaultFrames().find((f) => f.tabs[0] === id)!;
    cleaned.push({ ...fallback });
  }
  return cleaned;
}

export function findFrameForPanel(
  frames: DockFrame[],
  panelId: PanelId
): DockFrame | undefined {
  return frames.find((frame) => frame.tabs.includes(panelId));
}

export function moveTab(
  frames: DockFrame[],
  panelId: PanelId,
  toFrameId: string,
  toIndex: number
): DockFrame[] {
  const from = findFrameForPanel(frames, panelId);
  if (!from) return frames;
  const fromIndex = from.tabs.indexOf(panelId);
  if (from.id === toFrameId) {
    const dest = Math.max(0, Math.min(toIndex, from.tabs.length));
    return frames.map((frame) =>
      frame.id === from.id
        ? { ...frame, tabs: reorderItems(frame.tabs, fromIndex, dest), active: panelId }
        : frame
    );
  }
  return frames
    .map((frame) => {
      if (frame.id === from.id) {
        const tabs = frame.tabs.filter((id) => id !== panelId);
        return {
          ...frame,
          tabs,
          active: frame.active === panelId ? tabs[0] : frame.active,
        };
      }
      if (frame.id === toFrameId) {
        const tabs = frame.tabs.slice();
        const dest = Math.max(0, Math.min(toIndex, tabs.length));
        tabs.splice(dest, 0, panelId);
        return { ...frame, tabs, active: panelId, minimized: false };
      }
      return frame;
    })
    .filter((frame) => frame.tabs.length > 0);
}

export function mergeFrame(
  frames: DockFrame[],
  fromFrameId: string,
  toFrameId: string,
  toIndex: number
): DockFrame[] {
  if (fromFrameId === toFrameId) return frames;
  const from = frames.find((frame) => frame.id === fromFrameId);
  if (!from) return frames;
  const moving = from.tabs;
  return frames
    .map((frame) => {
      if (frame.id === fromFrameId) return { ...frame, tabs: [] as PanelId[] };
      if (frame.id !== toFrameId) return frame;
      const tabs = frame.tabs.slice();
      const dest = Math.max(0, Math.min(toIndex, tabs.length));
      tabs.splice(dest, 0, ...moving);
      return { ...frame, tabs, active: from.active, minimized: false };
    })
    .filter((frame) => frame.tabs.length > 0);
}

export function detachTab(
  frames: DockFrame[],
  panelId: PanelId,
  position: { x: number; y: number; width?: number; height?: number }
): DockFrame[] {
  const from = findFrameForPanel(frames, panelId);
  if (!from) return frames;
  const next = frames
    .map((frame) => {
      if (frame.id !== from.id) return frame;
      const tabs = frame.tabs.filter((id) => id !== panelId);
      return {
        ...frame,
        tabs,
        active: frame.active === panelId ? tabs[0] : frame.active,
      };
    })
    .filter((frame) => frame.tabs.length > 0);
  next.push({
    id: `f-${panelId}-${Date.now()}`,
    x: Math.max(0, position.x),
    y: Math.max(0, position.y),
    width: position.width ?? from.width,
    height: position.height ?? from.height,
    tabs: [panelId],
    active: panelId,
    minimized: false,
  });
  return next;
}

export function loadFrames(): DockFrame[] {
  try {
    const raw = localStorage.getItem(DOCK_STORAGE_KEY);
    if (!raw) return defaultFrames();
    return normalizeFrames(JSON.parse(raw) as DockFrame[]);
  } catch {
    return defaultFrames();
  }
}

export function saveFrames(frames: DockFrame[]) {
  try {
    localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(frames));
  } catch {
    /* yoksay */
  }
}
