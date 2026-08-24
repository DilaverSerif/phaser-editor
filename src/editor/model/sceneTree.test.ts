import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { deserializeScene } from "../serialization";
import type { GameObjectNode } from "./types";
import {
  collectNodeIds,
  extractNodesByIds,
  flattenVisibleIds,
  pruneNestedSelection,
  rangeSelectIds,
} from "./sceneTree";

const KUCHO = "/Users/bladon/Documents/GitHub/KuchoVector";

const node = (id: string, list?: GameObjectNode[]): GameObjectNode =>
  ({ id, type: "Container", label: id, list });

describe("collectNodeIds", () => {
  it("StreetBg gibi Layer + nested prefab cocuklarini present'te tutar", () => {
    const ids = collectNodeIds([
      node("layer", [node("sky"), node("sun"), node("wall")]),
    ]);
    expect([...ids].sort()).toEqual(["layer", "sky", "sun", "wall"]);
  });

  it.skipIf(!fs.existsSync(KUCHO))("StreetBgPrefab.scene agacindaki tum id'ler toplanir", () => {
    const scene = deserializeScene(
      fs.readFileSync(path.join(KUCHO, "StreetBgPrefab.scene"), "utf-8"),
      "StreetBgPrefab.scene"
    );
    const ids = collectNodeIds(scene.displayList);
    expect(ids.size).toBeGreaterThan(10);
    expect(ids.has(scene.displayList[0].id)).toBe(true);
    for (const child of scene.displayList[0].list ?? []) {
      expect(ids.has(child.id)).toBe(true);
    }
  });
});

describe("rangeSelectIds", () => {
  it("anchor ile hedef arasini secer", () => {
    expect(rangeSelectIds(["a", "b", "c", "d"], "b", "d")).toEqual(["b", "c", "d"]);
    expect(rangeSelectIds(["a", "b", "c", "d"], "d", "b")).toEqual(["b", "c", "d"]);
  });
});

describe("flattenVisibleIds", () => {
  it("collapsed parent'in cocuklarini atlar", () => {
    const tree = [node("a", [node("a1"), node("a2")]), node("b")];
    expect(flattenVisibleIds(tree, new Set(["a"]))).toEqual(["a", "b"]);
    expect(flattenVisibleIds(tree, new Set())).toEqual(["a", "a1", "a2", "b"]);
  });
});

describe("extractNodesByIds / pruneNestedSelection", () => {
  it("parent seciliyse cocugu ayri cikarmaz", () => {
    const tree = [node("a", [node("a1")]), node("b")];
    expect(pruneNestedSelection(tree, ["a", "a1", "b"])).toEqual(["a", "b"]);
  });

  it("secili dugumleri listeden cikarip sirayi korur", () => {
    const tree = [node("a"), node("b"), node("c")];
    const taken = extractNodesByIds(tree, new Set(["a", "c"]));
    expect(taken.map((n) => n.id)).toEqual(["a", "c"]);
    expect(tree.map((n) => n.id)).toEqual(["b"]);
  });
});
