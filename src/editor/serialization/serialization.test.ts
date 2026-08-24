import { describe, it, expect } from "vitest";
import { deserializeScene, serializeScene } from "../serialization";
import type { SceneFile } from "../model/types";

const SAMPLE = `{
  "id": "abc",
  "sceneType": "PREFAB",
  "settings": { "exportClass": true },
  "displayList": [
    {
      "id": "n1",
      "type": "Image",
      "label": "img",
      "texture": { "key": "platform-01" },
      "scope": "PUBLIC",
      "ArcadeComponent.active": true,
      "body.allowGravity": false
    }
  ],
  "plainObjects": [],
  "meta": { "app": "x", "contentType": "y", "version": 3 }
}`;

describe("serialization round-trip", () => {
  it("texture nesnesini ve ekstra alanlari korur", () => {
    const scene = deserializeScene(SAMPLE, "Plat.scene");
    expect(scene.sceneType).toBe("PREFAB");
    const node = scene.displayList[0];
    expect(node.texture).toEqual({ key: "platform-01" });
    // Phaser Editor 2D'ye ozgu ekstra alanlar korunmali
    expect((node as any)["scope"]).toBe("PUBLIC");
    expect((node as any)["ArcadeComponent.active"]).toBe(true);
    expect((node as any)["body.allowGravity"]).toBe(false);
  });

  it("serialize -> deserialize ozdeş kalir", () => {
    const scene = deserializeScene(SAMPLE, "Plat.scene");
    const out = serializeScene(scene);
    const again = deserializeScene(out, "Plat.scene");
    expect(again.displayList[0].texture).toEqual({ key: "platform-01" });
    expect((again.displayList[0] as any)["body.allowGravity"]).toBe(false);
  });

  it("name alanini serialize disinda birakir", () => {
    const scene = deserializeScene(SAMPLE, "Plat.scene") as SceneFile & { name?: string };
    scene.name = "Plat";
    const out = serializeScene(scene);
    expect(out).not.toContain('"name"');
  });
});
