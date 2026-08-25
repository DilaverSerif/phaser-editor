import { compileScene } from "./index";
import type { SceneFile } from "../model/types";
import { classNameFromFileName, type PrefabIndexEntry } from "../serialization";

export type CompileWriteApi = {
  writeFile: (file: string, content: string) => Promise<unknown>;
};

export async function compileAllToProject(opts: {
  api: CompileWriteApi;
  projectPath: string;
  scenes: { path: string; fileName: string; scene: SceneFile }[];
  prefabIndex: PrefabIndexEntry[];
}): Promise<number> {
  const targets = new Map<string, { fileName: string; scene: SceneFile }>();
  for (const scene of opts.scenes) {
    targets.set(scene.path, { fileName: scene.fileName, scene: scene.scene });
  }
  for (const prefab of opts.prefabIndex) {
    if (!prefab.scene) continue;
    targets.set(prefab.filePath, {
      fileName: prefab.fileName,
      scene: prefab.scene,
    });
  }
  let count = 0;
  for (const target of targets.values()) {
    const className = classNameFromFileName(target.fileName);
    const sub = target.scene.sceneType === "PREFAB" ? "prefabs" : "scenes";
    const code = compileScene(target.scene, className, opts.prefabIndex);
    await opts.api.writeFile(`${opts.projectPath}/src/${sub}/${className}.ts`, code);
    count += 1;
  }
  return count;
}
