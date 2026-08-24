import { describe, it, expect } from "vitest";
import type { GameObjectNode } from "../model/types";
import {
  hasSpriteSection,
  inspectorComponentName,
  inspectorObjectTitle,
  isPrefabOverride,
  prefabPropertyValue,
  prefabUserProperties,
} from "./inspectorModel";

const node = (patch: Partial<GameObjectNode>): GameObjectNode =>
  ({ id: "1", type: "Image", label: "hero", ...patch });

describe("inspectorObjectTitle", () => {
  it("label varsa onu kullanir", () => {
    expect(inspectorObjectTitle(node({}))).toBe("hero");
  });

  it("label yoksa prefab adına düşer", () => {
    expect(inspectorObjectTitle(node({ label: "", prefabName: "StreetBgPrefab" }))).toBe(
      "StreetBgPrefab"
    );
  });
});

describe("inspectorComponentName", () => {
  it("gorsel tipleri Sprite Renderer yapar", () => {
    expect(inspectorComponentName(node({ type: "TileSprite" }))).toBe("Sprite Renderer");
  });
});

describe("hasSpriteSection", () => {
  it("TileSprite icin acik", () => {
    expect(hasSpriteSection(node({ type: "TileSprite" }))).toBe(true);
    expect(hasSpriteSection(node({ type: "Container" }))).toBe(false);
  });
});

describe("prefabUserProperties / values", () => {
  it("prefab tanimindan user property okur", () => {
    const n = node({
      prefabId: "p1",
      scrollSpeed: 0.26,
    });
    const props = prefabUserProperties(n, [
      {
        id: "p1",
        scene: {
          prefabProperties: [
            {
              name: "scrollSpeed",
              label: "Scroll Speed",
              tooltip: "",
              defValue: 0.25,
              customDefinition: false,
              type: { id: "number" },
            },
          ],
        },
      },
    ]);
    expect(props).toHaveLength(1);
    expect(prefabPropertyValue(n, props[0])).toBe(0.26);
  });

  it("override unlock listesindeyse isaretler", () => {
    expect(isPrefabOverride(node({ prefabId: "p", unlock: ["texture"] }), "texture")).toBe(
      true
    );
    expect(isPrefabOverride(node({ unlock: ["texture"] }), "texture")).toBe(false);
  });
});
