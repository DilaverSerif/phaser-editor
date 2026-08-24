import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  clipFrameNames,
  generateFrameNames,
  isSpriteAnimsFile,
  matchSpriteAnims,
  parseSpriteAnimsJson,
  patchAnimClip,
  serializeSpriteAnims,
  shiftClipRange,
} from "./spriteAnims";

const KUCHO = "/Users/bladon/Documents/GitHub/KuchoVector";
const PURSUER_ANIMS = path.join(KUCHO, "src/shared/data/enemies/pursuer-anims.json");
const MINI_ANIMS = path.join(KUCHO, "src/shared/data/enemies/mini-enemy-anims.json");
const KUCHO_ANIMS = path.join(KUCHO, "src/shared/data/heroes/kucho-anims.json");

describe("generateFrameNames", () => {
  it("pursuer_ + zeroPad 2 → pursuer_01 … pursuer_16", () => {
    const names = generateFrameNames("pursuer_", 1, 16, 2);
    expect(names[0]).toBe("pursuer_01");
    expect(names[names.length - 1]).toBe("pursuer_16");
    expect(names).toHaveLength(16);
  });

  it("geri sayim: slide_ 23→1", () => {
    const names = generateFrameNames("slide_", 23, 1, 4);
    expect(names[0]).toBe("slide_0023");
    expect(names[names.length - 1]).toBe("slide_0001");
    expect(names).toHaveLength(23);
  });
});

describe("KuchoVector *-anims.json", () => {
  const exists = fs.existsSync(PURSUER_ANIMS);

  it.skipIf(!exists)("pursuer clip kare adlari generateFrameNames ile uyumlu", () => {
    const data = parseSpriteAnimsJson(fs.readFileSync(PURSUER_ANIMS, "utf-8"));
    expect(data?.atlasKey).toBe("pursuer");
    expect(clipFrameNames(data!.anims[0])).toEqual(
      generateFrameNames("pursuer_", 1, 16, 2)
    );
  });

  it.skipIf(!exists)("kucho-slide-stand 23→1 kareleri", () => {
    const data = parseSpriteAnimsJson(fs.readFileSync(KUCHO_ANIMS, "utf-8"));
    const slide = data?.anims.find((clip) => clip.key === "kucho-slide-stand");
    expect(slide).toBeTruthy();
    expect(clipFrameNames(slide!)).toEqual(generateFrameNames("slide_", 23, 1, 4));
  });

  it.skipIf(!exists)("PursuerPrefab / pursuer-preview pursuer json ile eslesir", () => {
    const data = parseSpriteAnimsJson(fs.readFileSync(PURSUER_ANIMS, "utf-8"));
    const sources = [
      { path: PURSUER_ANIMS, fileName: "pursuer-anims.json", data: data! },
    ];
    expect(
      matchSpriteAnims(
        { fileName: "PursuerPrefab.scene", className: "PursuerPrefab" },
        sources
      )?.data.atlasKey
    ).toBe("pursuer");
    expect(
      matchSpriteAnims({ textureKey: "pursuer-preview" }, sources)?.data.atlasKey
    ).toBe("pursuer");
    expect(matchSpriteAnims({ label: "pursuer" }, sources)?.data.atlasKey).toBe(
      "pursuer"
    );
  });

  it.skipIf(!exists)("anims olmayan dosya eslesmez", () => {
    const raw = fs.readFileSync(MINI_ANIMS, "utf-8");
    expect(parseSpriteAnimsJson(raw)).toBeNull();
    expect(isSpriteAnimsFile(JSON.parse(raw))).toBe(false);
    expect(
      matchSpriteAnims({ fileName: "MiniEnemyPrefab.scene" }, [])
    ).toBeNull();
  });
});

describe("serialize / patch", () => {
  it("extra JSON anahtarlarini korur", () => {
    const data = parseSpriteAnimsJson(
      JSON.stringify({
        atlasKey: "pursuer",
        origin: [0.5, 1],
        walkAnim: "pursuer-walk",
        body: { w: 160 },
        anims: [
          {
            key: "pursuer-walk",
            prefix: "pursuer_",
            start: 1,
            end: 16,
            zeroPad: 2,
            frameRate: 14,
            repeat: -1,
            atlasKey: "pursuer",
          },
        ],
      })
    );
    expect(data).toBeTruthy();
    const patched = patchAnimClip(data!, 0, { frameRate: 20 });
    expect(patched.origin).toEqual([0.5, 1]);
    expect(patched.walkAnim).toBe("pursuer-walk");
    expect(patched.body).toEqual({ w: 160 });
    expect(patched.anims[0].atlasKey).toBe("pursuer");
    expect(patched.anims[0].frameRate).toBe(20);
    const json = serializeSpriteAnims(patched);
    expect(json).toContain('"origin"');
    expect(json).toContain('"walkAnim"');
    expect(json).toContain('"frameRate": 20');
  });

  it("start-end surukleme kare araligini degistirir", () => {
    const clip = {
      key: "walk",
      prefix: "pursuer_",
      start: 1,
      end: 16,
      zeroPad: 2,
      frameRate: 14,
      repeat: -1,
    };
    expect(shiftClipRange(clip, "start", 2)).toEqual({ start: 3, end: 16 });
    expect(shiftClipRange(clip, "end", -3)).toEqual({ start: 1, end: 13 });
    expect(shiftClipRange({ ...clip, start: 23, end: 1 }, "start", 2)).toEqual({
      start: 21,
      end: 1,
    });
  });
});
