import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { useEditorStore } from "../store/store";

const KUCHO = "/Users/bladon/Documents/GitHub/KuchoVector";

function makeApi(dir: string) {
  return {
    openProject: async () => dir,
    readDir: async (d: string) => {
      let list: fs.Dirent[];
      try {
        list = fs.readdirSync(d, { withFileTypes: true });
      } catch {
        return [];
      }
      return list
        .filter((x) => x.name !== "node_modules" && x.name !== ".git" && x.name !== "dist")
        .map((x) => ({ name: x.name, isDirectory: x.isDirectory() }));
    },
    readFile: async (f: string) => fs.readFileSync(f, "utf-8"),
    writeFile: async () => ({ ok: true }),
    readAsset: async (_file?: string) => "data:image/png;base64,AAAA",
  };
}

describe("KuchoVector gercek proje entegrasyonu", () => {
  const exists = fs.existsSync(KUCHO);

  it.skipIf(!exists)("proje taranir: sahne + prefab dosyalari bulunur", async () => {
    (globalThis as any).window = { editor: makeApi(KUCHO) };
    // temiz baslangic
    useEditorStore.setState({
      projectPath: null,
      scenes: [],
      projectFiles: [],
      prefabIndex: [],
      assets: [],
      spriteAnims: [],
      animsWorking: null,
    } as any);
    await useEditorStore.getState().openProject(KUCHO);
    const s = useEditorStore.getState();
    expect(s.projectFiles.length).toBeGreaterThan(50);
    expect(s.prefabIndex.length).toBeGreaterThan(50);
    expect(s.assets.length).toBeGreaterThan(0);
    expect(s.spriteAnims.some((item) => item.fileName === "pursuer-anims.json")).toBe(true);
    expect(s.spriteAnims.some((item) => item.fileName === "mini-enemy-anims.json")).toBe(false);
  });

  it.skipIf(!exists)("Rooftop01.scene acilir ve prefab instance'lari yuklenir", async () => {
    let assetReads = 0;
    const api = makeApi(KUCHO);
    api.readAsset = async () => {
      assetReads += 1;
      return "data:image/png;base64,AAAA";
    };
    (globalThis as any).window = { editor: api };
    useEditorStore.setState({
      projectPath: null,
      scenes: [],
      projectFiles: [],
      prefabIndex: [],
      assets: [],
    } as any);
    await useEditorStore.getState().openProject(KUCHO);
    const target = path.join(KUCHO, "Rooftop01.scene");
    await useEditorStore.getState().openScenePath(target);
    const s = useEditorStore.getState();
    expect(s.activeFileName).toBe("Rooftop01.scene");
    const sc = s.scenes.find((x) => x.fileName === "Rooftop01.scene");
    expect(sc?.scene.displayList.length).toBeGreaterThan(0);
    // tum node'lar ya prefab instance ya da somut obje olmali
    const first = sc!.scene.displayList[0];
    expect(first.prefabId || first.type).toBeTruthy();

    // Sahne acilirken sadece gerekli texture'lar arka planda yuklenir;
    // tum asset pack'i acilista okumak performans regresyonudur.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(assetReads).toBeGreaterThan(0);
    expect(assetReads).toBeLessThan(70);
  });

  it.skipIf(!exists)("StreetBgPrefab acilinca parallax texture'lari istenir", async () => {
    const requested: string[] = [];
    const api = makeApi(KUCHO);
    api.readAsset = async (file?: string) => {
      if (file) requested.push(file);
      return "data:image/png;base64,AAAA";
    };
    (globalThis as any).window = { editor: api };
    useEditorStore.setState({
      projectPath: null,
      scenes: [],
      projectFiles: [],
      prefabIndex: [],
      assets: [],
    } as any);
    await useEditorStore.getState().openProject(KUCHO);
    await useEditorStore.getState().openScenePath(path.join(KUCHO, "StreetBgPrefab.scene"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    const joined = requested.join(" ");
    expect(joined).toContain("bg-sky.png");
    expect(joined).toContain("bg-sun.png");
    expect(joined).toContain("bg-wall.png");
    expect(requested.length).toBeGreaterThanOrEqual(11);
    expect(requested.length).toBeLessThan(70);
  });

  it.skipIf(!exists)("PursuerPrefab acilinca pursuer-anims.json baglanir", async () => {
    (globalThis as any).window = { editor: makeApi(KUCHO) };
    useEditorStore.setState({
      projectPath: null,
      scenes: [],
      projectFiles: [],
      prefabIndex: [],
      assets: [],
      spriteAnims: [],
      animsWorking: null,
    } as any);
    await useEditorStore.getState().openProject(KUCHO);
    await useEditorStore.getState().openScenePath(path.join(KUCHO, "PursuerPrefab.scene"));
    const working = useEditorStore.getState().animsWorking;
    expect(working?.fileName).toBe("pursuer-anims.json");
    expect(working?.data.atlasKey).toBe("pursuer");
    expect(working?.dirty).toBe(false);
  });
});
