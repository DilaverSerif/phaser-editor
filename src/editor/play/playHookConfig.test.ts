import { describe, expect, it } from "vitest";
import {
  devScriptUsesVite,
  PLAY_HOOK_CONFIG_SOURCE,
  PLAY_HOOK_DIR,
  PLAY_HOOK_FILE,
} from "./playHookConfig";

describe("devScriptUsesVite", () => {
  it("vite calistiran scriptleri taniyor", () => {
    expect(devScriptUsesVite("vite")).toBe(true);
    expect(devScriptUsesVite("vite --port 3000")).toBe(true);
    expect(devScriptUsesVite("npx vite")).toBe(true);
    expect(devScriptUsesVite("node ./node_modules/.bin/vite")).toBe(true);
  });

  it("vite disi scriptlere dokunmuyor", () => {
    expect(devScriptUsesVite("webpack serve")).toBe(false);
    expect(devScriptUsesVite("node server.js")).toBe(false);
    expect(devScriptUsesVite("vitest")).toBe(false);
    expect(devScriptUsesVite(undefined)).toBe(false);
  });
});

describe("PLAY_HOOK_CONFIG_SOURCE", () => {
  it("proje icine yazilacak yolu veriyor", () => {
    expect(PLAY_HOOK_DIR).toBe("node_modules/.phaser-editor");
    expect(PLAY_HOOK_FILE).toBe("play.config.mjs");
  });

  it("phaser cozumlemesini sarip oyunu globale koyuyor", () => {
    expect(PLAY_HOOK_CONFIG_SOURCE).toContain('if (source !== "phaser") return null;');
    expect(PLAY_HOOK_CONFIG_SOURCE).toContain("class Game extends __ns.Game");
    expect(PLAY_HOOK_CONFIG_SOURCE).toContain("window.__PHASER_EDITOR_GAME__ = this;");
  });

  it("uretilen modulu satir sonlariyla birlestiriyor", () => {
    expect(PLAY_HOOK_CONFIG_SOURCE).toContain(String.raw`].join("\n");`);
  });

  it("kullanicinin kendi ayarini koruyor", () => {
    expect(PLAY_HOOK_CONFIG_SOURCE).toContain("loadConfigFromFile");
    expect(PLAY_HOOK_CONFIG_SOURCE).toContain("mergeConfig");
  });
});
