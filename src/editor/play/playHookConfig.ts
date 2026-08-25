/**
 * Play sirasinda kullanicinin projesine dokunmadan Phaser oyununu yakalamak icin
 * uretilen gecici Vite ayari. Vite'in "phaser" cozumlemesini araya alir, Game
 * sinifini sarar ve olusan oyunu window.__PHASER_EDITOR_GAME__ altina koyar.
 */
export const PLAY_HOOK_DIR = "node_modules/.phaser-editor";
export const PLAY_HOOK_FILE = "play.config.mjs";

/** dev scripti Vite calistiriyor mu? Sadece o zaman ayar enjekte ediyoruz. */
export function devScriptUsesVite(devScript: unknown) {
  if (typeof devScript !== "string") return false;
  return /(^|[\s"'`/\\])vite(\s|$|["'`])/.test(devScript.trim());
}

export const PLAY_HOOK_CONFIG_SOURCE = `// Phaser Editor tarafindan uretildi. Elle duzenlemeyin.
import { loadConfigFromFile, mergeConfig } from "vite";

const VIRTUAL = "virtual:phaser-editor-play-hook";
const REAL_MARK = "?real=";

const hook = {
  name: "phaser-editor-play-hook",
  enforce: "pre",
  async resolveId(source, importer, options) {
    if (source !== "phaser") return null;
    if (importer && importer.indexOf(VIRTUAL) === 0) return null;
    try {
      const real = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!real) return null;
      return VIRTUAL + REAL_MARK + encodeURIComponent(real.id);
    } catch (err) {
      return null;
    }
  },
  load(id) {
    if (id.indexOf(VIRTUAL) !== 0) return null;
    const at = id.indexOf(REAL_MARK);
    if (at < 0) return null;
    const real = JSON.stringify(decodeURIComponent(id.slice(at + REAL_MARK.length)));
    return [
      "import * as __real from " + real + ";",
      "export * from " + real + ";",
      "const __ns = __real.default && __real.default.Game ? __real.default : __real;",
      "class Game extends __ns.Game {",
      "  constructor(config) {",
      "    super(config);",
      "    try {",
      "      window.__PHASER_EDITOR_GAME__ = this;",
      "      if (!window.__PHASER_GAME__) window.__PHASER_GAME__ = this;",
      "    } catch (err) {}",
      "  }",
      "}",
      "export { Game };",
      "export default Object.assign({}, __ns, { Game });",
    ].join("\\n");
  },
};

async function userConfig(env) {
  try {
    const loaded = await loadConfigFromFile(env, undefined, process.cwd());
    const raw = loaded && loaded.config;
    if (!raw) return {};
    return (typeof raw === "function" ? await raw(env) : raw) || {};
  } catch (err) {
    console.warn("[phaser-editor] vite ayari okunamadi: " + (err && err.message));
    return {};
  }
}

export default async (env) => mergeConfig(await userConfig(env), { plugins: [hook] });
`;
