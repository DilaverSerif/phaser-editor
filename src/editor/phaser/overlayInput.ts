/**
 * Phaser window `mousedown` dinler; canvas üstündeki HTML (dock) tıklanınca
 * alttaki game object'i de seçer. Yalnız canvas kaynaklı down işlenir.
 */

export function isSceneCanvasEvent(
  event: { target: EventTarget | null },
  canvas: EventTarget | null | undefined
): boolean {
  if (!canvas || !event.target) return false;
  const target = event.target;
  if (target === canvas) return true;
  return (
    typeof (canvas as Node).contains === "function" &&
    (canvas as Node).contains(target as Node)
  );
}

type MouseDownFn = (event: MouseEvent) => void;

export function ignoreOverlayMouseDown(manager: object): () => void {
  const input = manager as { canvas?: EventTarget | null; onMouseDown: MouseDownFn };
  const original = input.onMouseDown.bind(input) as MouseDownFn;
  input.onMouseDown = (event: MouseEvent) => {
    if (!isSceneCanvasEvent(event, input.canvas)) return;
    original(event);
  };
  return () => {
    input.onMouseDown = original;
  };
}
