import type { GameObjectNode, PrefabProperty } from "../model/types";

export const TRANSFORM_KEYS = new Set([
  "x",
  "y",
  "scaleX",
  "scaleY",
  "angle",
  "originX",
  "originY",
  "visible",
]);

export function inspectorObjectTitle(node: GameObjectNode): string {
  return node.label || node.prefabName || node.type || "GameObject";
}

export function inspectorComponentName(node: GameObjectNode): string {
  if (node.type === "Image" || node.type === "Sprite" || node.type === "TileSprite") {
    return "Sprite Renderer";
  }
  if (node.type === "Text" || node.type === "BitmapText") return "Text";
  if (node.type === "Container" || node.type === "Layer") return node.type;
  return node.type || "Component";
}

export function hasSpriteSection(node: GameObjectNode): boolean {
  return node.type === "Image" || node.type === "Sprite" || node.type === "TileSprite";
}

export function hasTextSection(node: GameObjectNode): boolean {
  return node.type === "Text" || node.type === "BitmapText";
}

export function prefabUserProperties(
  node: GameObjectNode,
  prefabs: Array<{ id: string; scene?: { prefabProperties?: PrefabProperty[] } }>
): PrefabProperty[] {
  if (!node.prefabId) return [];
  const entry = prefabs.find((p) => p.id === node.prefabId);
  return entry?.scene?.prefabProperties ?? [];
}

export function prefabPropertyValue(
  node: GameObjectNode,
  prop: PrefabProperty
): unknown {
  if (node[prop.name] !== undefined) return node[prop.name];
  const bag = node.prefabProps as Record<string, unknown> | undefined;
  if (bag && bag[prop.name] !== undefined) return bag[prop.name];
  return prop.defValue;
}

export function isPrefabOverride(node: GameObjectNode, key: string): boolean {
  return !!node.prefabId && (node.unlock ?? []).includes(key);
}
