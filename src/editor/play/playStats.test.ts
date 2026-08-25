import { describe, expect, it } from "vitest";
import {
  COLLECT_PLAY_STATS,
  EMPTY_PLAY_STATS,
  formatCount,
  formatFlag,
  formatMb,
  formatSize,
  parsePlayStats,
  PLAY_GAME_GLOBALS,
} from "./playStats";

describe("parsePlayStats", () => {
  it("bos degerde varsayilan doner", () => {
    expect(parsePlayStats(null)).toEqual(EMPTY_PLAY_STATS);
  });

  it("phaser alanlarini okur", () => {
    expect(
      parsePlayStats({
        found: true,
        fps: 60,
        delta: 16.6,
        frame: 10,
        renderer: "WebGL",
        scaleMode: "FIT",
        scenes: "Level",
        objects: 4,
        drawCount: 9,
      })
    ).toMatchObject({
      found: true,
      fps: 60,
      renderer: "WebGL",
      scaleMode: "FIT",
      scenes: "Level",
      drawCount: 9,
    });
  });

  it("performans alanlarini okur", () => {
    expect(
      parsePlayStats({
        found: true,
        drawCalls: 12.5,
        triangles: 340,
        textureBinds: 3,
        programBinds: 2,
        glTextures: 6,
        glBuffers: 9,
        heapUsed: 18.25,
        heapLimit: 4096,
        fpsMin: 52,
        fpsMax: 61,
        rawDelta: 17.2,
      })
    ).toMatchObject({
      drawCalls: 12.5,
      triangles: 340,
      textureBinds: 3,
      programBinds: 2,
      glTextures: 6,
      glBuffers: 9,
      heapUsed: 18.25,
      heapLimit: 4096,
      fpsMin: 52,
      fpsMax: 61,
      rawDelta: 17.2,
    });
  });

  it("olculemeyen performans alanlarini null birakir", () => {
    const stats = parsePlayStats({ found: true, fps: 60 });
    expect(stats.drawCalls).toBeNull();
    expect(stats.triangles).toBeNull();
    expect(stats.heapUsed).toBeNull();
    expect(stats.fpsMin).toBeNull();
  });

  it("json string kabul eder", () => {
    expect(parsePlayStats(JSON.stringify({ found: true, fps: 55 }))).toMatchObject({
      found: true,
      fps: 55,
    });
  });

  it("hata metnini korur", () => {
    expect(parsePlayStats({ found: false, error: "Sayfada canvas yok" })).toMatchObject({
      found: false,
      error: "Sayfada canvas yok",
    });
  });
});

describe("COLLECT_PLAY_STATS", () => {
  it("bilinen tum global adlarini tarar", () => {
    for (const name of PLAY_GAME_GLOBALS) {
      expect(COLLECT_PLAY_STATS).toContain(name);
    }
  });

  it("global yoksa window uzerinde arar", () => {
    expect(COLLECT_PLAY_STATS).toContain("getOwnPropertyNames(window)");
  });

  it("gl draw cagrilarini sayiyor", () => {
    for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
      expect(COLLECT_PLAY_STATS).toContain(name);
    }
    expect(COLLECT_PLAY_STATS).toContain("__phaserEditorPatched");
    expect(COLLECT_PLAY_STATS).toContain("bindTexture");
    expect(COLLECT_PLAY_STATS).toContain("useProgram");
  });

  it("kare basina degeri iki anket arasindaki farktan cikariyor", () => {
    expect(COLLECT_PLAY_STATS).toContain("var phaserFrames = frame - slot.lastFrame;");
    expect(COLLECT_PLAY_STATS).toContain("(slot.calls - slot.lastCalls) / frames");
  });

  it("phaser kare sayaci durursa rAF sayacina dusuyor", () => {
    expect(COLLECT_PLAY_STATS).toContain("slot.rafFrames - slot.lastRaf");
    expect(COLLECT_PLAY_STATS).toContain("__phaserEditorRafPatched");
  });

  it("bulunamayinca yol gosteren mesaj uretir", () => {
    expect(COLLECT_PLAY_STATS).toContain("vite-error-overlay");
    expect(COLLECT_PLAY_STATS).toContain("Sayfada canvas yok");
    expect(COLLECT_PLAY_STATS).toContain("window.__PHASER_GAME__ = game;");
  });
});

describe("format", () => {
  it("boyut ve bayrak yazar", () => {
    expect(formatSize(1280, 720)).toBe("1280×720");
    expect(formatSize(0, 720)).toBe("—");
    expect(formatFlag(true)).toBe("evet");
    expect(formatFlag(false)).toBe("hayır");
  });

  it("olculmemis sayilari tire yazar", () => {
    expect(formatCount(null)).toBe("—");
    expect(formatCount(0)).toBe("0");
    expect(formatCount(12.34, 1)).toBe("12.3");
    expect(formatMb(null)).toBe("—");
    expect(formatMb(18.25)).toBe("18.3 MB");
  });
});
