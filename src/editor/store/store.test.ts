import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { useEditorStore } from "../store/store";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ed-test-"));

fs.writeFileSync(
  path.join(root, "Level.scene"),
  JSON.stringify({
    id: "lvl",
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
      { id: "n1", type: "Image", label: "bg", texture: { key: "bg" }, x: 0, y: 0 },
      { id: "n2", type: "Text", label: "t", text: "hi", x: 10, y: 10 },
    ],
    plainObjects: [],
    meta: { app: "a", url: "b", contentType: "c", version: 3 },
  })
);

fs.writeFileSync(
  path.join(root, "Dragon.prefab"),
  JSON.stringify({
    id: "drg",
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
      { id: "r1", type: "Image", label: "dragon", texture: { key: "dragon" }, x: 0, y: 0 },
    ],
    plainObjects: [],
    meta: { app: "a", url: "b", contentType: "c", version: 3 },
    prefabProperties: [],
  })
);

function makeApi(dir: string) {
  return {
    openProject: async () => dir,
    readDir: async (d: string) =>
      fs.readdirSync(d, { withFileTypes: true }).map((x) => ({
        name: x.name,
        isDirectory: x.isDirectory(),
      })),
    readFile: async (f: string) => {
      try {
        return fs.readFileSync(f, "utf-8");
      } catch {
        return { error: "not found" };
      }
    },
    writeFile: async () => ({ ok: true }),
    readAsset: async () => "data:image/png;base64,AAAA",
  };
}

(globalThis as any).window = { editor: makeApi(root) };

