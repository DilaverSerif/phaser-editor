import { describe, it, expect } from "vitest";
import { canAcceptTexture, keysNeedingHydration } from "./textureHydrate";

describe("keysNeedingHydration", () => {
  const assets = [
    { key: "bg-sky", base64: "data:image/png;base64,AAA" },
    { key: "idle", base64: undefined },
    { key: "hero", base64: "data:image/png;base64,BBB" },
  ];

  it("base64'si olan ve Phaser'da olmayan key'leri doner", () => {
    expect(keysNeedingHydration(assets, (key) => key === "hero")).toEqual(["bg-sky"]);
  });

  it("hepsi yukluysa bos doner", () => {
    expect(keysNeedingHydration(assets, () => true)).toEqual([]);
  });
});

describe("canAcceptTexture", () => {
  it("oyun yok edilmisse veya renderer yoksa false", () => {
    expect(canAcceptTexture({ destroyed: true, game: { renderer: {} } })).toBe(false);
    expect(canAcceptTexture({ destroyed: false, game: null })).toBe(false);
    expect(canAcceptTexture({ destroyed: false, game: { renderer: null } })).toBe(false);
  });

  it("renderer hazirsa true", () => {
    expect(canAcceptTexture({ destroyed: false, game: { renderer: {} } })).toBe(true);
  });
});
