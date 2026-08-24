import type { GameObjectNode } from "./types";

export function collectNodeIds(
  nodes: GameObjectNode[],
  out: Set<string> = new Set()
): Set<string> {
  for (const node of nodes) {
    out.add(node.id);
    if (node.list) collectNodeIds(node.list, out);
  }
  return out;
}

export function flattenVisibleIds(
  nodes: GameObjectNode[],
  collapsed: Set<string>
): string[] {
  const out: string[] = [];
  const walk = (list: GameObjectNode[]) => {
    for (const node of list) {
      out.push(node.id);
      if (node.list?.length && !collapsed.has(node.id)) walk(node.list);
    }
  };
  walk(nodes);
  return out;
}

export function rangeSelectIds(
  order: string[],
  anchor: string,
  target: string
): string[] {
  const a = order.indexOf(anchor);
  const b = order.indexOf(target);
  if (a < 0 && b < 0) return target ? [target] : [];
  if (a < 0) return [target];
  if (b < 0) return [anchor];
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return order.slice(lo, hi + 1);
}

export function findNodeLocation(
  list: GameObjectNode[],
  id: string
): { list: GameObjectNode[]; index: number } | null {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { list, index: i };
    if (list[i].list) {
      const nested = findNodeLocation(list[i].list!, id);
      if (nested) return nested;
    }
  }
  return null;
}

export function isAncestor(
  nodes: GameObjectNode[],
  ancestorId: string,
  descendantId: string
): boolean {
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.id === ancestorId) {
      return collectNodeIds(node.list ?? []).has(descendantId);
    }
    if (node.list) stack.push(...node.list);
  }
  return false;
}

/** Secimde hem parent hem child varsa sadece parent kalir. */
export function pruneNestedSelection(
  roots: GameObjectNode[],
  ids: string[]
): string[] {
  return ids.filter(
    (id) => !ids.some((other) => other !== id && isAncestor(roots, other, id))
  );
}

export function extractNodesByIds(
  list: GameObjectNode[],
  ids: Set<string>
): GameObjectNode[] {
  const extracted: GameObjectNode[] = [];
  const keep = (items: GameObjectNode[]): GameObjectNode[] => {
    const next: GameObjectNode[] = [];
    for (const item of items) {
      if (ids.has(item.id)) {
        extracted.push(item);
        continue;
      }
      if (item.list) item.list = keep(item.list);
      next.push(item);
    }
    return next;
  };
  const remaining = keep(list);
  list.splice(0, list.length, ...remaining);
  return extracted;
}