describe("store (sahte proje)", () => {
  beforeAll(async () => {
    await useEditorStore.getState().openProject(root);
  });

  it("projectFiles ve prefabIndex dolar", () => {
    const s = useEditorStore.getState();
    expect(s.projectFiles.length).toBe(2);
    expect(s.projectFiles.filter((p) => p.sceneType === "SCENE").length).toBe(1);
    expect(s.projectFiles.filter((p) => p.sceneType === "PREFAB").length).toBe(1);
    expect(s.prefabIndex.length).toBe(1);
  });

  it("openScenePath sahneyi acar ve activeFileName'i ayarlar", async () => {
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    const s = useEditorStore.getState();
    expect(s.activeFileName).toBe("Level.scene");
    const sc = s.scenes.find((x) => x.fileName === "Level.scene");
    expect(sc?.scene.displayList.length).toBe(2);
  });

  it("kayit ozgün konuma yazilir", async () => {
    const written: Record<string, string> = {};
    (globalThis as any).window.editor.writeFile = async (f: string, c: string) => {
      written[f] = c;
      return { ok: true };
    };
    await useEditorStore.getState().saveActiveScene();
    expect(Object.keys(written)[0]).toContain("Level.scene");
    expect(Object.values(written)[0]).toContain('"sceneType": "SCENE"');
  });

  it("shift ile hierarchy araligi secer", async () => {
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    useEditorStore.getState().selectNode("n1");
    useEditorStore.getState().selectNode("n2", {
      shift: true,
      visibleIds: ["n1", "n2"],
    });
    const s = useEditorStore.getState();
    expect(s.selectedIds).toEqual(["n1", "n2"]);
    expect(s.selectedId).toBe("n2");
    expect(s.selectionAnchorId).toBe("n1");
  });

  it("createLayer bos layer ekler", async () => {
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    const before = useEditorStore
      .getState()
      .scenes.find((x) => x.fileName === "Level.scene")!.scene.displayList.length;
    useEditorStore.getState().createLayer();
    const list = useEditorStore
      .getState()
      .scenes.find((x) => x.fileName === "Level.scene")!.scene.displayList;
    const layer = list[list.length - 1];
    expect(list.length).toBe(before + 1);
    expect(layer.type).toBe("Layer");
    expect(layer.list).toEqual([]);
    expect(useEditorStore.getState().selectedId).toBe(layer.id);
  });

  it("groupSelectionInLayer secilenleri layer icine alir", async () => {
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    const current = useEditorStore.getState();
    useEditorStore.setState({
      scenes: current.scenes.map((item) =>
        item.fileName === "Level.scene"
          ? {
              ...item,
              scene: {
                ...item.scene,
                displayList: [
                  { id: "n1", type: "Image", label: "bg", x: 0, y: 0 },
                  { id: "n2", type: "Text", label: "t", x: 10, y: 10 },
                ],
              },
            }
          : item
      ),
      selectedId: "n1",
      selectedIds: ["n1", "n2"],
      selectionAnchorId: "n1",
    });
    useEditorStore.getState().groupSelectionInLayer();
    const list = useEditorStore
      .getState()
      .scenes.find((x) => x.fileName === "Level.scene")!.scene.displayList;
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe("Layer");
    expect(list[0].list?.map((n) => n.id)).toEqual(["n1", "n2"]);
    expect(useEditorStore.getState().selectedId).toBe(list[0].id);
  });

  it("reorderScenes acik sekme sirasini degistirir", async () => {
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    await useEditorStore.getState().openScenePath(path.join(root, "Dragon.prefab"));
    useEditorStore.getState().reorderScenes(0, 1);
    expect(useEditorStore.getState().scenes.map((s) => s.fileName)).toEqual([
      "Dragon.prefab",
      "Level.scene",
    ]);
  });

  it("addPhaserComponent arcade body ekler", async () => {
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    const current = useEditorStore.getState();
    useEditorStore.setState({
      scenes: current.scenes.map((item) =>
        item.fileName === "Level.scene"
          ? {
              ...item,
              scene: {
                ...item.scene,
                displayList: [{ id: "n1", type: "Image", label: "bg", x: 0, y: 0 }],
              },
            }
          : item
      ),
      selectedId: "n1",
      selectedIds: ["n1"],
    });
    useEditorStore.getState().addPhaserComponent("n1", "arcade");
    const obj = useEditorStore
      .getState()
      .scenes.find((x) => x.fileName === "Level.scene")!.scene.displayList[0];
    expect(obj["ArcadeComponent.active"]).toBe(true);
    useEditorStore.getState().addPhaserComponent("n1", "Glow");
    const withGlow = useEditorStore
      .getState()
      .scenes.find((x) => x.fileName === "Level.scene")!.scene.displayList[0];
    expect(withGlow.filters?.[0]).toMatchObject({ type: "Glow" });
  });

  it("edit sonra undo kaydedilmis haline doner ve dirty kalkar", async () => {
    useEditorStore.getState().closeScene("Level.scene");
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    const opened = useEditorStore.getState().scenes.find((x) => x.fileName === "Level.scene")!;
    expect(opened.dirty).toBe(false);
    const saved = opened.lastSaved;
    useEditorStore.getState().updateNode("n1", { x: 99 });
    const edited = useEditorStore.getState().scenes.find((x) => x.fileName === "Level.scene")!;
    expect(edited.dirty).toBe(true);
    expect(edited.scene.displayList[0].x).toBe(99);
    useEditorStore.getState().undo();
    const undone = useEditorStore.getState().scenes.find((x) => x.fileName === "Level.scene")!;
    expect(undone.dirty).toBe(false);
    expect(undone.scene.displayList[0].x).toBe(0);
    expect(undone.lastSaved).toBe(saved);
  });

  it("undo yalniz aktif sahnenin history'sini kullanir", async () => {
    useEditorStore.getState().closeScene("Level.scene");
    useEditorStore.getState().closeScene("Dragon.prefab");
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    useEditorStore.getState().updateNode("n1", { x: 11 });
    await useEditorStore.getState().openScenePath(path.join(root, "Dragon.prefab"));
    useEditorStore.getState().updateNode("r1", { x: 22 });
    useEditorStore.getState().undo();
    const dragon = useEditorStore.getState().scenes.find((x) => x.fileName === "Dragon.prefab")!;
    const level = useEditorStore.getState().scenes.find((x) => x.fileName === "Level.scene")!;
    expect(dragon.scene.displayList[0].x).toBe(0);
    expect(dragon.dirty).toBe(false);
    expect(level.scene.displayList[0].x).toBe(11);
    expect(level.dirty).toBe(true);
  });

  it("revertActiveScene son kaydi geri yukler", async () => {
    useEditorStore.getState().closeScene("Level.scene");
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    useEditorStore.getState().updateNode("n1", { x: 50 });
    useEditorStore.getState().updateNode("n1", { y: 60 });
    useEditorStore.getState().revertActiveScene();
    const sc = useEditorStore.getState().scenes.find((x) => x.fileName === "Level.scene")!;
    expect(sc.dirty).toBe(false);
    expect(sc.scene.displayList[0].x).toBe(0);
    expect(sc.scene.displayList[0].y).toBe(0);
    expect(sc.history.past).toEqual([]);
  });

  it("saveActiveScene cagrilmadan .scene yazilmaz", async () => {
    const written: string[] = [];
    (globalThis as any).window.editor.writeFile = async (f: string) => {
      written.push(f);
      return { ok: true };
    };
    useEditorStore.getState().closeScene("Level.scene");
    await useEditorStore.getState().openScenePath(path.join(root, "Level.scene"));
    useEditorStore.getState().updateNode("n1", { x: 7 });
    expect(written.filter((f) => f.endsWith(".scene"))).toEqual([]);
    await useEditorStore.getState().saveActiveScene();
    expect(written.some((f) => f.endsWith("Level.scene"))).toBe(true);
  });

  it("kirli *-anims.json extra anahtarlarla yazilir", async () => {
    const animsPath = path.join(root, "pursuer-anims.json");
    const prefabPath = path.join(root, "PursuerPrefab.scene");
    fs.writeFileSync(
      prefabPath,
      JSON.stringify({
        id: "pursuer-prefab",
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
          {
            id: "p1",
            type: "Sprite",
            label: "pursuer",
            texture: { key: "pursuer-preview" },
            x: 0,
            y: 0,
          },
        ],
        plainObjects: [],
        meta: { app: "a", url: "b", contentType: "c", version: 3 },
        prefabProperties: [],
      })
    );
    fs.writeFileSync(
      animsPath,
      JSON.stringify(
        {
          atlasKey: "pursuer",
          previewKey: "pursuer-preview",
          origin: [0.5, 1],
          walkAnim: "pursuer-walk",
          anims: [
            {
              key: "pursuer-walk",
              prefix: "pursuer_",
              start: 1,
              end: 16,
              zeroPad: 2,
              frameRate: 14,
              repeat: -1,
            },
          ],
        },
        null,
        2
      )
    );
    const written: Record<string, string> = {};
    (globalThis as any).window.editor.writeFile = async (f: string, c: string) => {
      written[f] = c;
      fs.writeFileSync(f, c);
      return { ok: true };
    };
    await useEditorStore.getState().refreshProjectFiles();
    await useEditorStore.getState().openScenePath(prefabPath);
    expect(useEditorStore.getState().animsWorking?.data.atlasKey).toBe("pursuer");
    useEditorStore.getState().updateAnimClip(0, { frameRate: 20 });
    expect(useEditorStore.getState().animsWorking?.dirty).toBe(true);
    await useEditorStore.getState().saveActiveScene();
    expect(useEditorStore.getState().animsWorking?.dirty).toBe(false);
    expect(written[animsPath]).toBeTruthy();
    const saved = JSON.parse(written[animsPath]);
    expect(saved.origin).toEqual([0.5, 1]);
    expect(saved.walkAnim).toBe("pursuer-walk");
    expect(saved.anims[0].frameRate).toBe(20);
  });
});
