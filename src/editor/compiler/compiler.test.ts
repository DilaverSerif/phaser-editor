import { describe, it, expect } from "vitest";
import { compileScene } from "../compiler";
import type { SceneFile, GameObjectNode } from "../model/types";
import type { PrefabIndexEntry } from "../serialization";

function node(p: Partial<GameObjectNode>): GameObjectNode {
  return {
    id: "id-" + Math.random(),
    type: "Image",
    label: "obj",
    x: 10,
    y: 20,
    ...p,
  } as GameObjectNode;
}

const prefabs: PrefabIndexEntry[] = [
  {
    id: "pref-1",
    fileName: "Dragon.scene",
    className: "Dragon",
    filePath: "/x/Dragon.scene",
    scene: undefined,
  },
];

describe("compiler", () => {
  it("SCENE: texture {key} nesnesinden dogru string anahtari uretir", () => {
    const scene: SceneFile = {
      id: "s1",
      sceneType: "SCENE",
      settings: {
        exportClass: true,
        autoImport: true,
        preloadMethodName: "",
        preloadPackFiles: [],
        createMethodName: "",
        compilerOutputLanguage: "TYPE_SCRIPT",
        borderWidth: 1280,
        borderHeight: 720,
      },
      displayList: [node({ type: "Image", label: "ground", texture: { key: "platform-01" } })],
      plainObjects: [],
      meta: { app: "a", url: "b", contentType: "c", version: 3 },
    };
    const code = compileScene(scene, "Level", prefabs);
    expect(code).toContain('class Level extends Phaser.Scene');
    expect(code).toContain('this.add.image(10, 20, "platform-01"');
  });

  it("SCENE: prefab instance icin new <Class> + add.existing uretir", () => {
    const scene: SceneFile = {
      id: "s1",
      sceneType: "SCENE",
      settings: {
        exportClass: true,
        autoImport: true,
        preloadMethodName: "",
        preloadPackFiles: [],
        createMethodName: "",
        compilerOutputLanguage: "TYPE_SCRIPT",
        borderWidth: 1280,
        borderHeight: 720,
      },
      displayList: [
        node({ type: "", label: "Dragon", prefabId: "pref-1", prefabName: "Dragon", x: 100, y: 200 }),
      ],
      plainObjects: [],
      meta: { app: "a", url: "b", contentType: "c", version: 3 },
    };
    const code = compileScene(scene, "Level", prefabs);
    expect(code).toContain('import Dragon from "../prefabs/Dragon";');
    expect(code).toContain("const Dragon_1 = new Dragon(this, 100, 200);");
    expect(code).toContain("this.add.existing(Dragon_1);");
  });

  it("PREFAB: kok objeyi miras alan sinif uretir", () => {
    const scene: SceneFile = {
      id: "p1",
      sceneType: "PREFAB",
      settings: {
        exportClass: true,
        autoImport: true,
        preloadMethodName: "",
        preloadPackFiles: [],
        createMethodName: "",
        compilerOutputLanguage: "TYPE_SCRIPT",
        borderWidth: 1280,
        borderHeight: 720,
      },
      displayList: [
        node({ type: "Image", label: "dragon", texture: { key: "dragon" }, x: 5, y: 6 }),
      ],
      plainObjects: [],
      meta: { app: "a", url: "b", contentType: "c", version: 3 },
    };
    const code = compileScene(scene, "Dragon", prefabs);
    expect(code).toContain("extends Phaser.GameObjects.Image");
    expect(code).toContain('texture || "dragon"');
  });

  it("PREFAB Layer: nested TileSprite override ve hierarchy sirasi korunur", () => {
    const parallax: PrefabIndexEntry = {
      id: "parallax-1",
      fileName: "ParallaxLayerPrefab.scene",
      className: "ParallaxLayerPrefab",
      filePath: "/x/ParallaxLayerPrefab.scene",
      scene: {
        id: "parallax-scene",
        sceneType: "PREFAB",
        settings: {
          exportClass: true,
          autoImport: true,
          preloadMethodName: "",
          preloadPackFiles: [],
          createMethodName: "",
          compilerOutputLanguage: "TYPE_SCRIPT",
          borderWidth: 1280,
          borderHeight: 720,
        },
        displayList: [
          node({ type: "TileSprite", label: "layer", texture: { key: "bg-sky" }, width: 1280, height: 720 }),
        ],
        plainObjects: [],
        meta: { app: "a", url: "b", contentType: "c", version: 3 },
      },
    };
    const scene: SceneFile = {
      id: "street-scene",
      sceneType: "PREFAB",
      settings: {
        exportClass: true,
        autoImport: true,
        preloadMethodName: "",
        preloadPackFiles: [],
        createMethodName: "",
        compilerOutputLanguage: "TYPE_SCRIPT",
        borderWidth: 1280,
        borderHeight: 720,
      },
      displayList: [
        node({
          type: "Layer",
          label: "streetBg",
          list: [
            node({
              type: "",
              label: "sky",
              prefabId: "parallax-1",
              texture: { key: "bg-sky" },
              width: 1280,
              height: 720,
              depth: -50,
            }),
            node({
              type: "",
              label: "sun",
              prefabId: "parallax-1",
              texture: { key: "bg-sun" },
              width: 1280,
              height: 720,
              depth: -48,
            }),
          ],
        }),
      ],
      plainObjects: [],
      meta: { app: "a", url: "b", contentType: "c", version: 3 },
    };
    const code = compileScene(scene, "StreetBgPrefab", [parallax]);
    expect(code).toContain("extends Phaser.GameObjects.Layer");
    expect(code).toContain('new ParallaxLayerPrefab(scene, 10, 20, 1280, 720, "bg-sky"');
    expect(code).toContain('new ParallaxLayerPrefab(scene, 10, 20, 1280, 720, "bg-sun"');
    expect(code.indexOf("setDepth(-50)")).toBeLessThan(code.indexOf("setDepth(-48)"));
  });

  it("SCENE: Arcade body icin physics.add.existing uretir", () => {
    const scene: SceneFile = {
      id: "s1",
      sceneType: "SCENE",
      settings: {
        exportClass: true,
        autoImport: true,
        preloadMethodName: "",
        preloadPackFiles: [],
        createMethodName: "",
        compilerOutputLanguage: "TYPE_SCRIPT",
        borderWidth: 1280,
        borderHeight: 720,
      },
      displayList: [
        node({
          type: "Image",
          label: "ground",
          texture: { key: "plat" },
          "ArcadeComponent.active": true,
          "body.physicsType": 1,
          "body.width": 80,
          "body.height": 20,
          "body.immovable": true,
        } as Partial<GameObjectNode>),
      ],
      plainObjects: [],
      meta: { app: "a", url: "b", contentType: "c", version: 3 },
    };
    const code = compileScene(scene, "Level", prefabs);
    expect(code).toContain("this.physics.add.existing(ground, true);");
    expect(code).toContain("ground.body.setSize(80, 20);");
    expect(code).toContain("ground.body.setImmovable(true);");
  });
});
