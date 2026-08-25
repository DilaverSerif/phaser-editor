import type { GameObjectNode } from "./types";

/** Instance'ta kalan kimlik + sahne konumu. Prefab varsayilanina dokunulmaz. */
export const PREFAB_INSTANCE_KEEP = new Set([
  "id",
  "type",
  "label",
  "prefabId",
  "prefabName",
  "x",
  "y",
]);

const APPLY_SKIP = new Set([
  ...PREFAB_INSTANCE_KEEP,
  "unlock",
  "scope",
  "prefabProps",
  "components",
  "list",
]);

export function prefabOverrideKeys(instance: GameObjectNode): string[] {
  const keys = new Set<string>();
  for (const key of Object.keys(instance)) {
    if (APPLY_SKIP.has(key) || instance[key] === undefined) continue;
    keys.add(key);
  }
  for (const key of instance.unlock ?? []) {
    if (!APPLY_SKIP.has(key)) keys.add(key);
  }
  return [...keys];
}

export function hasPrefabOverrides(instance: GameObjectNode): boolean {
  return prefabOverrideKeys(instance).length > 0;
}

export function applyOverridesToRoot(
  root: GameObjectNode,
  instance: GameObjectNode
): GameObjectNode {
  const next = { ...root };
  for (const key of prefabOverrideKeys(instance)) {
    next[key] = instance[key];
  }
  return next;
}

export function revertInstanceToPrefab(instance: GameObjectNode): GameObjectNode {
  const next: GameObjectNode = {
    id: instance.id,
    type: instance.type,
    label: instance.label,
    prefabId: instance.prefabId,
    prefabName: instance.prefabName,
    x: instance.x,
    y: instance.y,
    unlock: [],
  };
  return next;
}
