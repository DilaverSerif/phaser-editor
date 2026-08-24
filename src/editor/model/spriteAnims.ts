export interface SpriteAnimClip {
  key: string;
  prefix: string;
  start: number;
  end: number;
  zeroPad: number;
  frameRate: number;
  repeat: number;
  atlasKey?: string;
  [key: string]: unknown;
}

export interface SpriteAnimsFile {
  atlasKey: string;
  previewKey?: string;
  atlasUrl?: string;
  textureUrl?: string;
  anims: SpriteAnimClip[];
  [key: string]: unknown;
}

export interface SpriteAnimsSource {
  path: string;
  fileName: string;
  data: SpriteAnimsFile;
}

export interface SpriteAnimHints {
  fileName?: string;
  className?: string;
  label?: string;
  textureKey?: string;
}

const CLIP_KEYS = ["key", "prefix", "start", "end", "zeroPad", "frameRate", "repeat"] as const;

export function isSpriteAnimsFile(value: unknown): value is SpriteAnimsFile {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  if (typeof rec.atlasKey !== "string" || !rec.atlasKey) return false;
  if (!Array.isArray(rec.anims) || rec.anims.length === 0) return false;
  return rec.anims.every(isSpriteAnimClip);
}

export function isSpriteAnimClip(value: unknown): value is SpriteAnimClip {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.key === "string" &&
    typeof rec.prefix === "string" &&
    typeof rec.start === "number" &&
    typeof rec.end === "number" &&
    typeof rec.zeroPad === "number" &&
    typeof rec.frameRate === "number" &&
    typeof rec.repeat === "number"
  );
}

export function parseSpriteAnimsJson(json: string): SpriteAnimsFile | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    return isSpriteAnimsFile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeSpriteAnims(data: SpriteAnimsFile): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function generateFrameNames(
  prefix: string,
  start: number,
  end: number,
  zeroPad: number
): string[] {
  const names: string[] = [];
  const step = start <= end ? 1 : -1;
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
    names.push(`${prefix}${String(i).padStart(Math.max(0, zeroPad), "0")}`);
  }
  return names;
}

export function clipFrameNames(clip: SpriteAnimClip): string[] {
  return generateFrameNames(clip.prefix, clip.start, clip.end, clip.zeroPad);
}

export function clipDurationSec(clip: SpriteAnimClip): number {
  const count = clipFrameNames(clip).length;
  const rate = clip.frameRate > 0 ? clip.frameRate : 1;
  return count / rate;
}

export function cloneSpriteAnims(data: SpriteAnimsFile): SpriteAnimsFile {
  return JSON.parse(JSON.stringify(data)) as SpriteAnimsFile;
}

export function shiftClipRange(
  clip: SpriteAnimClip,
  handle: "start" | "end",
  cellDelta: number
): { start: number; end: number } {
  const step = clip.start <= clip.end ? 1 : -1;
  let start = clip.start;
  let end = clip.end;
  if (handle === "start") {
    start = clip.start + cellDelta * step;
    if (step > 0) start = Math.min(start, end);
    else start = Math.max(start, end);
  } else {
    end = clip.end + cellDelta * step;
    if (step > 0) end = Math.max(end, start);
    else end = Math.min(end, start);
  }
  return {
    start: Math.max(0, Math.round(start)),
    end: Math.max(0, Math.round(end)),
  };
}

export interface AtlasFrameRect {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function parseAtlasFrames(data: unknown): Map<string, AtlasFrameRect> {
  const map = new Map<string, AtlasFrameRect>();
  if (!data || typeof data !== "object") return map;
  const frames = (data as { frames?: unknown }).frames;
  if (!frames) return map;
  if (Array.isArray(frames)) {
    for (const item of frames) {
      const rect = readAtlasRect(item);
      if (rect) map.set(rect.name, rect);
    }
    return map;
  }
  if (typeof frames === "object") {
    for (const [name, item] of Object.entries(frames as Record<string, unknown>)) {
      const rect = readAtlasRect(item, name);
      if (rect) map.set(rect.name, rect);
    }
  }
  return map;
}

function readAtlasRect(item: unknown, fallbackName?: string): AtlasFrameRect | null {
  if (!item || typeof item !== "object") return null;
  const rec = item as Record<string, unknown>;
  const name = typeof rec.filename === "string" ? rec.filename : fallbackName;
  const frame = rec.frame;
  if (!name || !frame || typeof frame !== "object") return null;
  const box = frame as Record<string, unknown>;
  const x = Number(box.x);
  const y = Number(box.y);
  const w = Number(box.w ?? box.width);
  const h = Number(box.h ?? box.height);
  if (![x, y, w, h].every(Number.isFinite)) return null;
  return { name, x, y, w, h };
}

export function patchAnimClip(
  data: SpriteAnimsFile,
  clipIndex: number,
  patch: Partial<SpriteAnimClip>
): SpriteAnimsFile {
  const anims = data.anims.map((clip, index) =>
    index === clipIndex ? { ...clip, ...patch } : clip
  );
  return { ...data, anims };
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function candidateTokens(hints: SpriteAnimHints): string[] {
  const raw = [
    hints.fileName?.replace(/\.(scene|prefab)$/i, ""),
    hints.className,
    hints.label,
    hints.textureKey,
  ].filter((item): item is string => !!item);
  const out = new Set<string>();
  for (const item of raw) {
    const token = normalizeToken(item);
    if (!token) continue;
    out.add(token);
    out.add(token.replace(/prefab$/, ""));
  }
  return [...out].filter(Boolean);
}

export function matchSpriteAnims(
  hints: SpriteAnimHints,
  sources: SpriteAnimsSource[]
): SpriteAnimsSource | null {
  const tokens = candidateTokens(hints);
  if (tokens.length === 0) return null;
  for (const source of sources) {
    const keys = [source.data.atlasKey, source.data.previewKey]
      .filter((item): item is string => !!item)
      .map(normalizeToken);
    const hit = keys.some((key) =>
      tokens.some(
        (token) =>
          token === key ||
          (key.length >= 3 && token.includes(key)) ||
          (token.length >= 3 && key.includes(token))
      )
    );
    if (hit) return source;
  }
  return null;
}

export function resolveProjectUrl(projectPath: string, url: string): string[] {
  const clean = url.replace(/^\//, "");
  return [`${projectPath}/${clean}`, `${projectPath}/public/${clean}`];
}

export { CLIP_KEYS };
