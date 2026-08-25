import type { PanelId } from "./dockLayout";

type Handler = (panelId: PanelId) => void;

let handler: Handler | null = null;

export function setDockFocusHandler(next: Handler | null) {
  handler = next;
}

export function focusDockPanel(panelId: PanelId) {
  handler?.(panelId);
}
