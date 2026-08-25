import { describe, expect, it } from "vitest";
import type { GameObjectNode } from "./types";
import {
  applyOverridesToRoot,
  hasPrefabOverrides,
  prefabOverrideKeys,
  revertInstanceToPrefab,
} from "./prefabInstance";

const instance = (patch: Partial<GameObjectNode> = {}): GameObjectNode =>
  ({
    id: "i1",
    type: "",
    label: "Dragon",
    prefabId: "drg",
    prefabName: "Dragon",
    x: 100,
    y: 200,
    ...patch,
  }) as GameObjectNode;

describe("prefabInstance apply / revert", () => {
  it("x/y ve kimlik alanlarini override saymaz", () => {
    expect(prefabOverrideKeys(instance())).toEqual([]);
    expect(hasPrefabOverrides(instance())).toBe(false);
    expect(prefabOverrideKeys(instance({ scaleX: 2, unlock: ["x", "scaleX"] }))).toEqual([
      "scaleX",
    ]);
  });

  it("override'lari prefab kokune yazar, konumu dokunmaz", () => {
    const root: GameObjectNode = {
      id: "r1",
      type: "Image",
      label: "dragon",
      x: 0,
      y: 0,
      texture: { key: "dragon" },
    };
    const next = applyOverridesToRoot(
      root,
      instance({ scaleX: 2, texture: { key: "hero" } })
    );
    expect(next.scaleX).toBe(2);
    expect(next.texture).toEqual({ key: "hero" });
    expect(next.x).toBe(0);
    expect(next.id).toBe("r1");
  });

  it("instance'i prefab varsayilanina dondurur, sahne konumunu korur", () => {
    const next = revertInstanceToPrefab(
      instance({ scaleX: 2, angle: 45, unlock: ["scaleX"], texture: { key: "hero" } })
    );
    expect(next).toEqual({
      id: "i1",
      type: "",
      label: "Dragon",
      prefabId: "drg",
      prefabName: "Dragon",
      x: 100,
      y: 200,
      unlock: [],
    });
  });
});
