import { GameObjectNode, SceneFile, textureKeyOf } from "../model/types";

export interface AssetRef {
  key: string;
  path: string;
}

export function parseAssetPack(pack: unknown, root: string): AssetRef[] {
  const assets: AssetRef[] = [];
  if (!pack || typeof pack !== "object") return assets;
  for (const section of Object.values(pack as Record<string, unknown>)) {
    const files = (section as { files?: unknown } | null)?.files;
    if (!Array.isArray(files)) continue;
    for (const item of files) {
      const file = item as { key?: string; url?: string };
      if (file?.key && file?.url) {
        assets.push({ key: file.key, path: `${root}/${file.url}` });
      }
    }
  }
  return assets;
}

export function collectRequiredTextureKeys(
  scene: SceneFile,
  prefabIndex: Array<{ id: string; scene?: SceneFile }>
): string[] {
  const required = new Set<string>();
  const visitedPrefabs = new Set<string>();

  const collect = (nodes: GameObjectNode[]) => {
    for (const node of nodes) {
      const key = textureKeyOf(node);
      if (key) required.add(key);
      if (node.prefabId && !visitedPrefabs.has(node.prefabId)) {
        visitedPrefabs.add(node.prefabId);
        const prefab = prefabIndex.find((p) => p.id === node.prefabId);
        if (prefab?.scene) collect(prefab.scene.displayList);
      }
      if (node.list) collect(node.list);
    }
  };
  collect(scene.displayList);
  return [...required];
}

/** Eksik texture placeholder'ini kucuk tut: 1280x720 mor dikdortgenler canvas'i kitler. */
export function missingTexturePlaceholderSize(
  width: number,
  height: number,
  max = 128
): { width: number; height: number } {
  const w = width > 0 ? width : 64;
  const h = height > 0 ? height : 64;
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = max / Math.max(w, h);
  return {
    width: Math.max(8, Math.round(w * scale)),
    height: Math.max(8, Math.round(h * scale)),
  };
}
