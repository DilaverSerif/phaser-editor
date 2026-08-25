export const FOCUS_MIN_ZOOM = 0.35;
export const FOCUS_MAX_ZOOM = 2.5;
/** Nesne, görüş alanının yaklaşık yarısını kaplar. */
export const FOCUS_PADDING = 2;
const MIN_BOUNDS = 32;

export function focusZoomForBounds(
  width: number,
  height: number,
  viewWidth: number,
  viewHeight: number
): number {
  const w = Math.max(Number(width) || 0, MIN_BOUNDS);
  const h = Math.max(Number(height) || 0, MIN_BOUNDS);
  const vw = Math.max(Number(viewWidth) || 0, 1);
  const vh = Math.max(Number(viewHeight) || 0, 1);
  const zoom = Math.min(vw / (w * FOCUS_PADDING), vh / (h * FOCUS_PADDING));
  return Math.min(FOCUS_MAX_ZOOM, Math.max(FOCUS_MIN_ZOOM, zoom));
}

export function focusCenter(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number } {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function unionBounds(
  rects: { x: number; y: number; width: number; height: number }[]
): { x: number; y: number; width: number; height: number } | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
