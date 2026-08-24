import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { deserializeScene } from "../serialization";
import {
  collectRequiredTextureKeys,
  missingTexturePlaceholderSize,
  parseAssetPack,
} from "./sceneAssets";

const KUCHO = "/Users/bladon/Documents/GitHub/KuchoVector";

describe("parseAssetPack", () => {
  it("section.files icinden key+url cikarir", () => {
    const pack = {
      section1: {
        files: [
          { key: "bg-sky", url: "public/assets/parallax/bg-sky.png" },
          { key: "skip-me" },
        ],
      },
    };
    expect(parseAssetPack(pack, "/proj")).toEqual([
      { key: "bg-sky", path: "/proj/public/assets/parallax/bg-sky.png" },
    ]);
  });

  it("bozuk pack bos doner", () => {
    expect(parseAssetPack(null, "/proj")).toEqual([]);
    expect(parseAssetPack("nope", "/proj")).toEqual([]);
  });
});

describe("collectRequiredTextureKeys", () => {
  it("nested prefab instance texture override'larini toplar", () => {
    const keys = collectRequiredTextureKeys(
      {
        id: "street",
        sceneType: "PREFAB",
        settings: {} as any,
        displayList: [
          {
            id: "layer",
            type: "Layer",
            label: "streetBg",
            list: [
              {
                id: "sky",
                type: "",
                label: "sky",
                prefabId: "parallax",
                texture: { key: "bg-sky" },
              },
              {
                id: "sun",
                type: "",
                label: "sun",
                prefabId: "parallax",
                texture: { key: "bg-sun" },
              },
            ],
          },
        ],
        plainObjects: [],
        meta: {} as any,
      },
      [
        {
          id: "parallax",
          scene: {
            id: "p",
            sceneType: "PREFAB",
            settings: {} as any,
            displayList: [
              {
                id: "root",
                type: "TileSprite",
                label: "layer",
                texture: { key: "bg-sky" },
              },
            ],
            plainObjects: [],
            meta: {} as any,
          },
        },
      ]
    );
    expect(keys.sort()).toEqual(["bg-sky", "bg-sun"]);
  });
});

describe("missingTexturePlaceholderSize", () => {
  it("StreetBg katmani gibi buyuk boyutu kucultur", () => {
    expect(missingTexturePlaceholderSize(1280, 720)).toEqual({
      width: 128,
      height: 72,
    });
  });

  it("kucuk boyutu oldugu gibi birakir", () => {
    expect(missingTexturePlaceholderSize(64, 64)).toEqual({ width: 64, height: 64 });
  });
});

describe("KuchoVector StreetBgPrefab assetleri", () => {
  const exists = fs.existsSync(KUCHO);

  it.skipIf(!exists)("asset-pack bg-* anahtarlarini icerir", () => {
    const pack = JSON.parse(
      fs.readFileSync(path.join(KUCHO, "asset-pack.json"), "utf-8")
    );
    const assets = parseAssetPack(pack, KUCHO);
    const keys = new Set(assets.map((a) => a.key));
    for (const key of [
      "bg-sky",
      "bg-sun",
      "bg-clouds",
      "bg-forest",
      "bg-far-buildings",
      "bg-buildings",
      "bg-back-bushes",
      "bg-mid-trees",
      "bg-houses",
      "bg-front-bushes",
      "bg-wall",
    ]) {
      expect(keys.has(key)).toBe(true);
    }
  });

  it.skipIf(!exists)("StreetBgPrefab acilinca parallax texture'lari toplanir", () => {
    const street = deserializeScene(
      fs.readFileSync(path.join(KUCHO, "StreetBgPrefab.scene"), "utf-8"),
      "StreetBgPrefab.scene"
    );
    const parallax = deserializeScene(
      fs.readFileSync(path.join(KUCHO, "ParallaxLayerPrefab.scene"), "utf-8"),
      "ParallaxLayerPrefab.scene"
    );
    const keys = collectRequiredTextureKeys(street, [
      { id: parallax.id, scene: parallax },
    ]);
    expect(keys).toEqual(
      expect.arrayContaining([
        "bg-sky",
        "bg-sun",
        "bg-clouds",
        "bg-forest",
        "bg-houses",
        "bg-wall",
      ])
    );
  });
});
