import type { EditorScene } from "./EditorScene";

// CanvasView ile diger React bileşenleri (Toolbar vb.) arasinda
// aktif EditorScene ornegine erisim saglayan hafif singleton.
let active: EditorScene | null = null;

export function setActiveEditorScene(s: EditorScene | null) {
  active = s;
}

export function getActiveEditorScene(): EditorScene | null {
  return active;
}
