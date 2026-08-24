export type TransformTool = "pan" | "position" | "rotate" | "scale";
export type TransformAxis = "x" | "y" | "xy";

export const TRANSFORM_TOOLS: TransformTool[] = [
  "pan",
  "position",
  "rotate",
  "scale",
];

export const TRANSFORM_HOTKEYS: Record<string, TransformTool> = {
  q: "pan",
  w: "position",
  e: "rotate",
  r: "scale",
};

export function isTransformTool(value: string): value is TransformTool {
  return (TRANSFORM_TOOLS as string[]).includes(value);
}

export function applyAxisDelta(
  x: number,
  y: number,
  dx: number,
  dy: number,
  axis: TransformAxis
): { x: number; y: number } {
  if (axis === "x") return { x: x + dx, y };
  if (axis === "y") return { x, y: y + dy };
  return { x: x + dx, y: y + dy };
}

export function angleFromPoints(
  ox: number,
  oy: number,
  px: number,
  py: number
): number {
  return (Math.atan2(py - oy, px - ox) * 180) / Math.PI;
}

export const RING_RADIUS = 64;
export const RING_HIT_INNER = 36;
export const RING_HIT_OUTER = 92;

export function ringContains(x: number, y: number, inner = RING_HIT_INNER, outer = RING_HIT_OUTER): boolean {
  const d = Math.hypot(x, y);
  return d >= inner && d <= outer;
}

export function rotateByDelta(
  startAngle: number,
  startPointerAngle: number,
  currentPointerAngle: number
): number {
  return startAngle + (currentPointerAngle - startPointerAngle);
}

function ratio(start: number, current: number): number {
  if (Math.abs(start) < 1e-4) return 1;
  return current / start;
}

export function scaleFromDrag(
  startScale: { x: number; y: number },
  startOffset: { x: number; y: number },
  currentOffset: { x: number; y: number },
  axis: TransformAxis
): { scaleX: number; scaleY: number } {
  if (axis === "x") {
    return {
      scaleX: startScale.x * ratio(startOffset.x, currentOffset.x),
      scaleY: startScale.y,
    };
  }
  if (axis === "y") {
    return {
      scaleX: startScale.x,
      scaleY: startScale.y * ratio(startOffset.y, currentOffset.y),
    };
  }
  const startLen = Math.hypot(startOffset.x, startOffset.y);
  const currentLen = Math.hypot(currentOffset.x, currentOffset.y);
  const uniform = startLen < 1e-4 ? 1 : currentLen / startLen;
  return {
    scaleX: startScale.x * uniform,
    scaleY: startScale.y * uniform,
  };
}
