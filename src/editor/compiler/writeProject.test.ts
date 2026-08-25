import { describe, expect, it } from "vitest";
import { compileAllToProject } from "./writeProject";
import type { SceneFile } from "../model/types";
import type { PrefabIndexEntry } from "../serialization";

function scene(name: "SCENE" | "PREFAB"): SceneFile {
  return {
    id: name === "SCENE" ? "lvl" : "drg",
    sceneType: name,
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
      {
        id: "n1",
        type: "Image",
        label: name === "SCENE" ? "bg" : "dragon",
        texture: { key: "tex" },
        x: 0,
        y: 0,
      } as SceneFile["displayList"][number],
    ],
    plainObjects: [],
    meta: { app: "a", url: "b", contentType: "c", version: 3 },
  };
}

describe("compileAllToProject", () => {
  it("sahne ve prefab TS dosyalarini yazar, scenesiz prefabi atlar", async () => {
    const written = new Map<string, string>();
    const level = scene("SCENE");
    const dragon = scene("PREFAB");
    const prefabs: PrefabIndexEntry[] = [
      {
        id: "drg",
        fileName: "Dragon.prefab",
        className: "Dragon",
        filePath: "/proj/Dragon.prefab",
        scene: dragon,
      },
      {
        id: "ghost",
        fileName: "Ghost.prefab",
        className: "Ghost",
        filePath: "/proj/Ghost.prefab",
      },
    ];
    const count = await compileAllToProject({
      api: {
        writeFile: async (file, content) => {
          written.set(file, content);
        },
      },
      projectPath: "/proj",
      scenes: [{ path: "/proj/Level.scene", fileName: "Level.scene", scene: level }],
      prefabIndex: prefabs,
    });
    expect(count).toBe(2);
    expect(written.get("/proj/src/scenes/Level.ts")).toContain("class Level");
    expect(written.get("/proj/src/prefabs/Dragon.ts")).toContain("class Dragon");
    expect([...written.keys()].some((file) => file.includes("Ghost"))).toBe(false);
  });
});
