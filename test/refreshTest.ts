import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const kucho = "/Users/bladon/Documents/GitHub/KuchoVector";

function walk(dir: string): Array<{ name: string; isDirectory: boolean }> {
  let entries: Array<{ name: string; isDirectory: boolean }> = [];
  let list: string[];
  try {
    list = readdirSync(dir);
  } catch {
    return entries;
  }
  for (const name of list) {
    if (name === "node_modules" || name === ".git" || name === "dist") continue;
    let isDir = false;
    try {
      isDir = statSync(join(dir, name)).isDirectory();
    } catch {
      /* yoksay */
    }
    entries.push({ name, isDirectory: isDir });
  }
  return entries;
}

const api = {
  openProject: async () => kucho,
  readDir: async (dir: string) => walk(dir),
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

async function main() {
  useEditorStore.setState({ projectPath: kucho } as any);
  await useEditorStore.getState().refreshProjectFiles();
  const st = useEditorStore.getState();
  console.log("projectFiles:", st.projectFiles.length);
  console.log("prefabIndex:", st.prefabIndex.length);
  console.log("assets:", st.assets.length, "örnek:", st.assets.slice(0, 3).map((a) => a.key));

  await st.openScenePath(kucho + "/Rooftop01.scene");
  const after = useEditorStore.getState();
  const sc = after.scenes.find((s) => s.fileName === after.activeFileName);
  console.log("active scene nodes:", sc?.scene.displayList.length);
}

main().catch((e) => {
  console.error("TEST ERROR:", e);
  process.exit(1);
});
