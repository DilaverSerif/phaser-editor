import { describe, expect, it } from "vitest";
import type { GameObjectNode } from "./types";
import {
  arcadeDefaults,
  arcadeKeysOf,
  createFilter,
  emitArcade,
  emitFilters,
  emitHitArea,
  hasArcade,
  hasHitArea,
  hexToPhaserColor,
} from "./phaserComponents";

const node = (extra: Record<string, unknown> = {}): GameObjectNode =>
  ({ id: "n", type: "Image", label: "obj", ...extra }) as GameObjectNode;

describe("phaser components", () => {
  it("arcade varligini dotted key ile anlar", () => {
    expect(hasArcade(node())).toBe(false);
    expect(hasArcade(node(arcadeDefaults()))).toBe(true);
    expect(arcadeKeysOf(node(arcadeDefaults())).length).toBeGreaterThan(3);
  });

  it("hit area NONE degilse aktiftir", () => {
    expect(hasHitArea(node())).toBe(false);
    expect(hasHitArea(node({ "hitArea.shape": "NONE" }))).toBe(false);
    expect(hasHitArea(node({ "hitArea.shape": "RECTANGLE" }))).toBe(true);
  });

  it("hex rengi Phaser sayisina cevirir", () => {
    expect(hexToPhaserColor("#ff00aa")).toBe("0xff00aa");
  });

  it("arcade kodu physics.add.existing uretir", () => {
    const lines = emitArcade(
      "ground",
      node({
        ...arcadeDefaults(),
        "body.physicsType": 1,
        "body.width": 100,
        "body.height": 40,
        "body.immovable": true,
      }),
      "this"
    );
    expect(lines[0]).toBe("this.physics.add.existing(ground, true);");
    expect(lines).toContain("ground.body.setSize(100, 40);");
    expect(lines).toContain("ground.body.setImmovable(true);");
  });

  it("hit area ve filter kodu uretir", () => {
    expect(emitHitArea("btn", node({ "hitArea.shape": "RECTANGLE" }))).toEqual([
      "btn.setInteractive();",
    ]);
    const glow = createFilter("Glow");
    const lines = emitFilters("hero", node({ filters: [glow] }));
    expect(lines[0]).toBe("hero.enableFilters();");
    expect(lines[1]).toContain("hero.filters.external.addGlow(");
    expect(lines[1]).toContain("color: 0xffffff");
  });
});
