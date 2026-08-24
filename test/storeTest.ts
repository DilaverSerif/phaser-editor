import { readFileSync } from "node:fs";

// --- mock window.editor (Electron preload API) ---
const kucho = "/Users/bladon/Documents/GitHub/KuchoVector";
const api = {
  openProject: async () => kucho,
  readDir: async () => ({ error: "unused" }),
  readFile: async (file: string) => {
    try {
      return readFileSync(file, "utf-8");
    } catch (e) {
      return { error: String(e) };
    }
  },
  writeFile: async () => ({ ok: true }),
  readAsset: async () => "data:image/png;base64,",
};
(globalThis as any).editor = api;
(globalThis as any).window = { editor: api };

import { useEditorStore } from "../src/editor/store/store";
import { textureKeyOf } from "../src/editor/model/types";

async function main() {
  const st = useEditorStore.getState();
  // projectPath set et
  useEditorStore.setState({ projectPath: kucho } as any);

  const target = kucho + "/Rooftop01.scene";
  await st.openScenePath(target);

  const after = useEditorStore.getState();
  console.log("scenes count:", after.scenes.length);
  console.log("activeFileName:", after.activeFileName);
  const sc = after.scenes.find((s) => s.fileName === after.activeFileName);
  console.log("active scene displayList len:", sc?.scene.displayList.length);
  console.log(
    "prefabIndex entries:",
    after.prefabIndex.length,
    after.prefabIndex.slice(0, 3).map((p) => p.className)
  );
  // bir prefab instance'in texture cikarimi
  const firstNode = sc?.scene.displayList[0];
  console.log("first node:", JSON.stringify({ type: firstNode?.type, prefabId: firstNode?.prefabId?.slice(0,8), label: firstNode?.label }));
  void textureKeyOf;
}

main().catch((e) => {
  console.error("TEST ERROR:", e);
  process.exit(1);
});
